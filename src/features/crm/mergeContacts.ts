"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Contact } from "./types";
import { syncContactToCampaign } from "@/features/campaigns/actions";
import { revalidatePath } from "next/cache";

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
    const cPhone = normalizePhoneNumber(data.conta_phone || (data as any).phone);
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
      const phone = normalizePhoneNumber(data.conta_phone || data.phone);
      const email = (data.email || "").trim().toLowerCase();
      const cleanName = (data.conta_name || "").trim().toLowerCase();
      
      const key = phone ? `phone_${phone}` : (email ? `email_${email}` : `id_${doc.id}`);
      
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(data);
    });

    let totalRemoved = 0;
    let clustersMerged = 0;

    // Fetch campaigns to clean up duplicate donation subcollections
    const campaignsSnap = await adminDb.collection("campaigns").get().catch(() => ({ docs: [] }));

    for (const [, list] of clusters.entries()) {
      if (list.length <= 1) continue;

      clustersMerged++;
      
      // Pick master: prefer the one with the longest/most complete name or existing payments/donations
      const sortedList = [...list].sort((a, b) => {
        const aNameLen = (a.conta_name || "").trim().length;
        const bNameLen = (b.conta_name || "").trim().length;
        const aSpent = Number(a.total_spent || a.campaign_amount || 0);
        const bSpent = Number(b.total_spent || b.campaign_amount || 0);
        if (bSpent !== aSpent) return bSpent - aSpent;
        return bNameLen - aNameLen;
      });

      const master = sortedList[0];
      const duplicates = sortedList.slice(1);

      // Select the best/most complete fields across all duplicates
      const bestName = sortedList.map(c => (c.conta_name || "").trim()).filter(Boolean).sort((a, b) => b.length - a.length)[0] || master.conta_name;
      const bestPhone = sortedList.map(c => c.conta_phone || c.phone).filter(Boolean)[0] || master.conta_phone || master.phone;
      const bestEmail = sortedList.map(c => c.email).filter(Boolean)[0] || master.email;
      const bestCommunity = sortedList.map(c => c.community || c.mh_crm_community).filter(Boolean)[0] || master.community || master.mh_crm_community;
      const bestCampaignId = sortedList.map(c => c.campaign_id || c.campaignId).filter(Boolean)[0] || master.campaign_id || master.campaignId;

      const mergedDonations: any[] = [];
      const mergedPayments: any[] = [];
      const mergedEvents: any[] = [];
      const mergedForms: any[] = [];
      const mergedTags = new Set<string>();

      const seenDonationIds = new Set<string>();
      const seenPaymentKeys = new Set<string>();
      const seenEventKeys = new Set<string>();

      let totalSpent = 0;
      let totalCampaignAmount = 0;
      let orderCount = 0;
      let lastOrderDate = "";

      list.forEach((c) => {
        if (Array.isArray(c.tags)) {
          c.tags.forEach((t: any) => { if (typeof t === "string" && t.trim()) mergedTags.add(t.trim()); });
        }

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

      // If no explicit campaign history amount was found, sum from campaign_amount fields
      if (totalCampaignAmount === 0) {
        totalCampaignAmount = list.reduce((max, c) => Math.max(max, Number(c.campaign_amount || c.campaignAmount || 0)), 0);
      }
      if (totalSpent === 0) {
        totalSpent = Math.max(totalCampaignAmount, list.reduce((max, c) => Math.max(max, Number(c.total_spent || c.total_donated || 0)), 0));
      }

      // Sort descending
      mergedDonations.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      mergedPayments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      mergedEvents.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      const masterUpdatedData: any = {
        conta_name: bestName,
        conta_phone: bestPhone,
        phone: bestPhone,
        email: bestEmail,
        community: bestCommunity,
        campaign_id: bestCampaignId,
        tags: Array.from(mergedTags),
        total_spent: totalSpent,
        campaign_amount: totalCampaignAmount,
        total_donated: totalSpent,
        order_count: Math.max(orderCount, mergedPayments.filter((p) => p.status === "success" || p.status === "completed").length, 1),
        last_order_date: lastOrderDate || master.last_order_date || new Date().toISOString(),
        campaign_donations_history: mergedDonations,
        payments: mergedPayments,
        events: mergedEvents,
        form_submissions: mergedForms,
        updatedAt: new Date().toISOString(),
      };

      // Update master contact
      await adminDb.collection("contacts").doc(master.id).update(masterUpdatedData);

      // Clean up duplicate donation documents and delete duplicate contact docs
      const duplicateIds = new Set(duplicates.map((d) => d.id));
      const duplicatePhones = new Set(duplicates.map((d) => normalizePhoneNumber(d.conta_phone || d.phone)).filter(Boolean));

      for (const campDoc of campaignsSnap.docs) {
        try {
          const campId = campDoc.id;
          const donColl = adminDb.collection("campaigns").doc(campId).collection("donations");
          const ambColl = adminDb.collection("campaigns").doc(campId).collection("ambassadors");

          for (const d of duplicates) {
            // Delete direct doc references
            await donColl.doc(`don_${d.id}`).delete().catch(() => {});
            await donColl.doc(`crm-${d.id}`).delete().catch(() => {});
            await ambColl.doc(`amb_${d.id}`).delete().catch(() => {});
          }

          // Also check donations in campaign for matching duplicate contactId or phone
          const donSnap = await donColl.get();
          for (const dDoc of donSnap.docs) {
            const dData = dDoc.data();
            const dNormPhone = normalizePhoneNumber(dData.phone);
            const isDupContact = dData.contactId && duplicateIds.has(dData.contactId);
            const isDupDoc = dDoc.id.startsWith("don_") && duplicateIds.has(dDoc.id.replace("don_", ""));
            const isCrmDoc = dDoc.id.startsWith("crm-") && duplicateIds.has(dDoc.id.replace("crm-", ""));
            
            if (isDupContact || isDupDoc || isCrmDoc) {
              await dDoc.ref.delete().catch(() => {});
            }
          }
        } catch (campCleanErr) {
          console.warn("Error cleaning duplicate donations from campaign:", campCleanErr);
        }
      }

      // Delete duplicate docs from contacts collection
      const batch = adminDb.batch();
      duplicates.forEach((d) => {
        batch.delete(adminDb.collection("contacts").doc(d.id));
        totalRemoved++;
      });
      await batch.commit();

      // Sync master contact back to campaign so single updated donation record exists
      if (bestCampaignId && totalCampaignAmount > 0) {
        await syncContactToCampaign(master.id, {
          ...masterUpdatedData,
          campaign_id: bestCampaignId,
          campaign_amount: totalCampaignAmount,
        }).catch(() => {});
      }
    }

    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/");

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
