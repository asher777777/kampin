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

export const revalidate = 3600;

export default async function Home() {
  const config = await getHomePageConfig();
  // Fetch Super Admin's global settings for the root page (user ID "1" or system fallback)
  // We don't want the current regular user's settings to override the root page's branding.
  const globalSettings = await getGlobalSettings("1");

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isAdmin = session?.user?.role === "SUPERADMIN" || session?.user?.id === "1";

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
