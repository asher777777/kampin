"use server";

import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export interface NavLink {
  name: string;
  href: string;
}

export interface CommunityGoal {
  name: string;
  icon: string;
}

export interface CommunityData {
  id: string;
  name: string;
  icon?: string;
  targetAudiences?: string[];
  goals?: CommunityGoal[];
  brandColor: string;
}

export interface GlobalSettings {
  communities?: CommunityData[];
  siteLogoUrl: string;
  headerLayout: "classic" | "center" | "left";
  theme: "navy" | "emerald" | "rose" | "violet" | "charcoal";
  navLinks: NavLink[];
  customAudiences?: string[];
  customGoals?: string[];
  whatToGenerate?: string[];
  
  // Global Colors
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  
  // Text Colors
  textColor?: string;
  textColorH1?: string;
  textColorH2?: string;
  textColorH3?: string;
  
  // Button Colors
  buttonBgColor?: string;
  buttonTextColor?: string;
  
  // Personal Details
  companyName?: string;
  organizationType?: "חברה" | "עמותה" | "שותפות" | "עוסק מורשה" | "עוסק פטור";
  organizationPurpose?: string;
  slogan?: string;
  shortVision?: string;
  companyVision?: string;
  logoUrl?: string;
  memberCount?: string;
  personalName?: string;
  personalEmail?: string;
  personalPhone?: string;
  personalTitle?: string;

  // Contact Info
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;

  // Social Networks
  contactFacebook?: string;
  contactInstagram?: string;
  contactYouTube?: string;
  contactWhatsApp?: string;
  contactTikTok?: string;
  contactLinkedIn?: string;

  hasFacebook?: "yes" | "no" | null;
  hasInstagram?: "yes" | "no" | null;
  hasTikTok?: "yes" | "no" | null;
  hasYouTube?: "yes" | "no" | null;
  hasLinkedIn?: "yes" | "no" | null;
  socialSetupCompleted?: boolean;
  
  // Mini Site
  miniSiteSlug?: string;
}

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  siteLogoUrl: "/logo.png",
  headerLayout: "classic",
  theme: "charcoal",
  navLinks: [
    { name: "בית", href: "/" },
    { name: "עמודי נחיתה", href: "/landing-pages" },
    { name: "שירותים", href: "/services-pages" },
    { name: "תוכן ו-SEO", href: "/content-pages" },
    { name: "צור קשר", href: "/contact" },
  ],
  customAudiences: [],
  primaryColor: "#d8435d",
  secondaryColor: "#10354b",
  backgroundColor: "#f8f9fa",
  textColor: "#1f2937",
  contactPhone: "",
  contactEmail: "",
  contactFacebook: "",
  contactAddress: "",
  contactInstagram: "",
  contactYouTube: "",
  contactWhatsApp: "",
  companyName: "",
  companyVision: "",
  personalName: "",
  personalEmail: "",
  personalPhone: "",
  personalTitle: "",
};

