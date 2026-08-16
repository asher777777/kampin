"use client";

import { useState } from "react";

import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatBadgeProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  description: string;
  badgeColorClass?: string;
}

export function StatBadge({
  icon,
  value,
  label,
  description,
  badgeColorClass = "bg-[#181818] border-white/10 text-white"
}: StatBadgeProps) {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  return (
    <div className="relative inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/5 shadow-sm hover:shadow-md hover:border-white/20 bg-[#181818]/90 backdrop-blur-md transition-all duration-300">
      <div className={cn("p-1 rounded-full border flex items-center justify-center shrink-0 border-white/5 bg-white/5", badgeColorClass)}>
        {icon}
      </div>
      <span className="font-extrabold text-white text-sm whitespace-nowrap" dir="ltr">{value}</span>
      
      {/* Help Icon with Tooltip */}
      <div 
        className="relative group flex items-center justify-center"
        onMouseEnter={() => setShowMobileTooltip(true)}
        onMouseLeave={() => setShowMobileTooltip(false)}
        onClick={() => setShowMobileTooltip(!showMobileTooltip)}
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 cursor-help transition-colors" />
        
        {/* Tooltip Content */}
        <div className={cn(
          "absolute z-50 bottom-full right-1/2 translate-x-1/2 mb-2.5 w-52 p-3 bg-slate-950/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-xl border border-white/10 text-right leading-relaxed transition-all duration-200 transform origin-bottom",
          showMobileTooltip 
            ? "opacity-100 scale-100 pointer-events-auto" 
            : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
        )}>
          <p className="font-bold text-indigo-300 mb-1">{label}</p>
          <p className="text-[11px] text-slate-200">{description}</p>
          {/* Arrow */}
          <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-950/95" />
        </div>
      </div>
    </div>
  );
}
