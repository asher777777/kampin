import { Suspense } from "react";
import { DashboardShellTest } from "./DashboardShellTest";
import { getAiSettings } from "@/features/ai/actions";
import { getKesherSettings } from "@/features/kesher/actions";
import { getGlobalSettings } from "@/features/settings/actions";
import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Run checks concurrently to avoid sequential blocking waterfalls (improves page transition speeds)
    const [aiSettings, kesherSettings, dbActive, globalSettings] = await Promise.all([
    (async () => {
      if (process.env.GEMINI_API_KEY) return { googleAiKey: process.env.GEMINI_API_KEY };
      try {
        return await getAiSettings();
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        return await getKesherSettings();
      } catch {
        return null;
      }
    })(),
    (async () => {
      try {
        // Quick probe to check if adminDb is initialized and connected
        await adminDb.collection("configs").limit(1).get();
        return true;
      } catch (error) {
        console.warn("Database status check failed:", error);
        return false;
      }
    })(),
    (async () => {
      try {
        return await getGlobalSettings();
      } catch {
        return null;
      }
    })()
  ]);

  const geminiActive = !!(process.env.GEMINI_API_KEY || aiSettings?.googleAiKey);
  const kesherActive = !!(kesherSettings?.isActive);

  // Check if impersonating
  const session = await auth();
  const isImpersonating = !!(session?.user as any)?.isImpersonating;

  return (
    <DashboardShellTest
      geminiActive={geminiActive}
      kesherActive={kesherActive}
      dbActive={dbActive}
      miniSiteSlug={globalSettings?.miniSiteSlug}
      isImpersonating={isImpersonating}
    >
      <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-[2rem]" />}>
        {children}
      </Suspense>
    </DashboardShellTest>
  );
}
