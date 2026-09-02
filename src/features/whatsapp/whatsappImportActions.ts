"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getWhatsAppSettings, getWhatsAppConnection } from "./actions";
import { saveSmartGroup } from "../crm/groupsActions";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

function normalizePhone(phone?: string): string {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("972") && clean.length > 9) {
    return "0" + clean.slice(3);
  }
  if (!clean.startsWith("0") && clean.length === 9) {
    return "0" + clean;
  }
  return clean;
}

export interface WhatsAppGroupItem {
  id: string; // e.g. "120363044959328405@g.us"
  name: string;
  type: "group";
  memberCount?: number;
}

export interface WhatsAppGroupParticipant {
  phone: string; // Clean local format e.g. "0501234567"
  chatId: string; // e.g. "972501234567@c.us"
  name: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  existsInCRM?: boolean;
  existingContactName?: string;
}

export interface WhatsAppDirectContactItem {
  id: string; // e.g. "972501234567@c.us"
  phone: string;
  name: string;
  existsInCRM?: boolean;
  existingContactName?: string;
}

// 1. Fetch WhatsApp Groups List
export async function getWhatsAppGroupsList(): Promise<{
  success: boolean;
  groups: WhatsAppGroupItem[];
  error?: string;
}> {
  try {
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { success: false, groups: [], error: "חסרים פרטי חיבור וואטסאפ (Green API)." };
    }

    const url = `https://api.green-api.com/waInstance${settings.idInstance}/getContacts/${settings.apiToken}`;
    console.log("===> [WhatsApp Import] Fetching contacts from Green API to extract groups...");
    const res = await fetch(url, { next: { revalidate: 0 } });
    
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`שגיאת תקשורת מול Green API (${res.status}): ${errText}`);
    }

    const contacts: any[] = await res.json();
    if (!Array.isArray(contacts)) {
      return { success: true, groups: [] };
    }

    const groups: WhatsAppGroupItem[] = contacts
      .filter((item) => item.type === "group" || (item.id && item.id.endsWith("@g.us")))
      .map((item) => ({
        id: item.id,
        name: item.name || "קבוצת וואטסאפ ללא שם",
        type: "group",
      }));

    console.log(`===> [WhatsApp Import] Found ${groups.length} groups in Green API.`);
    return { success: true, groups };
  } catch (error: any) {
    console.error("===> [WhatsApp Import] Error fetching groups:", error);
    return { success: false, groups: [], error: error.message || "שגיאה בשליפת קבוצות" };
  }
}

