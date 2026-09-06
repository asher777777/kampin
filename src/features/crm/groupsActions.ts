"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import type { 
  SmartGroup, 
  GroupRule, 
  GroupsDataResponse 
} from "./groupsUtils";
import { isContactInGroup } from "./groupsUtils";

export async function getGroupsData(): Promise<GroupsDataResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;
    // Fetch contacts
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const contacts: any[] = [];
    const tagsMap = new Map<string, number>();
    const citiesSet = new Set<string>();
    const isNumericTag = (t: string) => /^\d+$/.test(t.trim());

    snap.forEach((doc) => {
      const d = doc.data();
      if (d.status === "trashed") return;

      const tags: string[] = Array.isArray(d.tags)
        ? d.tags.filter((t: any) => typeof t === "string" && t.trim() !== "" && !isNumericTag(t))
        : [];

      if (d.mh_crm_city && typeof d.mh_crm_city === "string" && d.mh_crm_city.trim()) {
        citiesSet.add(d.mh_crm_city.trim());
      }

      contacts.push({
        id: doc.id,
        ...d,
        tags,
      });

      tags.forEach((tag) => {
        const cleanTag = tag.trim();
        if (!isNumericTag(cleanTag)) {
          tagsMap.set(cleanTag, (tagsMap.get(cleanTag) || 0) + 1);
        }
      });
    });

    // Fetch saved group definitions from 'crm_groups'
    const groupsSnap = await adminDb
      .collection("users")
      .doc(ownerId)
      .collection("crm_groups")
      .get();

    const savedGroups: Map<string, SmartGroup> = new Map();
    const batch = adminDb.batch();
    let hasDeletes = false;

    groupsSnap.forEach((gDoc) => {
      const gData = gDoc.data() as SmartGroup;
      const gName = (gData.name || "").trim();

      // Clean up numeric titles or invalid groups automatically
      if (!gName || /^\d+$/.test(gName)) {
        batch.delete(gDoc.ref);
        hasDeletes = true;
      } else {
        const isCommunity = Boolean(gData.isCommunity || gData.pageSlug || gData.pageUrl || gData.pageId);
        savedGroups.set(gName, {
          ...gData,
          id: gDoc.id,
          isCommunity,
          category: isCommunity ? "community" : "group",
        });
      }
    });

    if (hasDeletes) {
      await batch.commit().catch(err => console.warn("Failed to delete numeric groups:", err));
    }

    // Auto-discover any tags from contacts that are not yet in crm_groups and add them as Groups
    const PRESET_COLORS = [
      "#4f46e5", "#059669", "#d97706", "#dc2626", 
      "#7c3aed", "#0284c7", "#0891b2", "#475569"
    ];
    let colorIndex = 0;
    tagsMap.forEach((_cnt, tagName) => {
      const cleanTag = tagName.trim();
      if (!savedGroups.has(cleanTag) && cleanTag && !/^\d+$/.test(cleanTag)) {
        savedGroups.set(cleanTag, {
          id: `tag_${encodeURIComponent(cleanTag)}`,
          name: cleanTag,
          color: PRESET_COLORS[colorIndex % PRESET_COLORS.length],
          description: "קבוצת תגית",
          type: "manual",
          isCommunity: false,
          category: "group",
          rules: [],
          matchType: "all",
          ownerId,
        });
        colorIndex++;
      }
    });

    // Calculate dynamic member count for all groups and communities
    const groups: SmartGroup[] = Array.from(savedGroups.values()).map((g) => {
      const count = contacts.filter((c) => isContactInGroup(c, g)).length;
      return {
        ...g,
        count,
      };
    });

    // Sort groups: communities first, then by count descending
    groups.sort((a, b) => {
      if (a.isCommunity && !b.isCommunity) return -1;
      if (!a.isCommunity && b.isCommunity) return 1;
      return (b.count || 0) - (a.count || 0);
    });

    // Calculate untagged count (contacts with no tags and in 0 groups)
    const untaggedCount = contacts.filter((c) => {
      const inAnyGroup = groups.some((g) => isContactInGroup(c, g));
      return !inAnyGroup;
    }).length;

    return JSON.parse(
      JSON.stringify({
        success: true,
        groups,
        contacts,
        totalContacts: contacts.length,
        untaggedCount,
        availableCities: Array.from(citiesSet).sort(),
      })
    );
  } catch (error: any) {
    console.error("Error in getGroupsData:", error);
    return {
      success: false,
      error: error.message || "שגיאה בטעינת נתוני קבוצות",
      groups: [],
      contacts: [],
      totalContacts: 0,
      untaggedCount: 0,
      availableCities: [],
    };
  }
}

export interface SelectablePageOrCampaign {
  id: string;
  title: string;
  category: string;
  type: "home" | "campaign" | "landing" | "service" | "page";
  url: string;
  target?: number;
  currentAmount?: number;
  coverImage?: string;
}

