import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import { getGlobalSettings } from "@/features/settings/actions";
import { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";
import { auth } from "@/lib/auth";
import { staticLandingPages } from "@/data/landing-pages";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const slugsToCheck = Array.from(new Set([slug, decodedSlug]));

  try {
    for (const checkId of slugsToCheck) {
      let docSnap = await adminDb.collection("landing").doc(checkId).get();
      if (!docSnap.exists) {
        docSnap = await adminDb.collection("pages").doc(checkId).get();
      }
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          title: data?.seo?.title || data?.hero?.title || data?.title || "עמוד נחיתה",
          description: data?.seo?.description || data?.hero?.subtitle || "עמוד נחיתה שנבנה באמצעות מערכת מחולל הקהילות",
        };
      }
    }

    const querySnap = await adminDb.collection("pages").where("slug", "in", slugsToCheck).limit(1).get();
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data();
      return {
        title: data?.seo?.title || data?.hero?.title || data?.title || "עמוד נחיתה",
        description: data?.seo?.description || data?.hero?.subtitle || "עמוד נחיתה שנבנה באמצעות מערכת מחולל הקהילות",
      };
    }
  } catch (e) {}
  
  const fallback = staticLandingPages.find(p => slugsToCheck.includes(p.id));
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

export default async function LandingSlugPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>, 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const slugsToCheck = Array.from(new Set([slug, decodedSlug]));
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPreview = resolvedSearchParams.preview === "true";
  const session = await auth();
  
  let pageConfig: any = null;
  let detectedCollection = "landing";

  try {
    for (const checkId of slugsToCheck) {
      let docSnap = await adminDb.collection("landing").doc(checkId).get();
      if (docSnap.exists) {
        pageConfig = docSnap.data();
        detectedCollection = "landing";
        break;
      } else {
        docSnap = await adminDb.collection("pages").doc(checkId).get();
        if (docSnap.exists) {
          pageConfig = docSnap.data();
          detectedCollection = "pages";
          break;
        }
      }
    }

    if (!pageConfig) {
      const querySnap = await adminDb.collection("pages").where("slug", "in", slugsToCheck).limit(1).get();
      if (!querySnap.empty) {
        pageConfig = querySnap.docs[0].data();
        detectedCollection = "pages";
      }
    }
  } catch (error) {
    console.warn("Could not fetch landing page from DB:", error);
  }

  if (!pageConfig) {
    const fallback = staticLandingPages.find(p => slugsToCheck.includes(p.id));
    if (fallback) {
      pageConfig = fallback;
    } else {
      return notFound();
    }
  }

  const globalSettings = await getGlobalSettings(pageConfig?.ownerId);

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
      layout: (config.richContent?.layout === "two-column" || config.richContent?.layout === "grid") ? config.richContent.layout : "center"
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
  
  if (pageConfig?.builderVersion === "v2") {
    const { V2PageClient } = await import("@/app/[id]/V2PageClient");
    return <V2PageClient pageData={pageConfig} />;
  }

  const canEdit = !isPreview && (session?.user?.role === "SUPERADMIN" || session?.user?.id === "1" || session?.user?.id === pageConfig?.ownerId);

  return <HomeClient initialConfig={mappedConfig as any} initialGlobalSettings={globalSettings} pageId={slug} collectionName={detectedCollection} canEdit={canEdit} />;
}
