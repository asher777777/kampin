"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export interface FormTemplate {
  id?: string;
  name: string;
  config: any;
  createdAt: string;
  updatedAt: string;
}

export async function getFormTemplates(): Promise<FormTemplate[]> {
  try {
    const snapshot = await adminDb.collection("form_templates").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as FormTemplate[];
  } catch (error) {
    console.error("Error fetching form templates:", error);
    return [];
  }
}

export async function saveFormTemplate(name: string, config: any): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const template: FormTemplate = {
      name,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection("form_templates").add(template);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error saving form template:", error);
    return { success: false, error: error.message };
  }
}

export async function updateFormTemplate(id: string, name: string, config: any): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await adminDb.collection("form_templates").doc(id).update({
      name,
      config,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating form template:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFormTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    await adminDb.collection("form_templates").doc(id).delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting form template:", error);
    return { success: false, error: error.message };
  }
}
