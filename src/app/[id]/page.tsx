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
import DottyChatClient from "../dotty/DottyChatClient";
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

    // Check smart_workers
    const agentDoc = await adminDb.collection("smart_workers").doc(id).get();
    if (agentDoc.exists) {
      const data = agentDoc.data();
      return {
        title: data?.name || "סוכן חכם",
        description: data?.role || "סוכן דיגיטלי חכם",
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

  // 1. Check if this is a system-level smart worker (e.g., betty) or office
  try {
    let agentDoc = await adminDb.collection("smart_workers").doc(id).get();
    if (!agentDoc.exists) {
      agentDoc = await adminDb.collection("smart_workers").doc(id.toUpperCase()).get();
    }
    if (agentDoc.exists) {
      const isSuperAdmin = session?.user?.role === "SUPERADMIN";
      const userRole = isSuperAdmin ? "MASTER_ADMIN" : "END_USER";
      const userId = session?.user?.id || null;

      return (
        <div className="flex flex-col h-screen w-full relative">
          <div className="flex-grow relative">
            <DottyChatClient userRole={userRole} userId={userId} agentId={id} />
          </div>
        </div>
      );
    }

    const officeDoc = await adminDb.collection("offices").doc(id).get();
    if (officeDoc.exists) {
      redirect(`/office/${id}`);
    }
  } catch (e) {}
  
  // 2. Fetch landing / custom page configuration
  let pageConfig: any = null;

  try {
    let docSnap = await adminDb.collection("landing").doc(id).get();
    if (!docSnap.exists) {
      docSnap = await adminDb.collection("pages").doc(id).get();
    }
    if (docSnap.exists) {
      pageConfig = docSnap.data();
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
    hero: { enabled: false, ...pageConfig.hero },
    services: { enabled: false, ...pageConfig.services },
    richContent: { enabled: false, ...pageConfig.richContent },
    landingSection: { enabled: false, ...pageConfig.landingSection },
    pricing: { enabled: false, ...pageConfig.pricing },
    timer: { enabled: false, ...pageConfig.timer },
    community: { enabled: false, ...pageConfig.community },
    contact: { enabled: false, ...pageConfig.contact }
  };

  const mappedConfig = {
    ...config,
    timer: {
      ...config.timer,
      targetDate: config.timer.endDate || config.timer.targetDate || config.timer.date
    },
    richContent: {
      ...config.richContent,
      heading: config.richContent.heading || config.richContent.title,
      body: config.richContent.body || config.richContent.content,
      layout: config.richContent.layout || config.richContent.theme || "split"
    },
    services: {
      ...config.services,
      description: config.services.description || config.services.subtitle,
      layout: config.services.layout || "grid",
      columns: config.services.columns || 3,
      effect: config.services.effect || "glow",
      items: config.services.items || []
    },
    hero: {
      ...config.hero,
      layout: config.hero.layout || "bento",
    },
    community: {
      ...config.community,
      layout: config.community.layout || "split",
      badgeVisible: config.community.badgeVisible !== false,
      buttonVisible: config.community.buttonVisible !== false
    }
  };
  
  // If this page was created by the new builder (v2), we use the clean V2 viewer
  if (pageConfig?.builderVersion === "v2") {
    const { V2PageClient } = await import("./V2PageClient");
    return <V2PageClient pageData={pageConfig} />;
  }

  // If preview mode is on, force canEdit to false so the old editor doesn't wrap the page
  const canEdit = !isPreview && (session?.user?.role === "SUPERADMIN" || session?.user?.id === "1" || session?.user?.id === pageConfig?.ownerId);

  return <HomeClient initialConfig={mappedConfig as any} initialGlobalSettings={globalSettings} pageId={id} collectionName="landing" canEdit={canEdit} />;
}
