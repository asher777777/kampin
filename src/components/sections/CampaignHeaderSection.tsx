"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, Target, Sparkles, ArrowUpRight, HeartHandshake, Layers } from "lucide-react";
import { Campaign, CampaignHeaderConfig, DonationTier, Ambassador } from "@/lib/types/campaign";
import { doc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCampaignData, getCampaignDonationsAction } from "@/features/campaigns/actions";
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
  const [calculatedAmbassadorRaised, setCalculatedAmbassadorRaised] = useState<number | null>(null);
  const [calculatedAmbassadorGoal, setCalculatedAmbassadorGoal] = useState<number | null>(null);
  const [donorsCount, setDonorsCount] = useState<number>(0);

  const isAmbassadorView = Boolean(
    ambassadorId?.trim() ||
    ambassadorSlug?.trim() ||
    (ambassadorName && ambassadorName.trim() !== "")
  );

  // 1. Initial direct fetch via Server Action
  useEffect(() => {
    if (!targetCampaignId) return;
    getCampaignData(targetCampaignId).then((camp) => {
      if (camp) setLiveCampaign(camp);
    }).catch(err => console.warn("Failed to fetch initial campaign data:", err));

    getCampaignDonationsAction(targetCampaignId).then(({ donations, ambassadors }) => {
      if (isAmbassadorView) {
        // Find matching ambassador
        const cleanSlug = ambassadorSlug?.trim();
        const cleanName = ambassadorName?.trim().toLowerCase();
        const cleanId = ambassadorId?.trim();

        const matched = ambassadors.find(a => 
          (cleanId && a.id === cleanId) ||
          (cleanSlug && (a.slug === cleanSlug || a.id === cleanSlug)) ||
          (cleanName && a.name.trim().toLowerCase() === cleanName)
        );

        if (matched) {
          setCalculatedAmbassadorRaised(matched.totalRaised);
          if (matched.targetGoal) setCalculatedAmbassadorGoal(matched.targetGoal);
          if (matched.donorCount !== undefined) setDonorsCount(matched.donorCount);
        } else {
          // Sum donations directly matching the ambassador name or slug
          const ambDonations = donations.filter(d => {
            const matchName = cleanName && d.ambassadorName && d.ambassadorName.trim().toLowerCase() === cleanName;
            const matchSlug = cleanSlug && ((d as any).ambassadorSlug === cleanSlug || d.ambassadorId === cleanSlug);
            const matchId = cleanId && d.ambassadorId === cleanId;
            return Boolean(matchName || matchSlug || matchId);
          });
          const total = ambDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
          setCalculatedAmbassadorRaised(total);
          setDonorsCount(ambDonations.length);
        }
      } else {
        setDonorsCount(donations.length);
      }
    }).catch(err => console.warn("Failed to fetch donations for header:", err));
  }, [targetCampaignId, isAmbassadorView, ambassadorId, ambassadorSlug, ambassadorName]);

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
          const data = snap.data() as Ambassador;
          setLiveAmbassador({ id: snap.id, ...data });
          if (data.totalRaised !== undefined && data.totalRaised > 0) {
            setCalculatedAmbassadorRaised(data.totalRaised);
          }
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
          const data = firstDoc.data() as Ambassador;
          setLiveAmbassador({ id: firstDoc.id, ...data });
          if (data.totalRaised !== undefined && data.totalRaised > 0) {
            setCalculatedAmbassadorRaised(data.totalRaised);
          }
        }
      }, (err) => {
        console.warn("Ambassador slug live listener error:", err);
      });
      return () => unsub();
    }
  }, [targetCampaignId, ambassadorId, ambassadorSlug]);

  // 4. Real-time Firestore Listener on Donations subcollection to keep community total live
  useEffect(() => {
    if (!targetCampaignId || !isAmbassadorView) return;

    const donationsColl = collection(db, "campaigns", targetCampaignId, "donations");
    const unsub = onSnapshot(donationsColl, (snap) => {
      let sum = 0;
      const cleanSlug = ambassadorSlug?.trim();
      const cleanName = ambassadorName?.trim().toLowerCase();
      const cleanId = ambassadorId?.trim();

      snap.docs.forEach((dDoc) => {
        const d = dDoc.data();
        if (d.paymentStatus === "completed") {
          const matchName = cleanName && d.ambassadorName && d.ambassadorName.trim().toLowerCase() === cleanName;
          const matchSlug = cleanSlug && ((d as any).ambassadorSlug === cleanSlug || d.ambassadorId === cleanSlug);
          const matchId = cleanId && d.ambassadorId === cleanId;
          if (matchName || matchSlug || matchId) {
            sum += Number(d.amount || 0);
          }
        }
      });

      if (sum > 0) {
        setCalculatedAmbassadorRaised(sum);
      }
    }, (err) => {
      console.warn("Donations subcollection listener:", err);
    });

    return () => unsub();
  }, [targetCampaignId, isAmbassadorView, ambassadorId, ambassadorSlug, ambassadorName]);

  // Resolve current active numbers (Ambassador vs Campaign)
  const currentAmbassadorRaised = calculatedAmbassadorRaised ?? liveAmbassador?.totalRaised ?? ambassadorRaised ?? 0;
  const currentAmbassadorGoal = calculatedAmbassadorGoal ?? liveAmbassador?.targetGoal ?? ambassadorGoal ?? 5000;

  // Prioritize config values set in the page editor if provided
  const currentGoal = (config?.targetGoal !== undefined && config?.targetGoal !== null && Number(config.targetGoal) > 0)
    ? Number(config.targetGoal)
    : (isAmbassadorView ? currentAmbassadorGoal : (liveCampaign?.targetGoal ?? targetGoal ?? 100000));

  const currentRaised = isAmbassadorView
    ? (currentAmbassadorRaised > 0 ? currentAmbassadorRaised : (config?.totalRaised ?? 0))
    : (liveCampaign?.totalRaised ?? config?.totalRaised ?? totalRaised ?? 0);

  const percentage = Math.round((currentRaised / (currentGoal || 1)) * 100);

  // Overall Campaign totals (strictly from the main campaign database)
  const overallCampaignRaised = liveCampaign?.totalRaised ?? totalRaised;
  const overallCampaignGoal = liveCampaign?.targetGoal ?? 100000;
  const overallPercentage = Math.round((overallCampaignRaised / (overallCampaignGoal || 1)) * 100);

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
            animate={{ pathLength: Math.min(1, Math.max(0.05, percentage / 100)) }}
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
        <div className="flex flex-col items-center justify-center gap-1">
          <motion.div 
            className="flex items-baseline justify-center gap-2 text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight dir-rtl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-emerald-800 text-3xl sm:text-4xl md:text-5xl font-extrabold">{currency}</span>
            <span>{formatAmount(currentRaised)}</span>
          </motion.div>
          <span className="text-xs md:text-sm font-semibold text-slate-500">גויסו עד כה</span>
        </div>

        {/* Clear Metric Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 text-xs md:text-sm">
          {/* Target Goal Badge */}
          <div className="flex items-center gap-1.5 bg-white text-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
            <Target className="w-4 h-4 text-emerald-700" />
            <span className="text-slate-500 font-medium">יעד:</span>
            <span className="font-bold text-slate-900">{currency}{formatAmount(currentGoal)}</span>
          </div>

          {/* Percentage Badge */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold border shadow-2xs ${
            percentage >= 100 
              ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20" 
              : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}>
            {percentage >= 100 ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>{percentage}% מהיעד (הושג!)</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>{percentage}% מהיעד</span>
              </>
            )}
          </div>

          {/* Donors Count Badge */}
          {donorsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-white text-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-slate-900">{donorsCount}</span>
              <span className="text-slate-500 font-medium">תורמים</span>
            </div>
          )}
        </div>

        {/* Parent Campaign Overall Status Card (when on Community / Ambassador page) */}
        {isAmbassadorView && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mt-5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-right"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-medium">
                  סך הכל גויס בכללי בקמפיין:
                </div>
                <div className="text-sm md:text-base font-black text-slate-900 flex items-baseline gap-1.5">
                  <span className="text-emerald-800">{currency}{formatAmount(overallCampaignRaised)}</span>
                  <span className="text-xs font-normal text-slate-400">
                    מתוך יעד {currency}{formatAmount(overallCampaignGoal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <span className="bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-xl text-xs">
                {overallPercentage}% מהקמפיין
              </span>
            </div>
          </motion.div>
        )}

        {/* Link button to Main Campaign placed at the BOTTOM */}
        {isAmbassadorView && (
          <div className="mt-3 pt-1">
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
