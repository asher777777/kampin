"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckSquare, Check, FileText, Target, CreditCard, Briefcase, ShoppingBag, Loader2, Save } from "lucide-react";
import { getGlobalSettings, saveGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { Button } from "@/components/ui/Button";

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

const OPTIONS = [
  { id: "content_pages", label: "עמודי תוכן", icon: FileText },
  { id: "landing_pages", label: "עמודי נחיתה (עבור לידים)", icon: Target },
  { id: "checkout_pages", label: "עמודי סליקה", icon: CreditCard },
  { id: "service_pages", label: "עמודי שירות", icon: Briefcase },
  { id: "product_pages", label: "עמודי מוצר", icon: ShoppingBag },
];

export function WhatToGenerateTab({
  onSave,
  activeStep = 8,
  settings: propSettings,
  isOpen,
  onToggle,
  isCompleted
}: {
  onSave?: () => void;
  activeStep?: number;
  settings?: GlobalSettings;
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(!propSettings);
  const [saving, setSaving] = useState(false);

  // Sync state with props
  useEffect(() => {
    if (propSettings?.whatToGenerate) {
      setSelectedOptions(propSettings.whatToGenerate);
    }
    setLoading(false);
  }, [propSettings]);

  const handleSave = async () => {
    setSaving(true);
    await saveGlobalSettings({ whatToGenerate: selectedOptions });
    setSaving(false);
    onSave?.();
  };

  const getSelectedNames = () => {
    return selectedOptions
      .map(id => OPTIONS.find(opt => opt.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  };

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full border border-white/5 bg-[#181818] rounded-2xl">
      <div className="relative">
        {/* Sticky Header */}
        <div className={`w-full bg-[#181818] transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md border-b border-white/5 rounded-t-2xl' : 'rounded-2xl'}`} dir="rtl">
          <button
            type="button"
            onClick={(e) => {
              onToggle();
              if (!isOpen) scrollToTop(e);
            }}
            className={`w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-4 text-right">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-blue-400'}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base">מה נחולל</span>
                {isCompleted && selectedOptions.length > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                    הושלם: {getSelectedNames().split(", ").slice(0, 2).join(", ")}
                  </span>
                )}
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white" />}
          </button>
        </div>

        {/* Outer Tab Content */}
        {isOpen && (
          <div className="w-full bg-[#111] p-4 sm:p-6 animate-in fade-in duration-200 rounded-b-2xl">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-400 mb-4">
                  בחר את סוגי העמודים שתרצה שהמערכת תחולל עבורך (ניתן לבחור יותר מאפשרות אחת):
                </div>
                
                <div className="flex flex-col gap-3">
                  {OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedOptions.includes(option.id);
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(option.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                          isSelected 
                            ? 'bg-blue-500/10 border-blue-500/50' 
                            : 'bg-[#181818] border-white/5 hover:bg-[#202020]'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-right">
                          <span className={`font-medium ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                            {option.label}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'border-gray-500'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-6 py-2.5 rounded-xl flex items-center"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    שמור בחירות
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
