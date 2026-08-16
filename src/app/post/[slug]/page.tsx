import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
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

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const docSnap = await adminDb.collection("posts").doc(slug).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        title: data?.seo?.title || data?.hero?.title || "מאמר",
        description: data?.seo?.description || data?.hero?.subtitle || "מאמר מעניין בקהילת מחולל הקהילות",
      };
    }
  } catch (e) {}
  
  return { 
    title: "מאמר",
    description: "מאמר מעניין בקהילת מחולל הקהילות"
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let pageConfig: any = null;

  try {
    const docSnap = await adminDb.collection("posts").doc(slug).get();
    if (docSnap.exists) {
      pageConfig = docSnap.data();
    }
  } catch (error) {
    console.warn("Could not fetch post from DB:", error);
  }

  if (!pageConfig) {
    return notFound();
  }

  const globalSettings = await getGlobalSettings(pageConfig?.ownerId);

  const config = {
    ...pageConfig,
    hero: { ...pageConfig.hero },
    services: { ...pageConfig.services },
    richContent: { ...pageConfig.richContent },
    landingSection: { ...pageConfig.landingSection },
    pricing: { ...pageConfig.pricing },
    timer: { ...pageConfig.timer },
    community: { ...pageConfig.community },
    contact: { ...pageConfig.contact }
  };

  const mappedConfig = {
    ...config,
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
      layout: config.hero?.layout || "bento",
    },
    community: {
      ...config.community,
      layout: config.community?.layout || "split",
      badgeVisible: config.community?.badgeVisible !== false,
      buttonVisible: config.community?.buttonVisible !== false
    }
  };

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const canEdit = session?.user?.role === "SUPERADMIN" || session?.user?.id === "1" || session?.user?.id === pageConfig?.ownerId;

  return <HomeClient initialConfig={mappedConfig as any} initialGlobalSettings={globalSettings} pageId={slug} collectionName="posts" canEdit={canEdit} />;
}
