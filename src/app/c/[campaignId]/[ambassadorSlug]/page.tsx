import { getCampaignData, getAmbassadorBySlug } from "@/features/campaigns/actions";
import { getHomePageConfig } from "@/features/home/actions";
import { getGlobalSettings } from "@/features/settings/actions";
import { CampaignClientView } from "../CampaignClientView";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; ambassadorSlug: string }>;
}): Promise<Metadata> {
  const { campaignId, ambassadorSlug } = await params;
  const decodedSlug = decodeURIComponent(ambassadorSlug || "");
  const campaign = await getCampaignData(campaignId);
  const ambassador = await getAmbassadorBySlug(campaignId, decodedSlug);

  const ambName = ambassador?.name ? ` ע"י ${ambassador.name}` : "";

  return {
    title: `${campaign?.title || "קמפיין גיוס"}${ambName}`,
    description: ambassador?.message || campaign?.subtitle || "עמוד קהילה אישי",
  };
}

export default async function AmbassadorCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string; ambassadorSlug: string }>;
}) {
  const { campaignId, ambassadorSlug } = await params;
  const decodedSlug = decodeURIComponent(ambassadorSlug || "");

  // If a full community page exists in pages collection, redirect directly to the community page
  try {
    const pageSnap = await adminDb.collection("pages").doc(decodedSlug).get();
    if (pageSnap.exists) {
      redirect(`/${decodedSlug}`);
    }
  } catch (e: any) {
    if (e.message?.includes("NEXT_REDIRECT")) throw e;
  }

  let campaign: any = null;
  let ambassador: any = null;
  try {
    campaign = await getCampaignData(campaignId);
    ambassador = await getAmbassadorBySlug(campaignId, decodedSlug);
  } catch (e) {
    console.warn("Failed to get campaign/ambassador data:", e);
  }

  let homeConfig: any = null;
  try {
    homeConfig = await getHomePageConfig();
  } catch (e) {
    console.warn("Failed to get home config in ambassador page:", e);
  }

  let globalSettings: any = null;
  try {
    globalSettings = await getGlobalSettings("1");
  } catch (e) {
    console.warn("Failed to get global settings in ambassador page:", e);
  }

  return (
    <CampaignClientView
      campaignId={campaignId}
      initialCampaign={campaign}
      initialAmbassador={ambassador}
      ambassadorSlug={decodedSlug}
      initialConfig={homeConfig}
      initialGlobalSettings={globalSettings}
    />
  );
}
