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
 * Record a pending donation when moving to payment step (status: "pending")
 * Registers the donor in CRM as "ממתין לתשלום" WITHOUT adding to totalRaised!
 */
export async function recordPendingDonationAction(data: {
  campaignId: string;
  donorName: string;
  amount: number;
  monthlyAmount?: number;
  recurringMonths?: number;
  isRecurring?: boolean;
  tier?: string;
  dedication?: string;
  isAnonymous?: boolean;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; donationId?: string; contactId?: string; error?: string }> {
  try {
    const {
      campaignId,
      donorName,
      amount,
      monthlyAmount,
      recurringMonths,
      isRecurring,
      tier,
      dedication,
      isAnonymous,
      ambassadorId,
      ambassadorName,
      phone,
      email,
    } = data;

    if (!campaignId || !amount || amount <= 0) {
      return { success: false, error: "סכום תרומה לא תקין" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const campaignDoc = await campaignRef.get();
    const campaignTitle = campaignDoc.data()?.title || campaignId;
    const crmOwnerId = campaignDoc.data()?.ownerId || "1";

    const donationRef = campaignRef.collection("donations").doc();
    const donationData: any = {
      campaignId,
      donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
      realDonorName: donorName || "",
      amount: Number(amount),
      monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
      recurringMonths: recurringMonths ? Number(recurringMonths) : null,
      isRecurring: Boolean(isRecurring),
      tier: tier || "",
      dedication: dedication || "",
      isAnonymous: Boolean(isAnonymous),
      ambassadorId: ambassadorId || null,
      ambassadorName: ambassadorName || null,
      phone: phone || "",
      email: email || "",
      paymentStatus: "pending",
      paymentMethod: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
      createdAt: new Date().toISOString(),
    };

    // Save pending donation document in campaign (WITHOUT incrementing totalRaised or donorCount!)
    await donationRef.set(donationData);

    // Save or update contact in CRM with status "ממתין לתשלום"
    let contactId = "";
    try {
      const contactRef = await adminDb.collection("contacts").add({
        ownerId: crmOwnerId,
        status: "active",
        conta_name: donorName || (isAnonymous ? "אנונימי" : "תורם קמפיין"),
        conta_phone: phone || "",
        email: email || "",
        lead_source: `תורם בקמפיין: ${campaignTitle}${isRecurring ? " (הוראת קבע)" : ""} - ממתין לתשלום`,
        campaign_role: "donor",
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        campaign_donation_mode: isRecurring ? "recurring" : "one_time",
        campaign_amount: Number(amount),
        campaign_monthly_amount: monthlyAmount ? Number(monthlyAmount) : null,
        campaign_recurring_months: recurringMonths ? Number(recurringMonths) : null,
        campaign_tier: tier || "",
        campaign_is_anonymous: Boolean(isAnonymous),
        campaign_dedication: dedication || "",
        campaign_ambassador_name: ambassadorName || "",
        campaign_payment_status: "pending",
        campaign_payment_method: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
        referred_by_ambassador: ambassadorName || null,
        total_donated: 0,
        monthly_amount: monthlyAmount || null,
        is_standing_order: Boolean(isRecurring),
        dedication: dedication || "",

        campaign_donations_history: [
          {
            id: donationRef.id,
            campaignId,
            campaignTitle,
            amount: Number(amount),
            monthlyAmount: monthlyAmount || null,
            recurringMonths: recurringMonths || null,
            isRecurring: Boolean(isRecurring),
            tier: tier || "",
            dedication: dedication || "",
            isAnonymous: Boolean(isAnonymous),
            ambassadorName: ambassadorName || "",
            paymentStatus: "pending",
            paymentMethod: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
            date: new Date().toISOString(),
          }
        ],
        payments: [
          {
            amount: Number(amount),
            monthlyAmount: monthlyAmount || null,
            isRecurring: Boolean(isRecurring),
            date: new Date().toISOString(),
            method: isRecurring ? "kesher_standing_order" : "kesher_credit_card",
            status: "pending",
            kesherStatus: "pending_payment",
          },
        ],
        events: [
          {
            title: `מעבר לעמוד תשלום בקמפיין ${campaignTitle} (ממתין לתשלום)`,
            type: "donation_pending",
            amount: Number(amount),
            date: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      contactId = contactRef.id;
    } catch (crmErr) {
      console.warn("CRM pending donor sync warning:", crmErr);
    }

    return { success: true, donationId: donationRef.id, contactId };
  } catch (error: any) {
    console.error("Error recording pending donation:", error);
    return { success: false, error: error.message || "שגיאה ברישום תרומה ממתינה" };
  }
}

/**
 * Complete a donation after successful payment via Kesher API
 * ONLY NOW atomically updates totalRaised & donorCount in Campaign & Ambassador!
 */
export async function completeDonationAction(data: {
  campaignId: string;
  donationId: string;
  contactId?: string;
  amount: number;
  monthlyAmount?: number;
  recurringMonths?: number;
  isRecurring?: boolean;
  dedication?: string;
  isAnonymous?: boolean;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  transactionId?: string;
  receiptUrl?: string;
  paymentMethod?: string;
  donorName?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      campaignId,
      donationId,
      contactId,
      amount,
      monthlyAmount,
      recurringMonths,
      isRecurring,
      dedication,
      isAnonymous,
      ambassadorId,
      ambassadorName,
      transactionId,
      receiptUrl,
      paymentMethod,
      donorName,
      phone,
      email,
    } = data;

    if (!campaignId || !donationId || !amount) {
      return { success: false, error: "חסרים נתונים להשלמת התרומה" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const donationRef = campaignRef.collection("donations").doc(donationId);

    // Atomic transaction to update donation status and increment total raised
    await adminDb.runTransaction(async (transaction) => {
      // 1. ALL READS FIRST
      const campaignSnap = await transaction.get(campaignRef);
      const campData = campaignSnap.data() || {};

      let ambSnap: any = null;
      let ambassadorRef: any = null;
      if (ambassadorId) {
        ambassadorRef = campaignRef.collection("ambassadors").doc(ambassadorId);
        ambSnap = await transaction.get(ambassadorRef);
      }

      // 2. ALL WRITES AFTER READS
      transaction.set(
        donationRef,
        {
          paymentStatus: "completed",
          transactionId: transactionId || "",
          receiptUrl: receiptUrl || "",
          paymentMethod: paymentMethod || (isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1"),
          completedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Increment campaign total raised and donor count
      transaction.set(
        campaignRef,
        {
          totalRaised: (campData.totalRaised || 0) + Number(amount),
          donorCount: (campData.donorCount || 0) + 1,
        },
        { merge: true }
      );

      // Increment ambassador totals if applicable
      if (ambassadorRef && ambSnap && ambSnap.exists) {
        const ambData = ambSnap.data();
        transaction.update(ambassadorRef, {
          totalRaised: (ambData?.totalRaised || 0) + Number(amount),
          donorCount: (ambData?.donorCount || 0) + 1,
        });
      }
    });

    // Update CRM Contact
    try {
      const campaignDoc = await campaignRef.get();
      const campaignTitle = campaignDoc.data()?.title || campaignId;

      if (contactId) {
        const contactDocRef = adminDb.collection("contacts").doc(contactId);
        const contactSnap = await contactDocRef.get();
        if (contactSnap.exists) {
          const contactData = contactSnap.data() || {};
          const currentPayments = contactData.payments || [];
          const updatedPayments = currentPayments.map((p: any) => {
            if (p.status === "pending") {
              return {
                ...p,
                status: "success",
                kesherStatus: "success",
                transactionId: transactionId || "",
                receiptLink: receiptUrl || "",
                method: paymentMethod || p.method,
                date: new Date().toISOString(),
              };
            }
            return p;
          });

          // Update donation history in contact
          const currentHistory = contactData.campaign_donations_history || [];
          const updatedHistory = currentHistory.map((h: any) => {
            if (h.id === donationId || h.paymentStatus === "pending") {
              return {
                ...h,
                paymentStatus: "completed",
                transactionId: transactionId || "",
                receiptUrl: receiptUrl || "",
                paymentMethod: paymentMethod || h.paymentMethod,
                date: new Date().toISOString(),
              };
            }
            return h;
          });

          await contactDocRef.set({
            lead_source: `תורם בקמפיין: ${campaignTitle}${isRecurring ? " (הוראת קבע)" : ""}`,
            campaign_payment_status: "completed",
            campaign_transaction_id: transactionId || "",
            campaign_receipt_url: receiptUrl || "",
            campaign_payment_method: paymentMethod || (isRecurring ? "kesher_standing_order" : "kesher_credit_card"),
            total_donated: (contactData.total_donated || 0) + Number(amount),
            total_spent: (contactData.total_spent || 0) + Number(amount),
            order_count: (contactData.order_count || 0) + 1,
            last_order_date: new Date().toISOString(),
            payments: updatedPayments,
            campaign_donations_history: updatedHistory,
            events: [
              ...(contactData.events || []),
              {
                title: `תרומה הושלמה בהצלחה בקמפיין ${campaignTitle}`,
                type: "donation",
                amount: Number(amount),
                date: new Date().toISOString(),
              }
            ],
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }
    } catch (crmErr) {
      console.warn("CRM complete donor sync warning:", crmErr);
    }

    revalidatePath(`/c/${campaignId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error completing donation:", error);
    return { success: false, error: error.message || "שגיאה בהשלמת תרומה" };
  }
}

/**
 * Mark a donation as failed if payment rejected by Kesher
 */
export async function failDonationAction(data: {
  campaignId: string;
  donationId: string;
  contactId?: string;
  error?: string;
}): Promise<{ success: boolean }> {
  try {
    const { campaignId, donationId, contactId, error } = data;
    if (campaignId && donationId) {
      await adminDb
        .collection("campaigns")
        .doc(campaignId)
        .collection("donations")
        .doc(donationId)
        .set({
          paymentStatus: "failed",
          paymentError: error || "התשלום נדחה",
          failedAt: new Date().toISOString(),
        }, { merge: true });
    }

    if (contactId) {
      const contactDocRef = adminDb.collection("contacts").doc(contactId);
      const contactSnap = await contactDocRef.get();
      if (contactSnap.exists) {
        const contactData = contactSnap.data() || {};
        const currentPayments = contactData.payments || [];
        const updatedPayments = currentPayments.map((p: any) => {
          if (p.status === "pending") {
            return {
              ...p,
              status: "failed",
              kesherStatus: "failed",
              error: error || "התשלום נדחה",
            };
          }
          return p;
        });

        await contactDocRef.set({
          campaign_payment_status: "failed",
          payments: updatedPayments,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    return { success: true };
  } catch (err) {
    console.warn("Error marking donation failed:", err);
    return { success: false };
  }
}

/**
 * Record a direct completed donation (e.g. from admin CRM manual entry)
 */
export async function recordDonationAction(data: {
  campaignId: string;
  donorName: string;
  amount: number;
  monthlyAmount?: number;
  recurringMonths?: number;
  isRecurring?: boolean;
  tier?: string;
  dedication?: string;
  isAnonymous?: boolean;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; donationId?: string; error?: string }> {
  try {
    const {
      campaignId,
      donorName,
      amount,
      monthlyAmount,
      recurringMonths,
      isRecurring,
      tier,
      dedication,
      isAnonymous,
      ambassadorId,
      ambassadorName,
      paymentMethod,
      transactionId,
      receiptUrl,
      phone,
      email,
    } = data;
    
    if (!campaignId || !amount || amount <= 0) {
      return { success: false, error: "סכום תרומה לא תקין" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    const donationRef = campaignRef.collection("donations").doc();

    const donationData = {
      campaignId,
      donorName: isAnonymous ? "אנונימי" : (donorName || "אנונימי"),
      realDonorName: donorName || "",
      amount: Number(amount),
      monthlyAmount: monthlyAmount ? Number(monthlyAmount) : undefined,
      recurringMonths: recurringMonths ? Number(recurringMonths) : undefined,
      isRecurring: Boolean(isRecurring),
      tier: tier || "",
      dedication: dedication || "",
      isAnonymous: Boolean(isAnonymous),
      ambassadorId: ambassadorId || null,
      ambassadorName: ambassadorName || null,
      paymentStatus: "completed",
      paymentMethod: paymentMethod || (isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1"),
      transactionId: transactionId || "",
      receiptUrl: receiptUrl || "",
      createdAt: new Date().toISOString(),
    };

    // Transaction to update total raised & donor count atomically
    await adminDb.runTransaction(async (transaction) => {
      // 1. ALL READS FIRST
      const campaignSnap = await transaction.get(campaignRef);
      const campData = campaignSnap.data() || {};

      let ambSnap: any = null;
      let ambassadorRef: any = null;
      if (ambassadorId) {
        ambassadorRef = campaignRef.collection("ambassadors").doc(ambassadorId);
        ambSnap = await transaction.get(ambassadorRef);
      }

      // 2. ALL WRITES AFTER READS
      transaction.set(donationRef, donationData);

      transaction.set(
        campaignRef,
        {
          totalRaised: (campData.totalRaised || 0) + Number(amount),
          donorCount: (campData.donorCount || 0) + 1,
        },
        { merge: true }
      );

      if (ambassadorRef && ambSnap && ambSnap.exists) {
        const ambData = ambSnap.data();
        transaction.update(ambassadorRef, {
          totalRaised: (ambData?.totalRaised || 0) + Number(amount),
          donorCount: (ambData?.donorCount || 0) + 1,
        });
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
        conta_name: donorName || (isAnonymous ? "אנונימי" : "תורם קמפיין"),
        conta_phone: phone || "",
        email: email || "",
        lead_source: `תורם בקמפיין: ${campaignTitle}${isRecurring ? " (הוראת קבע)" : ""}`,
        campaign_role: "donor",
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        campaign_donation_mode: isRecurring ? "recurring" : "one_time",
        campaign_amount: Number(amount),
        campaign_monthly_amount: monthlyAmount ? Number(monthlyAmount) : null,
        campaign_recurring_months: recurringMonths ? Number(recurringMonths) : null,
        campaign_tier: tier || "",

        campaign_is_anonymous: Boolean(isAnonymous),
        campaign_dedication: dedication || "",
        campaign_ambassador_name: ambassadorName || "",
        campaign_payment_status: "completed",
        campaign_payment_method: paymentMethod || (isRecurring ? "kesher_standing_order" : "kesher_credit_card"),
        campaign_transaction_id: transactionId || "",
        campaign_receipt_url: receiptUrl || "",
        referred_by_ambassador: ambassadorName || null,
        total_donated: Number(amount),
        total_spent: Number(amount),
        order_count: 1,
        last_order_date: new Date().toISOString(),
        monthly_amount: monthlyAmount || null,
        is_standing_order: Boolean(isRecurring),
        dedication: dedication || "",
        campaign_donations_history: [
          {
            id: donationRef.id,
            campaignId,
            campaignTitle,
            amount: Number(amount),
            monthlyAmount: monthlyAmount || null,
            recurringMonths: recurringMonths || null,
            isRecurring: Boolean(isRecurring),
            tier: tier || "",
            dedication: dedication || "",
            isAnonymous: Boolean(isAnonymous),
            ambassadorName: ambassadorName || "",
            paymentStatus: "completed",
            paymentMethod: paymentMethod || (isRecurring ? "kesher_standing_order" : "kesher_credit_card"),
            transactionId: transactionId || "",
            receiptUrl: receiptUrl || "",
            date: new Date().toISOString(),
          }
        ],
        payments: [
          {
            amount: Number(amount),
            monthlyAmount: monthlyAmount || null,
            isRecurring: Boolean(isRecurring),
            date: new Date().toISOString(),
            method: paymentMethod || "kesher_api",
            status: "success",
            kesherStatus: "success",
            transactionId: transactionId || "",
            receiptLink: receiptUrl || "",
          },
        ],
        events: [
          {
            title: `תרומה בקמפיין ${campaignTitle}`,
            type: "donation",
            amount: Number(amount),
            date: new Date().toISOString(),
          },
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

/**
 * Synchronize a CRM Contact's campaign fields with Firestore campaign documents
 * (donations collection, ambassadors collection, and campaign totalRaised/donorCount counters)
 */
export async function syncContactToCampaign(contactId: string, contactData: any) {
  try {
    const campaignId = contactData.campaign_id;
    if (!campaignId) return;

    const amount = Number(contactData.campaign_amount || 0);
    const role = contactData.campaign_role || "donor";
    const paymentStatus = contactData.campaign_payment_status || "completed";
    const isAnonymous = Boolean(contactData.campaign_is_anonymous);
    const donorName = contactData.conta_name || "תורם";
    const dedication = contactData.campaign_dedication || "";
    const ambassadorName = contactData.campaign_ambassador_name || "";
    const paymentMethod = contactData.campaign_payment_method || "kesher_credit_card";
    const transactionId = contactData.campaign_transaction_id || "";
    const receiptUrl = contactData.campaign_receipt_url || "";
    const isRecurring = contactData.campaign_donation_mode === "recurring";
    const monthlyAmount = contactData.campaign_monthly_amount;
    const recurringMonths = contactData.campaign_recurring_months;
    const tier = contactData.campaign_tier || "";

    const campaignRef = adminDb.collection("campaigns").doc(campaignId);
    
    // Ensure campaign document exists in Firestore
    const campSnap = await campaignRef.get();
    if (!campSnap.exists) {
      await campaignRef.set({
        id: campaignId,
        title: contactData.campaign_title || "קמפיין גיוס",
        targetGoal: Number(contactData.campaign_target_goal || 100000),
        totalRaised: 0,
        donorCount: 0,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 1. Sync Ambassador if applicable
    if (role === "ambassador" || (contactData.campaign_target_goal && Number(contactData.campaign_target_goal) > 0)) {
      const baseSlug = (contactData.conta_name || "ambassador").trim().toLowerCase().replace(/[\s\W]+/g, "-");
      const ambRef = campaignRef.collection("ambassadors").doc(`amb_${contactId}`);
      await ambRef.set({
        id: `amb_${contactId}`,
        campaignId,
        name: contactData.conta_name || "שגריר",
        slug: baseSlug,
        targetGoal: Number(contactData.campaign_target_goal || 10000),
        totalRaised: Number(contactData.campaign_total_raised || 0),
        phone: contactData.conta_phone || "",
        email: contactData.email || "",
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 2. Sync Donation if amount > 0
    if (amount > 0) {
      const donationDocRef = campaignRef.collection("donations").doc(`don_${contactId}`);
      const existingDonationSnap = await donationDocRef.get();
      const prevData = existingDonationSnap.exists ? existingDonationSnap.data() : null;
      const prevAmount = prevData?.paymentStatus === "completed" ? Number(prevData.amount || 0) : 0;
      const newCompletedAmount = paymentStatus === "completed" ? amount : 0;
      const amountDiff = newCompletedAmount - prevAmount;
      const donorCountDiff = (paymentStatus === "completed" ? 1 : 0) - (prevData?.paymentStatus === "completed" ? 1 : 0);

      const donationRecord = {
        id: `don_${contactId}`,
        campaignId,
        donorName: isAnonymous ? "אנונימי" : donorName,
        realDonorName: donorName,
        amount,
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
        recurringMonths: recurringMonths ? Number(recurringMonths) : null,
        isRecurring,
        tier,
        dedication,
        isAnonymous,
        ambassadorName: ambassadorName || null,
        paymentStatus,
        paymentMethod,
        transactionId,
        receiptUrl,
        createdAt: prevData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };


      await donationDocRef.set(donationRecord, { merge: true });

      // Update campaign totals if amountDiff or donorCountDiff is non-zero
      if (amountDiff !== 0 || donorCountDiff !== 0) {
        await adminDb.runTransaction(async (t) => {
          const cSnap = await t.get(campaignRef);
          const cData = cSnap.data() || {};
          const currentTotal = Number(cData.totalRaised || 0);
          const currentCount = Number(cData.donorCount || 0);

          t.set(
            campaignRef,
            {
              totalRaised: Math.max(0, currentTotal + amountDiff),
              donorCount: Math.max(0, currentCount + donorCountDiff),
            },
            { merge: true }
          );
        });
      }
    }

    revalidatePath(`/c/${campaignId}`);
    revalidatePath("/");
  } catch (err) {
    console.error("Error syncing contact to campaign:", err);
  }
}

/**
 * One-time / on-demand scan to sync all existing CRM contacts with campaign data into Firestore campaigns
 */
export async function syncAllExistingContactsToCampaigns(): Promise<{ syncedCount: number }> {
  try {
    const snap = await adminDb.collection("contacts").get();
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.campaign_id || (data.campaign_amount && Number(data.campaign_amount) > 0) || (data.total_donated && Number(data.total_donated) > 0)) {
        await syncContactToCampaign(doc.id, {
          campaign_id: data.campaign_id || "default-campaign",
          ...data,
        });
        count++;
      }
    }
    return { syncedCount: count };
  } catch (err) {
    console.error("Error syncing all contacts to campaigns:", err);
    return { syncedCount: 0 };
  }
}

/**
 * Get all completed donations and ambassadors for a campaign
 */
export async function getCampaignDonationsAction(campaignId: string): Promise<{ donations: Donation[]; ambassadors: Ambassador[] }> {
  try {
    const rawId = campaignId || "home";
    const idsToSearch = [rawId];
    if (rawId === "home" || rawId === "default-campaign") {
      if (!idsToSearch.includes("home")) idsToSearch.push("home");
      if (!idsToSearch.includes("default-campaign")) idsToSearch.push("default-campaign");
    }

    const allDonations: Donation[] = [];
    const allAmbassadors: Ambassador[] = [];

    for (const cid of idsToSearch) {
      try {
        const [donationsSnap, ambSnap] = await Promise.all([
          adminDb.collection("campaigns").doc(cid).collection("donations").get(),
          adminDb.collection("campaigns").doc(cid).collection("ambassadors").get(),
        ]);

        donationsSnap.docs.forEach((doc) => {
          const data = doc.data() as Donation;
          if (data.paymentStatus === "completed" && !allDonations.some(d => d.id === doc.id)) {
            allDonations.push({ id: doc.id, ...data });
          }
        });

        ambSnap.docs.forEach((doc) => {
          if (!allAmbassadors.some(a => a.id === doc.id)) {
            allAmbassadors.push({ id: doc.id, ...doc.data() } as Ambassador);
          }
        });
      } catch (err) {
        console.warn(`Error fetching subcollections for campaign ${cid}:`, err);
      }
    }

    // Sort newest first
    allDonations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { donations: allDonations, ambassadors: allAmbassadors };
  } catch (error) {
    console.error("Error in getCampaignDonationsAction:", error);
    return { donations: [], ambassadors: [] };
  }
}




