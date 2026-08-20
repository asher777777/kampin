"use client";

import React from "react";
import { DonationTier } from "@/lib/types/campaign";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Plus, Trash2, Image as ImageIcon, Heart, CreditCard, CheckCircle2 } from "lucide-react";

interface CampaignTiersEditorProps {
  config: any;
  onChange: (newConfig: any) => void;
}

export const CampaignTiersEditor: React.FC<CampaignTiersEditorProps> = ({
  config,
  onChange,
}) => {
  const tiers: DonationTier[] = config.tiers && config.tiers.length > 0 ? config.tiers : [
    { id: "t1", title: "שותף", monthlyAmount: 100, subtitle: "₪100 לחודש ל-12 חודשים" },
    { id: "t2", title: "תומך", monthlyAmount: 180, subtitle: "₪180 לחודש ל-12 חודשים" },
    { id: "t3", title: "ידיד", monthlyAmount: 360, subtitle: "₪360 לחודש ל-12 חודשים", isDefault: true },
    { id: "t4", title: "משפחה", monthlyAmount: 500, subtitle: "₪500 לחודש ל-12 חודשים" },
    { id: "t5", title: "שותף אמת", monthlyAmount: 770, subtitle: "₪770 לחודש ל-12 חודשים" },
    { id: "t6", title: "מייסד", monthlyAmount: 1600, subtitle: "₪1,600 לחודש ל-12 חודשים" },
  ];

  const handleUpdateTier = (index: number, field: keyof DonationTier, val: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...config, tiers: updated });
  };

  const handleAddTier = (e: React.MouseEvent) => {
    e.preventDefault();
    const newTier: DonationTier = {
      id: `t_${Date.now()}`,
      title: "מדרגה חדשה",
      monthlyAmount: 200,
      subtitle: "₪200 לחודש",
    };
    onChange({ ...config, tiers: [...tiers, newTier] });
  };

  const handleRemoveTier = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const updated = tiers.filter((_, i) => i !== index);
    onChange({ ...config, tiers: updated });
  };

  return (
    <div className="space-y-5 text-right text-sm text-slate-200 dir-rtl">
      
      {/* Prominent Header Banner */}
      <div className="p-3.5 bg-gradient-to-r from-rose-900/60 via-slate-800 to-emerald-900/60 rounded-2xl border border-rose-500/40 shadow-lg space-y-1">
        <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          <span>עריכת טופס תרומה, כפתורי מדרגות והוראות קבע</span>
        </div>
        <p className="text-xs text-slate-300">
          כאן מנהלים את כפתורי הסכומים והוראות קבע. עיצוב הצבעים של האזור מתבצע בלשונית ה'עיצוב' שמימין.
        </p>
      </div>

      <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-rose-500/30 space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
          <CreditCard className="w-4.5 h-4.5" />
          <span>הגדרות תרומה והוראות קבע (Kesher API)</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">סוג תרומה בטופס</label>
            <select
              value={config.donationType || "both"}
              onChange={(e) => onChange({ ...config, donationType: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold"
            >
              <option value="both">הוראת קבע + תרומה חד פעמית</option>
              <option value="recurring">הוראת קבע חודשית בלבד</option>
              <option value="one_time">תרומה חד פעמית בלבד</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">חודשים להוראת קבע</label>
            <input
              type="number"
              value={config.recurringMonths || 12}
              onChange={(e) => onChange({ ...config, recurringMonths: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold text-center"
            />
          </div>
        </div>

        {/* Tiers List Builder */}
        <div className="pt-2 space-y-3 border-t border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>כפתורי מדרגות תרומה</span>
            </div>
            <button
              type="button"
              onClick={handleAddTier}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>הוסף מדרגה</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {tiers.map((t, idx) => (
              <div key={t.id} className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-900/80 border border-emerald-400/60 flex items-center justify-center font-black text-[10px] text-white shrink-0 overflow-hidden">
                    {t.imageSrc ? (
                      <img src={t.imageSrc} alt={t.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>₪{t.monthlyAmount}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="שם מדרגה (למשל: ידיד)"
                    value={t.title}
                    onChange={(e) => handleUpdateTier(idx, "title", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
                  />
                  <input
                    type="number"
                    placeholder="סכום חודשי (₪)"
                    value={t.monthlyAmount}
                    onChange={(e) => handleUpdateTier(idx, "monthlyAmount", Number(e.target.value))}
                    className="w-24 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTier(idx, e)}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded"
                    title="מחק מדרגה"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Image Selection with system ImageUpload component */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <ImageIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="כתובת תמונה עגולה/מרובעת (URL)"
                      value={t.imageSrc || ""}
                      onChange={(e) => handleUpdateTier(idx, "imageSrc", e.target.value)}
                      className="w-full pr-8 pl-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white"
                    />
                  </div>

                  <ImageUpload
                    compact={true}
                    currentImage={t.imageSrc}
                    onSelect={(url) => handleUpdateTier(idx, "imageSrc", url)}
                    customTrigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        className="px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>העלאה / גלריה</span>
                      </button>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
