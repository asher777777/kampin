"use server";

import { adminDb, getUserDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { Contact } from "./types";
import { revalidatePath } from "next/cache";

// Helper to normalize phone numbers globally
function normalizePhone(phone?: string) {
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

// Helper to get authenticated user ID
async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

// 1. Get filtered, sorted, paginated contacts
export async function getContacts(params: {
  status?: "active" | "trashed";
  search?: string;
  tag_filter?: string;
  city_filter?: string;
  lead_source_filter?: string;
  community_filter?: string;
  orderby?: string;
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}) {
  try {
    const ownerId = await getUserId();
    const status = params.status || "active";
    const search = params.search ? params.search.trim().toLowerCase() : "";
    const tagFilter = params.tag_filter || "";
    const cityFilter = params.city_filter || "";
    const leadSourceFilter = params.lead_source_filter || "";
    const orderby = params.orderby || "createdAt";
    const order = params.order || "desc";
    const page = params.page || 1;
    const perPage = params.per_page !== undefined ? params.per_page : 10;

    // Fetch all contacts for this owner and status from Firestore
    const contactsRef = adminDb.collection("contacts");
    const snapshot = await contactsRef
      .where("ownerId", "==", ownerId)
      .where("status", "==", status)
      .get();

    // Fetch all system users to match with contacts
    const usersRef = adminDb.collection("users");
    const usersSnap = await usersRef.get();
    const userEmails = new Map<string, string>();
    const userPhones = new Map<string, string>();
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.email) userEmails.set(data.email, doc.id);
      if (data.username) userPhones.set(data.username, doc.id);
    });

    let contacts: Contact[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const systemUserId = (data.email && userEmails.get(data.email)) || (data.conta_phone && userPhones.get(data.conta_phone));
      return {
        id: doc.id,
        isUser: !!systemUserId,
        systemUserId: systemUserId || undefined,
        ...data,
      } as Contact;
    });

    try {
      require("fs").appendFileSync("debug-crm.log", JSON.stringify({
        time: new Date().toISOString(),
        ownerId,
        status,
        snapshotSize: snapshot.size,
        contactsCount: contacts.length,
      }) + "\n");
    } catch (e) {}

    // In-memory filtering
    if (search) {
      contacts = contacts.filter((c) => {
        const matchesField = (val?: string) => val?.toLowerCase().includes(search);
        
        // Search core contact info
        if (matchesField(c.conta_name)) return true;
        if (matchesField(c.f_m)) return true;
        if (matchesField(c.conta_phone)) return true;
        if (matchesField(c.email)) return true;
        if (matchesField(c.mh_crm_city)) return true;
        if (matchesField(c.mh_crm_street)) return true;
        if (matchesField(c.tg1)) return true;
        if (matchesField(c.tg2)) return true;
        if (matchesField(c.tg3)) return true;
        if (matchesField(c.company_name)) return true;
        if (matchesField(c.job_title)) return true;
        if (matchesField(c.lead_source)) return true;
        if (matchesField(c.notes)) return true;

        // Search events
        if (c.events && c.events.some((e) => matchesField(e.title) || matchesField(e.text))) {
          return true;
        }

        // Search form submissions
        if (c.form_submissions && c.form_submissions.some((fs) => matchesField(fs.name) || matchesField(fs.page))) {
          return true;
        }

        return false;
      });
    }

    if (tagFilter) {
      contacts = contacts.filter(
        (c) => c.tg1 === tagFilter || c.tg2 === tagFilter || c.tg3 === tagFilter
      );
    }

    if (cityFilter) {
      contacts = contacts.filter((c) => c.mh_crm_city === cityFilter);
    }

    if (leadSourceFilter) {
      contacts = contacts.filter((c) => c.lead_source === leadSourceFilter);
    }

    if (params.community_filter) {
      if (params.community_filter === "general") {
        // Find contacts with no communities
        contacts = contacts.filter((c) => !c.communityIds || c.communityIds.length === 0);
      } else {
        contacts = contacts.filter((c) => c.communityIds?.includes(params.community_filter!));
      }
    }

    // In-memory sorting
    contacts.sort((a: any, b: any) => {
      let valA = a[orderby];
      let valB = b[orderby];

      // Handle missing values
      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      // Case insensitive string comparison
      if (typeof valA === "string" && typeof valB === "string") {
        return order === "asc"
          ? valA.localeCompare(valB, "he")
          : valB.localeCompare(valA, "he");
      }

      // Numeric comparison
      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }

      // Default string fallback
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const totalContacts = contacts.length;
    
    // Pagination
    let paginatedContacts = contacts;
    if (perPage > 0) {
      const offset = (page - 1) * perPage;
      paginatedContacts = contacts.slice(offset, offset + perPage);
    }

    return {
      contacts: JSON.parse(JSON.stringify(paginatedContacts)),
      total: totalContacts,
      totalPages: perPage > 0 ? Math.ceil(totalContacts / perPage) : 1,
    };
  } catch (error: any) {
    console.error("Error in getContacts server action:", error);
    return {
      contacts: [],
      total: 0,
      totalPages: 1,
      error: error.message || String(error)
    };
  }
}

// 2. Get a single contact
export async function getContactById(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("contacts").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }

    const data = docSnap.data();
    if (data?.ownerId !== ownerId) {
      throw new Error("אין הרשאה לצפות באיש קשר זה");
    }

    const contact = {
      id: docSnap.id,
      ...data,
    };
    return JSON.parse(JSON.stringify(contact)) as Contact;
  } catch (error) {
    console.error("Error in getContactById:", error);
    throw error;
  }
}

