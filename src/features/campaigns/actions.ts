"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { Ambassador, Campaign, Donation } from "@/lib/types/campaign";

/**
 * Fetch all available campaigns for selection in HomeEditor
 */
export async function getAllCampaigns(): Promise<Campaign[]> {
  try {
    const snap = await adminDb.collection("campaigns").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
  } catch (error) {
    console.error("Error fetching all campaigns:", error);
    return [];
  }
}

/**
 * Get or initialize campaign document
 */
export async function getCampaignData(campaignId: string): Promise<Campaign | null> {
  try {
    const docRef = adminDb.collection("campaigns").doc(campaignId);
    const snap = await docRef.get();
    if (snap.exists) {
      return { id: snap.id, ...snap.data() } as Campaign;
    }
    return null;
  } catch (error) {
    console.error("Error fetching campaign data:", error);
    return null;
  }
}

/**
 * Get ambassador by slug
 */
export async function getAmbassadorBySlug(campaignId: string, slug: string): Promise<Ambassador | null> {
  try {
    const snap = await adminDb
      .collection("campaigns")
      .doc(campaignId)
      .collection("ambassadors")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as Ambassador;
    }
    return null;
  } catch (error) {
    console.error("Error fetching ambassador by slug:", error);
    return null;
  }
}

/**
 * Create ambassador (from public page modal OR CRM)
 */
export async function createAmbassadorAction(data: {
  campaignId: string;
  name: string;
  targetGoal: number;
  message?: string;
  phone?: string;
  email?: string;
  ownerId?: string;
}): Promise<{ success: boolean; ambassador?: Ambassador; error?: string }> {
  try {
    const { campaignId, name, targetGoal, message, phone, email, ownerId } = data;
    if (!campaignId || !name || !targetGoal) {
      return { success: false, error: "חסרים שדות חובה" };
    }

    // Generate unique slug
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[\s\W]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ambassador";
    
    let slug = baseSlug;
    let counter = 1;

    // Check slug uniqueness
    while (true) {
      const existing = await adminDb
        .collection("campaigns")
        .doc(campaignId)
        .collection("ambassadors")
        .where("slug", "==", slug)
        .get();

      if (existing.empty) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const docRef = adminDb
      .collection("campaigns")
      .doc(campaignId)
      .collection("ambassadors")
      .doc();

    const ambassadorData = {
      campaignId,
      name,
      slug,
      targetGoal: Number(targetGoal),
      totalRaised: 0,
      donorCount: 0,
      message: message || "",
      phone: phone || "",
      email: email || "",
      createdAt: new Date().toISOString(),
    };

    await docRef.set(ambassadorData);

    // Sync to CRM contacts collection for campaign creator
    try {
      const campaignDoc = await adminDb.collection("campaigns").doc(campaignId).get();
      const campaignTitle = campaignDoc.data()?.title || campaignId;
      const crmOwnerId = ownerId || campaignDoc.data()?.ownerId || "1";

      await adminDb.collection("contacts").add({
        ownerId: crmOwnerId,
        status: "active",
        conta_name: name,
        conta_phone: phone || "",
        email: email || "",
        lead_source: `שגריר בקמפיין: ${campaignTitle}`,
        campaign_role: "ambassador",
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        campaign_ambassador_slug: slug,
        campaign_target_goal: Number(targetGoal),
        campaign_total_raised: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (crmErr) {
      console.warn("CRM ambassador sync warning:", crmErr);
    }

    return {
      success: true,
      ambassador: { id: docRef.id, ...ambassadorData } as Ambassador,
    };
  } catch (error: any) {
    console.error("Error creating ambassador:", error);
    return { success: false, error: error.message || "שגיאה ביצירת שגריר" };
  }
}

/**
 * Record a new donation (from public page drawer OR CRM)
 */
export async function recordDonationAction(data: {
  campaignId: string;
  donorName: string;
  amount: number;
  dedication?: string;
  isAnonymous?: boolean;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  paymentMethod?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; donationId?: string; error?: string }> {
  try {
    const { campaignId, donorName, amount, dedication, isAnonymous, ambassadorId, ambassadorName, paymentMethod, phone, email } = data;
    
    if (!campaignId || !amount || amount <= 0) {
      return { success: false, error: "סכום תרומה לא תקין" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const donationRef = campaignRef.collection("donations").doc();

    const donationData = {
      campaignId,
      donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
      amount: Number(amount),
      dedication: dedication || "",
      isAnonymous: Boolean(isAnonymous),
      ambassadorId: ambassadorId || null,
      ambassadorName: ambassadorName || null,
      paymentStatus: "completed",
      paymentMethod: paymentMethod || "credit_card",
      createdAt: new Date().toISOString(),
    };

    // Transaction to update total raised & donor count atomically
    await adminDb.runTransaction(async (transaction) => {
      // 1. Save donation
      transaction.set(donationRef, donationData);

      // 2. Increment campaign totals
      const campaignSnap = await transaction.get(campaignRef);
      const campData = campaignSnap.data() || {};
      transaction.set(
        campaignRef,
        {
          totalRaised: (campData.totalRaised || 0) + Number(amount),
          donorCount: (campData.donorCount || 0) + 1,
        },
        { merge: true }
      );

      // 3. If ambassadorId provided, update ambassador totals
      if (ambassadorId) {
        const ambassadorRef = campaignRef.collection("ambassadors").doc(ambassadorId);
        const ambSnap = await transaction.get(ambassadorRef);
        if (ambSnap.exists) {
          const ambData = ambSnap.data();
          transaction.update(ambassadorRef, {
            totalRaised: (ambData?.totalRaised || 0) + Number(amount),
            donorCount: (ambData?.donorCount || 0) + 1,
          });
        }
      }
    });

    // Sync Donor to CRM contacts
    try {
      const campaignDoc = await campaignRef.get();
      const campaignTitle = campaignDoc.data()?.title || campaignId;
      const crmOwnerId = campaignDoc.data()?.ownerId || "1";

      await adminDb.collection("contacts").add({
        ownerId: crmOwnerId,
        status: "active",
        conta_name: isAnonymous ? "אנונימי" : (donorName || "תורם קמפיין"),
        conta_phone: phone || "",
        email: email || "",
        lead_source: `תורם בקמפיין: ${campaignTitle}`,
        campaign_role: "donor",
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        total_donated: Number(amount),
        last_donation_date: new Date().toISOString(),
        dedication: dedication || "",
        referred_by_ambassador: ambassadorName || null,
        payments: [
          {
            date: new Date().toISOString(),
            amount: Number(amount),
            paymentType: paymentMethod || "credit_card",
            receiptType: "תרומה קמפיין",
          }
        ],
        events: [
          {
            time: new Date().toISOString(),
            title: "תרומה חדשה התקבלה",
            text: `תרומה בסך ₪${amount} בקמפיין ${campaignTitle}${ambassadorName ? ` ע"י ${ambassadorName}` : ""}`,
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (crmErr) {
      console.warn("CRM donor sync warning:", crmErr);
    }

    revalidatePath(`/c/${campaignId}`);
    return { success: true, donationId: donationRef.id };
  } catch (error: any) {
    console.error("Error recording donation:", error);
    return { success: false, error: error.message || "שגיאה ברישום תרומה" };
  }
}
