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
}

export const CampaignTiersList: React.FC<CampaignTiersListProps> = ({
  tiers,
  donationMode = "recurring",
  selectedTierId,
  onSelectTier,
  onSelectCustomTier,
  theme = "dark"
}) => {
  const isDark = theme === "dark";

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 w-full dir-rtl">
      {tiers.map((t) => {
        const isSelected = selectedTierId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTier(t)}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border text-center group cursor-pointer ${
              isSelected
                ? "bg-emerald-800/80 border-emerald-500 shadow-lg shadow-emerald-900/40 scale-105"
                : isDark
                  ? "bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center mb-1 text-[10px] shadow-md group-hover:scale-105 transition-transform overflow-hidden relative ${
              isSelected || isDark ? "bg-emerald-900/80 border-2 border-emerald-400/60 font-black text-emerald-100" : "bg-emerald-100 border-2 border-emerald-300 font-bold text-emerald-800"
            }`}>
              {t.imageSrc ? (
                <img src={t.imageSrc} alt={t.title} className="w-full h-full object-cover" />
              ) : (
                <>
                  <span className="leading-tight text-[11px]">{t.title}</span>
                  <span className={`text-[9px] ${isSelected || isDark ? "text-emerald-300" : "text-emerald-600"}`}>₪{t.monthlyAmount}</span>
                </>
              )}
            </div>

            <span className={`font-bold text-[11px] line-clamp-1 ${isDark ? "text-white" : "text-slate-800"}`}>{t.title}</span>
            <span className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              ₪{t.monthlyAmount}{donationMode === "recurring" ? "/חודש" : ""}
            </span>
          </button>
        );
      })}

      {/* Custom Amount Button */}
      <button
        type="button"
        onClick={onSelectCustomTier}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border text-center cursor-pointer ${
          selectedTierId === "custom"
            ? "bg-emerald-800/80 border-emerald-500 shadow-lg scale-105"
            : isDark
              ? "bg-slate-800/70 border-slate-700/80 hover:bg-slate-800"
              : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 text-[11px] font-bold shadow-md ${
          selectedTierId === "custom" || isDark ? "bg-sky-900/80 border-2 border-sky-400/60 text-sky-100" : "bg-sky-100 border-2 border-sky-300 text-sky-800"
        }`}>
          סכום אחר
        </div>
        <span className={`font-bold text-[11px] ${isDark ? "text-white" : "text-slate-800"}`}>אחר</span>
        <span className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>חופשי</span>
      </button>
    </div>
  );
};
