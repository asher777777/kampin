"use client";

import React, { useEffect, useState } from "react";
import { CampaignDonorsConfig, DonationTier } from "@/lib/types/campaign";
import { getAllCampaigns } from "@/features/campaigns/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { LayoutGrid, Palette, Database, Layers, Repeat, Plus, Trash2, Image as ImageIcon, Heart, CreditCard, CheckCircle2 } from "lucide-react";

interface CampaignDonorsEditorProps {
  config: CampaignDonorsConfig;
  onChange: (newConfig: CampaignDonorsConfig) => void;
}

export const CampaignDonorsEditor: React.FC<CampaignDonorsEditorProps> = ({
  config,
  onChange,
}) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    getAllCampaigns().then((res) => {
      if (res && res.length > 0) {
        setCampaigns(res);
      }
    });
  }, []);

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
      
      {/* Prominent Header Banner for Form Editor */}
      <div className="p-3.5 bg-gradient-to-r from-rose-900/60 via-slate-800 to-emerald-900/60 rounded-2xl border border-rose-500/40 shadow-lg space-y-1">
        <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          <span>עריכת טופס תרומה, כפתורי מדרגות והוראות קבע</span>
        </div>
        <p className="text-xs text-slate-300">
          כאן מנהלים את כפתורי הסכומים (מדרגות עם תמונות מתוך גלריית המדיה), הוראות קבע (Kesher API), ועיצוב כרטיסיות התורמים.
        </p>
      </div>

      {/* DB Campaign Selection */}
      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Database className="w-4 h-4" />
          <span>בחירת קמפיין / ספריית DB מהמערכת</span>
        </div>
        <select
          value={config.campaignId || "default-campaign"}
          onChange={(e) => onChange({ ...config, campaignId: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold"
        >
          <option value="default-campaign">קמפיין ברירת מחדל (Default Campaign)</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} (ID: {c.id})
            </option>
          ))}
        </select>
      </div>

      {/* Donation Mode & Recurring Settings (הוראת קבע / Kesher API) */}
      <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-rose-500/30 space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
          <CreditCard className="w-4.5 h-4.5" />
          <span>הגדרות טופס תרומה והוראות קבע (Kesher API)</span>
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
              <option value="recurring">הוראת קבע חודשית בלבד (CreditType 10)</option>
              <option value="one_time">תרומה חד פעמית בלבד (CreditType 1)</option>
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

        {/* Tiers List Builder with ImageUpload integration */}
        <div className="pt-2 space-y-3 border-t border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>כפתורי מדרגות תרומה (עם תמונות מגלריית המדיה)</span>
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

                  {/* System ImageUpload trigger */}
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

      {/* Tab Selection */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-300">טאב מציג ברירת מחדל</label>
        <select
          value={config.defaultTab || "donors"}
          onChange={(e) => onChange({ ...config, defaultTab: e.target.value as any })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="donors">טאב תורמים</option>
          <option value="teams">טאב קבוצות / שגרירים</option>
          <option value="about">טאב אודות הקמפיין</option>
        </select>
      </div>

      {/* Card Layout & Styling Options */}
      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
          <LayoutGrid className="w-4 h-4" />
          <span>עיצוב ופריסת כרטיסיות התורמים</span>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-slate-300">סגנון פריסה (Layout Grid)</label>
          <select
            value={config.cardLayout || "grid-2"}
            onChange={(e) => onChange({ ...config, cardLayout: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
          >
            <option value="grid-2">גריד 2 עמודות (רשת זוגית - ברירת מחדל)</option>
            <option value="grid-3">גריד 3 עמודות (רשת שערים)</option>
            <option value="list">רשימה אנכית (Single Column List)</option>
            <option value="compact">כרטיסיות דחוסות (Compact Cards)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-slate-300">סגנון כרטיסייה (Card Style)</label>
          <select
            value={config.cardStyle || "shadow"}
            onChange={(e) => onChange({ ...config, cardStyle: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
          >
            <option value="shadow">כרטיס לבן עם צללית רכה (Classic Shadow)</option>
            <option value="bordered">מסגרת מובלטת (Bordered)</option>
            <option value="flat">שטוח (Flat minimal)</option>
            <option value="glassmorphism">זכוכית מודרנית (Glassmorphism)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[11px] font-medium mb-1 text-slate-300">צבע רקע לכרטיסייה</label>
            <input
              type="color"
              value={config.cardBgColor || "#ffffff"}
              onChange={(e) => onChange({ ...config, cardBgColor: e.target.value })}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1 text-slate-300">צבע טקסט תורם</label>
            <input
              type="color"
              value={config.cardTextColor || "#1e293b"}
              onChange={(e) => onChange({ ...config, cardTextColor: e.target.value })}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5"
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showSearch"
            checked={config.showSearch !== false}
            onChange={(e) => onChange({ ...config, showSearch: e.target.checked })}
            className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
          />
          <label htmlFor="showSearch" className="text-xs text-slate-300 font-semibold cursor-pointer">
            הצג תיבת חיפוש תורמים
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showSort"
            checked={config.showSort !== false}
            onChange={(e) => onChange({ ...config, showSort: e.target.checked })}
            className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
          />
          <label htmlFor="showSort" className="text-xs text-slate-300 font-semibold cursor-pointer">
            הצג אפשרויות מיון (הכי עדכני / הכי ישן / הכי גבוה)
          </label>
        </div>
      </div>

    </div>
  );
};
