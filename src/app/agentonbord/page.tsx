import { auth } from "@/lib/auth";
import { getUserCoins } from "@/features/credits/actions";
import { LiveBuilderShell } from "@/features/mini-site-builder/components/LiveBuilderShell";

import { getBuilderProgress } from "@/features/mini-site-builder/actions/builderActions";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  throw new Error("Unauthorized");
}

export default async function AgentOnboardingPage() {
  const ownerId = await getUserId();
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || "יזם יקר";

  const userCoinsData = await getUserCoins(ownerId);
  const initialState = await getBuilderProgress(ownerId);

  return (
    <div className="w-full min-h-screen bg-[#070b14]">
      <LiveBuilderShell
        initialCoins={userCoinsData.coins}
        userName={userName}
        initialState={initialState || undefined}
      />
    </div>
  );
}
