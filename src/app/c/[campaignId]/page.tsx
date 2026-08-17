import { getCampaignData, getAmbassadorBySlug } from "@/features/campaigns/actions";
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

  return (
    <CampaignClientView
      campaignId={campaignId}
      initialCampaign={campaign}
    />
  );
}
