"use client";

import React, { useState } from "react";
import { CampaignHeaderSection } from "@/components/sections/CampaignHeaderSection";
import { CampaignDonorsSection } from "@/components/sections/CampaignDonorsSection";
import { CampaignStickyBar } from "@/components/sections/CampaignStickyBar";
import { AmbassadorModal } from "@/components/campaigns/AmbassadorModal";
import { DonationDrawer } from "@/components/campaigns/DonationDrawer";
import { Ambassador, Campaign } from "@/lib/types/campaign";

interface CampaignClientViewProps {
  campaignId: string;
  initialCampaign?: Campaign | null;
  initialAmbassador?: Ambassador | null;
  ambassadorSlug?: string;
}

export const CampaignClientView: React.FC<CampaignClientViewProps> = ({
  campaignId,
  initialCampaign,
  initialAmbassador,
  ambassadorSlug,
}) => {
  const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState(false);
  const [isDonationDrawerOpen, setIsDonationDrawerOpen] = useState(false);

  const totalRaised = initialCampaign?.totalRaised ?? 45556;
  const targetGoal = initialCampaign?.targetGoal ?? 500000;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20 dir-rtl">
      
      {/* Header with trend curve & total raised */}
      <CampaignHeaderSection
        totalRaised={totalRaised}
        targetGoal={targetGoal}
        ambassadorName={initialAmbassador?.name}
        ambassadorGoal={initialAmbassador?.targetGoal}
        ambassadorRaised={initialAmbassador?.totalRaised}
      />

      {/* Main Tabs (Donors, Ambassadors, About) */}
      <CampaignDonorsSection
        campaignId={campaignId}
        ambassadorSlugFilter={ambassadorSlug}
        onOpenAmbassadorModal={() => setIsAmbassadorModalOpen(true)}
      />

      {/* Sticky Bottom Donation Bar */}
      <CampaignStickyBar
        onOpenDonate={() => setIsDonationDrawerOpen(true)}
      />

      {/* Modals */}
      <AmbassadorModal
        isOpen={isAmbassadorModalOpen}
        onClose={() => setIsAmbassadorModalOpen(false)}
        campaignId={campaignId}
      />

      <DonationDrawer
        isOpen={isDonationDrawerOpen}
        onClose={() => setIsDonationDrawerOpen(false)}
        campaignId={campaignId}
        ambassadorId={initialAmbassador?.id}
        ambassadorName={initialAmbassador?.name}
      />
    </div>
  );
};
