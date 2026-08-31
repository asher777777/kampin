"use client";

import React, { useState } from "react";
import { Share2, Heart, Copy, Check, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface CampaignStickyBarProps {
  onOpenDonate: (mode?: "one_time" | "recurring") => void;
  onOpenShare?: () => void;
  mainCampaignUrl?: string;
  isAmbassadorView?: boolean;
}

export const CampaignStickyBar: React.FC<CampaignStickyBarProps> = ({
  onOpenDonate,
  onOpenShare,
  mainCampaignUrl,
  isAmbassadorView,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    if (onOpenShare) {
      onOpenShare();
      return;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "קמפיין גיוס תרומות",
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 shadow-2xl dir-rtl">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 md:gap-3">
        
        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1.5 px-3.5 md:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs md:text-sm transition-all border border-slate-200 shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? "הועתק!" : "שתף"}</span>
          </button>

          {/* Link to Main Campaign button when on ambassador page */}
          {isAmbassadorView && mainCampaignUrl && (
            <Link
              href={mainCampaignUrl}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-full text-xs transition-all border border-amber-200 shrink-0"
            >
              <span>לקמפיין הראשי</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
            </Link>
          )}
        </div>

        {/* Bit Payment Button with Logo - Opens One-Time Donation */}
        <button
          type="button"
          onClick={() => onOpenDonate("one_time")}
          className="flex items-center gap-1.5 bg-[#0B132B] hover:bg-slate-900 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border border-slate-800 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 group"
          title="תרומה מהירה באפליקציית Bit"
        >
          {/* Bit Circular Logo */}
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00D2D2] flex items-center justify-center text-[#0B132B] font-black text-[10px] sm:text-xs leading-none shadow-sm group-hover:scale-110 transition-transform">
            bit
          </div>
          <span className="text-slate-200 font-bold text-xs sm:text-sm">תרומה ב-</span>
          <span className="text-[#00D2D2] font-black text-xs sm:text-sm -mr-0.5">bit</span>
        </button>

        {/* Big Donate Red Button */}
        <button
          type="button"
          onClick={() => onOpenDonate("recurring")}
          className="flex-1 max-w-xs py-3 px-6 bg-rose-500 hover:bg-rose-600 text-white font-black text-base md:text-lg rounded-full transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Heart className="w-5 h-5 fill-current" />
          <span>תרום</span>
        </button>

      </div>
    </div>
  );
};