// 3. Create contact
export async function createContact(contactData: Partial<Contact>) {
  try {
    const ownerId = await getUserId();
    
    if (!contactData.conta_name || !contactData.conta_phone) {
      throw new Error("שם וטלפון הם שדות חובה");
    }

    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(ownerId, "contacts");
    if (!limitCheck.allowed) {
      throw new Error("LIMIT_REACHED:" + ('message' in limitCheck ? limitCheck.message : ""));
    }

    const newContact: Omit<Contact, "id"> = {
      ownerId,
      status: contactData.status || "active",
      conta_name: contactData.conta_name,
      f_m: contactData.f_m || "",
      conta_phone: normalizePhone(contactData.conta_phone),
      email: contactData.email || "",
      gender: contactData.gender || "",
      mh_crm_city: contactData.mh_crm_city || "",
      mh_crm_street: contactData.mh_crm_street || "",
      tg1: contactData.tg1 || "",
      tg2: contactData.tg2 || "",
      tg3: contactData.tg3 || "",
      company_name: contactData.company_name || "",
      job_title: contactData.job_title || "",
      lead_source: contactData.lead_source || "",
      work_phone: contactData.work_phone || "",
      website: contactData.website || "",
      birth_date: contactData.birth_date || "",
      notes: contactData.notes || "",
      events: contactData.events || [],
      form_submissions: contactData.form_submissions || [],
      last_form_name: contactData.last_form_name || "",
      last_form_page: contactData.last_form_page || "",
      last_form_submission_date: contactData.last_form_submission_date || "",
      last_message_read_status: contactData.last_message_read_status || "unknown",
      total_spent: contactData.total_spent || 0,
      order_count: contactData.order_count || 0,
      last_order_date: contactData.last_order_date || "",
      payment_details: contactData.payment_details || {},
      communityIds: contactData.communityIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    // Append any dynamic custom fields
    Object.keys(contactData).forEach((key) => {
      if (key.startsWith("custom_") && contactData[key as keyof Contact] !== undefined) {
        newContact[key] = contactData[key as keyof Contact];
      }
    });

    // Remove general community if other communities are selected
    if (newContact.communityIds && newContact.communityIds.length > 0) {
      const generalCommQuery = await adminDb.collection("communities").where("ownerId", "==", ownerId).where("name", "==", "קהילה כללית").limit(1).get();
      if (!generalCommQuery.empty) {
        const genId = generalCommQuery.docs[0].id;
        if (newContact.communityIds.includes(genId) && newContact.communityIds.some((id: string) => id !== genId)) {
          newContact.communityIds = newContact.communityIds.filter((id: string) => id !== genId);
        }
      }
    }

    const docRef = await adminDb.collection("contacts").add(newContact);
    revalidatePath("/dashboard/crm");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error in createContact:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 4. Update contact
export async function updateContact(id: string, contactData: Partial<Contact>) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("contacts").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }

    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה לערוך איש קשר זה");
    }

    const updatedFields: Partial<Contact> = {
      ...contactData,
      updatedAt: new Date().toISOString(),
    };
    
    if (updatedFields.conta_phone !== undefined) {
      updatedFields.conta_phone = normalizePhone(updatedFields.conta_phone);
    }

    // Safety check: Never overwrite ownerId
    delete updatedFields.ownerId;
    delete updatedFields.id;

    // Remove general community if other communities are selected
    if (updatedFields.communityIds && updatedFields.communityIds.length > 0) {
      const generalCommQuery = await adminDb.collection("communities").where("ownerId", "==", ownerId).where("name", "==", "קהילה כללית").limit(1).get();
      if (!generalCommQuery.empty) {
        const genId = generalCommQuery.docs[0].id;
        if (updatedFields.communityIds.includes(genId) && updatedFields.communityIds.some((id: string) => id !== genId)) {
          updatedFields.communityIds = updatedFields.communityIds.filter((id: string) => id !== genId);
        }
      }
    }

    await docRef.update(updatedFields);
    revalidatePath("/dashboard/crm");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateContact:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 5. Delete contact
export async function deleteContact(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("contacts").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }

    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה למחוק איש קשר זה");
    }

    await docRef.delete();
    revalidatePath("/dashboard/crm");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteContact:", error);
    throw error;
  }
}

