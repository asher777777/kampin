import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth"; 
import { WelcomeDashboardClient } from "./WelcomeDashboardClient";
import { getCommunities } from "@/features/communities/actions";
import { getContacts } from "@/features/crm/actions";

export default async function WelcomeOnboardingPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/");
  }

  const communities = await getCommunities();
  const contactsRes = await getContacts({ status: "active", per_page: 1 });
  const totalContacts = contactsRes.total || 0;

  return (
    <WelcomeDashboardClient 
      userName={session.user.name || "אורח"} 
      communities={communities}
      totalContacts={totalContacts}
    />
  );
}