// 2. Fetch Group Details and Participants
export async function getWhatsAppGroupDetails(groupId: string): Promise<{
  success: boolean;
  groupName: string;
  groupId: string;
  participants: WhatsAppGroupParticipant[];
  error?: string;
}> {
  try {
    const ownerId = await getUserId();
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { success: false, groupName: "", groupId, participants: [], error: "חסרים פרטי חיבור וואטסאפ." };
    }

    // 1. Fetch group data from Green API
    const url = `https://api.green-api.com/waInstance${settings.idInstance}/getGroupData/${settings.apiToken}`;
    console.log(`===> [WhatsApp Import] Fetching group details for ${groupId}...`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`שגיאה בקבלת פרטי קבוצה (${res.status}): ${errText}`);
    }

    const groupData = await res.json();
    const groupName = groupData.subject || "קבוצת וואטסאפ";
    const rawParticipants: any[] = Array.isArray(groupData.participants) ? groupData.participants : [];

    // 2. Fetch contacts list for name resolution if available
    let contactsMap = new Map<string, string>();
    try {
      const contactsUrl = `https://api.green-api.com/waInstance${settings.idInstance}/getContacts/${settings.apiToken}`;
      const contactsRes = await fetch(contactsUrl, { next: { revalidate: 0 } });
      if (contactsRes.ok) {
        const allWaContacts: any[] = await contactsRes.json();
        if (Array.isArray(allWaContacts)) {
          allWaContacts.forEach(c => {
            if (c.id && c.name) contactsMap.set(c.id, c.name);
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch contact names map for groups:", e);
    }

    // 3. Fetch existing CRM contacts for this owner to detect overlaps
    const existingCrmContactsSnap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const existingPhonesMap = new Map<string, { id: string; name: string }>();
    existingCrmContactsSnap.forEach((doc) => {
      const d = doc.data();
      if (d.conta_phone) {
        const norm = normalizePhone(d.conta_phone);
        if (norm) existingPhonesMap.set(norm, { id: doc.id, name: d.conta_name || "" });
      }
    });

    // 4. Map participants
    const participants: WhatsAppGroupParticipant[] = rawParticipants.map((p) => {
      const chatId = p.id || "";
      const rawNumber = chatId.replace("@c.us", "");
      const cleanPhone = normalizePhone(rawNumber);
      const waName = contactsMap.get(chatId) || "";
      const existingCrm = existingPhonesMap.get(cleanPhone);

      return {
        phone: cleanPhone,
        chatId,
        name: waName || existingCrm?.name || (cleanPhone ? `משתתף (${cleanPhone})` : "משתתף"),
        isAdmin: !!p.isAdmin,
        isSuperAdmin: !!p.isSuperAdmin,
        existsInCRM: !!existingCrm,
        existingContactName: existingCrm?.name,
      };
    });

    console.log(`===> [WhatsApp Import] Group ${groupName} has ${participants.length} participants.`);
    return {
      success: true,
      groupName,
      groupId,
      participants,
    };
  } catch (error: any) {
    console.error("===> [WhatsApp Import] Error fetching group details:", error);
    return { success: false, groupName: "", groupId, participants: [], error: error.message || "שגיאה בטעינת משתתפי הקבוצה" };
  }
}

// 3. Fetch Direct WhatsApp Contacts List
export async function getWhatsAppDirectContactsList(): Promise<{
  success: boolean;
  contacts: WhatsAppDirectContactItem[];
  error?: string;
}> {
  try {
    const ownerId = await getUserId();
    const settings = await getWhatsAppSettings();
    if (!settings.idInstance || !settings.apiToken) {
      return { success: false, contacts: [], error: "חסרים פרטי חיבור וואטסאפ." };
    }

    const url = `https://api.green-api.com/waInstance${settings.idInstance}/getContacts/${settings.apiToken}`;
    console.log("===> [WhatsApp Import] Fetching all direct contacts from Green API...");
    const res = await fetch(url, { next: { revalidate: 0 } });
    
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`שגיאת תקשורת מול Green API (${res.status}): ${errText}`);
    }

    const waContacts: any[] = await res.json();
    if (!Array.isArray(waContacts)) {
      return { success: true, contacts: [] };
    }

    // Existing CRM contacts map
    const existingCrmContactsSnap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const existingPhonesMap = new Map<string, string>();
    existingCrmContactsSnap.forEach((doc) => {
      const d = doc.data();
      if (d.conta_phone) {
        const norm = normalizePhone(d.conta_phone);
        if (norm) existingPhonesMap.set(norm, d.conta_name || "");
      }
    });

    const directContacts: WhatsAppDirectContactItem[] = waContacts
      .filter((item) => item.type === "user" || (item.id && item.id.endsWith("@c.us")))
      .map((item) => {
        const rawNumber = (item.id || "").replace("@c.us", "");
        const cleanPhone = normalizePhone(rawNumber);
        const existingName = existingPhonesMap.get(cleanPhone);

        return {
          id: item.id,
          phone: cleanPhone,
          name: item.name || existingName || (cleanPhone ? `איש קשר (${cleanPhone})` : "איש קשר ללא שם"),
          existsInCRM: existingPhonesMap.has(cleanPhone),
          existingContactName: existingName,
        };
      });

    console.log(`===> [WhatsApp Import] Found ${directContacts.length} direct contacts.`);
    return { success: true, contacts: directContacts };
  } catch (error: any) {
    console.error("===> [WhatsApp Import] Error fetching direct contacts:", error);
    return { success: false, contacts: [], error: error.message || "שגיאה בשליפת אנשי קשר" };
  }
}

