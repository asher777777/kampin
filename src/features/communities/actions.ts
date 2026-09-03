"use server";

import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { Community } from "./types";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export async function getCommunities() {
  try {
    const ownerId = await getUserId();
    
    // Fetch from GlobalSettings instead of 'communities' collection
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    let communitiesData = docSnap.exists ? (docSnap.data()?.communities || []) : [];

    const communitiesWithCount = await Promise.all(
      communitiesData.map(async (comm: any) => {
        const countSnap = await adminDb
          .collection("contacts")
          .where("ownerId", "==", ownerId)
          .where("communityIds", "array-contains", comm.id)
          .count()
          .get();
        
        return {
          id: comm.id,
          name: comm.name,
          color: comm.brandColor || comm.color || "#4f46e5",
          icon: comm.icon || "Users",
          vision: comm.vision || "",
          purpose: comm.purpose || "",
          gallery: comm.gallery || [],
          pageId: comm.pageId || `comm-${comm.id}`,
          pageSlug: comm.pageSlug || `comm-${comm.id}`,
          pageUrl: comm.pageUrl || `/comm-${comm.id}`,
          mainCampaignId: comm.mainCampaignId || "",
          campaignTitle: comm.campaignTitle || "",
          ownerId: ownerId,
          memberCount: countSnap.data().count,
        };
      })
    );

    return JSON.parse(JSON.stringify(communitiesWithCount)) as any[];
  } catch (error: any) {
    console.error("Error in getCommunities:", error);
    return [];
  }
}

