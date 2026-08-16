"use server";

import { adminDb } from "@/lib/firebase-admin";

// We need to fetch the owner ID exactly as it is done in actions.ts.
// Let's import getUserId or auth from "@/lib/auth".
import { auth } from "@/lib/auth";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Not authenticated");
  return session.user.email;
}

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