// 4. Import Group Members to CRM & Communities
export interface ImportGroupParams {
  groupId: string;
  groupName: string;
  participants: {
    phone: string;
    name?: string;
  }[];
  targetCommunityName: string;
  createAsNewCommunity?: boolean;
  communityColor?: string;
  extraTags?: string[];
}

export async function importWhatsAppGroupMembersToCRM(params: ImportGroupParams): Promise<{
  success: boolean;
  createdCount: number;
  updatedCount: number;
  totalProcessed: number;
  communityName: string;
  error?: string;
}> {
  try {
    const ownerId = await getUserId();
    const {
      groupName,
      participants,
      targetCommunityName,
      createAsNewCommunity,
      communityColor = "#4f46e5",
      extraTags = [],
    } = params;

    const finalCommunityName = (targetCommunityName || groupName || "קבוצת וואטסאפ").trim();
    if (!finalCommunityName) {
      throw new Error("נא לציין שם קהילה או קבוצה לשיוך");
    }

    if (!participants || participants.length === 0) {
      throw new Error("לא נבחרו משתתפים לייבוא");
    }

    console.log(`===> [WhatsApp Import] Starting import of ${participants.length} participants into community [${finalCommunityName}]...`);

    // 1. Create new community in crm_groups if requested
    if (createAsNewCommunity) {
      try {
        await saveSmartGroup({
          id: finalCommunityName,
          name: finalCommunityName,
          color: communityColor,
          type: "manual",
          description: `יובא אוטומטית מקבוצת וואטסאפ: ${groupName}`,
        });
        console.log(`===> [WhatsApp Import] Created community definition [${finalCommunityName}] in crm_groups.`);
      } catch (err) {
        console.warn("Community creation notice:", err);
      }
    }

    // 2. Fetch existing contacts for this owner to merge
    const existingSnap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const existingByPhone = new Map<string, { id: string; tags: string[]; name: string; data: any }>();
    existingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.conta_phone) {
        const norm = normalizePhone(d.conta_phone);
        if (norm) {
          const tags: string[] = Array.isArray(d.tags) ? d.tags : [];
          existingByPhone.set(norm, { id: doc.id, tags, name: d.conta_name || "", data: d });
        }
      }
    });

    let createdCount = 0;
    let updatedCount = 0;

    const allTagsToApply = Array.from(new Set([finalCommunityName, ...extraTags.filter(t => t.trim() !== "")]));

    // Batch process in chunks of 100 for Firestore performance
    const chunkSize = 100;
    for (let i = 0; i < participants.length; i += chunkSize) {
      const chunk = participants.slice(i, i + chunkSize);
      const batch = adminDb.batch();

      for (const p of chunk) {
        const phone = normalizePhone(p.phone);
        if (!phone) continue;

        const existing = existingByPhone.get(phone);

        if (existing) {
          // Contact exists -> Update tags without overwriting existing details
          const mergedTags = Array.from(new Set([...existing.tags, ...allTagsToApply]));
          const docRef = adminDb.collection("contacts").doc(existing.id);
          batch.update(docRef, {
            tags: mergedTags,
            updatedAt: new Date().toISOString(),
          });
          updatedCount++;
        } else {
          // Contact is new -> Create new contact document
          const docRef = adminDb.collection("contacts").doc();
          const newName = p.name && !p.name.startsWith("משתתף (") && !p.name.startsWith("איש קשר (") 
            ? p.name.trim() 
            : `איש קשר ${phone}`;

          const newDoc = {
            ownerId,
            conta_name: newName,
            conta_phone: phone,
            tags: allTagsToApply,
            lead_source: `וואטסאפ - ${groupName}`,
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: `יובא מקבוצת וואטסאפ "${groupName}" בתאריך ${new Date().toLocaleDateString("he-IL")}`,
            total_spent: 0,
            campaign_amount: 0,
            order_count: 0,
          };

          batch.set(docRef, newDoc);
          createdCount++;
        }
      }

      await batch.commit();
    }

    console.log(`===> [WhatsApp Import] Completed: Created ${createdCount}, Updated ${updatedCount}, Total ${participants.length}`);

    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/whatsapp");

    return {
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: participants.length,
      communityName: finalCommunityName,
    };
  } catch (error: any) {
    console.error("===> [WhatsApp Import] Error importing group members:", error);
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      totalProcessed: 0,
      communityName: params.targetCommunityName || "",
      error: error.message || "שגיאה בייבוא המשתתפים",
    };
  }
}

