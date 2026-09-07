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
    const [crmGroupsSnap, donationsSnap, ambSnap, contactsSnap] = await Promise.all([
      adminDb.collectionGroup("crm_groups").get().catch(() => ({ docs: [] })),
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

    // 2. Build linked groups set & ambassadors list
    const linkedGroupNames = new Set<string>();
    const allAmbassadors: Ambassador[] = [];

    crmGroupsSnap.docs.forEach((doc: any) => {
      const gData = doc.data();
      if (!gData.name || !gData.name.trim()) return;
      const gName = gData.name.trim();

      // Permanently purge deleted / test communities
      if (DELETED_COMMUNITIES_FILTER.has(gName) || INVALID_COMMUNITIES_FILTER.has(gName) || /^\d+$/.test(gName) || gData.status === "trashed" || gData.isDeleted) {
        doc.ref.delete().catch(() => {});
        if (gData.pageSlug) adminDb.collection("pages").doc(gData.pageSlug).delete().catch(() => {});
        return;
      }

      const isCommunity = Boolean(gData.isCommunity && (gData.pageSlug || gData.pageUrl) && gData.category !== "group");
      if (!isCommunity) return;

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
          a => a.id === doc.id || a.slug === ambSlug || a.name.trim().toLowerCase() === gName.toLowerCase()
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

    // Also include ambassadors from campaign subcollection if valid
    ambSnap.docs.forEach((doc: any) => {
      const ambData = doc.data() as Ambassador;
      const aName = (ambData.name || "").trim();

      // Permanently purge deleted / test ambassadors
      if (DELETED_COMMUNITIES_FILTER.has(aName) || INVALID_COMMUNITIES_FILTER.has(aName)) {
        doc.ref.delete().catch(() => {});
        if (ambData.slug) adminDb.collection("pages").doc(ambData.slug).delete().catch(() => {});
        return;
      }

      const isPersonal = Boolean((ambData as any).isPersonalAmbassador || (ambData.slug && !doc.id.startsWith("comm-")));
      if (aName && (linkedGroupNames.has(aName) || isPersonal) && !allAmbassadors.some(a => a.name.trim().toLowerCase() === aName.toLowerCase() || (ambData.slug && a.slug === ambData.slug))) {
        allAmbassadors.push({ id: doc.id, ...ambData, isPersonalAmbassador: isPersonal });
      }
    });

    // 3. Build contact lookup maps
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

        // Find matching contact for community attribution & verification
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

        // Clear unlinked ambassador name
        if (data.ambassadorName && !linkedGroupNames.has(String(data.ambassadorName).trim())) {
          data.ambassadorName = "";
        }

        // If it's a CRM-synced donation, ensure the contact still has this campaign linked in CRM
        if (doc.id.startsWith("crm-") && matchedContact) {
          const contactCampId = (matchedContact.campaign_id || matchedContact.campaignId || "").trim();
          const isMatch = (targetCid === "home")
            ? (contactCampId === "home" || contactCampId === "default-campaign" || contactCampId === "/")
            : (contactCampId === targetCid || contactCampId.includes(targetCid));
          
          const campAmount = Number(matchedContact.campaign_amount || matchedContact.campaignAmount || 0);
          if (!isMatch || campAmount <= 0) {
            doc.ref.delete().catch(() => {});
            continue;
          }
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

        rawDonations.push({ id: doc.id, ...data });
      }
    }

    // 5. For CRM contacts: Include donation ONLY if explicitly assigned to THIS campaign in the contact's campaigns tab
    allLiveContacts.forEach((c) => {
      const contactCampId = (c.campaign_id || c.campaignId || c.campaign_page || "").trim();
      if (!contactCampId) return; // No campaign linked -> DO NOT INCLUDE!

      const isMatchingCampaign =
        (rawId === "home" || rawId === "default-campaign" || rawId === "/")
          ? (contactCampId === "home" || contactCampId === "/" || contactCampId === "default-campaign")
          : (contactCampId === rawId || contactCampId === `/c/${rawId}` || contactCampId.toLowerCase() === rawId.toLowerCase());

      if (!isMatchingCampaign) return; // Linked to a different campaign -> DO NOT INCLUDE!

      const campAmount = Number(c.campaign_amount || c.campaignAmount || 0);
      if (campAmount <= 0) return; // No donation amount in campaign tab -> DO NOT INCLUDE!

      const paymentStatus = c.campaign_payment_status || c.campaignPaymentStatus || "completed";
      if (paymentStatus !== "completed" && paymentStatus !== "הושלם") return;

      // Resolve ambassador name ONLY if explicitly assigned or in a linked group
      let commName = "";
      const explicitAmb = (c.campaign_ambassador_name || c.campaignAmbassadorName || "").trim();
      if (explicitAmb && linkedGroupNames.has(explicitAmb)) {
        commName = explicitAmb;
      } else if (c.community && linkedGroupNames.has(c.community.trim())) {
        commName = c.community.trim();
      } else if (c.mh_crm_community && linkedGroupNames.has(c.mh_crm_community.trim())) {
        commName = c.mh_crm_community.trim();
      } else if (Array.isArray(c.tags)) {
        const validTag = c.tags.find((t: any) => typeof t === "string" && linkedGroupNames.has(t.trim()));
        if (validTag) commName = validTag.trim();
      }

      rawDonations.push({
        id: `crm-${c.id}`,
        campaignId: rawId,
        contactId: c.id,
        donorName: c.conta_name || (c.f_m ? `משפחת ${c.f_m}` : "תורם"),
        phone: c.conta_phone || "",
        email: c.email || "",
        amount: campAmount,
        ambassadorName: commName,
        ambassadorId: commName,
        paymentStatus: "completed",
        paymentMethod: c.campaign_payment_method || "manual",
        isRecurring: c.campaign_donation_mode === "monthly" || c.campaign_donation_mode === "recurring",
        dedication: c.campaign_dedication || "",
        isAnonymous: Boolean(c.campaign_is_anonymous),
        createdAt: c.campaign_updated_at || c.last_order_date || c.createdAt || new Date().toISOString()
      });
    });

    // Also include personal ambassador contacts who configured a slug & personal goal
    allLiveContacts.forEach((c) => {
      if (c.ambassador_slug) {
        const cCampId = (c.ambassador_campaign_id || c.campaign_id || "").trim();
        const isCampMatch =
          (rawId === "home" || rawId === "default-campaign" || rawId === "/")
            ? (!cCampId || cCampId === "home" || cCampId === "/" || cCampId === "default-campaign")
            : (cCampId === rawId || cCampId === `/c/${rawId}` || cCampId.toLowerCase() === rawId.toLowerCase());

        if (isCampMatch) {
          const aName = (c.ambassador_name || c.conta_name || "שגריר").trim();
          const ambObj: Ambassador = {
            id: c.id,
            name: aName,
            leaderName: aName,
            slug: c.ambassador_slug,
            targetGoal: Number(c.ambassador_target_goal || c.campaign_target_goal || 5000),
            totalRaised: Number(c.ambassador_total_raised || 0),
            donorCount: 0,
            message: "",
            gallery: [],
            campaignId: rawId,
            pageUrl: `/${c.ambassador_slug}`,
            createdAt: c.createdAt || new Date().toISOString(),
            isPersonalAmbassador: true
          };

          const existingIdx = allAmbassadors.findIndex(
            a => a.id === c.id || a.slug === c.ambassador_slug || a.name.trim().toLowerCase() === aName.toLowerCase()
          );

          if (existingIdx === -1) {
            allAmbassadors.push(ambObj);
          } else {
            allAmbassadors[existingIdx] = {
              ...ambObj,
              ...allAmbassadors[existingIdx]
            };
          }
        }
      }
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

        if (d.ambassadorName && !linkedGroupNames.has(String(d.ambassadorName).trim())) {
          d.ambassadorName = "";
        }
        allDonations.push(d);
      }
    });

    // 7. Strict filter and deduplicate allAmbassadors so active CRM communities and personal ambassadors remain
    const uniqueAmbassadors: Ambassador[] = [];
    const seenAmbNames = new Set<string>();
    const seenAmbSlugs = new Set<string>();

    allAmbassadors.forEach(amb => {
      const cleanN = (amb.name || "").trim().toLowerCase();
      const cleanS = (amb.slug || "").trim().toLowerCase();
      const isPersonal = Boolean((amb as any).isPersonalAmbassador || (amb.slug && !amb.id.startsWith("comm-")));
      
      if ((linkedGroupNames.has(amb.name) || isPersonal) && !seenAmbNames.has(cleanN) && (!cleanS || !seenAmbSlugs.has(cleanS))) {
        seenAmbNames.add(cleanN);
        if (cleanS) seenAmbSlugs.add(cleanS);
        uniqueAmbassadors.push(amb);
      }
    });

    const filteredAmbassadors = uniqueAmbassadors;

    // 8. Calculate totalRaised and donorCount for each linked community from deduplicated allDonations
    for (const amb of filteredAmbassadors) {
      const ambDonations = allDonations.filter(d => {
        const matchName = d.ambassadorName && d.ambassadorName.trim().toLowerCase() === amb.name.trim().toLowerCase();
        const matchSlug = (d as any).ambassadorSlug && ((d as any).ambassadorSlug === amb.slug || d.ambassadorId === amb.slug);
        const matchId = d.ambassadorId && d.ambassadorId === amb.id;
        return Boolean(matchName || matchSlug || matchId);
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

    // 9. Calculate accurate total campaign raised and donor count, and sync to campaign doc
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

    return { donations: allDonations, ambassadors: filteredAmbassadors };
  } catch (error) {
    console.error("Error in getCampaignDonationsAction:", error);
    return { donations: [], ambassadors: [] };
  }
}
