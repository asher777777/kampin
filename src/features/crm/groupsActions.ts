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

    snap.forEach((doc) => {
      const d = doc.data();
      if (d.status === "trashed") return;

      const tags: string[] = Array.isArray(d.tags)
        ? d.tags.filter((t: any) => typeof t === "string" && t.trim() !== "")
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
        tagsMap.set(cleanTag, (tagsMap.get(cleanTag) || 0) + 1);
      });
    });

    // Fetch saved group definitions from 'crm_groups'
    const groupsSnap = await adminDb
      .collection("users")
      .doc(ownerId)
      .collection("crm_groups")
      .get();

    const savedGroups: Map<string, SmartGroup> = new Map();
    groupsSnap.forEach((gDoc) => {
      const gData = gDoc.data() as SmartGroup;
      savedGroups.set(gData.name, { ...gData, id: gDoc.id });
    });

    // Ensure all existing tags in contacts exist as groups
    tagsMap.forEach((count, tagName) => {
      if (!savedGroups.has(tagName)) {
        savedGroups.set(tagName, {
          id: tagName,
          name: tagName,
          color: "#4f46e5",
          type: "manual",
        });
      }
    });

    // Calculate dynamic member count for all groups
    const groups: SmartGroup[] = Array.from(savedGroups.values()).map((g) => {
      const count = contacts.filter((c) => isContactInGroup(c, g)).length;
      return {
        ...g,
        count,
      };
    });

    // Sort groups descending by count
    groups.sort((a, b) => (b.count || 0) - (a.count || 0));

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
      title: "🏠 דף הבית הראשי (/)",
      category: "עמוד ראשי",
      type: "home",
      url: "/",
    });

    // 2. Campaigns
    campaignsSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      const target = Number(d.target || d.goal || d.targetGoal || 0);
      const raised = Number(d.currentAmount || d.raised || d.totalRaised || 0);
      items.push({
        id: doc.id,
        title: `🎯 ${d.title || d.name || `קמפיין (${doc.id})`}`,
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
        title: `📄 ${d.title || d.name || `דף נחיתה (${doc.id})`}`,
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
        title: `⚙️ ${d.title || d.name || `שירות (${doc.id})`}`,
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
          title: `🌐 ${d.title || d.name || `עמוד (${doc.id})`}`,
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

export async function saveSmartGroup(group: Partial<SmartGroup>): Promise<{ success: boolean; id?: string; pageUrl?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    if (!group.name || !group.name.trim()) throw new Error("שם הקהילה הוא שדה חובה");
    const cleanName = group.name.trim();

    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const docId = group.id && !group.id.startsWith("new_") ? group.id : groupsRef.doc().id;

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
    const pageSlug = cleanSlug;
    const pageUrl = `/${pageSlug}`;
    const targetCampId = group.mainCampaignId || "home";

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
        // Exact section ordering as requested:
        // 1. videoGallery (מדיה מעמוד הקמפיין)
        // 2. hero (חלק הירו עם המסלול הטבעי ותמונה מהגלריה של הקהילה)
        // 3. mainContent (חזון הקהילה ששם הקהילה ככותרת באזור התוכן האודות)
        // 4. campaignTiers (כפתורי הקמפיין)
        // 5. campaignHeader (נתוני הקמפיין)
        // 6. campaignDonors (הטאבים של הקמפיין)
        // 7-15. כל שאר האזורים ממוקמים למטה ובמצב מוסתר
        // Exact section ordering as requested:
        // 1. videoGallery (מדיה מעמוד הקמפיין)
        // 2. richContent (אזור אודות / תוכן מעוצב עם כותרת הקהילה והחזון)
        // 3. campaignTiers (כפתורי הקמפיין)
        // 4. campaignHeader (נתוני הקמפיין)
        // 5. campaignDonors (הטאבים של הקמפיין)
        // 6-15. כל שאר האזורים ממוקמים למטה ובמצב מוסתר (הירו ותוכן מרכזי מוסתרים)
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
        // 1. Video & Media Gallery (מדיה מעמוד הקמפיין)
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
        // 2. Rich Content / About Section (אזור אודות / תוכן מעוצב: כותרת הקהילה והחזון)
        richContent: {
          visible: true,
          anchorId: "richContent",
          heading: cleanName,
          title: cleanName,
          body: group.vision
            ? `${group.vision}${group.purpose ? `\n\nמטרות ויעדים:\n${group.purpose}` : ""}`
            : (group.purpose || group.description || `ברוכים הבאים לעמוד קהילת ${cleanName}`),
          layout: "classic"
        },
        // 3. Campaign Tiers / Action Buttons (כפתורי הקמפיין)
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
        // 4. Campaign Stats & Header (נתוני הקמפיין)
        campaignHeader: {
          visible: true,
          anchorId: "campaignHeader",
          campaignId: targetCampId,
          ambassadorSlug: pageSlug,
          ambassadorName: cleanName
        },
        // 5. Campaign Tabs & Donor Cards (הטאבים של הקמפיין)
        campaignDonors: {
          visible: true,
          anchorId: "campaignDonors",
          campaignId: targetCampId,
          ambassadorSlug: pageSlug,
          ambassadorName: cleanName,
          campaignDescription: group.vision || group.purpose || group.description || ""
        },
        // 6. Hero Section (מוסתר כברירת מחדל לפי בקשה)
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
        // 7. Main Content Section (מוסתר כברירת מחדל לפי בקשה)
        mainContent: {
          visible: false,
          anchorId: "mainContent",
          title: cleanName,
          subtitle: group.vision ? `חזון הקהילה` : (group.purpose ? "מטרות הקהילה" : ""),
          description: group.vision || group.purpose || "",
          imageSrc: communitySecondaryImage,
          layout: "course-banner"
        },
        // 8-15. All other sections positioned at the bottom and hidden:
        services: {
          visible: false,
          items: []
        },
        community: {
          visible: false,
          title: cleanName,
          description: group.description || "",
          gallery: group.gallery || []
        },
        pricing: {
          visible: false,
          packages: []
        },
        livePosts: {
          visible: false
        },
        faq: {
          visible: false,
          items: []
        },
        timer: {
          visible: false
        },
        landingSection: {
          visible: false
        },
        contact: {
          visible: false
        }
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

    const dataToSave: SmartGroup = {
      id: docId,
      name: cleanName,
      leaderName: group.leaderName || cleanName,
      targetGoal: Number(group.targetGoal || 5000),
      color: group.color || "#6366f1",
      description: group.description || "",
      type: group.type || "manual",
      rules: group.rules || [],
      matchType: group.matchType || "all",
      ownerId,
      gallery: group.gallery || [],
      vision: group.vision || "",
      purpose: group.purpose || "",
      pageId: pageSlug,
      pageSlug: pageSlug,
      pageUrl: pageUrl,
      mainCampaignId: group.mainCampaignId || "",
      campaignTitle: group.campaignTitle || ""
    };

    await groupsRef.doc(docId).set(dataToSave, { merge: true });

    // Sync community directly to campaign ambassadors subcollection for real-time listener updates
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

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
    revalidatePath(pageUrl);
    return { success: true, id: docId, pageUrl };
  } catch (error: any) {
    console.error("Error in saveSmartGroup:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSmartGroup(groupNameOrId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;

    // Delete definition
    const groupsRef = adminDb.collection("users").doc(ownerId).collection("crm_groups");
    const byId = await groupsRef.doc(groupNameOrId).get();
    let tagName = groupNameOrId;
    if (byId.exists) {
      tagName = byId.data()?.name || groupNameOrId;
      await groupsRef.doc(groupNameOrId).delete();
    } else {
      const byName = await groupsRef.where("name", "==", groupNameOrId).get();
      byName.forEach(async (d) => await d.ref.delete());
    }

    // Remove tag from contacts
    const snap = await adminDb
      .collection("contacts")
      .where("ownerId", "==", ownerId)
      .where("tags", "array-contains", tagName)
      .get();

    const batch = adminDb.batch();
    snap.forEach((doc) => {
      const currentTags = doc.data().tags || [];
      batch.update(doc.ref, {
        tags: currentTags.filter((t: string) => t !== tagName),
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    revalidatePath("/dashboard/crm/groups");
    revalidatePath("/dashboard/crm/analytics");
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


