import { adminDb } from "@/lib/firebase-admin";
import { notFound, redirect } from "next/navigation";
import { Hero } from "@/components/sections/Hero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { LandingSection } from "@/components/sections/LandingSection";
import { RichContentSection } from "@/components/sections/RichContentSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { TimerSection } from "@/components/sections/TimerSection";
import { CommunitySection } from "@/components/sections/CommunitySection";
import { ContactSection } from "@/components/sections/ContactSection";
import { getGlobalSettings } from "@/features/settings/actions";
import { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";
import { auth } from "@/lib/auth";

export const revalidate = 3600; // Revalidate every hour

import { staticLandingPages } from "@/data/landing-pages";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    let docSnap = await adminDb.collection("landing").doc(id).get();
    if (!docSnap.exists) {
      docSnap = await adminDb.collection("pages").doc(id).get();
    }
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        title: data?.seo?.title || data?.hero?.title || "עמוד נחיתה",
        description: data?.seo?.description || data?.hero?.subtitle || "עמוד נחיתה שנבנה באמצעות מערכת מחולל הקהילות",
      };
    }
  } catch (e) {}
  
  const fallback = staticLandingPages.find(p => p.id === id);
  if (fallback) {
    return {
      title: fallback.seo.title,
      description: fallback.seo.description || "עמוד נחיתה שנבנה באמצעות מערכת מחולל הקהילות",
    };
  }
  
  return { 
    title: "עמוד נחיתה",
    description: "עמוד נחיתה שנבנה באמצעות מערכת מחולל הקהילות"
  };
}

export default async function LandingPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPreview = resolvedSearchParams.preview === "true";
  const session = await auth();
  
  // 1. Fetch landing / custom page configuration
  let pageConfig: any = null;
  let detectedCollection = "landing";

  try {
    let docSnap = await adminDb.collection("landing").doc(id).get();
    if (docSnap.exists) {
      pageConfig = docSnap.data();
      detectedCollection = "landing";
    } else {
      docSnap = await adminDb.collection("pages").doc(id).get();
      if (docSnap.exists) {
        pageConfig = docSnap.data();
        detectedCollection = "pages";
      }
    }
  } catch (error) {
    console.warn("Could not fetch page from DB:", error);
  }

  if (!pageConfig) {
    const fallback = staticLandingPages.find(p => p.id === id);
    if (fallback) {
      pageConfig = fallback;
    } else {
      return notFound();
    }
  }

  const globalSettings = await getGlobalSettings(pageConfig?.ownerId);

  // Set defaults for page configuration
  const config = {
    ...pageConfig,
  };

  const mappedConfig = {
    ...config,
    sectionOrder: config.sectionOrder || ["videoGallery", "hero", "mainContent", "campaignTiers", "campaignHeader", "campaignDonors", "services", "community", "pricing", "livePosts", "faq", "timer", "richContent", "landingSection", "contact"],
    timer: {
      ...config.timer,
      targetDate: config.timer?.endDate || config.timer?.targetDate || config.timer?.date
    },
    richContent: {
      ...config.richContent,
      heading: config.richContent?.heading || config.richContent?.title,
      body: config.richContent?.body || config.richContent?.content,
      layout: config.richContent?.layout || config.richContent?.theme || "split"
    },
    services: {
      ...config.services,
      description: config.services?.description || config.services?.subtitle,
      layout: config.services?.layout || "grid",
      columns: config.services?.columns || 3,
      effect: config.services?.effect || "glow",
      items: config.services?.items || []
    },
    hero: {
      ...config.hero,
      layout: config.hero?.layout || "progressive",
    },
    community: {
      ...config.community,
      layout: config.community?.layout || "split",
      badgeVisible: config.community?.badgeVisible !== false,
      buttonVisible: config.community?.buttonVisible !== false
    }
  };
  
  // If this page was created by the new builder (v2), we use the clean V2 viewer
  if (pageConfig?.builderVersion === "v2") {
    const { V2PageClient } = await import("./V2PageClient");
    return <V2PageClient pageData={pageConfig} />;
  }

  // If preview mode is on, force canEdit to false so the old editor doesn't wrap the page
  const canEdit = !isPreview && (session?.user?.role === "SUPERADMIN" || session?.user?.id === "1" || session?.user?.id === pageConfig?.ownerId);

  return <HomeClient initialConfig={mappedConfig as any} initialGlobalSettings={globalSettings} pageId={id} collectionName={detectedCollection} canEdit={canEdit} />;
}
