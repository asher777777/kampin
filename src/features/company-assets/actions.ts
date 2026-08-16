"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export interface CompanyAsset {
  id: string;
  ownerId: string;
  name: string;
  category: "logo" | "incorporation_doc" | "dealer_cert" | "vibe_image" | "other";
  url: string;
  fileType: "image" | "document" | "video";
  extractedColors?: string[];
  createdAt: string;
}

export async function getCompanyAssets(): Promise<CompanyAsset[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    const snapshot = await adminDb.collection("companyAssets")
      .where("ownerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CompanyAsset[];
  } catch (error) {
    console.error("Error fetching company assets:", error);
    return [];
  }
}

export async function addCompanyAsset(data: Omit<CompanyAsset, "id" | "ownerId" | "createdAt">): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = session.user.id;

    const docRef = await adminDb.collection("companyAssets").add({
      ...data,
      ownerId: userId,
      createdAt: new Date().toISOString()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding company asset:", error);
    return { success: false, error: "Failed to add asset" };
  }
}

export async function updateCompanyAsset(id: string, data: Partial<CompanyAsset>): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = session.user.id;

    const doc = await adminDb.collection("companyAssets").doc(id).get();
    if (!doc.exists || doc.data()?.ownerId !== userId) {
      return { success: false, error: "Not found or unauthorized" };
    }

    await adminDb.collection("companyAssets").doc(id).update(data);
    return { success: true };
  } catch (error) {
    console.error("Error updating company asset:", error);
    return { success: false, error: "Failed to update asset" };
  }
}

export async function deleteCompanyAsset(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const userId = session.user.id;

    const doc = await adminDb.collection("companyAssets").doc(id).get();
    if (!doc.exists || doc.data()?.ownerId !== userId) {
      return { success: false, error: "Not found or unauthorized" };
    }

    await adminDb.collection("companyAssets").doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting company asset:", error);
    return { success: false, error: "Failed to delete asset" };
  }
}

export async function getUserLogoUrl(userId: string): Promise<string | null> {
  try {
    const snap = await adminDb.collection("companyAssets")
      .where("ownerId", "==", userId)
      .where("category", "==", "logo")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!snap.empty) {
      return snap.docs[0].data().url;
    }
    return null;
  } catch (error) {
    console.error("Error getting user logo:", error);
    return null;
  }
}

export async function getAdminLogoUrl(): Promise<string | null> {
  try {
    const adminQuery = await adminDb.collection("users").where("role", "==", "ADMIN").limit(1).get();
    if (!adminQuery.empty) {
      const adminId = adminQuery.docs[0].id;
      return await getUserLogoUrl(adminId);
    }
    return null;
  } catch (error) {
    console.error("Error getting admin logo:", error);
    return null;
  }
}
