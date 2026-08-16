"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PainPoint {
  id: string;
  icon?: string;
  title: string;
  description: string;
}

export interface ServiceProblem {
  id: string;
  title: string;
  painPoints: PainPoint[];
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
}

export interface ServiceBenefit {
  id: string;
  title: string;
  items: BenefitItem[];
}

export interface CompanyCoreService {
  id?: string;
  name: string;
  targetAudiences: string[];
  problems?: ServiceProblem[];
  benefitGroups?: ServiceBenefit[];
  benefits: string; // Kept for backward compatibility if needed
  communityId: string;
  ownerId: string;
  createdAt: string;
}

export interface Audience {
  id?: string;
  name: string;
  ownerId: string;
}

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getCompanyServices() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("company_core_services")
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CompanyCoreService[];
  } catch (error) {
    console.error("Error in getCompanyServices:", error);
    return [];
  }
}

export async function addCompanyService(data: Omit<CompanyCoreService, "id" | "ownerId" | "createdAt">) {
  try {
    const ownerId = await getUserId();
    const newDoc = {
      ...data,
      ownerId,
      createdAt: new Date().toISOString()
    };
    const docRef = await adminDb.collection("company_core_services").add(newDoc);
    revalidatePath("/dashboard");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error in addCompanyService:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCompanyService(id: string, data: Partial<CompanyCoreService>) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("company_core_services").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) throw new Error("Service not found");
    if (docSnap.data()?.ownerId !== ownerId) throw new Error("Unauthorized");

    await docRef.update(data);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateCompanyService:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCompanyService(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("company_core_services").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) throw new Error("Service not found");
    if (docSnap.data()?.ownerId !== ownerId) throw new Error("Unauthorized");

    await docRef.delete();
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCompanyService:", error);
    return { success: false, error: error.message };
  }
}

// Audiences
export async function getAudiences() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("audiences")
      .where("ownerId", "==", ownerId)
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Audience[];
  } catch (error) {
    console.error("Error in getAudiences:", error);
    return [];
  }
}

export async function addAudience(name: string) {
  try {
    const ownerId = await getUserId();
    const newDoc = {
      name,
      ownerId,
      createdAt: new Date().toISOString()
    };
    const docRef = await adminDb.collection("audiences").add(newDoc);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error in addAudience:", error);
    return { success: false, error: error.message };
  }
}

// Goals Glossary
export interface GoalGlossaryItem {
  id?: string;
  name: string;
  icon: string;
  ownerId: string;
}

export async function getGoals() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("goals")
      .where("ownerId", "==", ownerId)
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as GoalGlossaryItem[];
  } catch (error) {
    console.error("Error in getGoals:", error);
    return [];
  }
}

export async function addGoal(name: string, icon: string) {
  try {
    const ownerId = await getUserId();
    const newDoc = {
      name,
      icon,
      ownerId,
      createdAt: new Date().toISOString()
    };
    const docRef = await adminDb.collection("goals").add(newDoc);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error in addGoal:", error);
    return { success: false, error: error.message };
  }
}
