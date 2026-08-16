"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export async function getGlobalConfigs() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  const doc = await adminDb.collection("configs").doc("global").get();
  return doc.exists ? doc.data() : {};
}

export async function saveGlobalConfigs(data: any) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  await adminDb.collection("configs").doc("global").set(data, { merge: true });
  return { success: true };
}