export async function getCampaignsListForSelect(): Promise<SelectablePageOrCampaign[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    const ownerId = session.user.id;

    const [campaignsSnap, servicesSnap, landingSnap, pagesSnap] = await Promise.all([
      adminDb.collection("campaigns").where("ownerId", "==", ownerId).get().catch(() => ({ docs: [] } as any)),
      adminDb.collection("services").where("ownerId", "==", ownerId).get().catch(() => ({ docs: [] } as any)),
      adminDb.collection("landing").get().catch(() => ({ docs: [] } as any)),
      adminDb.collection("pages").get().catch(() => ({ docs: [] } as any)),
    ]);

    const items: SelectablePageOrCampaign[] = [];

    // 1. Home Page
    items.push({
      id: "home",
      title: "🏠 דף הבית הראשי",
      category: "עמוד ראשי",
      type: "home",
      url: "/",
    });

    const getCleanTitle = (d: any, id: string, defaultFallback: string) => {
      let title = d?.title || d?.name || d?.campaignName || d?.pageTitle || d?.heading || d?.richContent?.title || d?.richContent?.heading || "";
      
      // If title is empty or is a slug/id
      if (!title || title.startsWith("comm-") || title.startsWith("pmm-") || title.startsWith("page-")) {
        try {
          title = decodeURIComponent(title || id || "");
        } catch {
          title = title || id || "";
        }
      } else {
        try {
          title = decodeURIComponent(title);
        } catch {}
      }

      // Remove prefix like "comm-", "pmm-", "page-"
      title = title.replace(/^(comm|pmm|page)-/gi, "");

      // If it has parentheses like "(comm-...)" or "קמפיין (comm-...)"
      const parenMatch = title.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        const prefixPart = parenMatch[1].trim();
        const inside = parenMatch[2].trim();
        if (["קמפיין", "עמוד", "דף נחיתה", "שירות", "פוסט / מאמר"].includes(prefixPart)) {
          title = inside.replace(/^(comm|pmm|page)-/gi, "");
          try {
            title = decodeURIComponent(title);
          } catch {}
        } else if (prefixPart) {
          title = prefixPart;
        }
      }

      try {
        title = decodeURIComponent(title);
      } catch {}

      return title.trim() || defaultFallback;
    };

    // 2. Campaigns
    campaignsSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      const target = Number(d.target || d.goal || d.targetGoal || 0);
      const raised = Number(d.currentAmount || d.raised || d.totalRaised || 0);
      items.push({
        id: doc.id,
        title: `🎯 ${getCleanTitle(d, doc.id, "קמפיין")}`,
        category: "קמפיינים ותרומות",
        type: "campaign",
        url: `/c/${doc.id}`,
        target,
        currentAmount: raised,
        coverImage: d.coverImage || d.image || "",
      });
    });

    // 3. Landing Pages
    landingSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      items.push({
        id: doc.id,
        title: `📄 ${getCleanTitle(d, doc.id, "דף נחיתה")}`,
        category: "דפי נחיתה",
        type: "landing",
        url: `/${doc.id}`,
      });
    });

    // 4. Services Pages
    servicesSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      items.push({
        id: doc.id,
        title: `⚙️ ${getCleanTitle(d, doc.id, "עמוד שירות")}`,
        category: "עמודי שירות ופעילות",
        type: "service",
        url: `/service/${doc.id}`,
      });
    });

    // 5. Custom Pages
    pagesSnap.docs.forEach((doc: any) => {
      if (doc.id === "home") return;
      const d = doc.data();
      // Avoid duplicate IDs if already added from landing
      if (!items.some(it => it.id === doc.id)) {
        items.push({
          id: doc.id,
          title: `🌐 ${getCleanTitle(d, doc.id, "עמוד")}`,
          category: "עמודי אתר נוספים",
          type: "page",
          url: `/${doc.id}`,
        });
      }
    });

    return JSON.parse(JSON.stringify(items));
  } catch (e) {
    console.warn("Error fetching campaigns and pages for select:", e);
    return [];
  }
}

