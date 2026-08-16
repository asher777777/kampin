import { getCommunities } from "@/features/communities/actions";
import { getCRMStats } from "@/features/crm/actions";
import { CommunitiesClient } from "./CommunitiesClient";

export default async function CommunitiesPage() {
  const [initialCommunities, initialStats] = await Promise.all([
    getCommunities(),
    getCRMStats()
  ]);

  return <CommunitiesClient initialCommunities={initialCommunities} initialStats={initialStats} />;
}