// 5. Import Direct WhatsApp Contacts to CRM & Communities
export interface ImportDirectContactsParams {
  contacts: {
    phone: string;
    name?: string;
  }[];
  targetCommunityName?: string;
  createAsNewCommunity?: boolean;
  communityColor?: string;
  extraTags?: string[];
}

export async function importWhatsAppContactsToCRM(params: ImportDirectContactsParams): Promise<{
  success: boolean;
  createdCount: number;
  updatedCount: number;
  totalProcessed: number;
  error?: string;
}> {
  try {
    const ownerId = await getUserId();
    const {
      contacts,
      targetCommunityName,
      createAsNewCommunity,
      communityColor = "#4f46e5",
      extraTags = [],
    } = params;

    if (!contacts || contacts.length === 0) {
      throw new Error("לא נבחרו אנשי קשר לייבוא");
    }

    const finalCommunity = targetCommunityName ? targetCommunityName.trim() : "";

    // 1. Create community if selected
    if (finalCommunity && createAsNewCommunity) {
      try {
        await saveSmartGroup({
          id: finalCommunity,
          name: finalCommunity,
          color: communityColor,
          type: "manual",
          description: `קהילה שיובאה מאנשי קשר של וואטסאפ`,
        });
      } catch (err) {}
    }

    // 2. Fetch existing CRM contacts to avoid duplicates
    const existingSnap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const existingByPhone = new Map<string, { id: string; tags: string[]; name: string }>();
    existingSnap.forEach((doc) => {
      const d = doc.data();
      if (d.conta_phone) {
        const norm = normalizePhone(d.conta_phone);
        if (norm) {
          existingByPhone.set(norm, {
            id: doc.id,
            tags: Array.isArray(d.tags) ? d.tags : [],
            name: d.conta_name || "",
          });
        }
      }
    });

    const tagsToApply = Array.from(
      new Set([
        ...(finalCommunity ? [finalCommunity] : []),
        ...extraTags.filter((t) => t.trim() !== ""),
      ])
    );

    let createdCount = 0;
    let updatedCount = 0;

    const chunkSize = 100;
    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize);
      const batch = adminDb.batch();

      for (const c of chunk) {
        const phone = normalizePhone(c.phone);
        if (!phone) continue;

        const existing = existingByPhone.get(phone);

        if (existing) {
          if (tagsToApply.length > 0) {
            const mergedTags = Array.from(new Set([...existing.tags, ...tagsToApply]));
            const docRef = adminDb.collection("contacts").doc(existing.id);
            batch.update(docRef, {
              tags: mergedTags,
              updatedAt: new Date().toISOString(),
            });
            updatedCount++;
          }
        } else {
          const docRef = adminDb.collection("contacts").doc();
          const newName = c.name && !c.name.startsWith("איש קשר (")
            ? c.name.trim()
            : `איש קשר ${phone}`;

          const newDoc = {
            ownerId,
            conta_name: newName,
            conta_phone: phone,
            tags: tagsToApply,
            lead_source: "וואטסאפ - אנשי קשר",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: `יובא מאנשי הקשר של וואטסאפ בתאריך ${new Date().toLocaleDateString("he-IL")}`,
            total_spent: 0,
            campaign_amount: 0,
            order_count: 0,
          };

          batch.set(docRef, newDoc);
          createdCount++;
        }
      }

      await batch.commit();
    }

    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/whatsapp");

    return {
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: contacts.length,
    };
  } catch (error: any) {
    console.error("===> [WhatsApp Import] Error importing direct contacts:", error);
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      totalProcessed: 0,
      error: error.message || "שגיאה בייבוא אנשי הקשר",
    };
  }
}