// 6. Bulk Action
export async function handleBulkAction(ids: string[], action: "trash" | "restore" | "delete_permanent" | "assign_community", options?: { communityId?: string }) {
  try {
    const ownerId = await getUserId();
    const contactsRef = adminDb.collection("contacts");
    
    // Process in batches
    const batch = adminDb.batch();
    
    for (const id of ids) {
      const docRef = contactsRef.doc(id);
      const docSnap = await docRef.get();
      
      if (docSnap.exists && docSnap.data()?.ownerId === ownerId) {
        if (action === "trash") {
          batch.update(docRef, { status: "trashed", updatedAt: new Date().toISOString() });
        } else if (action === "restore") {
          batch.update(docRef, { status: "active", updatedAt: new Date().toISOString() });
        } else if (action === "delete_permanent") {
          batch.delete(docRef);
        } else if (action === "assign_community" && options?.communityId) {
          let currentCommunities = docSnap.data()?.communityIds || [];
          if (!currentCommunities.includes(options.communityId)) {
            currentCommunities = [...currentCommunities, options.communityId];
            
            // Remove general community if we are assigning a specific community
            const generalCommQuery = await adminDb.collection("communities").where("ownerId", "==", ownerId).where("name", "==", "קהילה כללית").limit(1).get();
            if (!generalCommQuery.empty) {
              const genId = generalCommQuery.docs[0].id;
              if (currentCommunities.includes(genId) && currentCommunities.some((id: string) => id !== genId)) {
                currentCommunities = currentCommunities.filter((id: string) => id !== genId);
              }
            }

            batch.update(docRef, { 
              communityIds: currentCommunities,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }
    
    await batch.commit();
    revalidatePath("/dashboard/crm");
    return { success: true, processed: ids.length };
  } catch (error) {
    console.error("Error in handleBulkAction:", error);
    throw error;
  }
}

// 7. Get stats (active and trashed counters)
export async function getCRMStats() {
  try {
    const ownerId = await getUserId();
    const contactsRef = adminDb.collection("contacts");

    const [activeSnap, trashedSnap] = await Promise.all([
      contactsRef.where("ownerId", "==", ownerId).where("status", "==", "active").get(),
      contactsRef.where("ownerId", "==", ownerId).where("status", "==", "trashed").get(),
    ]);

    return {
      active: activeSnap.size,
      trashed: trashedSnap.size,
    };
  } catch (error) {
    console.error("Error in getCRMStats:", error);
    return { active: 0, trashed: 0 };
  }
}

// 8. Get unique filter options for selector dropdowns
export async function getCRMFilters() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const tags = new Set<string>();
    const cities = new Set<string>();
    const sources = new Set<string>();

    snapshot.docs.forEach((doc: any) => {
      const c = doc.data() as Contact;
      if (c.tg1) tags.add(c.tg1);
      if (c.tg2) tags.add(c.tg2);
      if (c.tg3) tags.add(c.tg3);
      if (c.mh_crm_city) cities.add(c.mh_crm_city);
      if (c.lead_source) sources.add(c.lead_source);
    });

    return {
      tags: Array.from(tags).sort(),
      cities: Array.from(cities).sort(),
      lead_sources: Array.from(sources).sort(),
    };
  } catch (error) {
    console.error("Error in getCRMFilters:", error);
    return { tags: [], cities: [], lead_sources: [] };
  }
}

// 9. Import Contacts from Excel/CSV (Bulk Create/Upsert)
export async function importContacts(importedContacts: Partial<Contact>[]) {
  try {
    const ownerId = await getUserId();
    const contactsRef = adminDb.collection("contacts");
    
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const { checkFeatureLimit } = await import("@/features/users/actions");
    const limitCheck = await checkFeatureLimit(ownerId, "contacts");

    for (const cData of importedContacts) {
      if (!cData.conta_name) {
        skipped++;
        continue;
      }
      
      if (cData.conta_phone !== undefined) {
        cData.conta_phone = normalizePhone(cData.conta_phone);
      }

      let existingDocId = "";

      // 1. Try finding by ID if provided
      if (cData.id) {
        const idSnap = await contactsRef.doc(cData.id).get();
        if (idSnap.exists && idSnap.data()?.ownerId === ownerId) {
          existingDocId = cData.id;
        }
      }

      // 2. Try finding by phone number if ID not found/provided
      if (!existingDocId && cData.conta_phone) {
        const phoneSnap = await contactsRef
          .where("ownerId", "==", ownerId)
          .where("conta_phone", "==", cData.conta_phone)
          .limit(1)
          .get();
        if (!phoneSnap.empty) {
          existingDocId = phoneSnap.docs[0].id;
        }
      }

      if (!existingDocId && !limitCheck.allowed) {
        // Can't create new if limit reached
        skipped++;
        continue;
      }

      const dbData: Omit<Contact, "id"> = {
        ownerId,
        status: cData.status || "active",
        conta_name: cData.conta_name,
        f_m: cData.f_m || "",
        conta_phone: cData.conta_phone || "",
        email: cData.email || "",
        gender: cData.gender || "",
        mh_crm_city: cData.mh_crm_city || "",
        mh_crm_street: cData.mh_crm_street || "",
        tg1: cData.tg1 || "",
        tg2: cData.tg2 || "",
        tg3: cData.tg3 || "",
        company_name: cData.company_name || "",
        job_title: cData.job_title || "",
        lead_source: cData.lead_source || "",
        work_phone: cData.work_phone || "",
        website: cData.website || "",
        birth_date: cData.birth_date || "",
        notes: cData.notes || "",
        events: cData.events || [],
        form_submissions: cData.form_submissions || [],
        last_form_name: cData.last_form_name || "",
        last_form_page: cData.last_form_page || "",
        last_form_submission_date: cData.last_form_submission_date || "",
        last_message_read_status: cData.last_message_read_status || "unknown",
        total_spent: cData.total_spent || 0,
        order_count: cData.order_count || 0,
        last_order_date: cData.last_order_date || "",
        createdAt: cData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingDocId) {
        // Exclude immutable parameters
        delete dbData.createdAt;
        await contactsRef.doc(existingDocId).update(dbData);
        updated++;
      } else {
        await contactsRef.add(dbData);
        created++;
      }
    }

    revalidatePath("/dashboard/crm");
    return { success: true, created, updated, skipped };
  } catch (error) {
    console.error("Error in importContacts:", error);
    throw error;
  }
}

// 10. Submit custom CRM-synced Form
export async function submitCRMForm(params: {
  formId: string;
  formTitle: string;
  formType: "standard" | "payment" | "register";
  formData: Record<string, string>;
  embeddingPostId?: string;
  embeddingPostTitle?: string;
  embeddingCollection?: string;
  formConfig: any;
  status?: string;
  amountPaid?: number;
  transactionId?: string;
}) {
  let ownerId = "";
  try {
    ownerId = await getUserId();
  } catch (e) {
    // Anonymous user (not logged in)
  }

  try {
    const { formData, formConfig, formTitle, embeddingPostTitle, status, amountPaid, formType } = params;

    const contactData: Record<string, any> = {};

    formConfig.fields.forEach((field: any) => {
      const value = formData[field.label];
      if (value !== undefined) {
        if (field.map_to) {
          contactData[field.map_to] = value;
        }
        if (field.map_to_2) {
          contactData[field.map_to_2] = value;
        }
      }
    });

    if (amountPaid && formConfig.payment_amount_crm_map) {
      contactData[formConfig.payment_amount_crm_map] = amountPaid;
    }

    if (formConfig.communityId) {
      contactData.communityIds = [formConfig.communityId];
    }

    const rawPhone = contactData.conta_phone;
    const phone = normalizePhone(rawPhone);
    if (phone) {
      contactData.conta_phone = phone;
    }

    // --- REGISTRATION LOGIC ---
    if (formType === "register") {
      const emailOrPhone = contactData.email || phone;
      if (!emailOrPhone) {
        throw new Error("חובה למפות שדה טלפון או דוא״ל עבור טופס הרשמה.");
      }

      const usersRef = adminDb.collection("users");
      const existingUser = await usersRef.where("username", "==", emailOrPhone.toLowerCase()).get();
      if (existingUser.empty) {
        const role = formConfig.register_role || "TRIAL";
        const newUser: any = {
          username: emailOrPhone.toLowerCase(),
          email: contactData.email || "",
          name: contactData.conta_name || "",
          password: phone || emailOrPhone.toLowerCase(), // phone as password, fallback to identifier
          role: role,
          createdAt: new Date().toISOString()
        };

        if (role === "TRIAL") {
          const expires = new Date();
          expires.setDate(expires.getDate() + 14);
          newUser.trialExpiresAt = expires.toISOString();
        }

        await usersRef.add(newUser);
      }
    }
    // -------------------------

    const finalOwnerId = formConfig.crm_owner_id || ownerId || "1";
    const contactsRef = adminDb.collection("contacts");
    
    let querySnapshot: any = { empty: true };
    if (phone) {
      querySnapshot = await contactsRef
        .where("ownerId", "==", finalOwnerId)
        .where("conta_phone", "==", phone)
        .limit(1)
        .get();
    } else if (contactData.email) {
      querySnapshot = await contactsRef
        .where("ownerId", "==", finalOwnerId)
        .where("email", "==", contactData.email)
        .limit(1)
        .get();
    }

    let contactId = "";
    let existingData: any = null;

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      contactId = doc.id;
      existingData = doc.data();
    }

    const finalStatus = status || (formConfig.form_type === "payment" ? "ממתין לתשלום" : "פנייה חדשה");
    
    const dbData: any = {
      ownerId: finalOwnerId,
      status: "active",
      conta_name: contactData.conta_name || existingData?.conta_name || "",
      f_m: contactData.f_m || existingData?.f_m || "",
      email: contactData.email || existingData?.email || "",
      conta_phone: phone,
      tg1: finalStatus,
      updatedAt: new Date().toISOString(),
    };

    // Fetch custom fields to check for repeaters
    let customFieldsMap = new Map();
    try {
      const docRef = adminDb.collection("crm_settings").doc(`custom_fields_${finalOwnerId}`);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const fields = docSnap.data()?.fields || [];
        fields.forEach((f: any) => customFieldsMap.set(f.id, f));
      }
    } catch (err) {}

    // Process mapped fields, including custom dynamic fields
    const repeaterAppends: Record<string, any> = {};

    Object.keys(contactData).forEach((key) => {
      if (
        contactData[key] !== undefined && 
        key !== "conta_name" && 
        key !== "f_m" && 
        key !== "email" && 
        key !== "conta_phone"
      ) {
        // Check if it's a mapping to a repeater sub-field (format: repeaterId.subFieldId)
        if (key.includes('.')) {
          const [repeaterId, subFieldId] = key.split('.');
          if (customFieldsMap.has(repeaterId) && customFieldsMap.get(repeaterId).type === 'repeater') {
            if (!repeaterAppends[repeaterId]) repeaterAppends[repeaterId] = {};
            repeaterAppends[repeaterId][subFieldId] = contactData[key];
            return;
          }
        }
        
        // Check if it's mapped directly to a repeater field (as a whole string)
        if (customFieldsMap.has(key) && customFieldsMap.get(key).type === 'repeater') {
          if (!repeaterAppends[key]) repeaterAppends[key] = {};
          // Fallback to storing in a default 'value' sub-field or first sub-field
          const firstSubField = customFieldsMap.get(key).subFields?.[0]?.id || 'value';
          repeaterAppends[key][firstSubField] = contactData[key];
          return;
        }

        dbData[key] = contactData[key];
      }
    });

    // Append repeater objects to existing arrays
    Object.keys(repeaterAppends).forEach((repeaterId) => {
      const existingArray = existingData?.[repeaterId] || [];
      dbData[repeaterId] = [...existingArray, repeaterAppends[repeaterId]];
    });

    if (amountPaid) {
      const numericAmount = Number(amountPaid);
      if (!isNaN(numericAmount) && numericAmount > 0) {
        dbData.total_spent = (existingData?.total_spent || 0) + numericAmount;
        dbData.order_count = (existingData?.order_count || 0) + 1;
        dbData.last_order_date = new Date().toISOString();
        
        const paymentRecord = {
          id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date().toISOString(),
          amount: numericAmount,
          paymentType: "credit_card",
          receiptType: "320",
          kesherStatus: "Success",
          receiptLink: params.transactionId || ""
        };

        dbData.payments = [...(existingData?.payments || []), paymentRecord];
      }
    }

    if (embeddingPostTitle) {
      dbData.lead_source = embeddingPostTitle;
    }
    dbData.last_form_name = formTitle;
    dbData.last_form_page = params.embeddingPostId || "";
    dbData.last_form_submission_date = new Date().toISOString();

    const newEvent = {
      time: new Date().toISOString(),
      title: `טופס: ${formTitle}`,
      text: `${amountPaid ? `סכום: ${amountPaid} ש"ח. ` : ""}${params.transactionId ? `מספר עסקה (קשר): ${params.transactionId}. ` : ""}סטטוס: ${finalStatus}. ערכי שדות: ${JSON.stringify(formData)}`
    };

    if (contactId) {
      const updatedEvents = [...(existingData?.events || []), newEvent];
      
      // Save previous version history
      const prevHistory = existingData?.history || [];
      // Clean up the history from the data to avoid exponential growth
      const previousDataWithoutHistory = { ...existingData };
      delete previousDataWithoutHistory.history;
      
      const newHistoryEntry = {
        updatedAt: new Date().toISOString(),
        updatedBy: `Form: ${formTitle}`,
        previousData: previousDataWithoutHistory
      };

      await contactsRef.doc(contactId).update({
        ...dbData,
        events: updatedEvents,
        history: [...prevHistory, newHistoryEntry]
      });
    } else {
      await contactsRef.add({
        ...dbData,
        createdAt: new Date().toISOString(),
        events: [newEvent]
      });
    }

    let whatsappSent = false;
    let finalWhatsAppMessage = "";

    const whatsappTemplate = formConfig.form_type === "payment" 
      ? (amountPaid ? formConfig.payment_success_message : formConfig.payment_pending_message)
      : formConfig.standard_whatsapp_message;

    const whatsappImageUrl = formConfig.form_type === "payment"
      ? (amountPaid ? formConfig.payment_success_image_url : formConfig.payment_pending_image_url)
      : formConfig.standard_whatsapp_image_url;

    if (whatsappTemplate) {
      let resolvedMsg = whatsappTemplate;
      Object.keys(formData).forEach((key) => {
        resolvedMsg = resolvedMsg.replace(new RegExp(`{${key}}`, "g"), formData[key]);
      });
      resolvedMsg = resolvedMsg.replace(/{סכום}/g, String(amountPaid || formConfig.payment_amount || 0));
      resolvedMsg = resolvedMsg.replace(/{עמוד}/g, embeddingPostTitle || "");
      resolvedMsg = resolvedMsg.replace(/{link_kabala}/g, "https://hakel.club/receipt/mock");

      finalWhatsAppMessage = resolvedMsg;
      whatsappSent = true;

      const updatedSnapshot = await contactsRef
        .where("ownerId", "==", finalOwnerId)
        .where("conta_phone", "==", phone)
        .limit(1)
        .get();

      if (!updatedSnapshot.empty) {
        const contactDoc = updatedSnapshot.docs[0];
        const contactDataCurrent = contactDoc.data();
        const whatsappEvent = {
          time: new Date().toISOString(),
          title: "מערכת WhatsApp אוטומטית",
          text: `נשלחה הודעה לנייד ${phone}: "${finalWhatsAppMessage}" ${whatsappImageUrl ? `(תמונה: ${whatsappImageUrl})` : ""}`
        };
        await contactsRef.doc(contactDoc.id).update({
          events: [...(contactDataCurrent.events || []), whatsappEvent]
        });
      }
    }

    // Increment analytics on the service/landing page if it exists
    if (params.embeddingPostId && params.embeddingPostId !== "home-contact" && params.embeddingPostId !== "home-landing" && params.embeddingPostId !== "home-landing-modal") {
      try {
        const collection = params.embeddingCollection || "services";
        const serviceRef = adminDb.collection(collection).doc(params.embeddingPostId);
        const incrementField = amountPaid ? "purchases" : "leads";
        await serviceRef.set({
          [incrementField]: FieldValue.increment(1)
        }, { merge: true });
      } catch (err) {
        console.error("Failed to increment analytics on doc:", err);
      }
    }

    // TRIGGER AUTOMATIONS (form_submission)
    try {
      const automationsRef = adminDb.collection("automations");
      const autoSnap = await automationsRef
        .where("ownerId", "==", finalOwnerId)
        .where("isActive", "==", true)
        .get();
        
      const formPayload = {
        ...formData,
        ...contactData,
        formTitle,
        formId: params.formId,
        amountPaid
      };

      for (const doc of autoSnap.docs) {
        const auto = doc.data();
        if (auto.trigger && auto.trigger.type === "form_submission" && auto.trigger.formId === params.formId) {
          // Dynamic import to prevent circular dependencies
          const { runAutomation } = await import("@/lib/automations/engine");
          void runAutomation(doc.id, formPayload);
        }
      }
    } catch (err) {
      console.error("Error triggering form_submission automation:", err);
    }

    revalidatePath("/dashboard/crm");
    return {
      success: true,
      whatsappSent,
      whatsappMessage: finalWhatsAppMessage,
      whatsappImageUrl
    };
  } catch (error: any) {
    console.error("CRM Form Submission Error:", error);
    return { success: false, error: error.message };
  }
}

// 11. Send Email and Log to Timeline
export async function sendEmailAction(contactId: string, email: string, subject: string, body: string) {
  try {
    const ownerId = await getUserId();
    const docRef = getUserDb(ownerId).collection("contacts").doc(contactId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }
    
    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה לערוך איש קשר זה");
    }
    
    const contactData = docSnap.data();
    const currentEvents = contactData?.events || [];
    
    const newEvent = {
      time: new Date().toISOString(),
      title: "מייל יוצא מהמערכת",
      text: `אל: ${email}\nנושא: ${subject}\nתוכן:\n${body}`,
    };
    
    await docRef.update({
      events: [newEvent, ...currentEvents],
      updatedAt: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendEmailAction:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 12. Add Contact Reminder Event
export async function addContactReminder(contactId: string, title: string, text: string, time: string) {
  try {
    const ownerId = await getUserId();
    const docRef = getUserDb(ownerId).collection("contacts").doc(contactId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error("איש הקשר לא נמצא");
    }
    
    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה לערוך איש קשר זה");
    }
    
    const contactData = docSnap.data();
    const currentEvents = contactData?.events || [];
    
    const newEvent = {
      time: time || new Date().toISOString(),
      title: title || "תזכורת",
      text: text || "",
    };
    
    await docRef.update({
      events: [newEvent, ...currentEvents],
      updatedAt: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in addContactReminder:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 13. Send WhatsApp and Log to Timeline
export async function sendWhatsAppAction(contactId: string, phone: string, message: string) {
  try {
    // Send message using Green API
    const { sendWhatsAppMessage } = await import("../whatsapp/actions");
    await sendWhatsAppMessage(phone, message);
    
    // Save to contact timeline
    const ownerId = await getUserId();
    const docRef = getUserDb(ownerId).collection("contacts").doc(contactId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists && docSnap.data()?.ownerId === ownerId) {
      const contactData = docSnap.data();
      const currentEvents = contactData?.events || [];
      const newEvent = {
        time: new Date().toISOString(),
        title: "הודעה יוצאת מוואטסאפ",
        text: message,
      };
      await docRef.update({
        events: [newEvent, ...currentEvents],
        updatedAt: new Date().toISOString(),
      });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendWhatsAppAction:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 14. Get custom CRM fields
export async function getCustomFields() {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("crm_settings").doc(`custom_fields_${ownerId}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return [];
    }
    const data = docSnap.data();
    return (data?.fields || []) as Array<{
      id: string;
      category: string;
      type: string;
      label: string;
    }>;
  } catch (error) {
    console.error("Error in getCustomFields:", error);
    return [];
  }
}

// 15. Add custom CRM field
export async function addCustomField(field: Omit<{id: string; category: string; type: string; label: string; subFields?: any}, "id">) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("crm_settings").doc(`custom_fields_${ownerId}`);
    const docSnap = await docRef.get();
    
    const newField = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...field,
    };

    if (!docSnap.exists) {
      await docRef.set({ fields: [newField] });
    } else {
      const data = docSnap.data();
      const fields = data?.fields || [];
      await docRef.update({ fields: [...fields, newField] });
    }
    
    return { success: true, field: newField };
  } catch (error: any) {
    console.error("Error in addCustomField:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 15.5 Update custom CRM field
export async function updateCustomField(fieldId: string, updates: Partial<{ category: string; type: string; label: string; subFields: any[] }>) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("crm_settings").doc(`custom_fields_${ownerId}`);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error("No custom fields found");
    }
    
    const data = docSnap.data();
    const fields = data?.fields || [];
    const index = fields.findIndex((f: any) => f.id === fieldId);
    
    if (index === -1) {
      throw new Error("Field not found");
    }
    
    fields[index] = { ...fields[index], ...updates };
    await docRef.update({ fields });
    
    return { success: true, field: fields[index] };
  } catch (error: any) {
    console.error("Error in updateCustomField:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 15.6 Get system field labels (Admin override)
export async function getSystemFieldLabels() {
  try {
    const docRef = adminDb.collection("global_settings").doc("crm_labels");
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return {};
    }
    const data = docSnap.data();
    return (data?.labels || {}) as Record<string, string>;
  } catch (error) {
    console.error("Error in getSystemFieldLabels:", error);
    return {};
  }
}

// 15.7 Save system field labels (Admin override)
export async function saveSystemFieldLabels(labels: Record<string, string>) {
  try {
    const isAdmin = await checkIsSuperAdmin();
    if (!isAdmin) throw new Error("Unauthorized: Only Super Admin can update system labels");

    const docRef = adminDb.collection("global_settings").doc("crm_labels");
    await docRef.set({ labels }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveSystemFieldLabels:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// 16. Get custom CRM tabs
export async function getCustomTabs() {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("crm_settings").doc(`custom_tabs_${ownerId}`);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return [];
    }
    const data = docSnap.data();
    return (data?.tabs || []) as import("./types").CustomTab[];
  } catch (error) {
    console.error("Error in getCustomTabs:", error);
    return [];
  }
}

// 17. Add custom CRM tab
export async function addCustomTab(tab: Omit<import("./types").CustomTab, "id">) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("crm_settings").doc(`custom_tabs_${ownerId}`);
    const docSnap = await docRef.get();
    
    const newTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...tab,
    };

    if (!docSnap.exists) {
      await docRef.set({ tabs: [newTab] });
    } else {
      const data = docSnap.data();
      const tabs = data?.tabs || [];
      await docRef.update({ tabs: [...tabs, newTab] });
    }
    
    return { success: true, tab: newTab };
  } catch (error: any) {
    console.error("Error in addCustomTab:", error);
    return { success: false, error: error.message || String(error) };
  }
}

// --- API Connection Request ---
export async function requestServiceConnection(serviceName: string) {
  try {
    const userId = await getUserId();
    const { adminDb } = await import("@/lib/firebase-admin");
    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) throw new Error("User not found");
    const userData = userSnap.data();
    
    const phoneOrEmail = userData?.username || userData?.email;
    if (!phoneOrEmail) throw new Error("Could not find user identifier");

    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", "1")
      .where("conta_phone", "==", phoneOrEmail)
      .limit(1)
      .get();

    if (!contactsSnap.empty) {
      const contactDoc = contactsSnap.docs[0];
      const data = contactDoc.data();
      const events = data.events || [];
      events.push({
        time: new Date().toISOString(),
        title: `בקשה לחיבור שירות: ${serviceName}`,
        text: `המשתמש ביקש לחבר את מפתחות ה-API עבור השירות: ${serviceName}. אנא עדכן את פרטיו בכרטיס איש הקשר.`
      });
      await contactDoc.ref.update({ events });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- Super Admin User Management via CRM ---
export async function checkIsSuperAdmin() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.email) return false;

  let role = session?.user?.role?.toUpperCase() || "";

  if (!role) {
    // If role is missing from session (e.g. Google login), fetch from Firestore
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      let userSnap;
      if (session.user.id) {
        userSnap = await adminDb.collection("users").doc(session.user.id).get();
      } else {
        const query = await adminDb.collection("users").where("email", "==", session.user.email).limit(1).get();
        userSnap = query.empty ? null : query.docs[0];
      }
      
      if (userSnap && userSnap.exists) {
        role = userSnap.data()?.role?.toUpperCase() || "";
      }
    } catch (err) {
      console.error("Failed to fetch user role from db:", err);
    }
  }

  // Also check hardcoded admin fallback
  if (session.user.email === "admin@habad.local" || session.user.email === process.env.ADMIN_USERNAME) {
    role = "SUPERADMIN";
  }

  return role === "ADMIN" || role === "SUPERADMIN";
}

export async function getContactUserSettings(email: string, phone: string) {
  try {
    const isAdmin = await checkIsSuperAdmin();
    if (!isAdmin) throw new Error("Unauthorized");
    
    const { adminDb } = await import("@/lib/firebase-admin");
    let userSnap: any;
    
    if (phone) {
      userSnap = await adminDb.collection("users").where("username", "==", phone.toLowerCase()).limit(1).get();
    }
    if ((!userSnap || userSnap.empty) && email) {
      userSnap = await adminDb.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    }
    
    if (!userSnap || userSnap.empty) return { found: false };
    
    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    const aiSnap = await adminDb.collection("users").doc(userId).collection("settings").doc("ai").get();
    const kesherSnap = await adminDb.collection("users").doc(userId).collection("settings").doc("kesher").get();
    const whatsappSnap = await adminDb.collection("users").doc(userId).collection("settings").doc("whatsapp").get();
    
    return {
      found: true,
      userId,
      userData: {
        createdAt: userData.createdAt,
        role: userData.role,
        trialExpiresAt: userData.trialExpiresAt,
        username: userData.username || "",
        password: userData.password || "",
      },
      settings: {
        ai: aiSnap.exists ? aiSnap.data() : { googleAiKey: "" },
        kesher: kesherSnap.exists ? kesherSnap.data() : { paymentPageId: "", apiKey: "", userName: "", ezCountToken: "" },
        whatsapp: whatsappSnap.exists ? whatsappSnap.data() : { idInstance: "", apiToken: "" },
      }
    };
  } catch (err: any) {
    return { found: false, error: err.message };
  }
}

export async function saveContactUserSettings(userId: string, newSettings: any, newUserData?: any) {
  try {
    const isAdmin = await checkIsSuperAdmin();
    if (!isAdmin) throw new Error("Unauthorized");
    
    const { adminDb } = await import("@/lib/firebase-admin");
    const userRef = adminDb.collection("users").doc(userId);
    
    if (newUserData) {
      const updateData: any = {};
      if (newUserData.username !== undefined) updateData.username = newUserData.username;
      if (newUserData.password !== undefined) updateData.password = newUserData.password;
      if (Object.keys(updateData).length > 0) {
        await userRef.set(updateData, { merge: true });
      }
    }

    if (newSettings.ai) await userRef.collection("settings").doc("ai").set(newSettings.ai, { merge: true });
    if (newSettings.kesher) await userRef.collection("settings").doc("kesher").set(newSettings.kesher, { merge: true });
    if (newSettings.whatsapp) await userRef.collection("settings").doc("whatsapp").set(newSettings.whatsapp, { merge: true });
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------
// Calendar Events (Analytics Ready)
// ---------------------------------------------------------

export async function getCalendarEvents(contactId?: string) {
  try {
    const userId = await getUserId();
    const allEvents: any[] = [];

    // 1. Fetch Calendar Events (Tasks / Reminders)
    let calQuery: FirebaseFirestore.Query = adminDb.collection("calendar_events").where("userId", "==", userId);
    if (contactId) {
      calQuery = calQuery.where("contactId", "==", contactId);
    }
    const calSnap = await calQuery.get();
    calSnap.docs.forEach(doc => {
      const data = doc.data();
      allEvents.push({
        id: doc.id,
        ...data,
        type: data.type || "task"
      });
    });

    // 2. Fetch Contact Interactions (Forms, WhatsApp)
    let contactsQuery: FirebaseFirestore.Query = adminDb.collection("contacts").where("ownerId", "==", userId);
    if (contactId) {
      // Not optimally querying by single ID if using ownerId, but it's fine for small scope or we just get doc.
      // Actually if contactId is provided, we only need that contact.
      const contactDoc = await adminDb.collection("contacts").doc(contactId).get();
      if (contactDoc.exists && contactDoc.data()?.ownerId === userId) {
        const cData = contactDoc.data();
        if (cData?.events && Array.isArray(cData.events)) {
          cData.events.forEach((ev: any, idx: number) => {
            allEvents.push({
              id: `contact_event_${contactId}_${idx}`,
              contactId,
              contactName: cData.conta_name || "",
              title: ev.title || "אינטראקציה",
              description: ev.text || "",
              start: ev.time || new Date().toISOString(),
              end: ev.time || new Date().toISOString(),
              type: ev.title?.includes("WhatsApp") ? "whatsapp" : (ev.title?.includes("טופס") ? "registration" : "system"),
              status: "בוצע"
            });
          });
        }
      }
    } else {
      const contactsSnap = await contactsQuery.get();
      contactsSnap.docs.forEach(doc => {
        const cData = doc.data();
        if (cData.events && Array.isArray(cData.events)) {
          cData.events.forEach((ev: any, idx: number) => {
            allEvents.push({
              id: `contact_event_${doc.id}_${idx}`,
              contactId: doc.id,
              contactName: cData.conta_name || "",
              title: ev.title || "אינטראקציה",
              description: ev.text || "",
              start: ev.time || new Date().toISOString(),
              end: ev.time || new Date().toISOString(),
              type: ev.title?.includes("WhatsApp") ? "whatsapp" : (ev.title?.includes("טופס") ? "registration" : "system"),
              status: "בוצע"
            });
          });
        }
      });
    }

    // 3. Fetch Analytics Events (Page Views)
    // We only fetch page views if contactId is NOT provided (since page views are general, not per contact mostly)
    if (!contactId) {
      const analyticsSnap = await adminDb.collection("analytics_events").where("ownerId", "==", userId).get();
      analyticsSnap.docs.forEach(doc => {
        const data = doc.data();
        allEvents.push({
          id: doc.id,
          title: `צפייה בעמוד: ${data.title}`,
          description: `סוג: ${data.collectionName}`,
          start: data.timestamp || new Date().toISOString(),
          end: data.timestamp || new Date().toISOString(),
          type: data.type || "landing_page_view",
          status: "בוצע"
        });
      });
    }

    // Sort all events by start time descending
    allEvents.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    return { success: true, events: JSON.parse(JSON.stringify(allEvents)) };
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    return { success: false, error: error.message };
  }
}

export async function createCalendarEvent(data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    // AI Suggestions Generation (Only for Superadmins)
    let suggestions: string[] = [];
    if (session.user.role === "SUPERADMIN" && data.title) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are a CRM assistant. Given this interaction: "${data.title}" and description: "${data.description || ''}", suggest 2 short follow-up actions in Hebrew. Return ONLY a valid JSON array of strings, e.g. ["צור קשר מחר", "שלח הצעת מחיר"].`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        const rawText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
        if (rawText) {
          suggestions = JSON.parse(rawText);
        }
      } catch (aiError) {
        console.error("AI Generation failed:", aiError);
      }
    }

    const eventData = {
      ...data,
      userId,
      metadata: {
        ...data.metadata,
        ...(suggestions.length > 0 ? { suggestions } : {})
      },
      createdAt: new Date().toISOString()
    };
    const ref = await adminDb.collection("calendar_events").add(eventData);
    
    return { success: true, event: { id: ref.id, ...eventData } };
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCalendarEvent(eventId: string, data: any) {
  try {
    const userId = await getUserId();
    const ref = adminDb.collection("calendar_events").doc(eventId);
    const doc = await ref.get();
    
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error("אירוע לא נמצא או שאין הרשאה");
    }
    
    await ref.update(data);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const userId = await getUserId();
    const ref = adminDb.collection("calendar_events").doc(eventId);
    const doc = await ref.get();
    
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error("אירוע לא נמצא או שאין הרשאה");
    }
    
    await ref.delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Log an AI interaction (tokens, summary, cost, image) to the user's CRM contact card
 */
export async function logAiInteraction(userId: string, inputTokens: number, outputTokens: number, summary: string, imageUrl?: string) {
  try {
    if (!userId) return { success: false, error: "Missing userId" };

    // Search for the CRM contact that corresponds to this system userId
    const contactsRef = adminDb.collection("contacts");
    const snapshot = await contactsRef.where("systemUserId", "==", userId).limit(1).get();
    
    if (snapshot.empty) {
      return { success: false, error: "Contact not found for this user" };
    }

    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

    // Calculate cost based on Gemini 3.6 Flash pricing
    // Input: $1.50 per 1M, Output: $7.50 per 1M
    const cost = (inputTokens / 1_000_000) * 1.50 + (outputTokens / 1_000_000) * 7.50;

    const newInteraction = {
      date: new Date().toISOString(),
      summary,
      inputTokens,
      outputTokens,
      cost,
      imageUrl: imageUrl || null
    };

    const currentInteractions = Array.isArray(data.ai_interactions) ? data.ai_interactions : [];
    
    await docRef.update({
      ai_total_input_tokens: FieldValue.increment(inputTokens),
      ai_total_output_tokens: FieldValue.increment(outputTokens),
      ai_total_cost: FieldValue.increment(cost),
      ai_interactions: [newInteraction, ...currentInteractions].slice(0, 50), // keep last 50
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error logging AI interaction:", error);
    return { success: false, error: error.message };
  }
}