export async function createCommunity(data: Partial<Community>) {
  try {
    const ownerId = await getUserId();
    
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    const currentData = docSnap.exists ? docSnap.data() : {};
    const currentCommunities = currentData?.communities || [];

    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const pageSlug = data.pageSlug || `comm-${newId}`;
    const pageUrl = `/${pageSlug}`;

    const targetCampId = data.mainCampaignId || "home";

    // Auto-create page in 'pages' collection
    try {
      const pageRef = adminDb.collection("pages").doc(pageSlug);

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

      const communityHeroImage = data.gallery && data.gallery.length > 0 ? data.gallery[0] : (inheritedVideoGallery?.images?.[0] || "");
      const communitySecondaryImage = data.gallery && data.gallery.length > 1 ? data.gallery[1] : communityHeroImage;

      const pageData: any = {
        id: pageSlug,
        ownerId,
        title: data.name || "",
        slug: pageSlug,
        collectionName: "pages",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seo: {
          title: data.name || "",
          description: data.vision || data.purpose || `קהילת ${data.name || ""}`,
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
        videoGallery: {
          visible: true,
          anchorId: "videoGallery",
          images: (inheritedVideoGallery?.images && inheritedVideoGallery.images.length > 0)
            ? inheritedVideoGallery.images
            : (data.gallery || []),
          videoUrl: inheritedVideoGallery?.videoUrl || "",
          videoType: inheritedVideoGallery?.videoType || "youtube",
          effect: inheritedVideoGallery?.effect || "fade",
          objectFit: inheritedVideoGallery?.objectFit || "cover",
          desktopHeight: inheritedVideoGallery?.desktopHeight || "500px"
        },
        richContent: {
          visible: true,
          anchorId: "richContent",
          heading: data.name || "",
          title: data.name || "",
          body: data.vision
            ? `${data.vision}${data.purpose ? `\n\nמטרות ויעדים:\n${data.purpose}` : ""}`
            : (data.purpose || `ברוכים הבאים לעמוד קהילת ${data.name || ""}`),
          layout: "classic"
        },
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
        campaignHeader: {
          visible: true,
          anchorId: "campaignHeader",
          campaignId: targetCampId,
          ambassadorSlug: pageSlug,
          ambassadorName: data.name || ""
        },
        campaignDonors: {
          visible: true,
          anchorId: "campaignDonors",
          campaignId: targetCampId,
          ambassadorSlug: pageSlug,
          ambassadorName: data.name || "",
          campaignDescription: data.vision || data.purpose || ""
        },
        hero: {
          visible: false,
          anchorId: "hero",
          title: data.name || "",
          subtitle: data.vision || data.purpose || `קהילת ${data.name || ""}`,
          description: data.purpose || "",
          imageSrc: communityHeroImage,
          layout: "progressive",
          buttonsVisible: false,
          heroStyle: "hero",
          flexDirection: "col"
        },
        mainContent: {
          visible: false,
          anchorId: "mainContent",
          title: data.name || "",
          subtitle: data.vision ? "חזון הקהילה" : (data.purpose ? "מטרות הקהילה" : ""),
          description: data.vision || data.purpose || "",
          imageSrc: communitySecondaryImage,
          layout: "course-banner"
        },
        services: { visible: false, items: [] },
        community: { visible: false, title: data.name || "", description: "", gallery: data.gallery || [] },
        pricing: { visible: false, packages: [] },
        livePosts: { visible: false },
        faq: { visible: false, items: [] },
        timer: { visible: false },
        landingSection: { visible: false },
        contact: { visible: false }
      };

      await pageRef.set(pageData);
    } catch (pageErr) {
      console.warn("Could not auto-create community page:", pageErr);
    }

    const newDoc = {
      id: newId,
      name: data.name || "",
      icon: data.icon || "Users",
      brandColor: data.color || "#4f46e5",
      vision: data.vision || "",
      purpose: data.purpose || "",
      gallery: data.gallery || [],
      pageId: pageSlug,
      pageSlug: pageSlug,
      pageUrl: pageUrl,
      mainCampaignId: data.mainCampaignId || "",
      campaignTitle: data.campaignTitle || "",
      targetAudiences: [],
      goals: [],
    };

    await docRef.set({
      ...currentData,
      communities: [newDoc, ...currentCommunities]
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    revalidatePath(pageUrl);
    
    return { success: true, id: newId, pageUrl };
  } catch (error: any) {
    console.error("Error in createCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCommunity(id: string, data: Partial<Community>) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      throw new Error("Global settings not found");
    }
    
    const currentData = docSnap.data() || {};
    const currentCommunities = currentData.communities || [];
    
    const index = currentCommunities.findIndex((c: any) => c.id === id);
    if (index === -1) {
      throw new Error("Community not found");
    }

    const updatedCommunity = {
      ...currentCommunities[index],
    };
    
    if (data.name !== undefined) updatedCommunity.name = data.name;
    if (data.icon !== undefined) updatedCommunity.icon = data.icon;
    if (data.color !== undefined) updatedCommunity.brandColor = data.color;
    if (data.vision !== undefined) updatedCommunity.vision = data.vision;
    if (data.purpose !== undefined) updatedCommunity.purpose = data.purpose;
    if (data.gallery !== undefined) updatedCommunity.gallery = data.gallery;
    if (data.mainCampaignId !== undefined) updatedCommunity.mainCampaignId = data.mainCampaignId;
    if (data.campaignTitle !== undefined) updatedCommunity.campaignTitle = data.campaignTitle;
    
    currentCommunities[index] = updatedCommunity;

    await docRef.update({
      communities: currentCommunities
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCommunity(id: string) {
  try {
    const ownerId = await getUserId();
    const docRef = adminDb.collection("users").doc(ownerId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return { success: true };
    
    const currentData = docSnap.data() || {};
    const currentCommunities = currentData.communities || [];
    
    const updatedCommunities = currentCommunities.filter((c: any) => c.id !== id);

    await docRef.update({
      communities: updatedCommunities
    });
    
    revalidatePath("/dashboard/communities");
    revalidatePath("/dashboard/crm");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCommunity:", error);
    return { success: false, error: error.message };
  }
}

export async function migrateContactsToGeneralCommunity() {
  try {
    const ownerId = await getUserId();
    
    // Check if General community exists
    const communitiesRef = adminDb.collection("communities");
    const snapshot = await communitiesRef
      .where("ownerId", "==", ownerId)
      .where("name", "==", "קהילה כללית")
      .limit(1)
      .get();
      
    let generalCommunityId = "";
    
    if (snapshot.empty) {
      // Create General community
      const newDoc = {
        name: "קהילה כללית",
        color: "#64748b", // slate-500
        icon: "Users",
        description: "קהילת ברירת מחדל לכל אנשי הקשר במערכת",
        files: [],
        ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await communitiesRef.add(newDoc);
      generalCommunityId = docRef.id;
    } else {
      generalCommunityId = snapshot.docs[0].id;
    }
    
    // Fetch all contacts
    const contactsRef = adminDb.collection("contacts");
    const contactsSnap = await contactsRef.where("ownerId", "==", ownerId).get();
    
    const batch = adminDb.batch();
    let count = 0;
    
    contactsSnap.forEach(doc => {
      const data = doc.data();
      const communityIds = data.communityIds || [];
      if (communityIds.length === 0) {
        batch.update(doc.ref, { communityIds: [generalCommunityId] });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    return { success: true, migratedCount: count, generalCommunityId };
  } catch (error: any) {
    console.error("Error migrating contacts:", error);
    return { success: false, error: error.message };
  }
}
