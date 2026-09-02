"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { Ambassador, Campaign, Donation } from "@/lib/types/campaign";
import { findExistingContact } from "@/features/crm/mergeContacts";

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
    const cleanSlug = decodeURIComponent(slug || "").trim();
    const targetCampaignId = (campaignId === "default-campaign" || campaignId === "home") ? "home" : campaignId;
    
    // 1. Query by slug in target campaign
    let snap = await adminDb
      .collection("campaigns")
      .doc(targetCampaignId)
      .collection("ambassadors")
      .where("slug", "==", cleanSlug)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as Ambassador;
    }

    // 2. Query by doc ID
    const byIdSnap = await adminDb
      .collection("campaigns")
      .doc(targetCampaignId)
      .collection("ambassadors")
      .doc(cleanSlug)
      .get();

    if (byIdSnap.exists) {
      return { id: byIdSnap.id, ...byIdSnap.data() } as Ambassador;
    }

    // 3. Fallback for default-campaign alias
    if (targetCampaignId === "home") {
      const fallbackSnap = await adminDb
        .collection("campaigns")
        .doc("default-campaign")
        .collection("ambassadors")
        .where("slug", "==", cleanSlug)
        .limit(1)
        .get();

      if (!fallbackSnap.empty) {
        const doc = fallbackSnap.docs[0];
        return { id: doc.id, ...doc.data() } as Ambassador;
      }
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

// Helper to retrieve drawerConfig for WhatsApp and custom branding
async function getCampaignDrawerConfig(campaignId: string) {
  try {
    const targetId = (campaignId === "default-campaign" || campaignId === "home") ? "home" : campaignId;
    const campDoc = await adminDb.collection("campaigns").doc(targetId).get();
    const campData = campDoc.data() || {};
    if (campData.drawerConfig) return campData.drawerConfig;

    const pageDoc = await adminDb.collection("pages").doc(targetId).get();
    const pageData = pageDoc.data();
    if (pageData?.campaignTiers?.drawerConfig) return pageData.campaignTiers.drawerConfig;

    const homeDoc = await adminDb.collection("pages").doc("home").get();
    return homeDoc.data()?.campaignTiers?.drawerConfig || {};
  } catch (e) {
    return {};
  }
}

// Helper to resolve dynamic placeholders in WhatsApp templates
function resolveDonationWhatsAppMessage(template: string, data: {
  donorName?: string;
  phone?: string;
  email?: string;
  amount: number | string;
  monthlyAmount?: number | string;
  recurringMonths?: number | string;
  isRecurring?: boolean;
  tier?: string;
  campaignTitle?: string;
  ambassadorName?: string;
  dedication?: string;
  receiptUrl?: string;
  paymentUrl?: string;
}): string {
  if (!template) return "";
  let msg = template;
  msg = msg.replace(/\{שם מלא\}/g, data.donorName || "ידיד/ת הקמפיין");
  msg = msg.replace(/\{טלפון\}|\{מספר טלפון נייד\}|\{מספר טלפון\}/g, data.phone || "");
  msg = msg.replace(/\{דוא"ל\}|\{כתובת אימייל\}|\{אימייל\}/g, data.email || "");
  msg = msg.replace(/\{סכום\}|\{סכום התרומה\}/g, String(data.amount || ""));
  msg = msg.replace(/\{סכום חודשי\}/g, String(data.monthlyAmount || data.amount || ""));
  msg = msg.replace(/\{מסלול\}|\{מסלול תרומה\}/g, data.tier || "");
  msg = msg.replace(/\{סוג תרומה\}/g, data.isRecurring ? `הוראת קבע (${data.recurringMonths || 12} חודשים)` : "תרומה חד פעמית");
  msg = msg.replace(/\{מספר חודשים\}/g, String(data.recurringMonths || (data.isRecurring ? 12 : 1)));
  msg = msg.replace(/\{שם קמפיין\}|\{קמפיין\}|\{עמוד\}/g, data.campaignTitle || "הקמפיין");
  msg = msg.replace(/\{שם שגריר\}|\{שגריר\}/g, data.ambassadorName || "");
  msg = msg.replace(/\{הקדשה\}|\{הקדשה \/ ברכה\}|\{ברכה\}/g, data.dedication || "");
  msg = msg.replace(/\{link_kabala\}|\{קישור לקבלה\}|\{קבלה\}/g, data.receiptUrl || "https://hakel.club/receipt");
  msg = msg.replace(/\{קישור לתשלום\}|\{link_tashlum\}|\{קישור להשלמת תשלום\}/g, data.paymentUrl || "");
  return msg;
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
  const fallbackDonationId = `pending-${Date.now()}`;
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

    const targetCampaignId = (!campaignId || campaignId === "default-campaign") ? "home" : campaignId;

    if (!amount || amount <= 0) {
      return { success: false, donationId: fallbackDonationId, error: "סכום תרומה לא תקין" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(targetCampaignId);
    let campaignTitle = targetCampaignId;
    let crmOwnerId = "1";

    try {
      const campaignDoc = await campaignRef.get();
      if (campaignDoc.exists) {
        campaignTitle = campaignDoc.data()?.title || targetCampaignId;
        crmOwnerId = campaignDoc.data()?.ownerId || "1";
      }
    } catch (e) {
      console.warn("Could not read campaign doc for pending donation:", e);
    }

    const donationRef = campaignRef.collection("donations").doc();
    const donationData: any = {
      campaignId: targetCampaignId,
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

    try {
      await donationRef.set(donationData);
    } catch (setErr) {
      console.warn("Error setting pending donation doc:", setErr);
    }

    // Save or update contact in CRM with status "ממתין לתשלום"
    let contactId = "";
    try {
      const existing = await findExistingContact(crmOwnerId, phone, email);

      const donationHistoryItem = {
        id: donationRef.id,
        campaignId: targetCampaignId,
        campaignTitle,
        amount: Number(amount),
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
        recurringMonths: recurringMonths ? Number(recurringMonths) : null,
        isRecurring: Boolean(isRecurring),
        tier: tier || "",
        dedication: dedication || "",
        isAnonymous: Boolean(isAnonymous),
        ambassadorName: ambassadorName || "",
        paymentStatus: "pending" as const,
        paymentMethod: isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1",
        date: new Date().toISOString(),
      };

      const paymentItem = {
        amount: Number(amount),
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
        isRecurring: Boolean(isRecurring),
        date: new Date().toISOString(),
        method: isRecurring ? "kesher_standing_order" : "kesher_credit_card",
        status: "pending",
        kesherStatus: "pending_payment",
      };

      const eventItem = {
        title: `מעבר לעמוד תשלום בקמפיין ${campaignTitle} (ממתין לתשלום)`,
        type: "donation_pending",
        amount: Number(amount),
        date: new Date().toISOString(),
      };

      if (existing) {
        contactId = existing.id;
        const currentHist = existing.data.campaign_donations_history || [];
        const currentPayments = existing.data.payments || [];
        const currentEvents = existing.data.events || [];

        await adminDb.collection("contacts").doc(existing.id).update({
          conta_name: existing.data.conta_name && existing.data.conta_name !== "אנונימי" && existing.data.conta_name !== "תורם קמפיין" 
            ? existing.data.conta_name 
            : (donorName || existing.data.conta_name || "תורם קמפיין"),
          email: existing.data.email || email || "",
          conta_phone: existing.data.conta_phone || phone || "",
          campaign_amount: (Number(existing.data.campaign_amount || 0) + Number(amount)),
          campaign_donations_history: [donationHistoryItem, ...currentHist],
          payments: [paymentItem, ...currentPayments],
          events: [eventItem, ...currentEvents],
          updatedAt: new Date().toISOString(),
        });
      } else {
        const contactRef = await adminDb.collection("contacts").add({
          ownerId: crmOwnerId,
          status: "active",
          conta_name: donorName || (isAnonymous ? "אנונימי" : "תורם קמפיין"),
          conta_phone: phone || "",
          email: email || "",
          lead_source: `תורם בקמפיין: ${campaignTitle}${isRecurring ? " (הוראת קבע)" : ""} - ממתין לתשלום`,
          campaign_role: "donor",
          campaign_id: targetCampaignId,
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
          campaign_donations_history: [donationHistoryItem],
          payments: [paymentItem],
          events: [eventItem],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        contactId = contactRef.id;
      }

      // Schedule 5-minute delayed WhatsApp reminder check
      if (phone) {
        const scheduledDonationId = donationRef.id;
        const scheduledContactId = contactId;
        setTimeout(async () => {
          try {
            const snap = await adminDb
              .collection("campaigns")
              .doc(targetCampaignId)
              .collection("donations")
              .doc(scheduledDonationId)
              .get();

            if (!snap.exists) return;
            const don = snap.data();
            if (!don || don.paymentStatus !== "pending" || don.pendingWhatsAppSent) {
              return; // Already paid or already sent
            }

            const drawerConfig = await getCampaignDrawerConfig(targetCampaignId);
            if (drawerConfig.whatsapp_enabled === false) return;

            const pendingTemplate = drawerConfig.whatsapp_pending_message || "שלום {שם מלא}, שמנו לב שהתחלת תרומה בסך ₪{סכום} עבור {שם קמפיין} אך התהליך טרם הושלם. לחץ כאן להשלמת התרומה: {קישור לתשלום}";
            const paymentUrl = `${process.env.NEXTAUTH_URL || "https://kampin.web.app"}/c/${targetCampaignId}?openDonate=true`;

            const resolvedMsg = resolveDonationWhatsAppMessage(pendingTemplate, {
              donorName: isAnonymous ? "ידיד/ת הקמפיין" : (donorName || "ידיד/ת הקמפיין"),
              phone,
              email,
              amount,
              monthlyAmount,
              recurringMonths,
              isRecurring,
              tier: tier || "",
              campaignTitle,
              ambassadorName: ambassadorName || "",
              dedication,
              paymentUrl,
            });

            const { sendWhatsAppMessage, sendWhatsAppFileByUrl } = await import("@/features/whatsapp/actions");
            if (drawerConfig.whatsapp_pending_image_url) {
              await sendWhatsAppFileByUrl(phone, drawerConfig.whatsapp_pending_image_url, "reminder.png", resolvedMsg);
            } else {
              await sendWhatsAppMessage(phone, resolvedMsg);
            }

            await snap.ref.update({
              pendingWhatsAppSent: true,
              pendingWhatsAppSentAt: new Date().toISOString(),
            });

            if (scheduledContactId) {
              await adminDb.collection("contacts").doc(scheduledContactId).update({
                events: adminDb.FieldValue.arrayUnion({
                  time: new Date().toISOString(),
                  title: "הודעת WhatsApp תזכורת (5 דק' בממתין)",
                  text: `נשלחה תזכורת לנייד ${phone}: "${resolvedMsg}"`,
                }),
              });
            }
          } catch (delayedErr) {
            console.warn("Delayed pending WhatsApp reminder error:", delayedErr);
          }
        }, 5 * 60 * 1000);
      }
    } catch (crmErr) {
      console.warn("CRM pending donor sync warning:", crmErr);
    }

    return { success: true, donationId: donationRef.id, contactId };
  } catch (error: any) {
    console.error("Error recording pending donation:", error);
    return { success: true, donationId: fallbackDonationId };
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

    const targetCampaignId = (!campaignId || campaignId === "default-campaign") ? "home" : campaignId;

    if (!donationId || !amount) {
      return { success: false, error: "חסרים נתונים להשלמת התרומה" };
    }

    console.log("===> [Campaign Server] completeDonationAction triggered:", {
      targetCampaignId,
      donationId,
      amount,
      phone,
      donorName,
      paymentMethod,
    });

    const campaignRef = adminDb.collection("campaigns").doc(targetCampaignId);
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
          donorName: isAnonymous ? "אנונימי" : (donorName || "תורם"),
          amount: Number(amount),
          monthlyAmount: isRecurring ? (monthlyAmount || amount) : undefined,
          recurringMonths: isRecurring ? (recurringMonths || 1) : 1,
          isRecurring: Boolean(isRecurring),
          dedication: dedication || "",
          isAnonymous: Boolean(isAnonymous),
          ambassadorId: ambassadorId || null,
          ambassadorName: ambassadorName || null,
          phone: phone || "",
          email: email || "",
          paymentStatus: "completed",
          transactionId: transactionId || "",
          receiptUrl: receiptUrl || "",
          paymentMethod: paymentMethod || (isRecurring ? "kesher_standing_order_creditType_10" : "kesher_credit_card_creditType_1"),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
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
    let campaignTitle = campaignId;
    try {
      const campaignDoc = await campaignRef.get();
      campaignTitle = campaignDoc.data()?.title || campaignId;

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

    // Send automated WhatsApp success message via GREEN-API
    const donorPhone = phone || (contactId ? (await adminDb.collection("contacts").doc(contactId).get()).data()?.conta_phone : "");
    console.log("===> [WhatsApp Server] Processing WhatsApp notification for completed donation:", { donorPhone, targetCampaignId });

    if (donorPhone) {
      try {
        const drawerConfig = await getCampaignDrawerConfig(targetCampaignId);
        console.log("===> [WhatsApp Server] Fetched drawerConfig for WhatsApp:", {
          whatsapp_enabled: drawerConfig.whatsapp_enabled,
          has_success_message: !!drawerConfig.whatsapp_success_message,
          has_success_image: !!drawerConfig.whatsapp_success_image_url,
        });

        if (drawerConfig.whatsapp_enabled !== false) {
          const successTemplate = drawerConfig.whatsapp_success_message || "שלום {שם מלא}, תודה רבה על תרומתך בסך ₪{סכום} עבור {שם קמפיין}! תזכו למצוות ולברכה.";
          const resolvedMsg = resolveDonationWhatsAppMessage(successTemplate, {
            donorName: isAnonymous ? "תורם יקר" : (donorName || "תורם יקר"),
            phone: donorPhone,
            email,
            amount,
            monthlyAmount,
            recurringMonths,
            isRecurring,
            tier: dedication || "",
            campaignTitle,
            ambassadorName: ambassadorName || "",
            dedication,
            receiptUrl: receiptUrl || "https://hakel.club/receipt",
          });

          console.log("===> [WhatsApp Server] Sending WhatsApp message via Green API to:", donorPhone, "Message:", resolvedMsg);

          const { sendWhatsAppMessage, sendWhatsAppFileByUrl } = await import("@/features/whatsapp/actions");
          if (drawerConfig.whatsapp_success_image_url) {
            await sendWhatsAppFileByUrl(donorPhone, drawerConfig.whatsapp_success_image_url, "thank-you.png", resolvedMsg);
          } else {
            await sendWhatsAppMessage(donorPhone, resolvedMsg);
          }

          console.log("===> [WhatsApp Server] Successfully sent WhatsApp message to:", donorPhone);

          if (contactId) {
            await adminDb.collection("contacts").doc(contactId).update({
              events: adminDb.FieldValue.arrayUnion({
                time: new Date().toISOString(),
                title: "הודעת WhatsApp תודה נשלחה (תרומה הושלמה)",
                text: `נשלחה הודעת תודה לנייד ${donorPhone}: "${resolvedMsg}"`,
              }),
            });
          }
        } else {
          console.log("===> [WhatsApp Server] WhatsApp notifications are disabled in drawerConfig.");
        }
      } catch (waErr) {
        console.error("===> [WhatsApp Server] WhatsApp success notification error:", waErr);
      }
    } else {
      console.warn("===> [WhatsApp Server] No donor phone found for WhatsApp notification!");
    }

    revalidatePath(`/c/${targetCampaignId}`);
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
    
    const targetCampaignId = (!campaignId || campaignId === "default-campaign") ? "home" : campaignId;

    if (!amount || amount <= 0) {
      return { success: false, error: "סכום תרומה לא תקין" };
    }

    const campaignRef = adminDb.collection("campaigns").doc(targetCampaignId);
    const donationRef = campaignRef.collection("donations").doc();

    const donationData = {
      campaignId: targetCampaignId,
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
    let campaignTitle = campaignId;
    try {
      const campaignDoc = await campaignRef.get();
      campaignTitle = campaignDoc.data()?.title || campaignId;
      const crmOwnerId = campaignDoc.data()?.ownerId || "1";

      const existing = await findExistingContact(crmOwnerId, phone, email);

      const donationHistoryItem = {
        id: donationRef.id,
        campaignId,
        campaignTitle,
        amount: Number(amount),
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
        recurringMonths: recurringMonths ? Number(recurringMonths) : null,
        isRecurring: Boolean(isRecurring),
        tier: tier || "",
        dedication: dedication || "",
        isAnonymous: Boolean(isAnonymous),
        ambassadorName: ambassadorName || "",
        paymentStatus: "completed" as const,
        paymentMethod: paymentMethod || (isRecurring ? "kesher_standing_order" : "kesher_credit_card"),
        transactionId: transactionId || "",
        receiptUrl: receiptUrl || "",
        date: new Date().toISOString(),
      };

      const paymentItem = {
        amount: Number(amount),
        monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
        isRecurring: Boolean(isRecurring),
        date: new Date().toISOString(),
        method: paymentMethod || "kesher_api",
        status: "success",
        kesherStatus: "success",
        transactionId: transactionId || "",
        receiptLink: receiptUrl || "",
      };

      const eventItem = {
        title: `תרומה בקמפיין ${campaignTitle}`,
        type: "donation",
        amount: Number(amount),
        date: new Date().toISOString(),
      };

      if (existing) {
        const currentHist = existing.data.campaign_donations_history || [];
        const currentPayments = existing.data.payments || [];
        const currentEvents = existing.data.events || [];

        await adminDb.collection("contacts").doc(existing.id).update({
          conta_name: existing.data.conta_name && existing.data.conta_name !== "אנונימי" && existing.data.conta_name !== "תורם קמפיין"
            ? existing.data.conta_name
            : (donorName || existing.data.conta_name || "תורם קמפיין"),
          email: existing.data.email || email || "",
          conta_phone: existing.data.conta_phone || phone || "",
          lead_source: `תורם בקמפיין: ${campaignTitle}${isRecurring ? " (הוראת קבע)" : ""}`,
          campaign_role: "donor",
          campaign_id: campaignId,
          campaign_title: campaignTitle,
          campaign_payment_status: "completed",
          total_donated: (Number(existing.data.total_donated || 0) + Number(amount)),
          total_spent: (Number(existing.data.total_spent || 0) + Number(amount)),
          campaign_amount: (Number(existing.data.campaign_amount || 0) + Number(amount)),
          order_count: (Number(existing.data.order_count || 0) + 1),
          last_order_date: new Date().toISOString(),
          campaign_donations_history: [donationHistoryItem, ...currentHist],
          payments: [paymentItem, ...currentPayments],
          events: [eventItem, ...currentEvents],
          updatedAt: new Date().toISOString(),
        });
      } else {
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
          campaign_donations_history: [donationHistoryItem],
          payments: [paymentItem],
          events: [eventItem],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (crmErr) {
      console.warn("CRM complete donor sync warning:", crmErr);
    }

    // Send automated WhatsApp success message via GREEN-API
    if (phone) {
      try {
        const drawerConfig = await getCampaignDrawerConfig(targetCampaignId);
        if (drawerConfig.whatsapp_enabled !== false) {
          const successTemplate = drawerConfig.whatsapp_success_message || "שלום {שם מלא}, תודה רבה על תרומתך בסך ₪{סכום} עבור {שם קמפיין}! תזכו למצוות ולברכה.";
          const resolvedMsg = resolveDonationWhatsAppMessage(successTemplate, {
            donorName: isAnonymous ? "תורם יקר" : (donorName || "תורם יקר"),
            phone,
            email,
            amount,
            monthlyAmount,
            recurringMonths,
            isRecurring,
            tier: tier || "",
            campaignTitle,
            ambassadorName: ambassadorName || "",
            dedication,
            receiptUrl: receiptUrl || "https://hakel.club/receipt",
          });

          console.log("===> [WhatsApp Server] recordDonationAction sending WhatsApp to:", phone, "Msg:", resolvedMsg);

          const { sendWhatsAppMessage, sendWhatsAppFileByUrl } = await import("@/features/whatsapp/actions");
          if (drawerConfig.whatsapp_success_image_url) {
            await sendWhatsAppFileByUrl(phone, drawerConfig.whatsapp_success_image_url, "thank-you.png", resolvedMsg);
          } else {
            await sendWhatsAppMessage(phone, resolvedMsg);
          }

          console.log("===> [WhatsApp Server] recordDonationAction successfully sent WhatsApp to:", phone);
        }
      } catch (waErr) {
        console.error("===> [WhatsApp Server] recordDonationAction WhatsApp notification error:", waErr);
      }
    }

    revalidatePath(`/c/${targetCampaignId}`);
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

    // Fetch contacts map to detect orphaned or trashed donations
    const activeContactsMap = new Map<string, boolean>();
    try {
      const contactsSnap = await adminDb.collection("contacts").get();
      contactsSnap.docs.forEach((cDoc) => {
        const cData = cDoc.data();
        const isLive = cData.status !== "trashed";
        activeContactsMap.set(cDoc.id, isLive);
        if (cData.phone) activeContactsMap.set(cData.phone, isLive);
        if (cData.email) activeContactsMap.set(cData.email, isLive);
      });
    } catch (cErr) {
      console.warn("Could not prefetch contacts map:", cErr);
    }

    for (const cid of idsToSearch) {
      try {
        const [donationsSnap, ambSnap] = await Promise.all([
          adminDb.collection("campaigns").doc(cid).collection("donations").get(),
          adminDb.collection("campaigns").doc(cid).collection("ambassadors").get(),
        ]);

        for (const doc of donationsSnap.docs) {
          const data = doc.data() as any;
          if (data.paymentStatus === "completed") {
            let shouldRemove = false;
            if (data.contactId && activeContactsMap.has(data.contactId) && !activeContactsMap.get(data.contactId)) {
              shouldRemove = true;
            } else if (data.phone && activeContactsMap.has(data.phone) && !activeContactsMap.get(data.phone)) {
              shouldRemove = true;
            }

            if (shouldRemove) {
              await doc.ref.delete().catch(() => {});
              continue;
            }

            if (!allDonations.some(d => d.id === doc.id)) {
              allDonations.push({ id: doc.id, ...data });
            }
          }
        }

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




