import { getCampaignData, getAmbassadorBySlug } from "@/features/campaigns/actions";
import { CampaignClientView } from "../CampaignClientView";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; ambassadorSlug: string }>;
}): Promise<Metadata> {
  const { campaignId, ambassadorSlug } = await params;
  const campaign = await getCampaignData(campaignId);
  const ambassador = await getAmbassadorBySlug(campaignId, ambassadorSlug);

  const ambName = ambassador?.name ? ` ע"י ${ambassador.name}` : "";

  return {
    title: `${campaign?.title || "קמפיין גיוס"}${ambName}`,
    description: ambassador?.message || campaign?.subtitle || "עמוד שגריר אישי לתרומה",
  };
}

export default async function AmbassadorCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string; ambassadorSlug: string }>;
}) {
  const { campaignId, ambassadorSlug } = await params;
  const campaign = await getCampaignData(campaignId);
  const ambassador = await getAmbassadorBySlug(campaignId, ambassadorSlug);

  return (
    <CampaignClientView
      campaignId={campaignId}
      initialCampaign={campaign}
      initialAmbassador={ambassador}
      ambassadorSlug={ambassadorSlug}
    />
  );
}
