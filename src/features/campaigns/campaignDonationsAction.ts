"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Ambassador, Donation } from "@/lib/types/campaign";

/**
 * Get all completed donations and ambassadors for a campaign
 * Runs concurrently and deduplicates all donations strictly.
 */
export async function getCampaignDonationsAction(campaignId: string): Promise<{ donations: Donation[]; ambassadors: Ambassador[] }> {
  try {
    const rawId = campaignId || "home";
    const targetCid = (rawId === "default-campaign" || rawId === "/") ? "home" : rawId;
    const INVALID_COMMUNITIES_FILTER = new Set(["באולם", "בחוץ", "באולם ", "בחוץ ", "0", "2160", "4320"]);
    const DELETED_COMMUNITIES_FILTER = new Set([
      "בדיקה", "בניהו יחזקל", "שיעורי תניא", "סדנאות תוכן ויצירה", "קהילה עוטפת",
      "בדיקה ", "בניהו יחזקל ", "שיעורי תניא ", "סדנאות תוכן ויצירה ", "קהילה עוטפת "
    ]);

    // 1. Parallel fetch all required Firestore data concurrently for maximum performance
    const [donationsSnap, ambSnap, contactsSnap] = await Promise.all([
      adminDb.collection("campaigns").doc(targetCid).collection("donations").get().catch(() => ({ docs: [] })),
      adminDb.collection("campaigns").doc(targetCid).collection("ambassadors").get().catch(() => ({ docs: [] })),
      adminDb.collection("contacts").where("status", "!=", "trashed").get().catch(() => 
        adminDb.collection("contacts").get().catch(() => ({ docs: [] }))
      )
    ]);

    // Purge unwanted legacy pages in background
    DELETED_COMMUNITIES_FILTER.forEach(dName => {
      adminDb.collection("pages").where("title", "==", dName.trim()).get().then(snap => {
        snap.forEach(d => d.ref.delete().catch(() => {}));
      }).catch(() => {});
    });

    // 2. Build contact lookup maps
    const activeContactsMap = new Map<string, boolean>();
    const contactByPhoneMap = new Map<string, any>();
    const contactByEmailMap = new Map<string, any>();
    const contactByIdMap = new Map<string, any>();
    const contactByNameMap = new Map<string, any>();
    const allLiveContacts: any[] = [];

    contactsSnap.docs.forEach((cDoc: any) => {
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

    // 3. Build REAL ambassadors list ONLY from contacts with an active ambassador_slug
    const allAmbassadors: Ambassador[] = [];
    const validAmbassadorSlugs = new Set<string>();
    const validAmbassadorNames = new Set<string>();

    allLiveContacts.forEach((c) => {
      if (c.ambassador_slug && c.ambassador_slug.trim()) {
        const cleanSlug = c.ambassador_slug.trim().toLowerCase();
        const aName = (c.ambassador_name || `${c.conta_name || ""} ${c.f_m || ""}`.trim() || c.conta_name || "שגריר").trim();

        if (DELETED_COMMUNITIES_FILTER.has(aName) || INVALID_COMMUNITIES_FILTER.has(aName)) return;

        validAmbassadorSlugs.add(cleanSlug);
        validAmbassadorNames.add(aName.toLowerCase());
        if (c.conta_name) validAmbassadorNames.add(c.conta_name.trim().toLowerCase());

        const ambObj: Ambassador = {
          id: c.id,
          name: aName,
          leaderName: aName,
          slug: cleanSlug,
          targetGoal: Number(c.ambassador_target_goal || c.campaign_target_goal || 5000),
          totalRaised: Number(c.ambassador_total_raised || 0),
          donorCount: 0,
          message: "",
          gallery: [],
          campaignId: targetCid,
          pageUrl: `/${cleanSlug}`,
          createdAt: c.createdAt || new Date().toISOString(),
          isPersonalAmbassador: true
        };

        const existingIdx = allAmbassadors.findIndex(
          a => a.id === c.id || a.slug === cleanSlug || a.name.trim().toLowerCase() === aName.toLowerCase()
        );

        if (existingIdx === -1) {
          allAmbassadors.push(ambObj);
        } else {
          allAmbassadors[existingIdx] = {
            ...ambObj,
            ...allAmbassadors[existingIdx],
            slug: cleanSlug,
            pageUrl: `/${cleanSlug}`
          };
        }
      }
    });

    // Also validate ambassadors in the campaign subcollection
    ambSnap.docs.forEach((doc: any) => {
      const ambData = doc.data() as Ambassador;
      const aName = (ambData.name || ambData.leaderName || "").trim();
      const aSlug = (ambData.slug || "").trim().toLowerCase();

      // If doc does NOT match any active contact with ambassador_slug -> purge stale doc!
      if (!aName || !aSlug || !validAmbassadorSlugs.has(aSlug) || DELETED_COMMUNITIES_FILTER.has(aName) || INVALID_COMMUNITIES_FILTER.has(aName)) {
        doc.ref.delete().catch(() => {});
        return;
      }
    });

    // 4. Process campaign subcollection donations with automatic duplicate cleanup
    const rawDonations: Donation[] = [];
    const seenFirestoreSignatures = new Set<string>();

    for (const doc of donationsSnap.docs) {
      const data = doc.data() as any;
      if (data.paymentStatus === "completed") {
        let shouldRemove = false;
        
        // 1. Check if the doc was linked to a contact that no longer exists in active contacts
        const docContactId = doc.id.startsWith("don_") 
          ? doc.id.replace("don_", "") 
          : (doc.id.startsWith("crm-") ? doc.id.replace("crm-", "") : null);

        if (docContactId && !contactByIdMap.has(docContactId)) {
          shouldRemove = true;
        } else if (data.contactId && !contactByIdMap.has(data.contactId)) {
          shouldRemove = true;
        } else if (data.phone && activeContactsMap.has(data.phone) && !activeContactsMap.get(data.phone)) {
          shouldRemove = true;
        }

        if (shouldRemove) {
          doc.ref.delete().catch(() => {});
          continue;
        }

        // Find matching contact for verification
        let matchedContact = null;
        if (data.contactId && contactByIdMap.has(data.contactId)) {
          matchedContact = contactByIdMap.get(data.contactId);
        } else if (docContactId && contactByIdMap.has(docContactId)) {
          matchedContact = contactByIdMap.get(docContactId);
        } else if (data.phone) {
          const cleanP = String(data.phone).replace(/\D/g, "");
          matchedContact = contactByPhoneMap.get(cleanP);
        } else if (data.email) {
          matchedContact = contactByEmailMap.get(String(data.email).trim().toLowerCase());
        } else if (data.donorName) {
          matchedContact = contactByNameMap.get(String(data.donorName).trim().toLowerCase());
        }

        if (matchedContact) {
          data.contactId = matchedContact.id;
          if (matchedContact.conta_name) {
            data.donorName = matchedContact.conta_name;
          }
          if (matchedContact.conta_phone) {
            data.phone = matchedContact.conta_phone;
          }
        }

        // Check and delete duplicate Firestore documents
        const cleanName = (data.donorName || "").trim().toLowerCase();
        const amount = Number(data.amount || 0);
        const cleanPhone = (data.phone || "").replace(/\D/g, "");
        const txId = (data.transactionId || "").trim();

        const docSigs: string[] = [];
        if (data.contactId) docSigs.push(`contact_${data.contactId}`);
        if (txId) docSigs.push(`tx_${txId}`);
        if (cleanPhone && amount > 0) docSigs.push(`phone_${cleanPhone}_${amount}`);
        if (cleanName && amount > 0) docSigs.push(`name_${cleanName}_${amount}`);

        const isDocDuplicate = docSigs.some(sig => seenFirestoreSignatures.has(sig));
        if (isDocDuplicate) {
          doc.ref.delete().catch(() => {});
          continue;
        }
        docSigs.forEach(sig => seenFirestoreSignatures.add(sig));

        // Clear unlinked or non-ambassador tag: ONLY valid ambassador names/slugs are allowed!
        const curAmbName = (data.ambassadorName || "").trim().toLowerCase();
        const curAmbSlug = ((data as any).ambassadorSlug || data.ambassadorId || "").trim().toLowerCase();
        const isValidAmbassador = (curAmbSlug && validAmbassadorSlugs.has(curAmbSlug)) || (curAmbName && validAmbassadorNames.has(curAmbName));

        if (!isValidAmbassador) {
          data.ambassadorName = "";
          data.ambassadorSlug = "";
          data.ambassadorId = "";
        }

        // If it's a CRM-synced donation, ensure the contact still has this campaign linked and has campaign_amount > 0 in CRM
        if (doc.id.startsWith("crm-") || doc.id.startsWith("don_")) {
          if (!matchedContact) {
            doc.ref.delete().catch(() => {});
            continue;
          }

          const contactCampId = (matchedContact.campaign_id || matchedContact.campaignId || "").trim();
          const isMatch = (targetCid === "home")
            ? (contactCampId === "home" || contactCampId === "default-campaign" || contactCampId === "/")
            : (contactCampId === targetCid || contactCampId.includes(targetCid));
          
          const campAmount = Number(matchedContact.campaign_amount || matchedContact.campaignAmount || 0);
          const isRecurring = matchedContact.campaign_donation_mode === "recurring" || matchedContact.campaign_donation_mode === "monthly";
          const monthlyAmount = isRecurring ? Number(matchedContact.campaign_monthly_amount || 0) : 0;
          const totalValidAmount = campAmount > 0 ? campAmount : (monthlyAmount > 0 ? monthlyAmount * Number(matchedContact.campaign_recurring_months || 12) : 0);

          if (!isMatch || totalValidAmount <= 0) {
            doc.ref.delete().catch(() => {});
            continue;
          }
        }

        rawDonations.push({ id: doc.id, ...data });
      }
    }

    // 5. For CRM contacts: Include donation ONLY if explicitly assigned to THIS campaign with campaign_amount in CRM
    allLiveContacts.forEach((c) => {
      const contactCampId = (c.campaign_id || c.campaignId || c.campaign_page || "").trim();

      // Must have explicit campaign donation amount in CRM campaigns tab
      const rawAmount = Number(c.campaign_amount || c.campaignAmount || 0);
      const isRecurring = c.campaign_donation_mode === "recurring" || c.campaign_donation_mode === "monthly";
      const monthlyAmt = isRecurring ? Number(c.campaign_monthly_amount || 0) : 0;
      const months = Number(c.campaign_recurring_months || 12);
      const campAmount = rawAmount > 0 ? rawAmount : (monthlyAmt > 0 ? (monthlyAmt * months) : 0);

      // STRICT: Never pull in general CRM contacts without explicit campaign donation!
      if (campAmount <= 0) return;

      const paymentStatus = c.campaign_payment_status || c.campaignPaymentStatus || "completed";
      if (paymentStatus !== "completed" && paymentStatus !== "הושלם") return;

      // Resolve ambassador name / slug: ONLY for real active ambassadors!
      let ambNameResolved = "";
      let ambSlugResolved = "";
      let ambIdResolved = "";

      const explicitAmb = (c.campaign_ambassador_name || c.campaignAmbassadorName || c.referred_by_ambassador || "").trim();
      if (explicitAmb) {
        const matchedAmb = allAmbassadors.find(a =>
          a.slug.toLowerCase() === explicitAmb.toLowerCase() ||
          a.name.toLowerCase() === explicitAmb.toLowerCase() ||
          a.leaderName.toLowerCase() === explicitAmb.toLowerCase()
        );
        if (matchedAmb) {
          ambNameResolved = matchedAmb.name;
          ambSlugResolved = matchedAmb.slug;
          ambIdResolved = matchedAmb.slug;
        }
      } else if (c.ambassador_slug) {
        const cleanS = c.ambassador_slug.trim().toLowerCase();
        if (validAmbassadorSlugs.has(cleanS)) {
          ambNameResolved = c.ambassador_name || c.conta_name || "";
          ambSlugResolved = cleanS;
          ambIdResolved = cleanS;
        }
      }

      // Campaign matching:
      // STRICT: Contact MUST have explicit campaign_id matching targetCid OR matching the ambassador slug
      if (!contactCampId && !ambSlugResolved) return; // No campaign or ambassador linked -> SKIP!

      let isMatchingCampaign = false;
      if (targetCid === "home") {
        isMatchingCampaign = (
          contactCampId === "home" ||
          contactCampId === "/" ||
          contactCampId === "default-campaign" ||
          (Boolean(ambSlugResolved) && (contactCampId === ambSlugResolved || contactCampId === `/${ambSlugResolved}`))
        );
      } else {
        // Specific campaign or personal ambassador page (e.g. "boko")
        isMatchingCampaign = (
          contactCampId === targetCid ||
          contactCampId === `/c/${targetCid}` ||
          contactCampId.toLowerCase() === targetCid.toLowerCase() ||
          (Boolean(ambSlugResolved) && ambSlugResolved.toLowerCase() === targetCid.toLowerCase())
        );
      }

      if (!isMatchingCampaign) return;

      rawDonations.push({
        id: `crm-${c.id}`,
        campaignId: rawId,
        contactId: c.id,
        donorName: c.conta_name || (c.f_m ? `משפחת ${c.f_m}` : "תורם"),
        phone: c.conta_phone || "",
        email: c.email || "",
        amount: campAmount,
        ambassadorName: ambNameResolved,
        ambassadorSlug: ambSlugResolved,
        ambassadorId: ambIdResolved,
        paymentStatus: "completed",
        paymentMethod: c.campaign_payment_method || "manual",
        isRecurring: isRecurring,
        dedication: c.campaign_dedication || "",
        isAnonymous: Boolean(c.campaign_is_anonymous),
        createdAt: c.campaign_updated_at || c.last_order_date || c.createdAt || new Date().toISOString()
      });
    });

    // 6. Strict Multi-Key Deduplication of Donations
    const allDonations: Donation[] = [];
    const seenDonationSignatures = new Set<string>();

    rawDonations.forEach(d => {
      const cleanName = (d.donorName || "").trim().toLowerCase();
      const amount = Number(d.amount || 0);
      const cleanPhone = (d.phone || "").replace(/\D/g, "");
      const txId = (d.transactionId || "").trim();

      const keysToCheck: string[] = [];
      if (d.contactId) keysToCheck.push(`contact_${d.contactId}`);
      if (txId) keysToCheck.push(`tx_${txId}`);
      if (cleanPhone && amount > 0) keysToCheck.push(`phone_${cleanPhone}_${amount}`);
      if (cleanName && amount > 0) keysToCheck.push(`name_${cleanName}_${amount}`);
      keysToCheck.push(`id_${d.id}`);

      const isDuplicate = keysToCheck.some(k => seenDonationSignatures.has(k));

      if (!isDuplicate) {
        keysToCheck.forEach(k => seenDonationSignatures.add(k));
        allDonations.push(d);
      }
    });

    // 7. Calculate totalRaised and donorCount for each real ambassador from deduplicated allDonations
    for (const amb of allAmbassadors) {
      const ambName = (amb.name || "").trim().toLowerCase();
      const ambLeader = (amb.leaderName || "").trim().toLowerCase();
      const ambSlug = (amb.slug || "").trim().toLowerCase();
      const ambId = (amb.id || "").trim().toLowerCase();

      const ambDonations = allDonations.filter(d => {
        const dAmbName = (d.ambassadorName || "").trim().toLowerCase();
        const dAmbId = (d.ambassadorId || "").trim().toLowerCase();
        const dAmbSlug = ((d as any).ambassadorSlug || "").trim().toLowerCase();

        // If donation has no ambassador assigned, it does NOT belong to any ambassador!
        if (!dAmbName && !dAmbSlug && !dAmbId) return false;

        const matchSlug = Boolean(ambSlug && (dAmbSlug === ambSlug || dAmbId === ambSlug || dAmbName === ambSlug));
        const matchId = Boolean(ambId && (dAmbId === ambId || dAmbName === ambId));
        const matchName = Boolean(
          (ambName && dAmbName && (dAmbName === ambName || (dAmbName.length >= 3 && (dAmbName === ambName || ambName.includes(dAmbName))))) ||
          (ambLeader && dAmbName && (dAmbName === ambLeader || (dAmbName.length >= 3 && (dAmbName === ambLeader || ambLeader.includes(dAmbName)))))
        );

        return matchSlug || matchId || matchName;
      });

      const total = ambDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      amb.totalRaised = total;
      amb.donorCount = ambDonations.length;

      // Sync to campaign ambassadors subcollection
      try {
        adminDb.collection("campaigns").doc(targetCid).collection("ambassadors").doc(amb.slug || amb.id).set({
          totalRaised: total,
          donorCount: ambDonations.length,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (ambErr) {}
    }

    // 8. Calculate accurate total campaign raised and donor count, and sync to campaign doc
    const totalRaisedSum = allDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const donorCountTotal = allDonations.length;

    try {
      adminDb.collection("campaigns").doc(targetCid).set({
        totalRaised: totalRaisedSum,
        donorCount: donorCountTotal,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});

      if (targetCid === "home") {
        adminDb.collection("campaigns").doc("default-campaign").set({
          totalRaised: totalRaisedSum,
          donorCount: donorCountTotal,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    } catch (campErr) {}

    // Sort newest first
    allDonations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { donations: allDonations, ambassadors: allAmbassadors };
  } catch (error) {
    console.error("Error in getCampaignDonationsAction:", error);
    return { donations: [], ambassadors: [] };
  }
}
