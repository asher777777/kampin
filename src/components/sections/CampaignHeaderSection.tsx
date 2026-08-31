"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, Target, Sparkles, ArrowUpRight, HeartHandshake, Layers } from "lucide-react";
import { Campaign, CampaignHeaderConfig, DonationTier, Ambassador } from "@/lib/types/campaign";
import { doc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCampaignData } from "@/features/campaigns/actions";
import Link from "next/link";

interface CampaignHeaderSectionProps {
  config?: CampaignHeaderConfig;
  campaignId?: string;
  totalRaised?: number;
  targetGoal?: number;
  currency?: string;
  ambassadorId?: string;
  ambassadorSlug?: string;
  ambassadorName?: string;
  ambassadorGoal?: number;
  ambassadorRaised?: number;
  campaignTitle?: string;
  mainCampaignUrl?: string;
  tiers?: DonationTier[];
  donationMode?: "one_time" | "recurring" | "both";
  onSelectTier?: (tierId?: string) => void;
}

export const CampaignHeaderSection: React.FC<CampaignHeaderSectionProps> = ({
  config,
  campaignId,
  totalRaised = 0,
  targetGoal = 100000,
  currency = "₪",
  ambassadorId,
  ambassadorSlug,
  ambassadorName,
  ambassadorGoal,
  ambassadorRaised,
  campaignTitle,
  mainCampaignUrl,
}) => {
  const rawId = (config?.campaignId && config.campaignId !== "default-campaign") ? config.campaignId : (campaignId || "home");
  const targetCampaignId = rawId === "default-campaign" ? "home" : rawId;
  const [liveCampaign, setLiveCampaign] = useState<Campaign | null>(null);
  const [liveAmbassador, setLiveAmbassador] = useState<Ambassador | null>(null);

  // 1. Initial direct fetch via Server Action
  useEffect(() => {
    if (!targetCampaignId) return;
    getCampaignData(targetCampaignId).then((camp) => {
      if (camp) setLiveCampaign(camp);
    }).catch(err => console.warn("Failed to fetch initial campaign data:", err));
  }, [targetCampaignId]);

  // 2. Real-time Firestore Listener for Campaign
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

  // 3. Real-time Firestore Listener for Ambassador (if on ambassador page)
  useEffect(() => {
    if (!targetCampaignId || (!ambassadorId && !ambassadorSlug)) return;

    if (ambassadorId) {
      const unsub = onSnapshot(doc(db, "campaigns", targetCampaignId, "ambassadors", ambassadorId), (snap) => {
        if (snap.exists()) {
          setLiveAmbassador({ id: snap.id, ...snap.data() } as Ambassador);
        }
      }, (err) => {
        console.warn("Ambassador live listener error:", err);
      });
      return () => unsub();
    } else if (ambassadorSlug) {
      const ambQuery = query(
        collection(db, "campaigns", targetCampaignId, "ambassadors"),
        where("slug", "==", ambassadorSlug),
        limit(1)
      );
      const unsub = onSnapshot(ambQuery, (snap) => {
        if (!snap.empty) {
          const firstDoc = snap.docs[0];
          setLiveAmbassador({ id: firstDoc.id, ...firstDoc.data() } as Ambassador);
        }
      }, (err) => {
        console.warn("Ambassador slug live listener error:", err);
      });
      return () => unsub();
    }
  }, [targetCampaignId, ambassadorId, ambassadorSlug]);

  const isAmbassadorView = Boolean(ambassadorName || ambassadorId || ambassadorSlug);

  // Resolve current active numbers (Ambassador vs Campaign)
  const currentAmbassadorRaised = liveAmbassador?.totalRaised ?? ambassadorRaised;
  const currentAmbassadorGoal = liveAmbassador?.targetGoal ?? ambassadorGoal;

  const currentRaised = isAmbassadorView
    ? (currentAmbassadorRaised ?? 0)
    : (liveCampaign?.totalRaised ?? config?.totalRaised ?? totalRaised);

  const currentGoal = isAmbassadorView
    ? (currentAmbassadorGoal ?? 5000)
    : (liveCampaign?.targetGoal ?? config?.targetGoal ?? targetGoal);

  const percentage = Math.min(100, Math.round((currentRaised / (currentGoal || 1)) * 100));

  // Overall Campaign totals
  const overallCampaignRaised = liveCampaign?.totalRaised ?? totalRaised;
  const overallCampaignGoal = liveCampaign?.targetGoal ?? targetGoal;
  const overallPercentage = Math.min(100, Math.round((overallCampaignRaised / (overallCampaignGoal || 1)) * 100));

  const resolvedCampaignTitle = campaignTitle || liveCampaign?.title || "הקמפיין הראשי";
  const resolvedMainUrl = mainCampaignUrl || (targetCampaignId === "home" ? "/" : `/c/${targetCampaignId}`);

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat("he-IL").format(val);
  };

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

    // Upward curved arrow matching Charidy design
    return (
      <svg viewBox="0 0 500 140" className="w-full h-32 overflow-visible">
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
      className="w-full py-8 md:py-10 px-4 md:px-8 bg-gradient-to-b from-slate-50 to-white text-slate-900 flex flex-col items-center justify-center border-b border-slate-100 dir-rtl"
      style={{ backgroundColor: config?.backgroundColor }}
    >
      <div className="max-w-3xl w-full text-center flex flex-col items-center gap-3">
        
        <h2 className="text-xl md:text-2xl font-bold text-slate-700">
          {isAmbassadorView 
            ? `הסכום שהושג ע"י ${ambassadorName || liveAmbassador?.name}` 
            : (config?.title || "הסכום שהושג")}
        </h2>

        {/* Dynamic SVG Trend Line */}
        <div className="w-full max-w-lg my-1 relative px-4">
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
        <div className="flex items-center justify-center gap-2 text-base md:text-lg font-semibold text-slate-600 dir-rtl">
          <span className="bg-emerald-100 text-emerald-900 px-3 py-0.5 rounded-full font-bold text-sm">
            {percentage}% מהיעד
          </span>
          <span>{currency}{formatAmount(currentGoal)}</span>
        </div>

        {/* Parent Campaign Overall Status Bar (when on Ambassador page) */}
        {isAmbassadorView && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mt-3 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs md:text-sm text-slate-600 px-2"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">סך הכל גויס בכללי בקמפיין:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-800 text-sm">
                {currency}{formatAmount(overallCampaignRaised)}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">
                {currency}{formatAmount(overallCampaignGoal)}
              </span>
              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-xs">
                {overallPercentage}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Link button to Main Campaign placed at the BOTTOM */}
        {isAmbassadorView && (
          <div className="mt-4 pt-2">
            <Link
              href={resolvedMainUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs md:text-sm rounded-full shadow-lg shadow-emerald-700/25 transition-all duration-200 hover:scale-[1.03] group"
            >
              <span>מעבר לעמוד הקמפיין הראשי</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-200 group-hover:text-white transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
};
