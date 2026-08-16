"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { generateHeroImageWithAI } from "@/features/services/actions";
import { Button } from "@/components/ui/Button";
import { Sparkles, Wand2, Loader2, Image as ImageIcon } from "lucide-react";
import { getAllSitePages } from "@/features/home/actions";
import { cn } from "@/lib/utils";

interface HeroEditorProps {
  title?: string;
  subtitle?: string;
  description?: string;
  imageSrc?: string;
  buttonsVisible?: boolean;
  primaryButton?: { text: string; link: string; visible?: boolean };
  secondaryButton?: { text: string; link: string; visible?: boolean };
  isEditing?: boolean;
  availableAnchors?: { id: string, label: string }[];
  heroStyle?: "hero" | "content" | "landing";
  flexDirection?: "row" | "row-reverse" | "col" | "col-reverse";
  formMode?: "visible" | "modal";
  form?: any;
  priority?: boolean;
  onUpdateHero: (field: "title" | "subtitle" | "description" | "imageSrc" | "buttonsVisible" | "primaryButton" | "secondaryButton" | "heroStyle" | "flexDirection" | "formMode" | "form", value: any) => void;
}

export function HeroEditor({
  title = "",
  subtitle = "",
  description = "",
  imageSrc,
  buttonsVisible = true,
  primaryButton = { text: "בדיקת תפילין ומזוזות", link: "/services" },
  secondaryButton = { text: "למידע נוסף", link: "/about", visible: false },
  availableAnchors = [],
  heroStyle = "hero",
  flexDirection = "row",
  formMode = "visible",
  form,
  priority,
  onUpdateHero
}: HeroEditorProps) {
  const [sitePages, setSitePages] = useState<any[]>([]);

  useEffect(() => {
    getAllSitePages().then(setSitePages).catch((e) => console.warn("Failed to load site pages", e));
  }, []);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleUpdate = (field: any, val: any) => {
    onUpdateHero(field, val);
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt) return;
    setGeneratingImage(true);
    setAiError("");
    try {
      const res = await generateHeroImageWithAI(aiPrompt);
      if (res.success && res.url) {
        handleUpdate("imageSrc", res.url);
      } else {
        setAiError(res.error || "שגיאה ביצירת התמונה.");
      }
    } catch (e: any) {
      setAiError(e.message || "שגיאה בתקשורת עם השרת.");
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="relative z-50 w-full max-w-xl mx-auto px-0 pb-8 mt-4">
      <div className="space-y-6 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            הגדרות אזור התוכן
          </h4>
        </div>
        
        <div className="flex flex-col gap-6 items-start w-full">
          {/* Layout Settings */}
          <div className="w-full space-y-4 border-b border-slate-700/50 pb-6">
            <h5 className="text-sm font-bold text-slate-300">פריסה (Layout)</h5>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">סגנון</label>
                <select
                  value={heroStyle}
                  onChange={(e) => handleUpdate("heroStyle", e.target.value)}
                  className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 font-medium cursor-pointer"
                >
                  <option value="hero">תצוגת הירו נוכחית (מרכזית)</option>
                  <option value="content">תצוגת אזור תוכן (צד לצד)</option>
                  <option value="landing">תצוגת עמוד נחיתה (מודרנית עם טופס)</option>
                </select>
              </div>

              {heroStyle === "landing" && (
                <div className="space-y-1 mt-2">
                  <label className="text-xs font-semibold text-slate-400">הצגת טופס לידים</label>
                  <select
                    value={formMode}
                    onChange={(e) => handleUpdate("formMode", e.target.value)}
                    className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 font-medium cursor-pointer"
                  >
                    <option value="visible">טופס גלוי (מוצג תמיד)</option>
                    <option value="modal">טופס חבוי (מוצג בלחיצה על כפתור)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1 mt-3">
                <label className="text-xs font-semibold text-slate-400">כיוון</label>
                <select
                  value={flexDirection}
                  onChange={(e) => handleUpdate("flexDirection", e.target.value)}
                  className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 font-medium cursor-pointer"
                >
                  <option value="row">מימין לשמאל (שולחן עבודה)</option>
                  <option value="row-reverse">משמאל לימין (שולחן עבודה)</option>
                  <option value="col">מלמעלה למטה (מובייל בדרך כלל)</option>
                  <option value="col-reverse">מלמטה למעלה</option>
                </select>
              </div>
            </div>
          </div>

          {/* Text Settings */}
          <div className="w-full space-y-4 border-b border-slate-700/50 pb-6">
            <h5 className="text-sm font-bold text-slate-300">הגדרות טקסט</h5>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">כותרת ראשית</label>
              <input type="text" value={title} onChange={(e) => handleUpdate("title", e.target.value)} className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400" placeholder="הזן כותרת..." />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">תת כותרת</label>
              <input type="text" value={subtitle} onChange={(e) => handleUpdate("subtitle", e.target.value)} className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400" placeholder="הזן תת כותרת..." />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">תיאור</label>
              <textarea value={description} onChange={(e) => handleUpdate("description", e.target.value)} rows={3} className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 resize-none" placeholder="הזן תיאור קצר..." />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 w-full border-b border-slate-700/50 pb-6">
            <h5 className="text-xs font-bold text-slate-300 w-full text-right">תמונת רקע</h5>
            <ImageUpload 
              currentImage={imageSrc}
              onSelect={(url) => handleUpdate("imageSrc", url)}
            />
          </div>
          
          <div className="w-full pt-2 space-y-3 border-b border-slate-700/50 pb-6">
            <h5 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
              מחולל תמונות AI
            </h5>
            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="תאר את התמונה שברצונך ליצור..."
                className="w-full text-xs bg-[#1e293b] text-white border border-slate-700 rounded-lg p-2 outline-none focus:border-purple-400 min-h-[60px] resize-none"
              />
              {aiError && (
                <p className="text-[10px] font-medium text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
                  {aiError}
                </p>
              )}
              <Button
                type="button"
                onClick={handleGenerateImage}
                disabled={generatingImage || !aiPrompt}
                className="w-full h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg gap-2 font-bold text-xs shadow-md"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> מייצר...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3" /> ייצר תמונה
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="w-full pt-2 space-y-3 pb-4">
            <h5 className="text-sm font-bold text-slate-300">עריכת כפתורים</h5>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">כפתור ראשי (טקסט וקישור)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-medium text-slate-500">הצג</span>
                    <div className="relative inline-flex items-center">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={primaryButton.visible ?? true}
                        onChange={(e) => handleUpdate("primaryButton", { ...primaryButton, visible: e.target.checked })}
                      />
                      <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                    </div>
                  </label>
                </div>
                <div className={cn("flex flex-col gap-2 transition-opacity", primaryButton.visible === false ? "opacity-50 pointer-events-none" : "")}>
                  <input type="text" value={primaryButton.text} onChange={(e) => handleUpdate("primaryButton", { ...primaryButton, text: e.target.value })} className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400" placeholder="טקסט הלחצן" />
                  
                  <select
                    value={primaryButton.link}
                    onChange={(e) => handleUpdate("primaryButton", { ...primaryButton, link: e.target.value })}
                    className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 font-medium cursor-pointer"
                  >
                    <optgroup label="עמודים">
                      {sitePages.map((page, idx) => (
                        <option key={`${page.id}-${idx}`} value={page.url}>{page.title}</option>
                      ))}
                    </optgroup>
                    <optgroup label="עוגנים לאזורים">
                      {availableAnchors.map(anchor => (
                        <option key={anchor.id} value={`/#${anchor.id}`}>{anchor.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">כפתור משני (טקסט וקישור)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-medium text-slate-500">הצג</span>
                    <div className="relative inline-flex items-center">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={secondaryButton.visible ?? true}
                        onChange={(e) => handleUpdate("secondaryButton", { ...secondaryButton, visible: e.target.checked })}
                      />
                      <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                    </div>
                  </label>
                </div>
                <div className={cn("flex flex-col gap-2 transition-opacity", secondaryButton.visible === false ? "opacity-50 pointer-events-none" : "")}>
                  <input type="text" value={secondaryButton.text} onChange={(e) => handleUpdate("secondaryButton", { ...secondaryButton, text: e.target.value })} className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400" placeholder="טקסט הלחצן" />
                  
                  <select
                    value={secondaryButton.link}
                    onChange={(e) => handleUpdate("secondaryButton", { ...secondaryButton, link: e.target.value })}
                    className="w-full text-sm border border-slate-700 rounded-lg p-3 bg-[#1e293b] text-white focus:outline-none focus:border-purple-400 font-medium cursor-pointer"
                  >
                    <optgroup label="עמודים">
                      {sitePages.map((page, idx) => (
                        <option key={`${page.id}-${idx}`} value={page.url}>{page.title}</option>
                      ))}
                    </optgroup>
                    <optgroup label="עוגנים לאזורים">
                      {availableAnchors.map(anchor => (
                        <option key={anchor.id} value={`/#${anchor.id}`}>{anchor.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
