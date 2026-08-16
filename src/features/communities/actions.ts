"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { Community } from "./types";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getCommunities() {
  try {
    const ownerId = await getUserId();
    
    // Fetch from GlobalSettings instead of 'communities' collection
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    let communitiesData = docSnap.exists ? (docSnap.data()?.communities || []) : [];

    const communitiesWithCount = await Promise.all(
      communitiesData.map(async (comm: any) => {
        const countSnap = await adminDb
          .collection("contacts")
          .where("ownerId", "==", ownerId)
          .where("communityIds", "array-contains", comm.id)
          .count()
          .get();
        
        return {
          id: comm.id,
          name: comm.name,
          color: comm.brandColor || comm.color || "#4f46e5",
          icon: comm.icon || "Users",
          ownerId: ownerId,
          memberCount: countSnap.data().count,
        };
      })
    );

    return JSON.parse(JSON.stringify(communitiesWithCount)) as any[];
  } catch (error: any) {
    console.error("Error in getCommunities:", error);
    return [];
  }
}

export async function createCommunity(data: Partial<Community>) {
  try {
    const ownerId = await getUserId();
    
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    const currentData = docSnap.exists ? docSnap.data() : {};
    const currentCommunities = currentData?.communities || [];

    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    
    const newDoc = {
      id: newId,
      name: data.name || "",
      icon: data.icon || "Users",
      brandColor: data.color || "#4f46e5",
      targetAudiences: [],
      goals: [],
    };

    await docRef.set({
      ...currentData,
      communities: [newDoc, ...currentCommunities]
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    
    return { success: true, id: newId };
  } catch (error: any) {
    console.error("Error in createCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCommunity(id: string, data: Partial<Community>) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error("Global settings not found");
    }
    
    const currentData = docSnap.data() || {};
    const currentCommunities = currentData.communities || [];
    
    const index = currentCommunities.findIndex((c: any) => c.id === id);
    if (index === -1) {
      throw new Error("Community not found");
    }

    const updatedCommunity = {
      ...currentCommunities[index],
    };
    
    if (data.name !== undefined) updatedCommunity.name = data.name;
    if (data.icon !== undefined) updatedCommunity.icon = data.icon;
    if (data.color !== undefined) updatedCommunity.brandColor = data.color;
    
    currentCommunities[index] = updatedCommunity;

    await docRef.update({
      communities: currentCommunities
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCommunity(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return { success: true };
    
    const currentData = docSnap.data() || {};
    const currentCommunities = currentData.communities || [];
    
    const updatedCommunities = currentCommunities.filter((c: any) => c.id !== id);

    await docRef.update({
      communities: updatedCommunities
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function migrateContactsToGeneralCommunity() {
  try {
    const ownerId = await getUserId();
    
    // Check if General community exists
    const communitiesRef = adminDb.collection("communities");
    const snapshot = await communitiesRef
      .where("ownerId", "==", ownerId)
      .where("name", "==", "קהילה כללית")
      .limit(1)
      .get();
      
    let generalCommunityId = "";
    
    if (snapshot.empty) {
      // Create General community
      const newDoc = {
        name: "קהילה כללית",
        color: "#64748b", // slate-500
        icon: "Users",
        description: "קהילת ברירת מחדל לכל אנשי הקשר במערכת",
        files: [],
        ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await communitiesRef.add(newDoc);
      generalCommunityId = docRef.id;
    } else {
      generalCommunityId = snapshot.docs[0].id;
    }
    
    // Fetch all contacts
    const contactsRef = adminDb.collection("contacts");
    const contactsSnap = await contactsRef.where("ownerId", "==", ownerId).get();
    
    const batch = adminDb.batch();
    let count = 0;
    
    contactsSnap.forEach(doc => {
      const data = doc.data();
      const communityIds = data.communityIds || [];
      if (communityIds.length === 0) {
        batch.update(doc.ref, { communityIds: [generalCommunityId] });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    return { success: true, migratedCount: count, generalCommunityId };
  } catch (error: any) {
    console.error("Error migrating contacts:", error);
    return { success: false, error: error.message };
  }
}
