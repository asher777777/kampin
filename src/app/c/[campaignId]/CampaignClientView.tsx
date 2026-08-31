"use client";

import React, { useState, useEffect } from "react";
import { CampaignHeaderSection } from "@/components/sections/CampaignHeaderSection";
import { CampaignTiersSection } from "@/components/sections/CampaignTiersSection";
import { CampaignDonorsSection } from "@/components/sections/CampaignDonorsSection";
import { CampaignStickyBar } from "@/components/sections/CampaignStickyBar";
import { VideoGallery } from "@/components/sections/VideoGallery";
import { AmbassadorModal } from "@/components/campaigns/AmbassadorModal";
import { DonationDrawer } from "@/components/campaigns/DonationDrawer";
import { Ambassador, Campaign } from "@/lib/types/campaign";
import { HomePageConfig } from "@/features/home/actions";
import { GlobalSettings } from "@/features/settings/actions";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { doc, onSnapshot, collection, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ArrowUpRight, MessageSquareQuote } from "lucide-react";
import Link from "next/link";

interface CampaignClientViewProps {
  campaignId: string;
  initialCampaign?: Campaign | null;
  initialAmbassador?: Ambassador | null;
  ambassadorSlug?: string;
  initialConfig?: HomePageConfig | null;
  initialGlobalSettings?: GlobalSettings | null;
}

