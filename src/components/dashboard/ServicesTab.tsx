"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Layers, Check } from "lucide-react";
import { CompanyServicesSection } from "./CompanyServicesSection";
import { getGlobalSettings } from "@/features/settings/actions";

const scrollToCenter = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget;
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
};

export function ServicesTab({
  onSave,
  activeStep = 8,
  settings: propSettings,
  companyServices,
  isOpen,
  onToggle,
  isCompleted
}: {
  onSave?: () => void;
  activeStep?: number;
  settings?: any;
  companyServices?: any[];
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [companyVision, setCompanyVision] = useState(propSettings?.companyVision || "");

  // Sync state with props
  useEffect(() => {
    if (propSettings) {
      setCompanyVision(propSettings.companyVision || "");
    }
  }, [propSettings]);

  useEffect(() => {
    async function load() {
      if (!propSettings) {
        const { getGlobalSettings } = await import("@/features/settings/actions");
        const data = await getGlobalSettings();
        setCompanyVision(data.companyVision || "");
      }
    }
    load();
  }, [propSettings]);

  return (
    <div className="w-full border border-white/5 bg-[#181818] rounded-2xl">
      <div className="relative">
        {/* Outer Tab Header */}
        <div className={`w-full bg-[#181818] transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md border-b border-white/5 rounded-t-2xl' : 'rounded-2xl'}`} dir="rtl">
          <button
            type="button"
            onClick={(e) => {
              onToggle();
              if (!isOpen) scrollToCenter(e);
            }}
            className={`w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-4 text-right">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-emerald-400'}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base">השירותים שלנו</span>
                {isCompleted && companyServices && companyServices.length > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                    הושלם: {companyServices.length} שירותים
                  </span>
                )}
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {/* Outer Tab Content */}
        {isOpen && (
          <div className="w-full bg-[#111] animate-in fade-in duration-200 rounded-b-2xl">
            <CompanyServicesSection companyVision={companyVision} onSave={onSave} />
          </div>
        )}
      </div>
    </div>
  );
}