export async function getGlobalSettings(userId?: string): Promise<GlobalSettings> {
  try {
    let finalUserId = userId;
    if (!finalUserId) {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      finalUserId = session.user.id;
    }

    const { getUserDb } = await import("@/lib/firebase-admin");
    const docRef = getUserDb(finalUserId).collection("settings").doc("global");
    const docSnap = await docRef.get();
    
    let data = docSnap.exists ? docSnap.data() : {};

    const adminLogoUrl = await import("@/features/company-assets/actions").then(m => m.getAdminLogoUrl());
      
      return {
        siteLogoUrl: data?.siteLogoUrl || adminLogoUrl || "",
        headerLayout: data?.headerLayout || "classic",
        theme: data?.theme || "navy",
        navLinks: data?.navLinks || DEFAULT_GLOBAL_SETTINGS.navLinks,
        customAudiences: data?.customAudiences || [],
        customGoals: data?.customGoals || [],
        
        // Global Colors
        primaryColor: data?.primaryColor || "",
        secondaryColor: data?.secondaryColor || "",
        backgroundColor: data?.backgroundColor || "",
        textColor: data?.textColor || "",
        textColorH1: data?.textColorH1 || "",
        textColorH2: data?.textColorH2 || "",
        textColorH3: data?.textColorH3 || "",
        buttonBgColor: data?.buttonBgColor || "",
        buttonTextColor: data?.buttonTextColor || "",
        shortVision: data?.shortVision || "",
        companyVision: data?.companyVision || "",
        personalName: data?.personalName || "",
        personalEmail: data?.personalEmail || "",
        personalPhone: data?.personalPhone || "",

        // Personal Details
        companyName: data?.companyName || "",
        organizationType: data?.organizationType || "",
        organizationPurpose: data?.organizationPurpose || "",
        slogan: data?.slogan || "",
        personalTitle: data?.personalTitle || "",
        memberCount: data?.memberCount || "",

        // Contact Info
        contactPhone: data?.contactPhone || DEFAULT_GLOBAL_SETTINGS.contactPhone,
        contactEmail: data?.contactEmail || DEFAULT_GLOBAL_SETTINGS.contactEmail,
        contactAddress: data?.contactAddress || DEFAULT_GLOBAL_SETTINGS.contactAddress,

        // Social Networks
        contactFacebook: data?.contactFacebook || "",
        contactInstagram: data?.contactInstagram || "",
        contactYouTube: data?.contactYouTube || "",
        contactWhatsApp: data?.contactWhatsApp || "",
        contactTikTok: data?.contactTikTok || "",
        contactLinkedIn: data?.contactLinkedIn || "",
        hasFacebook: data?.hasFacebook || null,
        hasInstagram: data?.hasInstagram || null,
        hasTikTok: data?.hasTikTok || null,
        hasYouTube: data?.hasYouTube || null,
        hasLinkedIn: data?.hasLinkedIn || null,
        socialSetupCompleted: data?.socialSetupCompleted || false,
        // Mini Site
        miniSiteSlug: data?.miniSiteSlug || "",

        // Communities
        communities: data?.communities || [],
      } as GlobalSettings;
  } catch (error) {
    console.warn(`Error fetching global settings:`, (error as Error).message);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export async function saveGlobalSettings(settings: Partial<GlobalSettings>) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { getUserDb, adminDb } = await import("@/lib/firebase-admin");

    const docRef = getUserDb(session.user.id).collection("settings").doc("global");
    await docRef.set({ ...settings, updatedAt: new Date().toISOString() }, { merge: true });

    // Also mirror to users/{userId} document
    const userUpdate: any = {};
    if (settings.companyName !== undefined) userUpdate.companyName = settings.companyName;
    if (settings.organizationPurpose !== undefined) userUpdate.organizationPurpose = settings.organizationPurpose;
    if (settings.memberCount !== undefined) userUpdate.memberCount = settings.memberCount;
    if (settings.contactFacebook !== undefined) userUpdate.contactFacebook = settings.contactFacebook;
    if (settings.contactInstagram !== undefined) userUpdate.contactInstagram = settings.contactInstagram;
    if (settings.contactTikTok !== undefined) userUpdate.contactTikTok = settings.contactTikTok;
    if (settings.contactYouTube !== undefined) userUpdate.contactYouTube = settings.contactYouTube;
    if (settings.contactLinkedIn !== undefined) userUpdate.contactLinkedIn = settings.contactLinkedIn;

    if (Object.keys(userUpdate).length > 0) {
      await adminDb.collection("users").doc(session.user.id).set(userUpdate, { merge: true });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.warn(`Error saving global settings:`, (error as Error).message);
    const errMsg = (error as Error).message || "";
    if (errMsg.includes("Could not load the default credentials") || errMsg.includes("UNAUTHENTICATED") || errMsg.includes("credential")) {
      console.warn("Firebase credentials missing locally - proceeding with local session save.");
      return { success: true, isLocalFallback: true };
    }
    throw new Error("Failed to save to Firebase");
  }
}
