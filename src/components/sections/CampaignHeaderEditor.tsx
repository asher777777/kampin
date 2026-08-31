"use client";

import React, { useEffect, useState } from "react";
import { CampaignHeaderConfig } from "@/lib/types/campaign";
import { getAllCampaigns } from "@/features/campaigns/actions";
import { Database } from "lucide-react";

interface CampaignHeaderEditorProps {
  config: CampaignHeaderConfig;
  onChange: (newConfig: CampaignHeaderConfig) => void;
}

export const CampaignHeaderEditor: React.FC<CampaignHeaderEditorProps> = ({
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
    <div className="space-y-4 text-right text-sm text-slate-200 dir-rtl">
      
      {/* DB Campaign Selection */}
      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Database className="w-4 h-4" />
          <span>בחירת קמפיין / עמוד מקושר מהמערכת</span>
        </div>
        <select
          value={config.campaignId || "default-campaign"}
          onChange={(e) => {
            const val = e.target.value;
            const selected = campaigns.find(c => c.id === val);
            onChange({
              ...config,
              campaignId: val,
              targetGoal: selected?.targetGoal ?? config.targetGoal,
              totalRaised: selected?.totalRaised ?? config.totalRaised,
            });
          }}
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
              {(items as any[]).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white font-normal">
                  {c.title} {c.id !== "home" ? `(${c.id})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>


      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-300">כותרת הסקשן</label>
        <input
          type="text"
          value={config.title || "הסכום שהושג"}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          placeholder="הסכום שהושג"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-300">סכום יעד הקמפיין (₪)</label>
          <input
            type="number"
            value={config.targetGoal ?? 100000}
            onChange={(e) => onChange({ ...config, targetGoal: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-300">סכום נוכחי שהושג (₪)</label>
          <input
            type="number"
            value={config.totalRaised ?? 0}
            onChange={(e) => onChange({ ...config, totalRaised: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          />
        </div>
      </div>


      <div>
        <label className="block text-xs font-semibold mb-1 text-slate-300">סגנון/תבנית גרף SVG הטרנד</label>
        <select
          value={config.svgTrendPreset || "curve_up"}
          onChange={(e) => onChange({ ...config, svgTrendPreset: e.target.value as any })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="curve_up">עקומת קשת עולה עם חץ (סגנון Charidy)</option>
          <option value="percentage_gauge">מד אחוז התקדמות</option>
          <option value="custom">נתיב SVG מותאם אישית (Custom SVG Path)</option>
        </select>
      </div>

      {config.svgTrendPreset === "custom" && (
        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-300">נתיב SVG מותאם (path d=...)</label>
          <textarea
            value={config.customSvgPath || ""}
            onChange={(e) => onChange({ ...config, customSvgPath: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono"
            rows={3}
            placeholder="M 10 80 Q 100 10, 200 80 T 300 20"
          />
        </div>
      )}
    </div>
  );
};
