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
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full dir-rtl">
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
              className={`relative flex flex-col items-center justify-center rounded-xl sm:rounded-2xl transition-all border overflow-hidden aspect-square group cursor-pointer ${
                isSelected
                  ? isDark
                    ? "border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md shadow-emerald-950/80 scale-[1.02]"
                    : "border-2 border-emerald-500 ring-2 ring-emerald-400/60 shadow-sm shadow-emerald-200 scale-[1.02]"
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
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shadow-md">
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
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl transition-all border text-center group cursor-pointer aspect-square ${
              isSelected
                ? isDark
                  ? "bg-emerald-950/90 border-2 border-emerald-400 shadow-md shadow-emerald-950/60 scale-[1.02]"
                  : "bg-emerald-50 border-2 border-emerald-500 shadow-sm shadow-emerald-200/50 scale-[1.02]"
                : isDark
                  ? "bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 ${isCircle ? "rounded-full" : "rounded-lg sm:rounded-xl"} flex flex-col items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition-transform overflow-hidden relative ${
              isSelected
                ? isDark
                  ? "bg-emerald-900 border border-emerald-400 font-black text-white"
                  : "bg-emerald-600 border border-emerald-400 font-black text-white"
                : isDark
                  ? "bg-emerald-950/80 border border-emerald-600/50 font-bold text-emerald-100"
                  : "bg-emerald-100/90 border border-emerald-300 font-bold text-emerald-900"
            }`}>
              {t.imageSrc ? (
                <img src={t.imageSrc} alt={t.title} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="leading-tight text-[10px] sm:text-xs font-black">{t.title}</span>
                  <span className={`text-[9px] font-bold ${
                    isSelected ? "text-emerald-200" : isDark ? "text-emerald-400" : "text-emerald-700"
                  }`}>
                    ₪{t.monthlyAmount}
                  </span>
                </>
              )}
            </div>

            <span className={`font-bold text-[10px] sm:text-xs line-clamp-1 leading-tight ${
              isSelected
                ? isDark ? "text-emerald-300" : "text-emerald-800"
                : isDark ? "text-white" : "text-slate-800"
            }`}>
              {t.title}
            </span>
            <span className={`text-[9px] font-medium leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              ₪{t.monthlyAmount}{donationMode === "recurring" ? "/ח'" : ""}
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
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl transition-all border text-center cursor-pointer aspect-square ${
              selectedTierId === "custom"
                ? isDark
                  ? "bg-sky-950/90 border-2 border-sky-400 shadow-md shadow-sky-950/60 scale-[1.02]"
                  : "bg-sky-50 border-2 border-sky-500 shadow-sm shadow-sky-200/50 scale-[1.02]"
                : isDark
                  ? "bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 ${customIsCircle ? "rounded-full" : "rounded-lg sm:rounded-xl"} bg-sky-100 text-sky-800 border border-sky-300 flex flex-col items-center justify-center mb-1 shadow-sm`}>
              <span className="text-[10px] font-black leading-none">סכום</span>
              <span className="text-[10px] font-black leading-none mt-0.5">אחר</span>
            </div>
            <span className={`font-black text-[10px] sm:text-xs leading-tight ${
              selectedTierId === "custom"
                ? isDark ? "text-sky-300" : "text-sky-800"
                : isDark ? "text-white" : "text-slate-800"
            }`}>
              אחר
            </span>
            <span className={`text-[9px] font-medium leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              חופשי
            </span>
          </button>
        );
      })()}
    </div>
  );
};
