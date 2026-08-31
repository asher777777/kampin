"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X } from "lucide-react";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Donation, DonationTier } from "@/lib/types/campaign";
import { getCampaignDonationsAction } from "@/features/campaigns/actions";
import { defaultTiers } from "./CampaignTiersList";

export interface LiveDonationAlertProps {
  campaignId?: string;
  configTiers?: DonationTier[];
  onOpenDonate?: () => void;
  /**
   * Optional initial recent donation to show after initial page load
   */
  recentDonations?: Donation[];
  /**
   * Position on screen. Defaults to "bottom-right"
   */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /**
   * Allow preview / demo button for testing
   */
  enableDemoMode?: boolean;
}

// Gentle Web Audio API chime (Golden Flute harmonic sound)
function playGentleChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Harmonic notes (Pentatonic chime: E5, G#5, B5, E6)
    const notes = [659.25, 830.61, 987.77, 1318.51];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.9);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.95);
    });
  } catch (e) {
    // Audio might be blocked by browser autoplay policy before user gesture
  }
}

export const LiveDonationAlert: React.FC<LiveDonationAlertProps> = ({
  campaignId = "home",
  configTiers,
  onOpenDonate,
  recentDonations = [],
  position = "bottom-right",
  enableDemoMode = false,
}) => {
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [queue, setQueue] = useState<Donation[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const hasInitializedFirestoreRef = useRef(false);
  const seenDonationIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const DISPLAY_DURATION_MS = 2750;

  const targetCampaignId = (!campaignId || campaignId === "default-campaign") ? "home" : campaignId;

  // Helper to find the tier image for this donation
  const getTierImageForDonation = (donation: Donation): { imageSrc?: string; title?: string; amount?: number } => {
    const availableTiers = configTiers && configTiers.length > 0 ? configTiers : defaultTiers;
    
    // Check match by tier name or id
    const matchByTier = availableTiers.find(
      (t) => (donation as any).tier && (t.id === (donation as any).tier || t.title === (donation as any).tier)
    );
    if (matchByTier) {
      return { imageSrc: matchByTier.imageSrc, title: matchByTier.title, amount: matchByTier.monthlyAmount };
    }

    // Check match by monthly amount or total amount
    const matchByAmount = availableTiers.find(
      (t) => (donation.monthlyAmount && t.monthlyAmount === donation.monthlyAmount) ||
             (donation.amount && t.monthlyAmount === donation.amount) ||
             (donation.amount && t.monthlyAmount * 12 === donation.amount)
    );
    if (matchByAmount) {
      return { imageSrc: matchByAmount.imageSrc, title: matchByAmount.title, amount: matchByAmount.monthlyAmount };
    }

    // If specific tier image was directly saved on donation
    if ((donation as any).tierImage) {
      return { imageSrc: (donation as any).tierImage, title: (donation as any).tier || "תרומה", amount: donation.amount };
    }

    // Fallback to first available tier or default tier
    const defaultTier = availableTiers.find((t) => t.isDefault) || availableTiers[0];
    return { imageSrc: defaultTier?.imageSrc, title: defaultTier?.title || "תרומה", amount: donation.amount };
  };

  // Show a donation
  const showDonation = useCallback((donation: Donation, playSound = true) => {
    setCurrentDonation(donation);
    setProgress(100);

    if (playSound) {
      playGentleChime();
    }
  }, []);

  const initialLoadedCampaignRef = useRef<string | null>(null);

  // 1. Initial Mount: Load the 3 most recent donations and queue them (Once per campaign)
  useEffect(() => {
    if (!targetCampaignId || initialLoadedCampaignRef.current === targetCampaignId) return;
    initialLoadedCampaignRef.current = targetCampaignId;
    let isMounted = true;

    const loadInitialDonors = async () => {
      try {
        const res = await getCampaignDonationsAction(targetCampaignId);
        if (!isMounted) return;

        let items: Donation[] = [];
        if (res.donations && res.donations.length > 0) {
          items = res.donations.filter((d) => d.paymentStatus === "completed").slice(0, 3);
        } else if (recentDonations && recentDonations.length > 0) {
          items = recentDonations.slice(0, 3);
        }

        // If no donations in database yet, provide 3 realistic social-proof samples
        if (items.length === 0) {
          items = [
            {
              id: "initial-1",
              campaignId: targetCampaignId,
              donorName: "אברהם כהן",
              amount: 360,
              monthlyAmount: 180,
              recurringMonths: 12,
              isRecurring: true,
              dedication: "לרפואה שלמה, ברכה והצלחה בכל מעשי ידינו!",
              paymentStatus: "completed",
              createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            },
            {
              id: "initial-2",
              campaignId: targetCampaignId,
              donorName: "משפחת שפירא",
              amount: 500,
              isRecurring: false,
              dedication: "להצלחת כל עם ישראל והמשפחה היקרה",
              paymentStatus: "completed",
              createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            },
            {
              id: "initial-3",
              campaignId: targetCampaignId,
              donorName: "רחל לוי",
              amount: 1800,
              monthlyAmount: 150,
              recurringMonths: 12,
              isRecurring: true,
              dedication: "לזכות ולעילוי נשמה, תרומה מכל הלב",
              paymentStatus: "completed",
              createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            },
          ];
        }

        // Queue all 3 items to pop up sequentially starting after 0.8s
        setTimeout(() => {
          if (isMounted) {
            setQueue((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const fresh = items.filter((it) => !existingIds.has(it.id));
              return [...prev, ...fresh];
            });
          }
        }, 800);
      } catch (err) {
        console.warn("Failed to load initial 3 donors for LiveDonationAlert:", err);
      }
    };

    loadInitialDonors();

    return () => {
      isMounted = false;
    };
  }, [targetCampaignId]);

  // 2. Process next item in queue with a smooth gap between popups
  useEffect(() => {
    if (!currentDonation && queue.length > 0) {
      const delayTimer = setTimeout(() => {
        setQueue(([nextDonation, ...rest]) => {
          if (nextDonation) {
            showDonation(nextDonation, true);
          }
          return rest || [];
        });
      }, 400);

      return () => clearTimeout(delayTimer);
    }
  }, [currentDonation, queue, showDonation]);

  // 3. Countdown timer and auto-dismiss (halved duration)
  useEffect(() => {
    if (!currentDonation) return;

    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 25;
    const totalSteps = DISPLAY_DURATION_MS / intervalStep;
    const decrement = 100 / totalSteps;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const nextVal = prev - decrement;
        return nextVal > 0 ? nextVal : 0;
      });
    }, intervalStep);

    timerRef.current = setTimeout(() => {
      setCurrentDonation(null);
    }, DISPLAY_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentDonation, isPaused]);

  // 4. Real-time Firestore Listener for incoming completed donations
  useEffect(() => {
    if (!targetCampaignId) return;

    const donationsQuery = query(
      collection(db, "campaigns", targetCampaignId, "donations"),
      where("paymentStatus", "==", "completed"),
      limit(25)
    );

    const unsubscribe = onSnapshot(donationsQuery, (snapshot) => {
      if (!hasInitializedFirestoreRef.current) {
        snapshot.forEach((doc) => {
          seenDonationIdsRef.current.add(doc.id);
        });
        hasInitializedFirestoreRef.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const donation = { id: change.doc.id, ...change.doc.data() } as Donation;
          if (donation.paymentStatus === "completed" && !seenDonationIdsRef.current.has(donation.id)) {
            seenDonationIdsRef.current.add(donation.id);
            // Insert live donation directly at the front of queue
            setQueue((prev) => [donation, ...prev]);
          }
        }
      });
    }, (err) => {
      console.warn("Real-time live donation alert listener error:", err);
    });

    return () => unsubscribe();
  }, [targetCampaignId]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDonation(null);
  };

  const handleCardClick = () => {
    if (onOpenDonate) {
      onOpenDonate();
    }
  };

  // Position classes in the UPPER THIRD of the screen (does not block action buttons or sticky bars)
  const positionClasses = {
    "bottom-right": "top-24 sm:top-28 right-3 sm:right-6",
    "bottom-left": "top-24 sm:top-28 left-3 sm:left-6",
    "top-right": "top-24 sm:top-28 right-3 sm:right-6",
    "top-left": "top-24 sm:top-28 left-3 sm:left-6",
  }[position] || "top-24 sm:top-28 right-3 sm:right-6";

  const tierInfo = currentDonation ? getTierImageForDonation(currentDonation) : { imageSrc: undefined, title: "תרומה", amount: 0 };

  return (
    <div 
      className={`fixed z-[9999] pointer-events-none ${positionClasses} max-w-[210px] sm:max-w-[230px] w-full`}
      dir="rtl"
      style={{ textAlign: "right" }}
    >
      {/* Optional Demo trigger for testing */}
      {enableDemoMode && (
        <div className="pointer-events-auto mb-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const mockDonation: Donation = {
                id: "mock-" + Date.now(),
                campaignId: targetCampaignId,
                donorName: ["אברהם כהן", "רחל לוי", "משפחת שפירא", "דוד ואסתר גולדשטיין", "אנונימי"][Math.floor(Math.random() * 5)],
                amount: [180, 360, 500, 1000, 1800, 3600][Math.floor(Math.random() * 6)],
                monthlyAmount: Math.random() > 0.5 ? 180 : undefined,
                recurringMonths: Math.random() > 0.5 ? 12 : undefined,
                isRecurring: Math.random() > 0.5,
                dedication: Math.random() > 0.4 ? "לרפואה שלמה, ברכה והצלחה בכל מעשי ידינו!" : undefined,
                ambassadorName: Math.random() > 0.5 ? "יוסף חיים" : undefined,
                paymentStatus: "completed",
                createdAt: new Date().toISOString(),
              };
              setQueue((prev) => [mockDonation, ...prev]);
            }}
            className="text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>בדיקת כרטיס</span>
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentDonation && (
          <motion.div
            key={currentDonation.id}
            initial={{ opacity: 0, y: -20, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={handleCardClick}
            className={`pointer-events-auto relative overflow-hidden rounded-xl bg-white/95 text-slate-900 p-2 sm:p-2.5 shadow-xl border border-amber-300/80 backdrop-blur-md cursor-pointer group transition-all duration-200 hover:border-amber-400 hover:shadow-amber-500/20`}
            style={{
              boxShadow: "0 8px 24px -3px rgba(0, 0, 0, 0.09), 0 0 16px 1px rgba(245, 158, 11, 0.12)",
            }}
          >
            {/* Countdown Progress Bar */}
            <div className="absolute top-0 right-0 left-0 h-[2px] bg-amber-100/70 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.025 }}
              />
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="סגור התראה"
              className="absolute top-1 left-1 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Compact Main Content Layout: Tier Button Image + Donor Name + Dedication ONLY */}
            <div className="relative z-10 flex items-center gap-2">
              
              {/* 1. Compact Tier / Button Image in Campaign Colors */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-400 via-emerald-500 to-amber-500 p-[1.5px] shadow-sm">
                  <div className="w-full h-full bg-white rounded-[7px] overflow-hidden flex items-center justify-center">
                    {tierInfo.imageSrc ? (
                      <img
                        src={tierInfo.imageSrc}
                        alt={tierInfo.title || "כפתור תרומה"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-500 text-center p-0.5">
                        <Heart className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. & 3. Donor Name & Dedication ONLY (Half size / compact) */}
              <div className="flex-1 min-w-0 pr-0.5 space-y-0.5">
                
                {/* Donor Name */}
                <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate tracking-tight leading-tight">
                  {currentDonation.isAnonymous || !currentDonation.donorName
                    ? "תורם/ת אנונימי/ת"
                    : currentDonation.donorName}
                </h4>

                {/* Dedication */}
                <p className="text-[10px] sm:text-[11px] text-slate-800 italic line-clamp-1 leading-tight bg-amber-50/90 px-1.5 py-0.5 rounded-md border border-amber-200/80 font-medium">
                  &quot;{currentDonation.dedication || "תרומה מכל הלב! ❤️"}&quot;
                </p>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
