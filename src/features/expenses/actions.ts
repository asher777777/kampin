"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Expense, ExpenseOption } from "./types";
import { revalidatePath } from "next/cache";

// Helper to get authenticated user ID
async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getExpenses() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("expenses")
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .get();

    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expense[];

    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function createExpense(data: Omit<Expense, "id" | "ownerId" | "createdAt" | "updatedAt">) {
  try {
    const ownerId = await getUserId();
    
    const newExpense = {
      ...data,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("expenses").add(newExpense);
    revalidatePath("/dashboard/expenses");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteExpense(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("expenses").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("ההוצאה לא נמצאה");
    }

    if (docSnap.data()?.ownerId !== ownerId) {
      throw new Error("אין הרשאה למחוק הוצאה זו");
    }

    await docRef.delete();
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error.message };
  }
}

// Manage Dropdown Options
export async function getExpenseOptions() {
  try {
    const ownerId = await getUserId();
    const snapshot = await adminDb
      .collection("expenseOptions")
      .where("ownerId", "==", ownerId)
      .get();

    const options = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ExpenseOption[];

    return {
      expenseTypes: options.filter(o => o.type === "expenseType").map(o => o.value),
      paymentMethods: options.filter(o => o.type === "paymentMethod").map(o => o.value)
    };
  } catch (error) {
    console.error("Error fetching expense options:", error);
    return { expenseTypes: [], paymentMethods: [] };
  }
}

export async function createExpenseOption(type: "expenseType" | "paymentMethod", value: string) {
  try {
    const ownerId = await getUserId();
    
    // Check if exists
    const existing = await adminDb.collection("expenseOptions")
      .where("ownerId", "==", ownerId)
      .where("type", "==", type)
      .where("value", "==", value)
      .get();
      
    if (!existing.empty) {
      return { success: true }; // Already exists
    }

    await adminDb.collection("expenseOptions").add({
      ownerId,
      type,
      value
    });
    
    // No need to revalidate path since it's used client-side mainly, 
    // but doing so ensures fresh data if Server Components are used.
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating expense option:", error);
    return { success: false, error: error.message };
  }
}
