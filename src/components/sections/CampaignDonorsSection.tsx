"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Users, Target, Info, Share2, Plus, Sparkles, Heart } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ambassador, Donation, CampaignDonorsConfig } from "@/lib/types/campaign";
import { getCampaignDonationsAction } from "@/features/campaigns/actions";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface CampaignDonorsSectionProps {
  config?: CampaignDonorsConfig;
  campaignId?: string;
  initialDonations?: Donation[];
  initialAmbassadors?: Ambassador[];
  onOpenAmbassadorModal?: () => void;
  ambassadorSlugFilter?: string;
  ambassadorId?: string;
  ambassadorName?: string;
  ambassadorMessage?: string;
  campaignDescription?: string;
}

export const CampaignDonorsSection: React.FC<CampaignDonorsSectionProps> = ({
  config,
  campaignId = "home",
  initialDonations = [],
  initialAmbassadors = [],
  onOpenAmbassadorModal,
  ambassadorSlugFilter,
  ambassadorId,
  ambassadorName,
  ambassadorMessage,
  campaignDescription,
}) => {
  const isAmbassadorView = Boolean(ambassadorName || ambassadorId || ambassadorSlugFilter);
  const [activeTab, setActiveTab] = useState<"donors" | "teams" | "about">(config?.defaultTab || "donors");
  const [donorFilterMode, setDonorFilterMode] = useState<"ambassador_only" | "all">(
    isAmbassadorView ? "ambassador_only" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest">("newest");

  const [donations, setDonations] = useState<Donation[]>(initialDonations);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>(initialAmbassadors);

  const rawId = (config?.campaignId && config.campaignId !== "default-campaign") ? config.campaignId : (campaignId || "home");
  const targetCampaignId = rawId === "default-campaign" ? "home" : rawId;

  // 1. Initial direct fetch via Server Action
  useEffect(() => {
    if (!targetCampaignId) return;
    getCampaignDonationsAction(targetCampaignId).then((res) => {
      if (res.donations && res.donations.length > 0) {
        setDonations(res.donations);
      }
      if (res.ambassadors && res.ambassadors.length > 0) {
        setAmbassadors(res.ambassadors);
      }
    }).catch(err => console.warn("Failed to fetch initial campaign donations:", err));
  }, [targetCampaignId]);

  // 2. Firestore Real-time listeners for live updates
  useEffect(() => {
    if (!targetCampaignId) return;

    // Listen for donations on primary campaign ID
    const donationsRef = collection(db, "campaigns", targetCampaignId, "donations");
    const unsubscribeDonations = onSnapshot(donationsRef, (snapshot) => {
      const liveDonations: Donation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Donation;
        if (data.paymentStatus === "completed") {
          liveDonations.push({ id: doc.id, ...data } as Donation);
        }
      });
      setDonations((prev) => {
        const merged = [...liveDonations];
        prev.forEach(p => {
          if (!merged.some(m => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
    }, (err) => {
      console.warn("Firestore live donations listener fallback to initial:", err);
    });

    // If targetCampaignId is "home", ALSO listen to "default-campaign"
    let unsubscribeFallback: (() => void) | null = null;
    if (targetCampaignId === "home") {
      const fallbackRef = collection(db, "campaigns", "default-campaign", "donations");
      unsubscribeFallback = onSnapshot(fallbackRef, (snapshot) => {
        const extraDonations: Donation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Donation;
          if (data.paymentStatus === "completed") {
            extraDonations.push({ id: doc.id, ...data } as Donation);
          }
        });
        if (extraDonations.length > 0) {
          setDonations((prev) => {
            const merged = [...prev];
            extraDonations.forEach(e => {
              if (!merged.some(m => m.id === e.id)) merged.push(e);
            });
            return merged;
          });
        }
      }, () => {});
    }

    // Listen for ambassadors
    const ambassadorsRef = collection(db, "campaigns", targetCampaignId, "ambassadors");
    const unsubscribeAmbassadors = onSnapshot(ambassadorsRef, (snapshot) => {
      const liveAmbassadors: Ambassador[] = [];
      snapshot.forEach((doc) => {
        liveAmbassadors.push({ id: doc.id, ...doc.data() } as Ambassador);
      });
      setAmbassadors(liveAmbassadors);
    }, (err) => {
      console.warn("Firestore live ambassadors listener fallback to initial:", err);
    });

    return () => {
      unsubscribeDonations();
      if (unsubscribeFallback) unsubscribeFallback();
      unsubscribeAmbassadors();
    };
  }, [targetCampaignId]);


  // Display real completed donations from database with smart ambassador filtering
  const allCompletedDonations = useMemo(() => {
    return donations.filter(d => d.paymentStatus === "completed");
  }, [donations]);

  const ambassadorDonations = useMemo(() => {
    if (!isAmbassadorView) return allCompletedDonations;
    return allCompletedDonations.filter(d => {
      const matchId = ambassadorId && d.ambassadorId === ambassadorId;
      const matchSlug = ambassadorSlugFilter && (d.ambassadorId === ambassadorSlugFilter || (d as any).ambassadorSlug === ambassadorSlugFilter);
      const matchName = ambassadorName && d.ambassadorName && d.ambassadorName.trim().toLowerCase() === ambassadorName.trim().toLowerCase();
      return Boolean(matchId || matchSlug || matchName);
    });
  }, [allCompletedDonations, isAmbassadorView, ambassadorId, ambassadorSlugFilter, ambassadorName]);

  const displayDonations = useMemo(() => {
    let list: Donation[] = (isAmbassadorView && donorFilterMode === "ambassador_only")
      ? ambassadorDonations
      : allCompletedDonations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => (d.donorName || "").toLowerCase().includes(q) || (d.dedication && d.dedication.toLowerCase().includes(q)));
    }

    if (sortBy === "oldest") {
      list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "highest") {
      list = [...list].sort((a, b) => b.amount - a.amount);
    } else {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list as Donation[];
  }, [allCompletedDonations, ambassadorDonations, isAmbassadorView, donorFilterMode, searchQuery, sortBy]);

  const displayAmbassadors = useMemo(() => {
    return ambassadors;
  }, [ambassadors]);

  const getInitials = (name: string) => {
    if (!name) return "ת";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).substring(0, 2);
    return name.substring(0, 2);
  };

  const getFormattedTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: he });
    } catch (e) {
      return "לפני זמן קצר";
    }
  };

  // Determine grid class from config.cardLayout
  const getGridClass = () => {
    switch (config?.cardLayout) {
      case "grid-3":
        return "grid grid-cols-1 md:grid-cols-3 gap-4";
      case "list":
        return "flex flex-col gap-3";
      case "compact":
        return "grid grid-cols-2 md:grid-cols-4 gap-3";
      case "grid-2":
      default:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
    }
  };

  const getCardStyleClass = () => {
    switch (config?.cardStyle) {
      case "bordered":
        return "border-2 border-slate-300 shadow-none";
      case "flat":
        return "border-none shadow-none bg-slate-100/80";
      case "glassmorphism":
        return "bg-white/70 backdrop-blur-md border border-white/40 shadow-xl";
      case "shadow":
      default:
        return "border border-slate-200 shadow-sm hover:shadow-md";
    }
  };

  return (
    <section id={config?.anchorId || "campaign-donors"} className="w-full py-10 px-4 md:px-8 bg-slate-50 border-t border-slate-200 text-slate-800 dir-rtl" style={{ backgroundColor: config?.backgroundColor }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Tab Navigation Header */}
        <div className="flex items-center justify-center border-b border-slate-200 gap-8 text-base md:text-lg font-bold">
          <button
            onClick={() => setActiveTab("donors")}
            className={`pb-3 relative transition-colors ${
              activeTab === "donors" ? "text-emerald-800" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{isAmbassadorView ? (donorFilterMode === "ambassador_only" ? ambassadorDonations.length : allCompletedDonations.length) : allCompletedDonations.length} תורמים</span>
            {activeTab === "donors" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("teams")}
            className={`pb-3 relative transition-colors ${
              activeTab === "teams" ? "text-emerald-800" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{displayAmbassadors.length} קבוצות / שגרירים</span>
            {activeTab === "teams" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-700 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`pb-3 relative transition-colors ${
              activeTab === "about" ? "text-emerald-800" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>אודות הקמפיין</span>
            {activeTab === "about" && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-700 rounded-full" />
            )}
          </button>
        </div>

        {/* Donors Tab Content */}
        {activeTab === "donors" && (
          <div className="flex flex-col gap-5">
            
            {/* Filter Toggle for Ambassador Page (Ambassador Donors vs All Donors) */}
            {isAmbassadorView && (
              <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-200/70 rounded-full max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={() => setDonorFilterMode("ambassador_only")}
                  className={`flex-1 py-1.5 px-4 rounded-full text-xs md:text-sm font-bold transition-all ${
                    donorFilterMode === "ambassador_only"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  תרומות דרך {ambassadorName || "השגריר"} ({ambassadorDonations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDonorFilterMode("all")}
                  className={`flex-1 py-1.5 px-4 rounded-full text-xs md:text-sm font-bold transition-all ${
                    donorFilterMode === "all"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  כלל תורמי הקמפיין ({allCompletedDonations.length})
                </button>
              </div>
            )}

            {/* Search & Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              {config?.showSearch !== false && (
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש תורם או ברכה..."
                    className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800"
                  />
                </div>
              )}

              {config?.showSort !== false && (
                <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600">
                  <span>מיון לפי:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="newest">הכי עדכני</option>
                    <option value="oldest">הכי ישן</option>
                    <option value="highest">הכי גבוה</option>
                  </select>
                </div>
              )}
            </div>

            {/* Donors Cards Grid or Empty State */}
            {displayDonations.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <Heart className="w-8 h-8 fill-emerald-100 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">
                  {isAmbassadorView && donorFilterMode === "ambassador_only"
                    ? `היו הראשונים לתרום דרך ${ambassadorName || "השגריר"}!`
                    : "היו הראשונים לתרום לקמפיין!"}
                </h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  כל תרומה מקרבת אותנו להשגת היעד. תרומתכם תוצג כאן בלוח התורמים מיד עם השלמת התשלום.
                </p>
              </div>
            ) : (
              <div className={getGridClass()}>
                <AnimatePresence>
                  {displayDonations.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-5 rounded-2xl transition-all flex flex-col justify-between gap-3 relative ${getCardStyleClass()}`}
                      style={{
                        backgroundColor: config?.cardBgColor || undefined,
                        color: config?.cardTextColor || undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Donor Amount badge */}
                        <div className="text-xl md:text-2xl font-black tracking-tight dir-rtl text-emerald-800">
                          ₪{item.amount.toLocaleString()}
                        </div>

                        <div className="flex items-center gap-3 text-left">
                          <div className="text-right">
                            <h4 className="font-bold text-base" style={{ color: config?.cardTextColor || undefined }}>
                              {item.isAnonymous ? "אנונימי" : item.donorName}
                            </h4>
                            <span className="text-xs opacity-60">
                              {getFormattedTime(item.createdAt)}
                            </span>
                          </div>
                          
                          {/* Avatar circle */}
                          <div className="w-10 h-10 rounded-full bg-emerald-900 text-emerald-100 flex items-center justify-center font-bold text-sm shrink-0">
                            {getInitials(item.isAnonymous ? "אנונימי" : item.donorName)}
                          </div>
                        </div>
                      </div>

                      {/* Dedication text */}
                      {item.dedication && (
                        <p className="text-sm opacity-80 line-clamp-3 bg-black/5 p-2.5 rounded-lg border border-black/5 italic text-right">
                          "{item.dedication}"
                        </p>
                      )}

                      {/* Ambassador Attribution */}
                      {item.ambassadorName && (
                        <div className="text-xs text-amber-700 font-semibold flex items-center gap-1 self-end bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>ע"י {item.ambassadorName}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Teams / Ambassadors Tab Content */}
        {activeTab === "teams" && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div>
                <h3 className="font-bold text-emerald-950 text-lg">רוצים לעזור לנו להגיע ליעד?</h3>
                <p className="text-sm text-emerald-800">צרו יעד אישי והפכו לשגרירים של הקמפיין!</p>
              </div>
              
              <button
                onClick={onOpenAmbassadorModal}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>צור יעד אישי</span>
              </button>
            </div>

            {displayAmbassadors.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-3">
                <Users className="w-12 h-12 text-slate-300" />
                <h4 className="text-base font-bold text-slate-700">עדיין לא הצטרפו שגרירים לקמפיין</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  רוצים לפתוח יעד אישי ולהפוך לשגרירים? לחצו על "צור יעד אישי" והצטרפו!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayAmbassadors.map((amb) => {
                  const ambPercentage = Math.min(100, Math.round((amb.totalRaised / (amb.targetGoal || 1)) * 100));
                  const isCurrentAmbassador = Boolean(
                    (ambassadorId && amb.id === ambassadorId) ||
                    (ambassadorSlugFilter && amb.slug === ambassadorSlugFilter) ||
                    (ambassadorName && amb.name === ambassadorName)
                  );

                  return (
                    <div 
                      key={amb.id} 
                      className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                        isCurrentAmbassador 
                          ? "border-amber-400 ring-2 ring-amber-300/50 shadow-md bg-amber-50/20" 
                          : "border-slate-200 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div>
                        {isCurrentAmbassador && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>זה עמוד השגריר הנוכחי</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                            {ambPercentage}% מהיעד
                          </span>
                          <h4 className="font-bold text-slate-900 text-lg">{amb.name}</h4>
                        </div>

                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden my-3">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${ambPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>מתוך ₪{amb.targetGoal.toLocaleString()}</span>
                          <span className="font-bold text-emerald-900">₪{amb.totalRaised.toLocaleString()}</span>
                        </div>
                      </div>

                      <a
                        href={`/c/${targetCampaignId}/${amb.slug}`}
                        className={`w-full py-2 text-xs font-bold rounded-lg transition-colors text-center border ${
                          isCurrentAmbassador
                            ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                            : "bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border-slate-200"
                        }`}
                      >
                        {isCurrentAmbassador ? "אתה נמצא כאן" : "צפה בעמוד השגריר"}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* About Tab Content */}
        {activeTab === "about" && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed space-y-6">
            
            {/* Personal Ambassador Message Card (if viewing an ambassador) */}
            {isAmbassadorView && ambassadorMessage && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>מסר אישי מ{ambassadorName || "השגריר"}:</span>
                </div>
                <p className="text-slate-800 italic leading-relaxed pr-2">
                  "{ambassadorMessage}"
                </p>
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">אודות הקמפיין</h3>
              <p className="mb-2">
                {campaignDescription || "ברוכים הבאים לקמפיין הגיוס המיוחד שלנו! הודות לתמיכה ולשותפות שלכם, אנו מצליחים להרחיב את הפעילות ולהגיע להישגים מרשימים."}
              </p>
              <p>
                כל תרומה קטנה כגדולה מקרבת אותנו להשגת היעד ומאפשרת לנו לשנות מציאות ולהשפיע ישירות.
              </p>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
