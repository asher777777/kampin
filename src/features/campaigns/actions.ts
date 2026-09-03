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
  name: string; // שם הקהילה
  leaderName?: string; // שם מוביל הקהילה
  targetGoal: number;
  message?: string; // חזון הקהילה
  gallery?: string[];
  customSlug?: string;
  phone?: string;
  email?: string;
  ownerId?: string;
}): Promise<{ success: boolean; ambassador?: Ambassador; error?: string }> {
  try {
    const { campaignId, name, leaderName, targetGoal, message, gallery, customSlug, phone, email, ownerId } = data;
    if (!campaignId || !name || !targetGoal) {
      return { success: false, error: "חסרים שדות חובה" };
    }

    // 1. Generate unique English-only slug
    let baseSlug = "";
    if (customSlug && customSlug.trim()) {
      baseSlug = customSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    
    if (!baseSlug) {
      baseSlug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "") || `leader-${Date.now().toString().slice(-4)}`;
    }
    
    let slug = baseSlug;
    let counter = 1;

    // Check slug uniqueness across campaign ambassadors
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
      name: name.trim(),
      leaderName: (leaderName && leaderName.trim()) || name.trim(),
      slug,
      targetGoal: Number(targetGoal),
      totalRaised: 0,
      donorCount: 0,
      message: message || "",
      vision: message || "",
      gallery: gallery || [],
      phone: phone || "",
      email: email || "",
      createdAt: new Date().toISOString(),
    };

    await docRef.set(ambassadorData);

    // 2. Fetch campaign data and owner ID
    const campaignDoc = await adminDb.collection("campaigns").doc(campaignId).get();
    const campaignData = campaignDoc.exists ? campaignDoc.data() : {};
    const campaignTitle = campaignData?.title || campaignId;
    const crmOwnerId = ownerId || campaignData?.ownerId || "1";

    // 3. Create Community in crm_groups for the community leader
    try {
      const communityId = `leader-${docRef.id}`;
      const groupData = {
        id: communityId,
        name: name.trim(),
        leaderName: (leaderName && leaderName.trim()) || name.trim(),
        color: "#4f46e5",
        description: message || `קהילת ${name.trim()} - קמפיין ${campaignTitle}`,
        type: "manual",
        ownerId: crmOwnerId,
        gallery: gallery || [],
        vision: message || "",
        purpose: "",
        pageId: slug,
        pageSlug: slug,
        pageUrl: `/${slug}`,
        mainCampaignId: campaignId,
        campaignTitle: campaignTitle,
        rules: [],
        matchType: "all",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await adminDb
        .collection("users")
        .doc(crmOwnerId)
        .collection("crm_groups")
        .doc(communityId)
        .set(groupData, { merge: true });
    } catch (grpErr) {
      console.warn("Could not create crm_group for community leader:", grpErr);
    }

    // 4. Create Community Page in 'pages' collection
    try {
      let inheritedVideoGallery: any = campaignData?.videoGallery || null;
      let inheritedTiers: any = campaignData?.campaignTiers || null;

      if (!inheritedVideoGallery) {
        try {
          const homeDoc = await adminDb.collection("pages").doc("home").get();
          if (homeDoc.exists) {
            inheritedVideoGallery = homeDoc.data()?.videoGallery || null;
            if (!inheritedTiers) inheritedTiers = homeDoc.data()?.campaignTiers || null;
          }
        } catch (homeErr) {
          console.warn("Home config fetch error:", homeErr);
        }
      }

      const leaderHeroImage = gallery && gallery.length > 0 ? gallery[0] : (inheritedVideoGallery?.images?.[0] || "");
      const leaderSecondaryImage = gallery && gallery.length > 1 ? gallery[1] : leaderHeroImage;

      const pageDocData = {
        id: slug,
        ownerId: crmOwnerId,
        title: name.trim(),
        leaderName: (leaderName && leaderName.trim()) || name.trim(),
        slug: slug,
        collectionName: "pages",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seo: {
          title: `${name.trim()} | קמפיין ${campaignTitle}`,
          description: message || `עמוד קהילת ${name.trim()} בקמפיין ${campaignTitle}`,
        },
        sectionOrder: [
          "videoGallery",
          "richContent",
          "campaignTiers",
          "campaignHeader",
          "campaignDonors",
          "hero",
          "mainContent",
          "services",
          "community",
          "pricing",
          "livePosts",
          "faq",
          "timer",
          "landingSection",
          "contact"
        ],
        // 1. Video & Media Gallery
        videoGallery: {
          visible: true,
          anchorId: "videoGallery",
          images: (inheritedVideoGallery?.images && inheritedVideoGallery.images.length > 0)
            ? inheritedVideoGallery.images
            : (gallery || []),
          videoUrl: inheritedVideoGallery?.videoUrl || "",
          videoType: inheritedVideoGallery?.videoType || "youtube",
          effect: inheritedVideoGallery?.effect || "fade",
          objectFit: inheritedVideoGallery?.objectFit || "cover",
          desktopHeight: inheritedVideoGallery?.desktopHeight || "500px"
        },
        // 2. Rich Content / About Section: כותרת הקהילה והחזון
        richContent: {
          visible: true,
          anchorId: "richContent",
          heading: name.trim(),
          title: name.trim(),
          body: message || `ברוכים הבאים לעמוד קהילת ${name.trim()} בקמפיין ${campaignTitle}`,
          layout: "classic"
        },
        // 3. Campaign Tiers
        campaignTiers: {
          visible: true,
          anchorId: "campaignTiers",
          campaignId: campaignId,
          donationType: inheritedTiers?.donationType || "both",
          tiers: inheritedTiers?.tiers || [
            { id: "tier-1", name: "שותף", amount: 180, description: "השתתפות בפעילות הקהילה" },
            { id: "tier-2", name: "תומך", amount: 360, description: "תמיכה שנתית בפעילות" },
            { id: "tier-3", name: "ידיד", amount: 770, description: "זכות שותפות מורחבת" },
            { id: "tier-4", name: "פטרון", amount: 1800, description: "פטרון הקהילה" }
          ]
        },
        // 4. Campaign Header
        campaignHeader: {
          visible: true,
          anchorId: "campaignHeader",
          campaignId: campaignId,
          ambassadorSlug: slug,
          ambassadorName: name.trim()
        },
        // 5. Campaign Donors
        campaignDonors: {
          visible: true,
          anchorId: "campaignDonors",
          campaignId: campaignId,
          ambassadorSlug: slug,
          ambassadorName: name.trim(),
          campaignDescription: message || ""
        },
        // 6. Hero Section (מוסתר כברירת מחדל)
        hero: {
          visible: false,
          anchorId: "hero",
          title: name.trim(),
          subtitle: message || `קהילת ${name.trim()} - קמפיין ${campaignTitle}`,
          description: `הצטרפו לתמיכה ביעד של ₪${Number(targetGoal).toLocaleString()}`,
          imageSrc: leaderHeroImage,
          layout: "progressive",
          buttonsVisible: false,
          heroStyle: "hero",
          flexDirection: "col"
        },
        // 7. Main Content Section (מוסתר כברירת מחדל)
        mainContent: {
          visible: false,
          anchorId: "mainContent",
          title: name.trim(),
          subtitle: message ? "חזון מוביל הקהילה" : "אודות היעד האישי",
          description: message || `הצטרפו לתמיכה בקמפיין ${campaignTitle}`,
          imageSrc: leaderSecondaryImage,
          layout: "course-banner"
        },
        // 8-15. Other Sections (מוסתרים)
        services: { visible: false, items: [] },
        community: { visible: false, title: name.trim(), description: "", gallery: gallery || [] },
        pricing: { visible: false, packages: [] },
        livePosts: { visible: false },
        faq: { visible: false, items: [] },
        timer: { visible: false },
        landingSection: { visible: false },
        contact: { visible: false }
      };

      await adminDb.collection("pages").doc(slug).set(pageDocData, { merge: true });
    } catch (pageErr) {
      console.warn("Could not auto-create community page for leader:", pageErr);
    }

    // 5. Sync to CRM contacts collection for the community leader
    try {
      const contactPersonName = (leaderName && leaderName.trim()) || name.trim();
      await adminDb.collection("contacts").add({
        ownerId: crmOwnerId,
        status: "active",
        conta_name: contactPersonName,
        conta_phone: phone || "",
        email: email || "",
        lead_source: `מוביל קהילת ${name.trim()} בקמפיין: ${campaignTitle}`,
        campaign_role: "ambassador",
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        campaign_ambassador_slug: slug,
        campaign_target_goal: Number(targetGoal),
        campaign_total_raised: 0,
        tags: [name.trim(), contactPersonName].filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (crmErr) {
      console.warn("CRM leader sync warning:", crmErr);
    }

    revalidatePath(`/c/${campaignId}`);
    revalidatePath(`/dashboard/crm/groups`);
    revalidatePath(`/dashboard/crm`);

    return {
      success: true,
      ambassador: { id: docRef.id, ...ambassadorData } as Ambassador,
    };
  } catch (error: any) {
    console.error("Error creating ambassador:", error);
    return { success: false, error: error.message || "שגיאה ביצירת מוביל קהילה" };
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
        const ambassadorTag = ambassadorName ? ambassadorName.trim() : "";
        let currentTags: string[] = Array.isArray(existing.data.tags) ? existing.data.tags : [];
        if (ambassadorTag && !currentTags.includes(ambassadorTag)) {
          currentTags = [...currentTags, ambassadorTag];
        }

        await adminDb.collection("contacts").doc(existing.id).update({
          conta_name: existing.data.conta_name && existing.data.conta_name !== "אנונימי" && existing.data.conta_name !== "תורם קמפיין" 
            ? existing.data.conta_name 
            : (donorName || existing.data.conta_name || "תורם קמפיין"),
          email: existing.data.email || email || "",
          conta_phone: existing.data.conta_phone || phone || "",
          tags: currentTags,
          campaign_amount: (Number(existing.data.campaign_amount || 0) + Number(amount)),
          campaign_donations_history: [donationHistoryItem, ...currentHist],
          payments: [paymentItem, ...currentPayments],
          events: [eventItem, ...currentEvents],
          updatedAt: new Date().toISOString(),
        });
      } else {
        const ambassadorTag = ambassadorName ? ambassadorName.trim() : "";
        const contactRef = await adminDb.collection("contacts").add({
          ownerId: crmOwnerId,
          status: "active",
          conta_name: donorName || (isAnonymous ? "אנונימי" : "תורם קמפיין"),
          conta_phone: phone || "",
          email: email || "",
          tags: ambassadorTag ? [ambassadorTag] : [],
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

      // Invalidate previous pending donations for this phone in this campaign so they never trigger duplicate reminders
      if (phone) {
        try {
          const oldPendingSnap = await campaignRef.collection("donations")
            .where("phone", "==", phone)
            .where("paymentStatus", "==", "pending")
            .get();
          
          for (const oldDoc of oldPendingSnap.docs) {
            if (oldDoc.id !== donationRef.id) {
              await oldDoc.ref.update({
                pendingWhatsAppSent: true,
                superseded: true,
              });
            }
          }
        } catch (e) {}
      }

      // Schedule 5-minute delayed WhatsApp reminder check (Single send guaranteed)
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
              return; // Already paid, cancelled or already sent
            }

            // Check contact 24h cooldown to guarantee only 1 reminder ever sent
            if (scheduledContactId) {
              const cSnap = await adminDb.collection("contacts").doc(scheduledContactId).get();
              const cData = cSnap.data();
              if (cData?.lastPendingWhatsAppSentAt) {
                const diffMs = Date.now() - new Date(cData.lastPendingWhatsAppSentAt).getTime();
                if (diffMs < 24 * 60 * 60 * 1000) {
                  console.log("===> [WhatsApp Server] Cooldown: pending reminder already sent in last 24h to:", phone);
                  await snap.ref.update({ pendingWhatsAppSent: true });
                  return;
                }
              }
            }

            const drawerConfig = await getCampaignDrawerConfig(targetCampaignId);
            if (drawerConfig.whatsapp_enabled === false) {
              await snap.ref.update({ pendingWhatsAppSent: true });
              return;
            }

            // Mark as sent BEFORE sending (atomic guard to prevent duplicate concurrent triggers)
            await snap.ref.update({
              pendingWhatsAppSent: true,
              pendingWhatsAppSentAt: new Date().toISOString(),
            });

            if (scheduledContactId) {
              await adminDb.collection("contacts").doc(scheduledContactId).update({
                lastPendingWhatsAppSentAt: new Date().toISOString(),
              });
            }

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

            console.log("===> [WhatsApp Server] Sending single pending reminder to:", phone);

            const { sendWhatsAppMessage, sendWhatsAppFileByUrl } = await import("@/features/whatsapp/actions");
            if (drawerConfig.whatsapp_pending_image_url) {
              await sendWhatsAppFileByUrl(phone, drawerConfig.whatsapp_pending_image_url, "reminder.png", resolvedMsg);
            } else {
              await sendWhatsAppMessage(phone, resolvedMsg);
            }

            if (scheduledContactId) {
              await adminDb.collection("contacts").doc(scheduledContactId).update({
                events: adminDb.FieldValue.arrayUnion({
                  time: new Date().toISOString(),
                  title: "הודעת WhatsApp תזכורת (נשלחה פעם אחת)",
                  text: `נשלחה תזכורת יחידה לנייד ${phone}: "${resolvedMsg}"`,
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
        const ambassadorTag = ambassadorName ? ambassadorName.trim() : "";
        let currentTags: string[] = Array.isArray(existing.data.tags) ? existing.data.tags : [];
        if (ambassadorTag && !currentTags.includes(ambassadorTag)) {
          currentTags = [...currentTags, ambassadorTag];
        }

        await adminDb.collection("contacts").doc(existing.id).update({
          conta_name: existing.data.conta_name && existing.data.conta_name !== "אנונימי" && existing.data.conta_name !== "תורם קמפיין"
            ? existing.data.conta_name
            : (donorName || existing.data.conta_name || "תורם קמפיין"),
          email: existing.data.email || email || "",
          conta_phone: existing.data.conta_phone || phone || "",
          tags: currentTags,
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
        const ambassadorTag = ambassadorName ? ambassadorName.trim() : "";
        await adminDb.collection("contacts").add({
          ownerId: crmOwnerId,
          status: "active",
          conta_name: donorName || (isAnonymous ? "אנונימי" : "תורם קמפיין"),
          conta_phone: phone || "",
          email: email || "",
          tags: ambassadorTag ? [ambassadorTag] : [],
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

    // 1. Fetch CRM communities strictly linked to THIS campaign first
    const linkedGroupNames = new Set<string>();
    const allCrmGroupsMap = new Map<string, any>();
    const INVALID_COMMUNITIES_FILTER = new Set(["באולם", "בחוץ", "באולם ", "בחוץ ", "0", "2160", "4320"]);

    try {
      const crmGroupsSnap = await adminDb.collectionGroup("crm_groups").get();
      crmGroupsSnap.docs.forEach((doc) => {
        const gData = doc.data();
        if (!gData.name || !gData.name.trim()) return;
        const gName = gData.name.trim();
        if (INVALID_COMMUNITIES_FILTER.has(gName) || /^\d+$/.test(gName)) return;

        allCrmGroupsMap.set(gName, gData);
        if (gData.id) allCrmGroupsMap.set(gData.id, gData);

        const gMainCamp = (gData.mainCampaignId || "").trim();

        // Strict campaign linkage: ONLY if explicitly assigned to this campaign
        const isLinked =
          (rawId === "home" || rawId === "default-campaign" || rawId === "/")
            ? (gMainCamp === "home" || gMainCamp === "/" || gMainCamp === "default-campaign")
            : (gMainCamp === rawId || gMainCamp === `🎯 ${rawId}` || gMainCamp === `/c/${rawId}` || gMainCamp.includes(rawId));

        if (isLinked) {
          linkedGroupNames.add(gName);
          const ambSlug = gData.pageSlug || gData.pageId || `comm-${doc.id}`;
          const ambObj: Ambassador = {
            id: doc.id,
            name: gName,
            leaderName: gData.leaderName || gName,
            slug: ambSlug,
            targetGoal: Number(gData.targetGoal || 5000),
            totalRaised: 0,
            donorCount: 0,
            message: gData.vision || gData.description || "",
            gallery: gData.gallery || [],
            campaignId: rawId,
            pageUrl: gData.pageUrl || `/${ambSlug}`,
            createdAt: gData.createdAt || new Date().toISOString()
          };

          const existingIdx = allAmbassadors.findIndex(
            a => a.id === doc.id || a.slug === ambSlug || a.name === gName
          );

          if (existingIdx === -1) {
            allAmbassadors.push(ambObj);
          } else {
            allAmbassadors[existingIdx] = {
              ...ambObj,
              ...allAmbassadors[existingIdx],
              pageUrl: gData.pageUrl || allAmbassadors[existingIdx].pageUrl
            };
          }
        }
      });
    } catch (crmErr) {
      console.warn("Error fetching collectionGroup crm_groups in getCampaignDonationsAction:", crmErr);
    }

    // 2. Fetch contacts map to detect active donors and their community affiliation
    const activeContactsMap = new Map<string, boolean>();
    const contactByPhoneMap = new Map<string, any>();
    const contactByEmailMap = new Map<string, any>();
    const contactByIdMap = new Map<string, any>();
    const contactByNameMap = new Map<string, any>();
    const allLiveContacts: any[] = [];

    try {
      const contactsSnap = await adminDb.collection("contacts").get();
      contactsSnap.docs.forEach((cDoc) => {
        const cData = cDoc.data();
        const isLive = cData.status !== "trashed";
        activeContactsMap.set(cDoc.id, isLive);
        if (isLive) {
          allLiveContacts.push({ id: cDoc.id, ...cData });
          contactByIdMap.set(cDoc.id, cData);
          if (cData.phone) {
            activeContactsMap.set(cData.phone, isLive);
            contactByPhoneMap.set(String(cData.phone).replace(/\D/g, ""), cData);
          }
          if (cData.conta_phone) {
            contactByPhoneMap.set(String(cData.conta_phone).replace(/\D/g, ""), cData);
          }
          if (cData.email) {
            activeContactsMap.set(cData.email, isLive);
            contactByEmailMap.set(String(cData.email).trim().toLowerCase(), cData);
          }
          if (cData.conta_name) {
            contactByNameMap.set(String(cData.conta_name).trim().toLowerCase(), cData);
          }
        }
      });
    } catch (cErr) {
      console.warn("Could not prefetch contacts map:", cErr);
    }

    // 3. Fetch donations from campaign subcollections
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

            // If ambassadorName is not a strictly linked community to this campaign, clear it
            if (data.ambassadorName && !linkedGroupNames.has(String(data.ambassadorName).trim())) {
              data.ambassadorName = "";
            }

            // Find matching contact for community attribution
            let matchedContact = null;
            if (data.contactId && contactByIdMap.has(data.contactId)) {
              matchedContact = contactByIdMap.get(data.contactId);
            } else if (data.phone) {
              const cleanP = String(data.phone).replace(/\D/g, "");
              matchedContact = contactByPhoneMap.get(cleanP);
            } else if (data.email) {
              matchedContact = contactByEmailMap.get(String(data.email).trim().toLowerCase());
            } else if (data.donorName) {
              matchedContact = contactByNameMap.get(String(data.donorName).trim().toLowerCase());
            }

            if (matchedContact) {
              const cTags = Array.isArray(matchedContact.tags) ? matchedContact.tags : [];
              let commName = "";
              if (matchedContact.community && linkedGroupNames.has(matchedContact.community.trim())) {
                commName = matchedContact.community.trim();
              } else if (matchedContact.mh_crm_community && linkedGroupNames.has(matchedContact.mh_crm_community.trim())) {
                commName = matchedContact.mh_crm_community.trim();
              } else {
                const validTag = cTags.find((t: any) => typeof t === "string" && linkedGroupNames.has(t.trim()));
                if (validTag) commName = validTag.trim();
              }

              if (commName && !data.ambassadorName) {
                data.ambassadorName = commName;
              }
            }

            if (!allDonations.some(d => d.id === doc.id)) {
              allDonations.push({ id: doc.id, ...data });
            }
          }
        }

        ambSnap.docs.forEach((doc) => {
          const ambData = doc.data() as Ambassador;
          const aName = (ambData.name || "").trim();
          if (aName && linkedGroupNames.has(aName) && !allAmbassadors.some(a => a.id === doc.id)) {
            allAmbassadors.push({ id: doc.id, ...ambData });
          }
        });
      } catch (err) {
        console.warn(`Error fetching subcollections for campaign ${cid}:`, err);
      }
    }

    // 4. For contacts with community tags who have donations/payments in CRM, ensure their donations are included ONLY IF community is linked
    allLiveContacts.forEach((c) => {
      const cTags = Array.isArray(c.tags) ? c.tags : [];
      let commName = "";

      if (c.community && linkedGroupNames.has(c.community.trim())) {
        commName = c.community.trim();
      } else if (c.mh_crm_community && linkedGroupNames.has(c.mh_crm_community.trim())) {
        commName = c.mh_crm_community.trim();
      } else {
        const validTag = cTags.find((t: any) => typeof t === "string" && linkedGroupNames.has(t.trim()));
        if (validTag) commName = validTag.trim();
      }

      const spent = Number(c.total_spent || c.campaign_amount || 0);

      if (commName && spent > 0) {
        const cleanP = c.conta_phone ? String(c.conta_phone).replace(/\D/g, "") : "";
        const cleanE = c.email ? String(c.email).trim().toLowerCase() : "";
        
        const alreadyHasDonation = allDonations.some(d => 
          (d.contactId && d.contactId === c.id) ||
          (cleanP && d.phone && String(d.phone).replace(/\D/g, "") === cleanP) ||
          (cleanE && d.email && String(d.email).trim().toLowerCase() === cleanE)
        );

        if (!alreadyHasDonation) {
          allDonations.push({
            id: `crm-${c.id}`,
            campaignId: rawId,
            contactId: c.id,
            donorName: c.conta_name || "תורם",
            phone: c.conta_phone || "",
            email: c.email || "",
            amount: spent,
            ambassadorName: commName,
            ambassadorId: commName,
            paymentStatus: "completed",
            isAnonymous: false,
            createdAt: c.createdAt || c.last_order_date || new Date().toISOString()
          });
        }
      }
    });

    // 5. Strictly ensure allDonations only have ambassadorName if it is in linkedGroupNames
    allDonations.forEach(d => {
      if (d.ambassadorName && !linkedGroupNames.has(String(d.ambassadorName).trim())) {
        d.ambassadorName = "";
      }
    });

    // 6. Strictly filter allAmbassadors so ONLY active CRM communities linked to THIS campaign remain
    const filteredAmbassadors = allAmbassadors.filter(amb => linkedGroupNames.has(amb.name));

    // 7. Calculate totalRaised and donorCount for each linked community from allDonations
    filteredAmbassadors.forEach(amb => {
      const ambDonations = allDonations.filter(d => {
        const matchName = d.ambassadorName && d.ambassadorName.trim().toLowerCase() === amb.name.trim().toLowerCase();
        const matchSlug = (d as any).ambassadorSlug && ((d as any).ambassadorSlug === amb.slug || d.ambassadorId === amb.slug);
        const matchId = d.ambassadorId && d.ambassadorId === amb.id;
        return Boolean(matchName || matchSlug || matchId);
      });

      const total = ambDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      amb.totalRaised = total;
      amb.donorCount = ambDonations.length;
    });

    // Sort newest first
    allDonations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { donations: allDonations, ambassadors: filteredAmbassadors };
  } catch (error) {
    console.error("Error in getCampaignDonationsAction:", error);
    return { donations: [], ambassadors: [] };
  }
}