export const CampaignClientView: React.FC<CampaignClientViewProps> = ({
  campaignId,
  initialCampaign,
  initialAmbassador,
  ambassadorSlug,
  initialConfig,
  initialGlobalSettings,
}) => {
  const [isAmbassadorModalOpen, setIsAmbassadorModalOpen] = useState(false);
  const [isDonationDrawerOpen, setIsDonationDrawerOpen] = useState(false);
  const [selectedTierIdForDrawer, setSelectedTierIdForDrawer] = useState<string | undefined>();
  const [drawerInitialMode, setDrawerInitialMode] = useState<"one_time" | "recurring" | undefined>();

  const [liveCampaign, setLiveCampaign] = useState<Campaign | null>(initialCampaign || null);
  const [liveAmbassador, setLiveAmbassador] = useState<Ambassador | null>(initialAmbassador || null);

  const targetCampaignId = (campaignId === "default-campaign" || campaignId === "home") ? "home" : campaignId;

  // Real-time Firestore Listener for Campaign
  useEffect(() => {
    if (!targetCampaignId) return;
    const unsub = onSnapshot(doc(db, "campaigns", targetCampaignId), (snap) => {
      if (snap.exists()) {
        setLiveCampaign({ id: snap.id, ...snap.data() } as Campaign);
      }
    }, (err) => console.warn("Live campaign error:", err));

    return () => unsub();
  }, [targetCampaignId]);

  // Real-time Firestore Listener for Ambassador
  useEffect(() => {
    if (!targetCampaignId || (!initialAmbassador?.id && !ambassadorSlug)) return;

    if (initialAmbassador?.id) {
      const unsub = onSnapshot(doc(db, "campaigns", targetCampaignId, "ambassadors", initialAmbassador.id), (snap) => {
        if (snap.exists()) {
          setLiveAmbassador({ id: snap.id, ...snap.data() } as Ambassador);
        }
      }, (err) => console.warn("Live ambassador error:", err));

      return () => unsub();
    } else if (ambassadorSlug) {
      const q = query(
        collection(db, "campaigns", targetCampaignId, "ambassadors"),
        where("slug", "==", ambassadorSlug),
        limit(1)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const docItem = snap.docs[0];
          setLiveAmbassador({ id: docItem.id, ...docItem.data() } as Ambassador);
        }
      }, (err) => console.warn("Live ambassador slug error:", err));

      return () => unsub();
    }
  }, [targetCampaignId, initialAmbassador?.id, ambassadorSlug]);

  const globalSettings = initialGlobalSettings || {
    siteLogoUrl: "",
    headerLayout: "classic",
    theme: "navy",
    navLinks: [],
  };

  const config = initialConfig;
  const isAmbassadorView = Boolean(liveAmbassador || initialAmbassador || ambassadorSlug);
  const mainCampaignUrl = targetCampaignId === "home" ? "/" : `/c/${targetCampaignId}`;
  const campaignTitle = liveCampaign?.title || initialCampaign?.title || "קמפיין גיוס";

  const customStyle = {
    ...(globalSettings.primaryColor ? { '--primary': globalSettings.primaryColor } : {}),
    ...(globalSettings.secondaryColor ? { '--secondary': globalSettings.secondaryColor } : {}),
    ...(globalSettings.backgroundColor ? { '--background': globalSettings.backgroundColor } : {}),
    ...(globalSettings.textColor ? { '--foreground': globalSettings.textColor } : {}),
    ...(globalSettings.textColorH1 ? { '--heading-1': globalSettings.textColorH1 } : {}),
    ...(globalSettings.textColorH2 ? { '--heading-2': globalSettings.textColorH2 } : {}),
    ...(globalSettings.textColorH3 ? { '--heading-3': globalSettings.textColorH3 } : {}),
    ...(globalSettings.buttonBgColor ? { '--button-bg': globalSettings.buttonBgColor } : {}),
    ...(globalSettings.buttonTextColor ? { '--button-text': globalSettings.buttonTextColor } : {}),
  } as React.CSSProperties;

  const currentAmbassador = liveAmbassador || initialAmbassador;

  return (
    <div 
      className={`min-h-screen bg-slate-50 text-slate-900 pb-24 dir-rtl ${globalSettings.theme ? `theme-${globalSettings.theme}` : "theme-navy"}`}
      style={customStyle}
    >
      {/* Global Navbar with Branding */}
      <Navbar 
        layout={globalSettings.headerLayout} 
        logoUrl={globalSettings.siteLogoUrl} 
        navLinks={globalSettings.navLinks} 
        companyName={globalSettings.companyName}
        slogan={globalSettings.slogan}
        headerBgColor={globalSettings.headerBgColor}
        headerTitleColor={globalSettings.headerTitleColor}
        headerSloganColor={globalSettings.headerSloganColor}
      />

      {/* 1. Video & Photo Gallery at the TOP of the page (ראש העמוד) */}
      {config?.videoGallery && (config.videoGallery.visible !== false && String(config.videoGallery.visible) !== "false") && (
        <VideoGallery
          id={config.videoGallery.anchorId || "videoGallery"}
          images={config.videoGallery.images}
          videoUrl={config.videoGallery.videoUrl}
          videoType={config.videoGallery.videoType}
          effect={config.videoGallery.effect}
          objectFit={config.videoGallery.objectFit}
          titleEffect={config.videoGallery.titleEffect}
          textPosition={config.videoGallery.textPosition}
          heightDesktop={config.videoGallery.desktopHeight}
          backgroundColor={config.videoGallery.backgroundColor || globalSettings.backgroundColor}
        />
      )}

      {/* 2. Ambassador Header Card with Campaign Colors (מתחת לגלריה: שם השגריר בצבעי הקמפיין) */}
      {isAmbassadorView && currentAmbassador && (
        <section className="w-full max-w-4xl mx-auto px-4 pt-8 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/60 text-slate-900 shadow-xl shadow-emerald-950/5 border border-emerald-200/90 overflow-hidden"
          >
            {/* Ambient Campaign Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-right">
              
              <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto">
                {/* Monogram Avatar in Campaign Colors */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-emerald-500 p-0.5 shadow-lg shadow-emerald-700/20 shrink-0">
                  <div className="w-full h-full bg-emerald-900 rounded-[14px] flex items-center justify-center text-white font-black text-2xl md:text-3xl">
                    {currentAmbassador.name ? currentAmbassador.name.trim().slice(0, 2) : <Sparkles className="w-8 h-8" />}
                  </div>
                </div>

                {/* Ambassador Info & Campaign Link */}
                <div className="space-y-1.5 text-right flex-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-xs font-extrabold tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                    <span>עמוד שגריר אישי</span>
                    <span className="text-emerald-400">•</span>
                    <span className="text-emerald-800 font-semibold">קמפיין {campaignTitle}</span>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                    {currentAmbassador.name}
                  </h1>
                </div>
              </div>

              {/* Personal Target Goal Badge */}
              <div className="flex items-center gap-3 bg-white border border-emerald-200/90 px-6 py-3.5 rounded-2xl shadow-sm shrink-0 w-full md:w-auto justify-between md:justify-start">
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-bold">יעד הגיוס של השגריר</div>
                  <div className="text-2xl md:text-3xl font-black text-emerald-800 dir-rtl tracking-tight">
                    ₪{currentAmbassador.targetGoal.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {/* Ambassador Personal Message / Quote */}
            {currentAmbassador.message && (
              <div className="mt-6 pt-5 border-t border-emerald-200/70 relative z-10">
                <div className="flex items-start gap-3.5 bg-white/90 rounded-2xl p-4 md:p-5 border border-emerald-200/80 shadow-sm">
                  <MessageSquareQuote className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-emerald-900">מסר אישי מהשגריר:</div>
                    <p className="text-sm md:text-base text-slate-800 italic leading-relaxed">
                      "{currentAmbassador.message}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </section>
      )}

      {/* 3. Donation Tiers / Buttons Section (מתחת לשם השגריר: אזור הכפתורים והסכומים) */}
      <CampaignTiersSection
        config={config?.campaignTiers || { visible: true }}
        tiers={config?.campaignTiers?.tiers}
        donationMode={config?.campaignTiers?.donationType || "both"}
        onSelectTier={(tierId) => {
          setSelectedTierIdForDrawer(tierId);
          setIsDonationDrawerOpen(true);
        }}
      />

      {/* 4. Campaign Progress & Stats Section (מתחת לכפתורים: נתוני הקמפיין, חץ, סכום ויעד) */}
      <CampaignHeaderSection
        config={config?.campaignHeader}
        campaignId={targetCampaignId}
        campaignTitle={campaignTitle}
        totalRaised={liveCampaign?.totalRaised ?? initialCampaign?.totalRaised ?? 0}
        targetGoal={liveCampaign?.targetGoal ?? initialCampaign?.targetGoal ?? 100000}
        ambassadorId={currentAmbassador?.id}
        ambassadorSlug={ambassadorSlug || currentAmbassador?.slug}
        ambassadorName={currentAmbassador?.name}
        ambassadorGoal={currentAmbassador?.targetGoal}
        ambassadorRaised={currentAmbassador?.totalRaised}
        mainCampaignUrl={mainCampaignUrl}
      />

      {/* 5. Main Tabs (Donors, Ambassadors, About) */}
      <CampaignDonorsSection
        config={config?.campaignDonors}
        campaignId={targetCampaignId}
        ambassadorId={currentAmbassador?.id}
        ambassadorName={currentAmbassador?.name}
        ambassadorSlugFilter={ambassadorSlug}
        ambassadorMessage={currentAmbassador?.message}
        campaignDescription={liveCampaign?.description || initialCampaign?.description}
        onOpenAmbassadorModal={() => setIsAmbassadorModalOpen(true)}
      />

      {/* Footer */}
      <Footer 
        companyName={globalSettings.companyName}
        slogan={globalSettings.slogan}
        siteLogoUrl={globalSettings.siteLogoUrl}
      />

      {/* Sticky Bottom Donation Bar */}
      <CampaignStickyBar
        onOpenDonate={(mode) => {
          setSelectedTierIdForDrawer(undefined);
          setDrawerInitialMode(mode);
          setIsDonationDrawerOpen(true);
        }}
        mainCampaignUrl={mainCampaignUrl}
        isAmbassadorView={isAmbassadorView}
      />

      {/* Modals & Drawers */}
      <AmbassadorModal
        isOpen={isAmbassadorModalOpen}
        onClose={() => setIsAmbassadorModalOpen(false)}
        campaignId={targetCampaignId}
      />

      <DonationDrawer
        isOpen={isDonationDrawerOpen}
        onClose={() => setIsDonationDrawerOpen(false)}
        campaignId={targetCampaignId}
        ambassadorId={currentAmbassador?.id}
        ambassadorName={currentAmbassador?.name}
        initialSelectedTierId={selectedTierIdForDrawer}
        initialDonationMode={drawerInitialMode}
        configTiers={config?.campaignTiers?.tiers}
        configDonationType={config?.campaignTiers?.donationType}
        configRecurringMonths={config?.campaignTiers?.recurringMonths}
        drawerConfig={config?.campaignTiers?.drawerConfig}
      />
    </div>
  );
};
