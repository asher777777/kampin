"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, Target, Sparkles } from "lucide-react";
import { Campaign, CampaignHeaderConfig, DonationTier } from "@/lib/types/campaign";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCampaignData } from "@/features/campaigns/actions";

interface CampaignHeaderSectionProps {
  config?: CampaignHeaderConfig;
  campaignId?: string;
  totalRaised?: number;
  targetGoal?: number;
  currency?: string;
  ambassadorName?: string;
  ambassadorGoal?: number;
  ambassadorRaised?: number;
}

export const CampaignHeaderSection: React.FC<CampaignHeaderSectionProps> = ({
  config,
  campaignId,
  totalRaised = 0,
  targetGoal = 100000,
  currency = "₪",
  ambassadorName,
  ambassadorGoal,
  ambassadorRaised,
  tiers,
  donationMode,
  onSelectTier,
}) => {
  const rawId = (config?.campaignId && config.campaignId !== "default-campaign") ? config.campaignId : (campaignId || "home");
  const targetCampaignId = rawId === "default-campaign" ? "home" : rawId;
  const [liveCampaign, setLiveCampaign] = useState<Campaign | null>(null);

  // 1. Initial direct fetch via Server Action
  useEffect(() => {
    if (!targetCampaignId) return;
    getCampaignData(targetCampaignId).then((camp) => {
      if (camp) setLiveCampaign(camp);
    }).catch(err => console.warn("Failed to fetch initial campaign data:", err));
  }, [targetCampaignId]);

  // 2. Real-time Firestore Listener
  useEffect(() => {
    if (!targetCampaignId) return;
    const unsub = onSnapshot(doc(db, "campaigns", targetCampaignId), (docSnap) => {
      if (docSnap.exists()) {
        setLiveCampaign({ id: docSnap.id, ...docSnap.data() } as Campaign);
      }
    }, (err) => {
      console.warn("CampaignHeaderSection live listener:", err);
    });

    return () => unsub();
  }, [targetCampaignId]);

  const currentRaised = ambassadorRaised !== undefined 
    ? ambassadorRaised 
    : (liveCampaign?.totalRaised ?? config?.totalRaised ?? totalRaised);

  const currentGoal = ambassadorGoal !== undefined 
    ? ambassadorGoal 
    : (liveCampaign?.targetGoal ?? config?.targetGoal ?? targetGoal);

  const percentage = Math.min(100, Math.round((currentRaised / (currentGoal || 1)) * 100));

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat("he-IL").format(val);
  };

  const preset = config?.svgTrendPreset || "curve_up";
  const customPath = config?.customSvgPath;

  // Render SVG Trend Line
  const renderTrendSvg = () => {
    if (customPath) {
      return (
        <svg viewBox="0 0 400 120" className="w-full h-28 overflow-visible">
          <path d={customPath} fill="none" stroke="#E5E7EB" strokeWidth="6" strokeLinecap="round" />
          <motion.path
            d={customPath}
            fill="none"
            stroke="#1B4332"
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percentage / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
      );
    }

    // Default upward curved arrow matching Charidy design in screenshot 1
    return (
      <svg viewBox="0 0 500 140" className="w-full h-32 overflow-visible">
        {/* Background Grey Guide Line with Arrow */}
        <defs>
          <marker
            id="arrowhead-bg"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <polygon points="0 12, 12 6, 0 0" fill="#D1D5DB" />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="12"
            markerHeight="12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <polygon points="0 12, 12 6, 0 0" fill="#15803D" />
          </marker>
        </defs>

        {/* Base trend path */}
        <path
          d="M 50 120 Q 150 110, 250 80 T 450 20"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
          markerEnd="url(#arrowhead-bg)"
        />

        {/* Animated Filled Progress Trend Path */}
        <motion.path
          d="M 50 120 Q 150 110, 250 80 T 450 20"
          fill="none"
          stroke="#166534"
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.05, percentage / 100) }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        />

        {/* Glowing tip at progress point */}
        <motion.circle
          cx="430"
          cy="26"
          r="8"
          fill="#15803D"
          className="shadow-lg shadow-emerald-500/50"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </svg>
    );
  };

  return (
    <section 
      id={config?.anchorId || "campaign-header"}
      className="w-full py-10 px-4 md:px-8 bg-gradient-to-b from-slate-50 to-white text-slate-900 flex flex-col items-center justify-center border-b border-slate-100"
      style={{ backgroundColor: config?.backgroundColor }}
    >
      <div className="max-w-3xl w-full text-center flex flex-col items-center gap-4">
        
        {ambassadorName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold mb-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>עמוד שגריר אישי: {ambassadorName}</span>
          </motion.div>
        )}

        <h2 className="text-xl md:text-2xl font-bold text-slate-700">
          {ambassadorName ? `הסכום שהושג ע"י ${ambassadorName}` : (config?.title || "הסכום שהושג")}
        </h2>

        {/* Dynamic SVG Trend Line */}
        <div className="w-full max-w-lg my-2 relative px-4">
          {renderTrendSvg()}
        </div>

        {/* Total Raised Big Number */}
        <motion.div 
          className="flex items-baseline justify-center gap-2 text-4xl md:text-6xl font-black text-slate-900 tracking-tight dir-rtl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-emerald-800 text-3xl md:text-5xl font-extrabold">{currency}</span>
          <span>{formatAmount(currentRaised)}</span>
        </motion.div>

        {/* Goal Percentage Subtitle */}
        <div className="flex items-center justify-center gap-2 text-base md:text-lg font-semibold text-slate-600 dir-rtl mb-6">
          <span className="bg-emerald-100 text-emerald-900 px-3 py-0.5 rounded-full font-bold text-sm">
            {percentage}% מהיעד
          </span>
          <span>{currency}{formatAmount(currentGoal)}</span>
        </div>

        {/* Removed Tiers List since it's its own section now */}
      </div>
    </section>
  );
};
