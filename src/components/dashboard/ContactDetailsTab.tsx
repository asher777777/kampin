"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Phone, Check, Save, Loader2 } from "lucide-react";
import { saveGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { Button } from "@/components/ui/Button";

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

export function ContactDetailsTab({
  onSave,
  activeStep,
  settings: propSettings,
  isOpen,
  onToggle,
  isCompleted
}: {
  onSave?: () => void;
  activeStep: number;
  settings: GlobalSettings | null;
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (propSettings) {
      setContactPhone(propSettings.contactPhone || "");
      setContactEmail(propSettings.contactEmail || "");
      setContactAddress(propSettings.contactAddress || "");
    }
  }, [propSettings]);

  const handleSave = async () => {
    setSaving(true);
    await saveGlobalSettings({
      contactPhone,
      contactEmail,
      contactAddress
    });
    setSaving(false);
    onSave?.();
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
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-emerald-400'}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base">נתוני התקשרות גלובליים</span>
                {isCompleted && contactPhone && (
                  <span className="text-[11px] text-emerald-400 font-semibold mt-0.5 font-sans">
                    הושלם: {contactPhone}
                  </span>
                )}
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {isOpen && (
          <div className="p-4 sm:p-6 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4 flex flex-col items-center justify-center min-h-[300px] rounded-b-2xl">
            {/* Fields in the center of the page */}
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-gray-400">טלפון ליצירת קשר</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors text-left"
                  placeholder="054-0000000"
                />
              </div>
              
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-gray-400">אימייל ליצירת קשר</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors text-left"
                  placeholder="info@yourdomain.com"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-gray-400">כתובת פיזית (Waze)</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="רחוב החדשנות 1, תל אביב"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-6 py-2 rounded-xl flex items-center"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  שמור התקשרות
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
