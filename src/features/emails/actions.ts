"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Contact } from "@/features/crm/types";

export interface Campaign {
  id?: string;
  ownerId: string;
  subject: string;
  content: string;
  status: "draft" | "sent";
  sentAt?: string;
  recipientsCount: number;
  opensCount?: number;
  errorCount?: number;
  createdAt: string;
}

export interface EmailTemplate {
  id?: string;
  ownerId: string;
  name: string;
  subject: string;
  content: string;
  createdAt: string;
}

// Helper to get authenticated user ID
async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const userId = await getUserId();

    const snapshot = await adminDb
      .collection("campaigns")
      .where("ownerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const campaigns = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Campaign[];

    // Fetch stats
    await Promise.all(campaigns.map(async (camp) => {
      try {
        const opensSnap = await adminDb.collection("campaign_opens").where("campaignId", "==", camp.id).get();
        camp.opensCount = opensSnap.size;
      } catch (e) {}

      try {
        const errorsSnap = await adminDb.collection("mail")
          .where("campaignId", "==", camp.id)
          .where("delivery.state", "==", "ERROR")
          .get();
        camp.errorCount = errorsSnap.size;
      } catch (e) {}
    }));

    return campaigns;
  } catch (error) {
    console.error("Failed to get campaigns:", error);
    return [];
  }
}

export async function sendCampaign(
  subject: string,
  content: string,
  recipients: Contact[],
  fromEmail?: string,
  attachments?: { filename: string, path: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();

    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    const now = new Date().toISOString();

    const campaignRef = await adminDb.collection("campaigns").add({
      ownerId: userId,
      subject,
      content,
      status: "sent",
      sentAt: now,
      recipientsCount: recipients.length,
      createdAt: now,
    });

    const batch = adminDb.batch();
    const mailCollection = adminDb.collection("mail");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hakel.club";

    recipients.forEach((contact) => {
      let personalizedContent = content;
      
      const tags = ['conta_name', 'email', 'conta_phone', 'company_name', 'mh_crm_city'];
      tags.forEach(tag => {
        const val = contact[tag as keyof Contact];
        const stringVal = val !== undefined && val !== null ? String(val) : "";
        personalizedContent = personalizedContent.replace(new RegExp(`{{${tag}}}`, 'g'), stringVal);
      });

      const trackingUrl = `${baseUrl}/api/track-email?campaignId=${campaignRef.id}&contactId=${contact.id}`;
      const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
      personalizedContent += pixel;

      const docRef = mailCollection.doc();
      const mailMessage: any = {
        subject: subject,
        html: personalizedContent,
      };

      if (fromEmail) {
        mailMessage.from = fromEmail;
      }
      
      if (attachments && attachments.length > 0) {
        mailMessage.attachments = attachments;
      }

      batch.set(docRef, {
        to: [contact.email],
        message: mailMessage,
        campaignId: campaignRef.id,
        contactId: contact.id,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    revalidatePath("/dashboard/emails");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send campaign:", error);
    return { success: false, error: error.message };
  }
}

export async function getContactsForEmailing(): Promise<Contact[]> {
  try {
    const userId = await getUserId();

    const snapshot = await adminDb
      .collection("contacts")
      .where("ownerId", "==", userId)
      .where("status", "==", "active")
      .get();

    return snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Contact;
      })
      .filter((contact) => !!contact.email);
  } catch (error) {
    console.error("Failed to get contacts:", error);
    return [];
  }
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const userId = await getUserId();
    const snapshot = await adminDb.collection("email_templates").where("ownerId", "==", userId).orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as EmailTemplate[];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveEmailTemplate(name: string, subject: string, content: string): Promise<{success: boolean, id?: string}> {
  try {
    const userId = await getUserId();
    const docRef = await adminDb.collection("email_templates").add({
      ownerId: userId,
      name,
      subject,
      content,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}
