"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Automation } from "@/lib/automations/engine";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  throw new Error("Unauthorized");
}

export async function getAutomations() {
  try {
    const ownerId = await getUserId();
    const { getUserDb } = await import("@/lib/firebase-admin");
    const snapshot = await getUserDb(ownerId)
      .collection("automations")
      .where("ownerId", "==", ownerId)
      .get();
      
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Automation[];
  } catch (error) {
    console.error("Error fetching automations:", error);
    return [];
  }
}

export async function createAutomation(data: Partial<Automation>) {
  try {
    const ownerId = await getUserId();
    const newAutomation = {
      ownerId,
      name: data.name || "אוטומציה חדשה",
      isActive: data.isActive ?? false,
      trigger: data.trigger || { type: "webhook", webhookId: Math.random().toString(36).substring(2, 10) },
      steps: data.steps || [],
      createdAt: new Date().toISOString()
    };
    
    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = await getUserDb(ownerId).collection("automations").add(newAutomation);
    
    // Create linked webhook document
    if (newAutomation.trigger && newAutomation.trigger.type === "webhook" && newAutomation.trigger.webhookId) {
      await getUserDb(ownerId).collection("webhooks").add({
        webhookId: newAutomation.trigger.webhookId,
        automationId: docRef.id,
        ownerId,
      });
    }

    revalidatePath("/dashboard/automations");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating automation:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAutomation(id: string, data: Partial<Automation>) {
  try {
    const ownerId = await getUserId();
    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(ownerId).collection("automations").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data()?.ownerId !== ownerId) {
      throw new Error("לא נמצא או אין הרשאה");
    }
    
    await docRef.update({
      ...data,
      updatedAt: new Date().toISOString()
    });
    
    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating automation:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAutomation(id: string) {
  try {
    const ownerId = await getUserId();
    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(ownerId).collection("automations").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data()?.ownerId !== ownerId) {
      throw new Error("לא נמצא או אין הרשאה");
    }

    const autoData = docSnap.data();
    
    // Delete associated webhook
    if (autoData?.trigger?.webhookId) {
      const webhookSnap = await getUserDb(ownerId).collection("webhooks")
        .where("webhookId", "==", autoData.trigger.webhookId)
        .get();
      
      const batch = adminDb.batch(); // We can keep adminDb.batch() as it's a global operation on references
      webhookSnap.docs.forEach((d: any) => batch.delete(d.ref));
      batch.delete(docRef as any);
      await batch.commit();
    } else {
      await docRef.delete();
    }
    
    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting automation:", error);
    return { success: false, error: error.message };
  }
}