export async function saveSmartGroup(group: Partial<SmartGroup> & { 
  createPage?: boolean;
  previousName?: string;
}): Promise<{ success: boolean; id?: string; pageUrl?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    if (!group.name || !group.name.trim()) throw new Error("שם הוא שדה חובה");
    const cleanName = group.name.trim();
    const previousName = group.previousName ? group.previousName.trim() : "";

    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    let docId = group.id && !group.id.startsWith("new_") && !group.id.startsWith("tag_") ? group.id : groupsRef.doc().id;

    // Check if docId already exists by name
    if (group.id?.startsWith("tag_") || !group.id) {
      const existingByName = await groupsRef.where("name", "==", cleanName).get();
      if (!existingByName.empty) {
        docId = existingByName.docs[0].id;
      }
    }

    const shouldCreatePage = Boolean(group.createPage);
    const isCommunity = shouldCreatePage || Boolean(group.isCommunity && group.category === "community");
    let pageSlug = "";
    let pageUrl = "";
    const targetCampId = group.mainCampaignId || "home";

    if (shouldCreatePage) {
      // Define page slug & URL (strictly English letters, numbers, and hyphens only)
      let cleanSlug = (group.pageSlug || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!cleanSlug || cleanSlug.length < 2) {
        cleanSlug = `comm-${docId.substring(0, 8)}`;
      }
      pageSlug = cleanSlug;
      pageUrl = `/${pageSlug}`;

      // Auto-create/update page in 'pages' collection with full home editor capabilities
      try {
        const pageRef = adminDb.collection("pages").doc(pageSlug);
        const pageSnap = await pageRef.get();
        
        // Inherit videoGallery, tiers, header, donors from main campaign or home
        let inheritedVideoGallery: any = null;
        let inheritedTiers: any = null;
        let inheritedHeader: any = null;
        let inheritedDonors: any = null;

        try {
          let campDoc = await adminDb.collection("pages").doc(targetCampId === "home" ? "home" : targetCampId).get();
          if (!campDoc.exists && targetCampId !== "home") {
            campDoc = await adminDb.collection("campaigns").doc(targetCampId).get();
          }
          if (!campDoc.exists) {
            campDoc = await adminDb.collection("pages").doc("home").get();
          }

          if (campDoc.exists) {
            const cData = campDoc.data() || {};
            inheritedVideoGallery = cData.videoGallery || null;
            inheritedTiers = cData.campaignTiers || null;
            inheritedHeader = cData.campaignHeader || null;
            inheritedDonors = cData.campaignDonors || null;
          }
        } catch (inheritErr) {
          console.warn("Could not fetch inherited campaign data:", inheritErr);
        }

        const communityHeroImage = group.gallery && group.gallery.length > 0 
          ? group.gallery[0] 
          : (inheritedVideoGallery?.images?.[0] || "");

        const communitySecondaryImage = group.gallery && group.gallery.length > 1 
          ? group.gallery[1] 
          : communityHeroImage;

        const pageData: any = {
          id: pageSlug,
          ownerId,
          title: cleanName,
          slug: pageSlug,
          collectionName: "pages",
          updatedAt: new Date().toISOString(),
          seo: {
            title: cleanName,
            description: group.vision || group.purpose || group.description || `קהילת ${cleanName}`,
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
              : (group.gallery || []),
            videoUrl: inheritedVideoGallery?.videoUrl || "",
            videoType: inheritedVideoGallery?.videoType || "youtube",
            effect: inheritedVideoGallery?.effect || "fade",
            objectFit: inheritedVideoGallery?.objectFit || "cover",
            desktopHeight: inheritedVideoGallery?.desktopHeight || "500px"
          },
          // 2. Rich Content / About Section (קלאסי ממורכז כברירת מחדל)
          richContent: {
            visible: true,
            anchorId: "richContent",
            heading: cleanName,
            title: cleanName,
            body: group.vision
              ? `${group.vision}${group.purpose ? `\n\nמטרות ויעדים:\n${group.purpose}` : ""}`
              : (group.purpose || group.description || `ברוכים הבאים לעמוד קהילת ${cleanName}`),
            layout: "center"
          },
          // 3. Campaign Tiers
          campaignTiers: {
            visible: true,
            anchorId: "campaignTiers",
            campaignId: targetCampId,
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
            campaignId: targetCampId,
            ambassadorSlug: pageSlug,
            ambassadorName: cleanName
          },
          // 5. Campaign Donors
          campaignDonors: {
            visible: true,
            anchorId: "campaignDonors",
            campaignId: targetCampId,
            ambassadorSlug: pageSlug,
            ambassadorName: cleanName,
            campaignDescription: group.vision || group.purpose || group.description || ""
          },
          // 6. Hero Section (מוסתר כברירת מחדל)
          hero: {
            visible: false,
            anchorId: "hero",
            title: cleanName,
            subtitle: group.vision || group.purpose || `קהילת ${cleanName}`,
            description: group.purpose || group.description || "",
            imageSrc: communityHeroImage,
            layout: "progressive",
            buttonsVisible: false,
            heroStyle: "hero",
            flexDirection: "col"
          },
          // 7. Main Content Section (מוסתר כברירת מחדל)
          mainContent: {
            visible: false,
            anchorId: "mainContent",
            title: cleanName,
            subtitle: group.vision ? `חזון הקהילה` : (group.purpose ? "מטרות הקהילה" : ""),
            description: group.vision || group.purpose || "",
            imageSrc: communitySecondaryImage,
            layout: "course-banner"
          },
          services: { visible: false, items: [] },
          community: { visible: false, title: cleanName, description: group.description || "", gallery: group.gallery || [] },
          pricing: { visible: false, packages: [] },
          livePosts: { visible: false },
          faq: { visible: false, items: [] },
          timer: { visible: false },
          landingSection: { visible: false },
          contact: { visible: false }
        };

        if (!pageSnap.exists) {
          pageData.createdAt = new Date().toISOString();
          await pageRef.set(pageData);
        } else {
          await pageRef.set(pageData, { merge: true });
        }
      } catch (pageErr) {
        console.warn("Could not auto-create/update community page document:", pageErr);
      }

      // Sync community directly to campaign ambassadors subcollection
      try {
        const campIdToSync = (targetCampId === "/" || targetCampId === "") ? "home" : targetCampId;
        const ambData = {
          id: pageSlug,
          name: cleanName,
          leaderName: group.leaderName || cleanName,
          slug: pageSlug,
          targetGoal: Number(group.targetGoal || 5000),
          totalRaised: 0,
          message: group.vision || group.description || "",
          vision: group.vision || "",
          gallery: group.gallery || [],
          campaignId: campIdToSync,
          pageUrl: pageUrl,
          updatedAt: new Date().toISOString(),
        };

        await adminDb
          .collection("campaigns")
          .doc(campIdToSync)
          .collection("ambassadors")
          .doc(pageSlug)
          .set(ambData, { merge: true });

        if (campIdToSync === "home") {
          await adminDb
            .collection("campaigns")
            .doc("default-campaign")
            .collection("ambassadors")
            .doc(pageSlug)
            .set(ambData, { merge: true });
        }
      } catch (ambSyncErr) {
        console.warn("Could not sync community to campaign ambassadors:", ambSyncErr);
      }
    } else if (group.id) {
      // If user chose NOT to have a page, clean up old page/ambassador documents if they existed
      try {
        const oldGroupDoc = await groupsRef.doc(docId).get();
        if (oldGroupDoc.exists) {
          const oldG = oldGroupDoc.data() as SmartGroup;
          const oldSlug = oldG.pageSlug || oldG.pageId;
          if (oldSlug) {
            await adminDb.collection("pages").doc(oldSlug).delete().catch(() => {});
            await adminDb.collection("campaigns").doc(oldG.mainCampaignId || "home").collection("ambassadors").doc(oldSlug).delete().catch(() => {});
            await adminDb.collection("campaigns").doc("home").collection("ambassadors").doc(oldSlug).delete().catch(() => {});
            await adminDb.collection("campaigns").doc("default-campaign").collection("ambassadors").doc(oldSlug).delete().catch(() => {});
          }
        }
      } catch (cleanErr) {}
    }

    // If name changed from previousName, update all contacts where tags contain previousName
    if (previousName && previousName !== cleanName) {
      try {
        const contactsSnap = await adminDb
          .collection("contacts")
          .where("ownerId", "==", ownerId)
          .where("tags", "array-contains", previousName)
          .get();

        if (!contactsSnap.empty) {
          let batch = adminDb.batch();
          let opCount = 0;

          for (const doc of contactsSnap.docs) {
            const currentTags = doc.data().tags || [];
            const newTags = currentTags.map((t: string) => (t === previousName ? cleanName : t));
            const updateObj: any = {
              tags: newTags,
              updatedAt: new Date().toISOString(),
            };
            if (doc.data().community === previousName) {
              updateObj.community = cleanName;
            }
            batch.update(doc.ref, updateObj);
            opCount++;

            if (opCount >= 450) {
              await batch.commit();
              batch = adminDb.batch();
              opCount = 0;
            }
          }

          if (opCount > 0) {
            await batch.commit();
          }
        }
      } catch (renameErr) {
        console.warn("Could not rename tags across contacts:", renameErr);
      }
    }

    const dataToSave: SmartGroup = {
      id: docId,
      name: cleanName,
      leaderName: group.leaderName || cleanName,
      targetGoal: Number(group.targetGoal || 5000),
      color: group.color || "#4f46e5",
      description: group.description || "",
      type: group.type || "manual",
      rules: group.rules || [],
      matchType: group.matchType || "all",
      isCommunity: isCommunity,
      category: isCommunity ? "community" : "group",
      ownerId,
      gallery: group.gallery || [],
      vision: group.vision || "",
      purpose: group.purpose || "",
      pageId: shouldCreatePage ? pageSlug : "",
      pageSlug: shouldCreatePage ? pageSlug : "",
      pageUrl: shouldCreatePage ? pageUrl : "",
      mainCampaignId: shouldCreatePage ? (group.mainCampaignId || "") : "",
      campaignTitle: shouldCreatePage ? (group.campaignTitle || "") : ""
    };

    await groupsRef.doc(docId).set(dataToSave, { merge: true });

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    if (pageUrl) revalidatePath(pageUrl);
    return { success: true, id: docId, pageUrl: shouldCreatePage ? pageUrl : "" };
  } catch (error: any) {
    console.error("Error in saveSmartGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCommunityPageAction(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    const groupRef = adminDb.collection("users").doc(ownerId).collection("crm_groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) throw new Error("קהילה לא נמצאה");

    const groupData = groupSnap.data() as SmartGroup;
    const pageSlug = groupData.pageSlug || groupData.pageId;
    const mainCampId = groupData.mainCampaignId || "home";

    // 1. Delete page from 'pages' collection
    if (pageSlug) {
      await adminDb.collection("pages").doc(pageSlug).delete().catch(() => {});
      await adminDb.collection("campaigns").doc(mainCampId).collection("ambassadors").doc(pageSlug).delete().catch(() => {});
      await adminDb.collection("campaigns").doc("home").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
      await adminDb.collection("campaigns").doc("default-campaign").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
    }

    // 2. Clear page fields from crm_groups document and set isCommunity = false
    await groupRef.update({
      pageId: "",
      pageSlug: "",
      pageUrl: "",
      mainCampaignId: "",
      campaignTitle: "",
      isCommunity: false,
      category: "group",
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/");
    if (pageSlug) revalidatePath(`/${pageSlug}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCommunityPageAction:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSmartGroup(groupNameOrId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    let targetTagName = groupNameOrId;
    if (groupNameOrId.startsWith("tag_")) {
      targetTagName = decodeURIComponent(groupNameOrId.replace("tag_", ""));
    }

    // Delete definition and any associated landing page
    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const byId = await groupsRef.doc(groupNameOrId).get();
    
    if (byId.exists) {
      const gData = byId.data();
      targetTagName = gData?.name || targetTagName;
      const pageSlug = gData?.pageSlug || gData?.pageId;
      if (pageSlug) {
        await adminDb.collection("pages").doc(pageSlug).delete().catch(() => {});
        await adminDb.collection("campaigns").doc(gData?.mainCampaignId || "home").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
        await adminDb.collection("campaigns").doc("home").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
        await adminDb.collection("campaigns").doc("default-campaign").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
      }
      await groupsRef.doc(groupNameOrId).delete();
    } else {
      const byName = await groupsRef.where("name", "==", targetTagName).get();
      for (const d of byName.docs) {
        const gData = d.data();
        const pageSlug = gData?.pageSlug || gData?.pageId;
        if (pageSlug) {
          await adminDb.collection("pages").doc(pageSlug).delete().catch(() => {});
          await adminDb.collection("campaigns").doc(gData?.mainCampaignId || "home").collection("ambassadors").doc(pageSlug).delete().catch(() => {});
        }
        await d.ref.delete();
      }
    }

    // Remove tag and community from contacts
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();

    const batch = adminDb.batch();
    let batchCount = 0;
    snap.forEach((doc) => {
      const d = doc.data();
      const currentTags: string[] = Array.isArray(d.tags) ? d.tags : [];
      const hasTag = currentTags.includes(targetTagName);
      const isComm = d.community === targetTagName;
      const isMhComm = d.mh_crm_community === targetTagName;

      if (hasTag || isComm || isMhComm) {
        batch.update(doc.ref, {
          tags: currentTags.filter((t: string) => t !== targetTagName),
          community: isComm ? "" : (d.community || ""),
          mh_crm_community: isMhComm ? "" : (d.mh_crm_community || ""),
          updatedAt: new Date().toISOString(),
        });
        batchCount++;
      }
    });
    if (batchCount > 0) {
      await batch.commit();
    }

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/dashboard/crm");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteSmartGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkAssignGroup(
  contactIds: string[],
  groupTag: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const cleanTag = groupTag.trim();
    if (!cleanTag) throw new Error("שם תווית לא תקין");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const currentTags: string[] = doc.data()?.tags || [];
        if (!currentTags.includes(cleanTag)) {
          batch.update(ref, {
            tags: [...currentTags, cleanTag],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true, count: cleanIds.length };
  } catch (error: any) {
    console.error("Error in bulkAssignGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkRemoveFromGroup(
  contactIds: string[],
  groupTag: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const cleanTag = groupTag.trim();
    if (!cleanTag) throw new Error("שם תווית לא תקין");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        const currentTags: string[] = doc.data()?.tags || [];
        if (currentTags.includes(cleanTag)) {
          batch.update(ref, {
            tags: currentTags.filter((t) => t !== cleanTag),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true, count: cleanIds.length };
  } catch (error: any) {
    console.error("Error in bulkRemoveFromGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function moveContactsBetweenGroups(
  contactIds: string[],
  fromGroupTag: string,
  toGroupTag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const fromTag = fromGroupTag.trim();
    const toTag = toGroupTag.trim();
    if (!toTag) throw new Error("יש לבחור קבוצת יעד תקינה");

    const batch = adminDb.batch();
    const cleanIds = Array.from(new Set(contactIds));

    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        let currentTags: string[] = doc.data()?.tags || [];
        if (fromTag) {
          currentTags = currentTags.filter((t) => t !== fromTag);
        }
        if (!currentTags.includes(toTag)) {
          currentTags.push(toTag);
        }
        batch.update(ref, {
          tags: currentTags,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true };
  } catch (error: any) {
    console.error("Error in moveContactsBetweenGroups:", error);
    return { success: false, error: error.message };
  }
}

export async function setContactTags(
  contactId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cleanTags = Array.from(
      new Set(tags.map((t) => t.trim()).filter((t) => t !== ""))
    );

    await adminDb.collection("contacts").doc(contactId).update({
      tags: cleanTags,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");

    return { success: true };
  } catch (error: any) {
    console.error("Error in setContactTags:", error);
    return { success: false, error: error.message };
  }
}

// Fetch Community Interactions / Broadcasts History
export async function getCommunityInteractions(
  communityId: string,
  communityName?: string
): Promise<{ success: boolean; interactions: any[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const userId = session.user.id;

    const campaignsSnap = await adminDb
      .collection("whatsapp_campaigns")
      .where("userId", "==", userId)
      .get();

    const interactions: any[] = [];

    for (const doc of campaignsSnap.docs) {
      const data = doc.data();
      const matchesId = data.communityId && data.communityId === communityId;
      const matchesName = communityName && data.communityName && data.communityName === communityName;
      const matchesAll = communityId === "__all__";

      if (matchesId || matchesName || matchesAll) {
        // Fetch recipients
        const recSnap = await doc.ref.collection("recipients").get();
        const recipients = recSnap.docs.map((rDoc) => ({
          id: rDoc.id,
          ...rDoc.data(),
        }));

        interactions.push({
          id: doc.id,
          ...data,
          recipients,
        });
      }
    }

    // Sort descending by createdAt
    interactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      interactions: JSON.parse(JSON.stringify(interactions)),
    };
  } catch (error: any) {
    console.error("Error in getCommunityInteractions:", error);
    return { success: false, interactions: [], error: error.message };
  }
}

export async function bulkPermanentDeleteContacts(
  contactIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    const cleanIds = Array.from(new Set(contactIds));
    if (cleanIds.length === 0) return { success: true, count: 0 };

    const batch = adminDb.batch();
    for (const id of cleanIds) {
      const ref = adminDb.collection("contacts").doc(id);
      batch.delete(ref);
    }

    await batch.commit();
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/dashboard/crm");

    return { success: true, count: cleanIds.length };
  } catch (error: any) {
    console.error("Error in bulkPermanentDeleteContacts:", error);
    return { success: false, error: error.message };
  }
}

export interface ExcelGroupImportRow {
  groupName: string;
  leaderName?: string;
  targetGoal?: number;
  vision?: string;
  description?: string;
  slug?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  amount?: number;
  city?: string;
  leadSource?: string;
}

export interface ExcelGroupImportOptions {
  autoCreateGroups: boolean;
  tagExistingContacts: boolean;
  createNewContacts: boolean;
  defaultCampaignId?: string;
}

export async function importGroupsFromExcelAction(
  rows: ExcelGroupImportRow[],
  options: ExcelGroupImportOptions
): Promise<{
  success: boolean;
  createdGroupsCount: number;
  updatedContactsCount: number;
  createdContactsCount: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, createdGroupsCount: 0, updatedContactsCount: 0, createdContactsCount: 0, error: "אין שורות נתונים לייבוא" };
    }

    let createdGroupsCount = 0;
    let updatedContactsCount = 0;
    let createdContactsCount = 0;

    // 1. Fetch existing groups for this owner
    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const groupsSnap = await groupsRef.get();
    const existingGroupsMap = new Map<string, any>();
    groupsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.name) existingGroupsMap.set(data.name.trim().toLowerCase(), { id: doc.id, ...data });
    });

    // 2. Process and create groups if enabled
    const PRESET_COLORS = [
      "#4f46e5", "#059669", "#d97706", "#dc2626", 
      "#7c3aed", "#2563eb", "#0891b2", "#db2777"
    ];

    const uniqueGroupsInRows = new Map<string, ExcelGroupImportRow>();
    rows.forEach((r) => {
      const gName = (r.groupName || "").trim();
      if (gName && !uniqueGroupsInRows.has(gName.toLowerCase())) {
        uniqueGroupsInRows.set(gName.toLowerCase(), r);
      }
    });

    if (options.autoCreateGroups) {
      for (const [lowerName, row] of uniqueGroupsInRows.entries()) {
        if (!existingGroupsMap.has(lowerName)) {
          const gName = row.groupName.trim();
          const docId = groupsRef.doc().id;

          // Generate English slug
          let cleanSlug = (row.slug || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

          if (!cleanSlug || cleanSlug.length < 2) {
            cleanSlug = `comm-${docId.substring(0, 8)}`;
          }

          const pageUrl = `/${cleanSlug}`;
          const targetCampId = options.defaultCampaignId || "home";

          const newGroupData: SmartGroup = {
            id: docId,
            name: gName,
            leaderName: row.leaderName || gName,
            targetGoal: Number(row.targetGoal || 5000),
            color: PRESET_COLORS[createdGroupsCount % PRESET_COLORS.length],
            description: row.description || "",
            vision: row.vision || "",
            purpose: "",
            gallery: [],
            pageId: cleanSlug,
            pageSlug: cleanSlug,
            pageUrl: pageUrl,
            mainCampaignId: targetCampId === "/" ? "home" : targetCampId,
            campaignTitle: "",
            type: "manual",
            matchType: "all",
            rules: [],
            ownerId
          };

          await groupsRef.doc(docId).set(newGroupData, { merge: true });

          // Also auto-create page document in 'pages'
          try {
            await adminDb.collection("pages").doc(cleanSlug).set({
              id: cleanSlug,
              ownerId,
              title: gName,
              slug: cleanSlug,
              collectionName: "pages",
              updatedAt: new Date().toISOString(),
              seo: {
                title: gName,
                description: row.vision || row.description || `קהילת ${gName}`,
              },
              sectionOrder: ["videoGallery", "richContent", "campaignTiers", "campaignHeader", "campaignDonors"],
              richContent: {
                visible: true,
                anchorId: "about",
                title: `אודות ${gName}`,
                heading: `חזון ופעילות ${gName}`,
                body: row.vision || row.description || `ברוכים הבאים לעמוד קהילת ${gName}`,
                layout: "center"
              },
              campaignHeader: {
                visible: true,
                anchorId: "campaignHeader",
                campaignId: targetCampId,
                ambassadorSlug: cleanSlug,
                ambassadorName: gName,
                targetGoal: Number(row.targetGoal || 5000)
              },
              campaignDonors: {
                visible: true,
                anchorId: "campaignDonors",
                campaignId: targetCampId,
                ambassadorSlug: cleanSlug,
                ambassadorName: gName,
                campaignDescription: row.vision || row.description || ""
              },
              hero: { visible: false },
              mainContent: { visible: false },
              services: { visible: false },
              community: { visible: false },
              pricing: { visible: false },
              livePosts: { visible: false },
              faq: { visible: false },
              timer: { visible: false },
              contact: { visible: false }
            }, { merge: true });
          } catch (pErr) {
            console.warn("Could not create page document for imported group:", pErr);
          }

          existingGroupsMap.set(lowerName, newGroupData);
          createdGroupsCount++;
        }
      }
    }

    // 3. Process contacts
    if (options.tagExistingContacts || options.createNewContacts) {
      // Fetch all existing contacts
      const contactsSnap = await adminDb.collection("contacts").where("ownerId", "==", ownerId).get();
      const contactByPhoneMap = new Map<string, any>();
      const contactByEmailMap = new Map<string, any>();
      const contactByNameMap = new Map<string, any>();

      contactsSnap.docs.forEach((cDoc) => {
        const cData = cDoc.data();
        const contactObj = { id: cDoc.id, ...cData };
        if (cData.conta_phone) {
          const digits = String(cData.conta_phone).replace(/\D/g, "");
          if (digits) contactByPhoneMap.set(digits, contactObj);
        }
        if (cData.phone) {
          const digits = String(cData.phone).replace(/\D/g, "");
          if (digits) contactByPhoneMap.set(digits, contactObj);
        }
        if (cData.email && typeof cData.email === "string" && cData.email.trim()) {
          contactByEmailMap.set(cData.email.trim().toLowerCase(), contactObj);
        }
        if (cData.conta_name && typeof cData.conta_name === "string" && cData.conta_name.trim()) {
          contactByNameMap.set(cData.conta_name.trim().toLowerCase(), contactObj);
        }
      });

      let currentBatch = adminDb.batch();
      let batchCount = 0;

      for (const row of rows) {
        const gName = (row.groupName || "").trim();
        const rawPhone = row.phone ? String(row.phone).replace(/\D/g, "") : "";
        const rawEmail = row.email ? String(row.email).trim().toLowerCase() : "";
        const rawName = (row.contactName || "").trim();

        if (!rawPhone && !rawEmail && !rawName) continue;

        // Try to match existing contact
        let matched = null;
        if (rawPhone && contactByPhoneMap.has(rawPhone)) {
          matched = contactByPhoneMap.get(rawPhone);
        } else if (rawEmail && contactByEmailMap.has(rawEmail)) {
          matched = contactByEmailMap.get(rawEmail);
        } else if (rawName && contactByNameMap.has(rawName.toLowerCase())) {
          matched = contactByNameMap.get(rawName.toLowerCase());
        }

        if (matched) {
          if (options.tagExistingContacts && gName) {
            const currentTags = Array.isArray(matched.tags) ? [...matched.tags] : [];
            let needsUpdate = false;

            if (!currentTags.includes(gName)) {
              currentTags.push(gName);
              needsUpdate = true;
            }

            const updateData: any = {
              tags: currentTags,
              updatedAt: new Date().toISOString()
            };

            if (!matched.community) {
              updateData.community = gName;
              needsUpdate = true;
            }

            if (row.amount && Number(row.amount) > 0 && (!matched.total_spent || Number(matched.total_spent) === 0)) {
              updateData.total_spent = Number(row.amount);
              needsUpdate = true;
            }

            if (needsUpdate) {
              const cRef = adminDb.collection("contacts").doc(matched.id);
              currentBatch.update(cRef, updateData);
              batchCount++;
              updatedContactsCount++;
              matched.tags = currentTags; // reflect in local memory
            }
          }
        } else if (options.createNewContacts) {
          // Create new contact
          const newDocRef = adminDb.collection("contacts").doc();
          const newContactData: any = {
            ownerId,
            conta_name: rawName || "לקוח חדש",
            conta_phone: row.phone || "",
            email: row.email || "",
            tags: gName ? [gName] : [],
            community: gName || "",
            mh_crm_city: row.city || "",
            lead_source: row.leadSource || "ייבוא אקסל",
            total_spent: Number(row.amount || 0),
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          currentBatch.set(newDocRef, newContactData);
          batchCount++;
          createdContactsCount++;

          const createdObj = { id: newDocRef.id, ...newContactData };
          if (rawPhone) contactByPhoneMap.set(rawPhone, createdObj);
          if (rawEmail) contactByEmailMap.set(rawEmail, createdObj);
          if (rawName) contactByNameMap.set(rawName.toLowerCase(), createdObj);
        }

        if (batchCount >= 450) {
          await currentBatch.commit();
          currentBatch = adminDb.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await currentBatch.commit();
      }
    }

    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm");

    return {
      success: true,
      createdGroupsCount,
      updatedContactsCount,
      createdContactsCount
    };
  } catch (error: any) {
    console.error("Error in importGroupsFromExcelAction:", error);
    return {
      success: false,
      createdGroupsCount: 0,
      updatedContactsCount: 0,
      createdContactsCount: 0,
      error: error.message || String(error)
    };
  }
}

const INVALID_COMMUNITIES_SET = new Set(["באולם", "בחוץ", "באולם ", "בחוץ ", "0", "2160", "4320"]);

const isInvalidCommunityName = (val?: string | null) => {
  if (!val) return true;
  const s = String(val).trim();
  if (!s || /^\d+$/.test(s)) return true;
  if (INVALID_COMMUNITIES_SET.has(s)) return true;
  return false;
};

export async function cleanupAllNumericTagsAndCommunitiesAction(): Promise<{
  cleanedContactsCount: number;
  cleanedDonationsCount: number;
  cleanedGroupsCount: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    let cleanedContactsCount = 0;
    let cleanedDonationsCount = 0;
    let cleanedGroupsCount = 0;

    // 1. Clean contacts (remove numeric community / 'באולם' / 'בחוץ', remove numeric tags)
    const contactsSnap = await adminDb.collection("contacts").where("ownerId", "==", ownerId).get();
    let batch = adminDb.batch();
    let batchOps = 0;

    for (const cDoc of contactsSnap.docs) {
      const c = cDoc.data();
      let needsUpdate = false;
      const updateData: any = {};

      // Check community
      if (c.community && isInvalidCommunityName(c.community)) {
        updateData.community = "";
        needsUpdate = true;
      }
      if (c.mh_crm_community && isInvalidCommunityName(c.mh_crm_community)) {
        updateData.mh_crm_community = "";
        needsUpdate = true;
      }

      // Check tags
      if (Array.isArray(c.tags)) {
        const filteredTags = c.tags.filter((t: any) => typeof t === "string" && t.trim() && !isInvalidCommunityName(t));
        if (filteredTags.length !== c.tags.length) {
          updateData.tags = filteredTags;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(cDoc.ref, updateData);
        batchOps++;
        cleanedContactsCount++;
      }

      if (batchOps >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        batchOps = 0;
      }
    }

    // 2. Clean donations across campaigns
    const campaignsSnap = await adminDb.collection("campaigns").get();
    for (const campDoc of campaignsSnap.docs) {
      const donationsSnap = await campDoc.ref.collection("donations").get();
      for (const dDoc of donationsSnap.docs) {
        const d = dDoc.data();
        let needsUpdate = false;
        const updateData: any = {};

        if (d.ambassadorName && isInvalidCommunityName(d.ambassadorName)) {
          updateData.ambassadorName = "";
          needsUpdate = true;
        }
        if (d.ambassadorId && isInvalidCommunityName(d.ambassadorId)) {
          updateData.ambassadorId = "";
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(dDoc.ref, updateData);
          batchOps++;
          cleanedDonationsCount++;
        }

        if (batchOps >= 450) {
          await batch.commit();
          batch = adminDb.batch();
          batchOps = 0;
        }
      }

      // Also clean ambassadors subcollection
      const ambSnap = await campDoc.ref.collection("ambassadors").get();
      for (const aDoc of ambSnap.docs) {
        const a = aDoc.data();
        if (isInvalidCommunityName(a.name) || isInvalidCommunityName(a.slug)) {
          batch.delete(aDoc.ref);
          batchOps++;
          cleanedGroupsCount++;
        }
        if (batchOps >= 450) {
          await batch.commit();
          batch = adminDb.batch();
          batchOps = 0;
        }
      }
    }

    // 3. Clean crm_groups
    const groupsSnap = await adminDb.collection("users").doc(ownerId).collection("crm_groups").get();
    for (const gDoc of groupsSnap.docs) {
      const g = gDoc.data();
      if (!g.name || isInvalidCommunityName(g.name)) {
        batch.delete(gDoc.ref);
        batchOps++;
        cleanedGroupsCount++;
      }
      if (batchOps >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        batchOps = 0;
      }
    }

    // 4. Clean invalid pages
    try {
      const pagesSnap = await adminDb.collection("pages").where("ownerId", "==", ownerId).get();
      for (const pDoc of pagesSnap.docs) {
        const p = pDoc.data();
        if (isInvalidCommunityName(p.title) || isInvalidCommunityName(p.slug)) {
          batch.delete(pDoc.ref);
          batchOps++;
        }
      }
    } catch (pErr) {}

    if (batchOps > 0) {
      await batch.commit();
    }

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath("/dashboard/crm");
    revalidatePath("/");

    return { cleanedContactsCount, cleanedDonationsCount, cleanedGroupsCount };
  } catch (error: any) {
    console.error("Error in cleanupAllNumericTagsAndCommunitiesAction:", error);
    return { cleanedContactsCount: 0, cleanedDonationsCount: 0, cleanedGroupsCount: 0 };
  }
}


