"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function updateRecordField(
  dataSource: "contacts" | "forms",
  id: string,
  field: string,
  value: any
) {
  try {
    const ownerId = await getUserId();
    
    // Check if id is a child row or submission row
    let contactId = id;
    let childIndex: number | null = null;

    if (id.includes("_child_")) {
      const parts = id.split("_child_");
      contactId = parts[0];
      childIndex = parseInt(parts[1], 10);
    } else if (id.includes("_sub_")) {
      const parts = id.split("_sub_");
      contactId = parts[0];
    }

    const docRef = adminDb.collection("contacts").doc(contactId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: "הרשומה לא נמצאה" };
    }

    const data = docSnap.data();
    if (data?.ownerId !== ownerId) {
      return { success: false, error: "אין הרשאה לערוך רשומה זו" };
    }

    // If updating a child field in children array
    if (childIndex !== null && Array.isArray(data?.children) && data.children[childIndex]) {
      const updatedChildren = [...data.children];
      updatedChildren[childIndex] = {
        ...updatedChildren[childIndex],
        [field]: value,
      };
      await docRef.update({
        children: updatedChildren,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Normal top level or numeric field
      let processedValue = value;
      if (field === "total_spent" || field === "order_count" || field.startsWith("custom_num_")) {
        const num = Number(value);
        if (!isNaN(num)) {
          processedValue = num;
        }
      }

      await docRef.update({
        [field]: processedValue,
        updatedAt: new Date().toISOString(),
      });
    }

    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/crm/analytics");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateRecordField:", error);
    return { success: false, error: error.message || String(error) };
  }
}
