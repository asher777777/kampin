"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import type { 
  SmartGroup, 
  GroupRule, 
  GroupsDataResponse 
} from "./groupsUtils";
import { isContactInGroup } from "./groupsUtils";

export type { SmartGroup, GroupRule, GroupsDataResponse };

export async function getGroupsData(): Promise<GroupsDataResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    // Fetch contacts
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const contacts: any[] = [];
    const tagsMap = new Map<string, number>();
    const citiesSet = new Set<string>();

    snap.forEach((doc) => {
      const d = doc.data();
      if (d.status === "trashed") return;

      const tags: string[] = Array.isArray(d.tags)
        ? d.tags.filter((t: any) => typeof t === "string" && t.trim() !== "")
        : [];

      if (d.mh_crm_city && typeof d.mh_crm_city === "string" && d.mh_crm_city.trim()) {
        citiesSet.add(d.mh_crm_city.trim());
      }

      contacts.push({
        id: doc.id,
        ...d,
        tags,
      });

      tags.forEach((tag) => {
        const cleanTag = tag.trim();
        tagsMap.set(cleanTag, (tagsMap.get(cleanTag) || 0) + 1);
      });
    });

    // Fetch saved group definitions from 'crm_groups'
    const groupsSnap = await adminDb
      .collection("users")
      .doc(ownerId)
      .collection("crm_groups")
      .get();

    const savedGroups: Map<string, SmartGroup> = new Map();
    groupsSnap.forEach((gDoc) => {
      const gData = gDoc.data() as SmartGroup;
      savedGroups.set(gData.name, { ...gData, id: gDoc.id });
    });

    // Ensure all existing tags in contacts exist as groups
    tagsMap.forEach((count, tagName) => {
      if (!savedGroups.has(tagName)) {
        savedGroups.set(tagName, {
          id: tagName,
          name: tagName,
          color: "#4f46e5",
          type: "manual",
        });
      }
    });

    // Calculate dynamic member count for all groups
    const groups: SmartGroup[] = Array.from(savedGroups.values()).map((g) => {
      const count = contacts.filter((c) => isContactInGroup(c, g)).length;
      return {
        ...g,
        count,
      };
    });

    // Sort groups descending by count
    groups.sort((a, b) => (b.count || 0) - (a.count || 0));

    // Calculate untagged count (contacts with no tags and in 0 groups)
    const untaggedCount = contacts.filter((c) => {
      const inAnyGroup = groups.some((g) => isContactInGroup(c, g));
      return !inAnyGroup;
    }).length;

    return JSON.parse(
      JSON.stringify({
        success: true,
        groups,
        contacts,
        totalContacts: contacts.length,
        untaggedCount,
        availableCities: Array.from(citiesSet).sort(),
      })
    );
  } catch (error: any) {
    console.error("Error in getGroupsData:", error);
    return {
      success: false,
      error: error.message || "שגיאה בטעינת נתוני קבוצות",
      groups: [],
      contacts: [],
      totalContacts: 0,
      untaggedCount: 0,
      availableCities: [],
    };
  }
}

export async function saveSmartGroup(group: Partial<SmartGroup>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    if (!group.name || !group.name.trim()) throw new Error("שם הקבוצה הוא שדה חובה");
    const cleanName = group.name.trim();

    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const docId = group.id && !group.id.startsWith("new_") ? group.id : groupsRef.doc().id;

    const dataToSave: SmartGroup = {
      id: docId,
      name: cleanName,
      color: group.color || "#6366f1",
      description: group.description || "",
      type: group.type || "manual",
      rules: group.rules || [],
      matchType: group.matchType || "all",
      ownerId,
    };

    await groupsRef.doc(docId).set(dataToSave, { merge: true });

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    return { success: true, id: docId };
  } catch (error: any) {
    console.error("Error in saveSmartGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSmartGroup(groupNameOrId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    // Delete definition
    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const byId = await groupsRef.doc(groupNameOrId).get();
    let tagName = groupNameOrId;
    if (byId.exists) {
      tagName = byId.data()?.name || groupNameOrId;
      await groupsRef.doc(groupNameOrId).delete();
    } else {
      const byName = await groupsRef.where("name", "==", groupNameOrId).get();
      byName.forEach(async (d) => await d.ref.delete());
    }

    // Remove tag from contacts
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("tags", "array-contains", tagName)
      .get();

    const batch = adminDb.batch();
    snap.forEach((doc) => {
      const currentTags = doc.data().tags || [];
      batch.update(doc.ref, {
        tags: currentTags.filter((t: string) => t !== tagName),
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteSmartGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkAssignGroup(
  contactIds: string[],
  groupTag: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const cleanTag = groupTag.trim();
    if (!cleanTag) throw new Error("שם תווית לא תקין");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const currentTags: string[] = doc.data()?.tags || [];
        if (!currentTags.includes(cleanTag)) {
          batch.update(ref, {
            tags: [...currentTags, cleanTag],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true, count: cleanIds.length };
  } catch (error: any) {
    console.error("Error in bulkAssignGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkRemoveFromGroup(
  contactIds: string[],
  groupTag: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const cleanTag = groupTag.trim();
    if (!cleanTag) throw new Error("שם תווית לא תקין");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const currentTags: string[] = doc.data()?.tags || [];
        if (currentTags.includes(cleanTag)) {
          batch.update(ref, {
            tags: currentTags.filter((t) => t !== cleanTag),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true, count: cleanIds.length };
  } catch (error: any) {
    console.error("Error in bulkRemoveFromGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function moveContactsBetweenGroups(
  contactIds: string[],
  fromGroupTag: string,
  toGroupTag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const fromTag = fromGroupTag.trim();
    const toTag = toGroupTag.trim();
    if (!toTag) throw new Error("יש לבחור קבוצת יעד תקינה");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        let currentTags: string[] = doc.data()?.tags || [];
        if (fromTag) {
          currentTags = currentTags.filter((t) => t !== fromTag);
        }
        if (!currentTags.includes(toTag)) {
          currentTags.push(toTag);
        }
        batch.update(ref, {
          tags: currentTags,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true };
  } catch (error: any) {
    console.error("Error in moveContactsBetweenGroups:", error);
    return { success: false, error: error.message };
  }
}

export async function setContactTags(
  contactId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cleanTags = Array.from(
      new Set(tags.map((t) => t.trim()).filter((t) => t !== ""))
    );

    await adminDb.collection("contacts").doc(contactId).update({
      tags: cleanTags,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true };
  } catch (error: any) {
    console.error("Error in setContactTags:", error);
    return { success: false, error: error.message };
  }
}
