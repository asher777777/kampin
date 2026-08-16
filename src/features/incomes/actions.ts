"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Income } from "./types";
import { revalidatePath } from "next/cache";

// Helper to get authenticated user ID
async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getIncomes() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("incomes")
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .get();

    const incomes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Income[];

    return incomes;
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return [];
  }
}

export async function createIncome(data: Omit<Income, "id" | "ownerId" | "createdAt" | "updatedAt">) {
  try {
    const ownerId = await getUserId();
    
    const newIncome = {
      ...data,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("incomes").add(newIncome);
    revalidatePath("/dashboard/incomes");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating income:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteIncome(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("incomes").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("ההכנסה לא נמצאה");
    }

    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה למחוק הכנסה זו");
    }

    await docRef.delete();
    revalidatePath("/dashboard/incomes");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting income:", error);
    return { success: false, error: error.message };
  }
}
