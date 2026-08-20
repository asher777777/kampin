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
    fetch("/api/campaigns")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.items)) {
          setCampaigns(data.items);
        } else {
          getAllCampaigns().then(camps => {
            if (Array.isArray(camps)) setCampaigns(camps);
          });
        }
      })
      .catch(err => {
        console.warn("GET /api/campaigns error:", err);
        getAllCampaigns().then(camps => {
          if (Array.isArray(camps)) setCampaigns(camps);
        });
      });
  }, []);


  return (
    <div className="space-y-5 text-right text-sm text-slate-200 dir-rtl">
      
      {/* Prominent Header Banner for Form Editor */}
      <div className="p-3.5 bg-gradient-to-r from-rose-900/60 via-slate-800 to-emerald-900/60 rounded-2xl border border-rose-500/40 shadow-lg space-y-1">
        <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          <span>עריכת רשימת התורמים</span>
        </div>
        <p className="text-xs text-slate-300">
          כאן מנהלים את הגדרות כרטיסיות התורמים, בחירת קמפיין, וסידור טאבים.
        </p>
      </div>

      {/* DB Campaign Selection */}
      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Database className="w-4 h-4" />
          <span>בחירת קמפיין / עמוד מקושר מהמערכת</span>
        </div>
        <select
          value={config.campaignId || "default-campaign"}
          onChange={(e) => onChange({ ...config, campaignId: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold"
        >
          <option value="default-campaign">קמפיין ברירת מחדל (Default Campaign)</option>
          {Object.entries(
            campaigns.reduce((acc: Record<string, any[]>, item: any) => {
              const cat = item.category || "קמפיינים";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {})
          ).map(([category, items]) => (
            <optgroup key={category} label={category} className="bg-slate-800 text-amber-400 font-bold">
              {(items as any[]).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white font-normal">
                  {c.title} {c.id !== "home" ? `(${c.id})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>


      {/* Removed Donation Type & Tiers Form */}

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
