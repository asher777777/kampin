"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CampaignDonorsConfig } from "@/lib/types/campaign";
import { getAllCampaigns } from "@/features/campaigns/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { 
  LayoutGrid, 
  Database, 
  Heart, 
  FileText, 
  Image as ImageIcon, 
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react";

const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor").then((m) => m.RichTextEditor),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-48 bg-slate-900/60 border border-slate-800 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
        טוען עורך טקסט עשיר...
      </div>
    )
  }
);

interface CampaignDonorsEditorProps {
  config: CampaignDonorsConfig;
  onChange: (newConfig: CampaignDonorsConfig) => void;
}

const DEFAULT_ABOUT_CONTENT = `<h3>אודות הקמפיין</h3>
<p>ברוכים הבאים לקמפיין הגיוס המיוחד שלנו! הודות לתמיכה ולשותפות שלכם, אנו מצליחים להרחיב את הפעילות ולהגיע להישגים מרשימים.</p>
<p>כל תרומה קטנה כגדולה מקרבת אותנו להשגת היעד ומאפשרת לנו לשנות מציאות ולהשפיע ישירות.</p>`;

export const CampaignDonorsEditor: React.FC<CampaignDonorsEditorProps> = ({
  config,
  onChange,
}) => {
  const [activeEditorSubTab, setActiveEditorSubTab] = useState<"about" | "donors">("about");
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

  const handleInsertImageFromGallery = (url: string) => {
    if (!url) return;
    const current = config.aboutContent || DEFAULT_ABOUT_CONTENT;
    const imageHtml = `<p><img src="${url}" alt="תמונת קמפיין" style="max-width: 100%; height: auto; border-radius: 1rem; margin: 1.5rem auto; display: block;" /></p>`;
    onChange({
      ...config,
      aboutContent: current + imageHtml
    });
  };

  const handleResetDefaultAbout = () => {
    if (confirm("האם לאפס את תוכן האודות לתבנית ברירת המחדל?")) {
      onChange({
        ...config,
        aboutTitle: "אודות הקמפיין",
        aboutContent: DEFAULT_ABOUT_CONTENT
      });
    }
  };

  return (
    <div className="space-y-5 text-right text-sm text-slate-200 dir-rtl">
      
      {/* Prominent Header Banner */}
      <div className="p-3.5 bg-gradient-to-r from-rose-900/60 via-slate-800 to-amber-900/60 rounded-2xl border border-rose-500/40 shadow-lg space-y-1">
        <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          <span>עריכת אזור תורמים ואודות הקמפיין</span>
        </div>
        <p className="text-xs text-slate-300">
          ניהול עשיר של טאב האודות עם תמונות ועיצוב, יחד עם הגדרות כרטיסיות התורמים.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveEditorSubTab("about")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeEditorSubTab === "about"
              ? "bg-amber-500 text-black shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>עריכת טאב אודות</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveEditorSubTab("donors")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeEditorSubTab === "donors"
              ? "bg-amber-500 text-black shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>הגדרות תורמים ועיצוב</span>
        </button>
      </div>

      {/* SUB-TAB 1: ABOUT CONTENT RICH EDITOR */}
      {activeEditorSubTab === "about" && (
        <div className="space-y-4">
          
          {/* About Title Field */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
            <label className="block text-xs font-bold text-amber-400">כותרת טאב אודות</label>
            <input
              type="text"
              value={config.aboutTitle ?? "אודות הקמפיין"}
              onChange={(e) => onChange({ ...config, aboutTitle: e.target.value })}
              placeholder="אודות הקמפיין"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Rich Text Editor Container */}
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>תוכן עשיר לטאב אודות הקמפיין</span>
              </div>
              
              {/* Media Library image insertion trigger */}
              <div className="flex items-center gap-2">
                <ImageUpload
                  onSelect={handleInsertImageFromGallery}
                  compact
                  customTrigger={(openGallery) => (
                    <button
                      type="button"
                      onClick={openGallery}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      title="בחר או העלה תמונה להטמעה בטקסט"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>הוסף תמונה מגלריה</span>
                    </button>
                  )}
                />
                
                <button
                  type="button"
                  onClick={handleResetDefaultAbout}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="טען תבנית ראשונית"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>איפוס</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              ניתן להוסיף כותרות, עיצוב טקסט, צבעים, רשימות, וכן להעלות או לגרור תמונות ישירות לתוך העורך.
            </p>

            {/* The Rich Text Editor with RTL and media support */}
            <div className="bg-white rounded-xl overflow-hidden shadow-inner">
              <RichTextEditor
                value={config.aboutContent ?? DEFAULT_ABOUT_CONTENT}
                onChange={(newHtml) => onChange({ ...config, aboutContent: newHtml })}
                placeholder="כתבו כאן את סיפור הקמפיין, מטרות הפעילות והוספת תמונות..."
                minHeight={320}
              />
            </div>
          </div>

          {/* Quick info box */}
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">טיפ לעיצוב תמונות:</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                ניתן להשתמש בכפתור התמונה בסרגל הכלים של העורך להעלאת תמונה מקומית, או ללחוץ על "הוסף תמונה מגלריה" לבחירה מתוך ספריית המדיה של האתר.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: DONORS & CARDS SETTINGS */}
      {activeEditorSubTab === "donors" && (
        <div className="space-y-4">
          
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

          {/* Default Active Tab Selection */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">טאב מציג ברירת מחדל</label>
            <select
              value={config.defaultTab || "donors"}
              onChange={(e) => onChange({ ...config, defaultTab: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold"
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
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
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
      )}

    </div>
  );
};
