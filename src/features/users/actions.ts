"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type UserRole = "SUPERADMIN" | "ADMIN" | "PRO" | "DEVELOPING" | "TRIAL";

export interface UserDoc {
  id?: string;
  email: string;
  username: string;
  name?: string;
  password?: string;
  role: UserRole;
  createdAt: string;
  trialExpiresAt?: string;
  
  // Admin API Overrides
  useAdminGoogleAi?: boolean;
  googleAiKey?: string;
  
  useAdminKesher?: boolean;
  kesherSettings?: any;
  
  useAdminGreenApi?: boolean;
  greenApiSettings?: any;
}

export async function getUsers() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  const snapshot = await adminDb.collection("users").get();
  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  })) as UserDoc[];
}

export async function createUser(data: Partial<UserDoc>) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  if (!data.username || !data.password || !data.role) {
    throw new Error("Missing required fields");
  }

  // Check if username exists
  const existing = await adminDb.collection("users").where("username", "==", data.username.toLowerCase()).get();
  if (!existing.empty) throw new Error("Username already exists");

  const newUser: Omit<UserDoc, "id"> = {
    username: data.username.toLowerCase(),
    email: data.email || "",
    name: data.name || "",
    password: data.password,
    role: data.role as UserRole,
    createdAt: new Date().toISOString(),
  };

  if (data.role === "TRIAL") {
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    newUser.trialExpiresAt = expires.toISOString();
  }

  const docRef = await adminDb.collection("users").add(newUser);
  revalidatePath("/dashboard/users");
  return { success: true, id: docRef.id };
}

export async function updateUser(id: string, data: Partial<UserDoc>) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  if (data.role === "TRIAL" && !data.trialExpiresAt) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    data.trialExpiresAt = expires.toISOString();
  }

  await adminDb.collection("users").doc(id).update({
    ...data
  });
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  await adminDb.collection("users").doc(id).delete();
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function changeMyPassword(newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  if (session.user.id === "1") { // Legacy hardcoded admin guard
    throw new Error("Cannot change password for hardcoded admin");
  }

  await adminDb.collection("users").doc(session.user.id).update({
    password: newPassword
  });
  return { success: true };
}

// Validation helper functions
export async function checkFeatureLimit(userId: string, feature: "contacts" | "landing_pages" | "ai" | "payments" | "forms") {
  const session = await auth();
  const role = session?.user?.role || "ADMIN";
  
  if (role === "SUPERADMIN" || role === "ADMIN" || role === "PRO") return { allowed: true };

  // TRIAL check
  if (role === "TRIAL") {
    // Need to check expiration
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const data = userDoc.data() as UserDoc;
    if (data.trialExpiresAt) {
      if (new Date(data.trialExpiresAt) < new Date()) {
        // Expired -> Treat as DEVELOPING
        return checkDevelopingLimits(userId, feature);
      }
    }
    return { allowed: true }; // Active trial
  }

  if (role === "DEVELOPING") {
    return checkDevelopingLimits(userId, feature);
  }

  return { allowed: false, message: "No active role" };
}

async function checkDevelopingLimits(userId: string, feature: string) {
  if (feature === "ai" || feature === "payments") {
    return { allowed: false, message: "תכונה זו חסומה למשתמש מתפתח. אנא שדרג לפרו." };
  }

  if (feature === "contacts") {
    const contactsSnap = await adminDb.collection("contacts").where("ownerId", "==", userId).get();
    if (contactsSnap.size >= 100) {
      return { allowed: false, message: "הגעת למגבלת 100 אנשי הקשר. אנא שדרג לפרו." };
    }
  }

  if (feature === "landing_pages") {
    const lpSnap = await adminDb.collection("landing_pages").where("ownerId", "==", userId).get();
    if (lpSnap.size >= 3) {
      return { allowed: false, message: "הגעת למגבלת 3 דפי נחיתה. אנא שדרג לפרו." };
    }
  }

  if (feature === "forms") {
    const formSnap = await adminDb.collection("form_templates").where("ownerId", "==", userId).get();
    if (formSnap.size >= 1) {
      return { allowed: false, message: "הגעת למגבלת טופס 1. אנא שדרג לפרו." };
    }
  }

  return { allowed: true };
}
