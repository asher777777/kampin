import { getAllServices } from "@/features/services/actions";
import { auth } from "@/lib/auth";
import { getGlobalSettings } from "@/features/settings/actions";
import { OnboardingClient } from "./OnboardingClient";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export default async function OnboardingPage() {
  const services = await getAllServices();
  const ownerId = await getUserId();
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || "משתמש";

  const globalSettings = await getGlobalSettings(ownerId);

  return (
    <OnboardingClient
      initialSettings={globalSettings}
      initialServices={services}
      userName={userName}
    />
  );
}
