import { getCampaignData } from "@/features/campaigns/actions";
import { getHomePageConfig } from "@/features/home/actions";
import { getGlobalSettings } from "@/features/settings/actions";
import { CampaignClientView } from "./CampaignClientView";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}): Promise<Metadata> {
  const { campaignId } = await params;
  const campaign = await getCampaignData(campaignId);

  return {
    title: campaign?.title || "קמפיין גיוס תרומות",
    description: campaign?.subtitle || "הצטרפו לתמיכה ולתרומה בקמפיין הגיוס המיוחד שלנו",
  };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCampaignData(campaignId);

  let homeConfig: any = null;
  try {
    homeConfig = await getHomePageConfig();
  } catch (e) {
    console.warn("Failed to get home config in campaign page:", e);
  }

  let globalSettings: any = null;
  try {
    globalSettings = await getGlobalSettings("1");
  } catch (e) {
    console.warn("Failed to get global settings in campaign page:", e);
  }

  return (
    <CampaignClientView
      campaignId={campaignId}
      initialCampaign={campaign}
      initialConfig={homeConfig}
      initialGlobalSettings={globalSettings}
    />
  );
}
