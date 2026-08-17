"use client";

import React, { useState } from "react";
import { Share2, Heart, Copy, Check } from "lucide-react";

interface CampaignStickyBarProps {
  onOpenDonate: () => void;
  onOpenShare?: () => void;
}

export const CampaignStickyBar: React.FC<CampaignStickyBarProps> = ({
  onOpenDonate,
  onOpenShare,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    if (onOpenShare) {
      onOpenShare();
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: "קמפיין גיוס תרומות",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 shadow-2xl dir-rtl">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Share Button */}
        <button
          onClick={handleShareClick}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs md:text-sm transition-all border border-slate-200"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? "הועתק!" : "שתף"}</span>
        </button>

        {/* Big Donate Red Button */}
        <button
          onClick={onOpenDonate}
          className="flex-1 max-w-xs py-3 px-6 bg-rose-500 hover:bg-rose-600 text-white font-black text-lg rounded-full transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Heart className="w-5 h-5 fill-current" />
          <span>תרום</span>
        </button>

        {/* Quick Payment Logos badge (Bit, GPay, PayBox, Credit Card) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-full text-xs font-bold shadow-sm">
          <span className="text-sky-400">bit</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-400">GPay</span>
          <span className="text-slate-400">|</span>
          <span className="text-amber-400">PayBox</span>
        </div>

      </div>
    </div>
  );
};
