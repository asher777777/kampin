"use client";

import React from "react";
import { DonationTier } from "@/lib/types/campaign";
import { CampaignTiersList, defaultTiers } from "../campaigns/CampaignTiersList";

interface CampaignTiersSectionProps {
  config?: any;
  tiers?: DonationTier[];
  donationMode?: "one_time" | "recurring" | "both";
  onSelectTier?: (tierId?: string) => void;
}

export const CampaignTiersSection: React.FC<CampaignTiersSectionProps> = ({
  config,
  tiers,
  donationMode = "recurring",
  onSelectTier
}) => {
  const visible = config?.visible !== false;
  if (!visible) return null;

  const resolvedTiers = tiers && tiers.length > 0 ? tiers : defaultTiers;

  return (
    <section 
      id={config?.anchorId || "campaign-tiers"}
      className="w-full py-10 px-4 md:px-8 flex flex-col items-center justify-center border-b border-slate-100"
      style={{ backgroundColor: config?.backgroundColor || "#ffffff" }}
    >
      <div className="max-w-4xl w-full flex flex-col items-center gap-6">
        {config?.title && (
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-800">
            {config.title}
          </h2>
        )}
        
        {resolvedTiers.length > 0 && onSelectTier && (
          <div className="w-full">
            <CampaignTiersList
              tiers={resolvedTiers}
              donationMode={donationMode === "one_time" ? "one_time" : "recurring"}
              theme="light"
              drawerConfig={config?.drawerConfig}
              onSelectTier={(tier) => onSelectTier(tier.id)}
              onSelectCustomTier={() => onSelectTier("custom")}
            />
          </div>
        )}
      </div>
    </section>
  );
};
