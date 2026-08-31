"use client";

import React from "react";
import { DonationTier } from "@/lib/types/campaign";

export const defaultTiers: DonationTier[] = [
  { id: "t1", title: "שותף", monthlyAmount: 100, subtitle: "₪100 לחודש ל-12 חודשים", imageShape: "circle" },
  { id: "t2", title: "תומך", monthlyAmount: 180, subtitle: "₪180 לחודש ל-12 חודשים", imageShape: "circle" },
  { id: "t3", title: "ידיד", monthlyAmount: 360, subtitle: "₪360 לחודש ל-12 חודשים", imageShape: "circle", isDefault: true },
  { id: "t4", title: "משפחה", monthlyAmount: 500, subtitle: "₪500 לחודש ל-12 חודשים", imageShape: "circle" },
  { id: "t5", title: "שותף אמת", monthlyAmount: 770, subtitle: "₪770 לחודש ל-12 חודשים", imageShape: "circle" },
  { id: "t6", title: "מייסד", monthlyAmount: 1600, subtitle: "₪1,600 לחודש ל-12 חודשים", imageShape: "circle" },
];

interface CampaignTiersListProps {
  tiers: DonationTier[];
  donationMode?: "one_time" | "recurring" | "both";
  selectedTierId?: string;
  onSelectTier: (tier: DonationTier) => void;
  onSelectCustomTier: () => void;
  theme?: "dark" | "light";
  drawerConfig?: any;
}

export const CampaignTiersList: React.FC<CampaignTiersListProps> = ({
  tiers,
  donationMode = "recurring",
  selectedTierId,
  onSelectTier,
  onSelectCustomTier,
  theme = "dark",
  drawerConfig,
}) => {
  const isDark = theme === "dark";

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3 w-full dir-rtl">
      {tiers.map((t) => {
        const isSelected = selectedTierId === t.id;
        const isFullImage = (t.displayMode === "full_image" || t.imageShape === "full" || (!t.displayMode && drawerConfig?.tierDisplayMode === "full_image")) && Boolean(t.imageSrc);
        const imageShape = t.imageShape || drawerConfig?.tierImageShape || "rounded";

        if (isFullImage && t.imageSrc) {
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTier(t)}
              className={`relative flex flex-col items-center justify-center rounded-2xl transition-all border overflow-hidden aspect-[4/5] sm:aspect-square group cursor-pointer ${
                isSelected
                  ? isDark
                    ? "border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-950/80 scale-[1.03]"
                    : "border-2 border-emerald-500 ring-2 ring-emerald-400/60 shadow-md shadow-emerald-200 scale-[1.03]"
                  : isDark
                    ? "border-slate-700/80 hover:border-slate-500 shadow-sm opacity-90 hover:opacity-100"
                    : "border-slate-200 hover:border-slate-400 shadow-sm opacity-95 hover:opacity-100"
              }`}
            >
              <img
                src={t.imageSrc}
                alt={t.title}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-md">
                  ✓
                </div>
              )}
            </button>
          );
        }

        const isCircle = imageShape === "circle";

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTier(t)}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all border text-center group cursor-pointer ${
              isSelected
                ? isDark
                  ? "bg-emerald-950/90 border-2 border-emerald-400 shadow-lg shadow-emerald-950/60 scale-[1.03]"
                  : "bg-emerald-50 border-2 border-emerald-500 shadow-md shadow-emerald-200/50 scale-[1.03]"
                : isDark
                  ? "bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${isCircle ? "rounded-full" : "rounded-xl sm:rounded-2xl"} flex flex-col items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform overflow-hidden relative ${
              isSelected
                ? isDark
                  ? "bg-emerald-900 border-2 border-emerald-400 font-black text-white"
                  : "bg-emerald-600 border-2 border-emerald-400 font-black text-white"
                : isDark
                  ? "bg-emerald-950/80 border border-emerald-600/50 font-bold text-emerald-100"
                  : "bg-emerald-100/90 border border-emerald-300 font-bold text-emerald-900"
            }`}>
              {t.imageSrc ? (
                <img src={t.imageSrc} alt={t.title} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="leading-tight text-xs sm:text-sm font-black">{t.title}</span>
                  <span className={`text-[10px] sm:text-xs font-bold ${
                    isSelected ? "text-emerald-200" : isDark ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    ₪{t.monthlyAmount}
                  </span>
                </>
              )}
            </div>

            <span className={`font-bold text-xs sm:text-sm line-clamp-1 ${
              isSelected
                ? isDark ? "text-emerald-300" : "text-emerald-800"
                : isDark ? "text-white" : "text-slate-800"
            }`}>
              {t.title}
            </span>
            <span className={`text-[10px] sm:text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              ₪{t.monthlyAmount}{donationMode === "recurring" ? "/חודש" : ""}
            </span>
          </button>
        );
      })}

      {/* Custom Amount Button */}
      {(() => {
        const customIsCircle = drawerConfig?.tierImageShape === "circle" || (!drawerConfig?.tierImageShape && tiers.every(t => t.imageShape === "circle"));
        return (
          <button
            type="button"
            onClick={onSelectCustomTier}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all border text-center cursor-pointer ${
              selectedTierId === "custom"
                ? isDark
                  ? "bg-sky-950/90 border-2 border-sky-400 shadow-lg shadow-sky-950/60 scale-[1.03]"
                  : "bg-sky-50 border-2 border-sky-500 shadow-md shadow-sky-200/50 scale-[1.03]"
                : isDark
                  ? "bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${customIsCircle ? "rounded-full" : "rounded-xl sm:rounded-2xl"} flex flex-col items-center justify-center mb-2 text-xs sm:text-sm font-black shadow-md ${
              selectedTierId === "custom"
                ? isDark
                  ? "bg-sky-900 border-2 border-sky-400 text-white"
                  : "bg-sky-600 border-2 border-sky-400 text-white"
                : isDark
                  ? "bg-sky-950/80 border border-sky-600/50 text-sky-200"
                  : "bg-sky-100/90 border border-sky-300 text-sky-900"
            }`}>
              <span>סכום</span>
              <span>אחר</span>
            </div>
            <span className={`font-bold text-xs sm:text-sm ${
              selectedTierId === "custom"
                ? isDark ? "text-sky-300" : "text-sky-800"
                : isDark ? "text-white" : "text-slate-800"
            }`}>
              אחר
            </span>
            <span className={`text-[10px] sm:text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              חופשי
            </span>
          </button>
        );
      })()}
    </div>
  );
};
