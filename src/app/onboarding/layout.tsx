import { Suspense } from "react";
import { OnboardingShell } from "./OnboardingShell";
import { getGlobalSettings } from "@/features/settings/actions";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default async function OnboardingLayout({
  children,
}: OnboardingLayoutProps) {
  const globalSettings = await (async () => {
    try {
      return await getGlobalSettings();
    } catch {
      return null;
    }
  })();

  // Check if impersonating
  const session = await auth();
  const isImpersonating = !!(session?.user as any)?.isImpersonating;

  return (
    <OnboardingShell
      userLogoUrl={globalSettings?.logoUrl}
      isImpersonating={isImpersonating}
    >
      <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-[2rem]" />}>
        {children}
      </Suspense>
    </OnboardingShell>
  );
}
