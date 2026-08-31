import { getHomePageConfig } from "@/features/home/actions";
import { getGlobalSettings } from "@/features/settings/actions";
import { HomeClient } from "./HomeClient";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomePageConfig();
  const settings = await getGlobalSettings("1");
  const faviconUrl = settings?.siteLogoUrl || "/favicon.ico";
  
  return {
    title: config.seo?.title || "מחולל הקהילות | הפלטפורמה המקיפה ליצירת קהילות",
    description: config.seo?.description || "מערכת מחולל הקהילות מאפשרת לך לנהל לקוחות, לשווק תוכן ולבנות עמודי נחיתה מרהיבים בקלות.",
    keywords: config.seo?.keywords,
    openGraph: config.seo?.image ? { images: [config.seo.image] } : undefined,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    }
  };
}

export const dynamic = "force-dynamic";

export default async function Home() {
  let config: any;
  let globalSettings: any;

  try {
    config = await getHomePageConfig();
  } catch (e) {
    console.error("Home page config fetch error:", e);
    const { DEFAULT_HOME_CONFIG } = await import("@/features/home/actions");
    config = DEFAULT_HOME_CONFIG;
  }

  try {
    globalSettings = await getGlobalSettings("1");
  } catch (e) {
    console.error("Home global settings fetch error:", e);
    globalSettings = null;
  }

  let isAdmin = false;
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    isAdmin = session?.user?.role === "SUPERADMIN" || session?.user?.id === "1";
  } catch (e) {
    console.warn("Auth check failed in Home page:", e);
  }

  return (
    <HomeClient 
      initialConfig={config} 
      initialGlobalSettings={globalSettings} 
      pageId="home" 
      collectionName="pages"
      canEdit={isAdmin}
    />
  );
}
