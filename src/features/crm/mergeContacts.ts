"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Contact } from "./types";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

function normalizePhoneNumber(phone?: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "").replace(/^972/, "0");
}

/**
 * Searches for an existing contact by normalized phone or email.
 */
export async function findExistingContact(
  ownerId: string,
  phone?: string,
  email?: string
): Promise<{ id: string; data: Contact } | null> {
  const normPhone = normalizePhoneNumber(phone);
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!normPhone && !cleanEmail) return null;

  const snapshot = await adminDb
    .collection("contacts")
    .where("ownerId", "==", ownerId)
    .where("status", "==", "active")
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as Contact;
    const cPhone = normalizePhoneNumber(data.conta_phone);
    const cEmail = (data.email || "").trim().toLowerCase();

    if (normPhone && cPhone && normPhone === cPhone) {
      return { id: doc.id, data };
    }
    if (cleanEmail && cEmail && cleanEmail === cEmail) {
      return { id: doc.id, data };
    }
  }

  return null;
}

/**
 * Automatically merges all duplicate contacts for the logged-in owner.
 */
export async function mergeDuplicateContacts() {
  try {
    const ownerId = await getUserId();
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("status", "==", "active")
      .get();

    const clusters = new Map<string, any[]>();
    snap.docs.forEach((doc: any) => {
      const data = { id: doc.id, ...doc.data() };
      const phone = normalizePhoneNumber(data.conta_phone);
      const email = (data.email || "").trim().toLowerCase();
      const key = phone ? `phone_${phone}` : (email ? `email_${email}` : `id_${doc.id}`);
      
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(data);
    });

    let totalRemoved = 0;
    let clustersMerged = 0;

    for (const [, list] of clusters.entries()) {
      if (list.length <= 1) continue;

      clustersMerged++;
      const master = list[0];
      const duplicates = list.slice(1);

      const mergedDonations: any[] = [];
      const mergedPayments: any[] = [];
      const mergedEvents: any[] = [];
      const mergedForms: any[] = [];

      const seenDonationIds = new Set<string>();
      const seenPaymentKeys = new Set<string>();
      const seenEventKeys = new Set<string>();

      let totalSpent = 0;
      let totalCampaignAmount = 0;
      let orderCount = 0;
      let lastOrderDate = "";

      list.forEach((c) => {
        // 1. History
        const hist = c.campaign_donations_history || [];
        hist.forEach((h: any) => {
          const hKey = h.id || `${h.campaignId}_${h.amount}_${h.date}`;
          if (!seenDonationIds.has(hKey)) {
            seenDonationIds.add(hKey);
            mergedDonations.push(h);
            totalCampaignAmount += Number(h.amount || 0);
            if (h.paymentStatus === "completed") {
              orderCount += 1;
              if (!lastOrderDate || h.date > lastOrderDate) lastOrderDate = h.date;
            }
          }
        });

        // 2. Payments
        const payments = c.payments || [];
        payments.forEach((p: any) => {
          const pKey = p.transactionId || `${p.amount}_${p.date}_${p.method}`;
          if (!seenPaymentKeys.has(pKey)) {
            seenPaymentKeys.add(pKey);
            mergedPayments.push(p);
            if (p.status === "success" || p.status === "completed") {
              totalSpent += Number(p.amount || 0);
            }
          }
        });

        // 3. Events
        const events = c.events || [];
        events.forEach((e: any) => {
          const eKey = `${e.title}_${e.date}`;
          if (!seenEventKeys.has(eKey)) {
            seenEventKeys.add(eKey);
            mergedEvents.push(e);
          }
        });

        // 4. Forms
        const forms = c.form_submissions || [];
        forms.forEach((f: any) => {
          mergedForms.push(f);
        });
      });

      // Sort descending
      mergedDonations.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      mergedPayments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      mergedEvents.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      // Update master contact
      await adminDb.collection("contacts").doc(master.id).update({
        total_spent: totalSpent,
        campaign_amount: totalCampaignAmount,
        total_donated: totalSpent,
        order_count: Math.max(orderCount, mergedPayments.filter((p) => p.status === "success" || p.status === "completed").length),
        last_order_date: lastOrderDate || master.last_order_date || new Date().toISOString(),
        campaign_donations_history: mergedDonations,
        payments: mergedPayments,
        events: mergedEvents,
        form_submissions: mergedForms,
        updatedAt: new Date().toISOString(),
      });

      // Delete duplicate docs
      const batch = adminDb.batch();
      duplicates.forEach((d) => {
        batch.delete(adminDb.collection("contacts").doc(d.id));
        totalRemoved++;
      });
      await batch.commit();
    }

    return {
      success: true,
      clustersMerged,
      totalRemoved,
    };
  } catch (error: any) {
    console.error("Error in mergeDuplicateContacts:", error);
    return { success: false, error: error.message || String(error) };
  }
}
