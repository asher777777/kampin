"use client";

import React, { useState } from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { 
  Trash2, 
  Monitor, 
  Link2, 
  Film, 
  RefreshCw, 
  GripVertical, 
  Type, 
  Maximize2, 
  Sparkles, 
  Layers,
  Compass,
  CheckCircle2
} from "lucide-react";
import { Reorder } from "framer-motion";
import { VideoGalleryImageItem } from "./VideoGallery";

export interface VideoGalleryConfig {
  visible: boolean;
  images: VideoGalleryImageItem[];
  videoUrl: string;
  videoType: "drive-direct" | "iframe" | "auto";
  effect: "fade" | "digital-squares" | "zoom-in" | "slide";
  objectFit?: "cover" | "contain" | "fill" | "scale-down";
  titleEffect?: "cinematic" | "glow" | "badge" | "fade-up";
  textPosition?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left";
  desktopHeight?: "natural" | "auto" | "16:9" | "21:9" | "3:1" | "2.35:1" | "normal" | "tall" | "extra-tall" | string;
  anchorId?: string;
  backgroundColor?: string;
}

interface VideoGalleryEditorProps {
  config: VideoGalleryConfig;
  onChange: (config: VideoGalleryConfig) => void;
  initialTab?: "media" | "settings";
}

interface InternalImageItem {
  id: string;
  url: string;
  title: string;
  position?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left";
}

export const VideoGalleryEditor = ({ config, onChange, initialTab = "media" }: VideoGalleryEditorProps) => {
  const [activeTab, setActiveTab] = useState<"media" | "settings">(initialTab);

  const updateField = (key: keyof VideoGalleryConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  // Convert raw config images into normalized internal items with stable IDs
  const getNormalizedItems = (): InternalImageItem[] => {
    const raw = config.images || [];
    return raw.map((item, idx) => {
      if (typeof item === "string") {
        return {
          id: `img-${idx}-${item.slice(-10)}`,
          url: item,
          title: "",
          position: undefined,
        };
      }
      return {
        id: `img-${idx}-${item.url?.slice(-10) || ""}`,
        url: item.url || "",
        title: item.title || "",
        position: item.position,
      };
    });
  };

  const handleAddMultiple = (urls: any) => {
    const urlsArray = Array.isArray(urls) ? urls : [urls];
    const cleanUrls = urlsArray.filter((u) => typeof u === "string" && u.trim() !== "");
    if (cleanUrls.length === 0) return;
    
    const newItems = cleanUrls.map((u) => ({ url: u, title: "" }));
    updateField("images", [...(config.images || []), ...newItems]);
  };

  const handleUpdateImageUrl = (index: number, newUrl: string) => {
    const raw = [...(config.images || [])];
    const current = raw[index];
    if (typeof current === "string") {
      raw[index] = { url: newUrl, title: "" };
    } else {
      raw[index] = { ...current, url: newUrl };
    }
    updateField("images", raw);
  };

  const handleUpdateImageTitle = (index: number, newTitle: string) => {
    const raw = [...(config.images || [])];
    const current = raw[index];
    if (typeof current === "string") {
      raw[index] = { url: current, title: newTitle };
    } else {
      raw[index] = { ...current, title: newTitle };
    }
    updateField("images", raw);
  };

  const handleUpdateImagePosition = (index: number, newPos: any) => {
    const raw = [...(config.images || [])];
    const current = raw[index];
    if (typeof current === "string") {
      raw[index] = { url: current, title: "", position: newPos };
    } else {
      raw[index] = { ...current, position: newPos };
    }
    updateField("images", raw);
  };

  const handleRemoveImage = (index: number) => {
    const raw = [...(config.images || [])];
    raw.splice(index, 1);
    updateField("images", raw);
  };

  const handleReorder = (newItems: InternalImageItem[]) => {
    const exported = newItems.map((item) => ({
      url: item.url,
      title: item.title,
      position: item.position,
    }));
    updateField("images", exported);
  };

  const items = getNormalizedItems();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors cursor-pointer text-sm ${
            activeTab === "media"
              ? "border-amber-500 text-amber-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          מדיה וכותרות (תמונות ווידאו)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors cursor-pointer text-sm ${
            activeTab === "settings"
              ? "border-amber-500 text-amber-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          הגדרות עיצוב, יחסי גובה ומידות
        </button>
      </div>

      {activeTab === "media" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Video Section */}
          <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm md:text-base">
              <Film className="w-5 h-5 text-amber-400" /> סרטון ראשי (גוגל דרייב / יוטיוב / קובץ)
            </h3>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                קישור לסרטון (URL)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={config.videoUrl || ""}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  placeholder="הדבק כאן קישור שיתוף מגוגל דרייב, יוטיוב, או וידאו..."
                  className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg pr-10 pl-3 py-2.5 text-xs md:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  dir="ltr"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">או בחר קובץ וידאו מהמחשב/ספרייה:</span>
                <ImageUpload
                  size="sm"
                  onSelect={(url) => updateField("videoUrl", Array.isArray(url) ? url[0] : url)}
                  customTrigger={(onClick) => (
                    <button
                      type="button"
                      onClick={onClick}
                      className="px-2.5 py-1 text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      בחר / העלה וידאו
                    </button>
                  )}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                * מומלץ סרטון דרייב קטן מ-100MB כדי שהנגן יוכל להמשיך מאותה נקודה. עבור Google Photos יש לבחור 'הטמעה רגילה'.
              </p>
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                סוג ניגון סרטון (מומלץ: זיהוי אוטומטי)
              </label>
              <select
                value={config.videoType || "auto"}
                onChange={(e) => updateField("videoType", e.target.value)}
                className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 text-xs md:text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="auto">זיהוי אוטומטי (Auto)</option>
                <option value="drive-direct">נגן פנימי חכם (Drive Direct - תומך עצירה/המשך)</option>
                <option value="iframe">הטמעה רגילה (Iframe - Google Photos / יוטיוב / קבצים גדולים)</option>
              </select>
            </div>
          </div>

          {/* Background Images Section */}
          <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2 text-sm md:text-base">
                  <Monitor className="w-5 h-5 text-amber-400" /> תמונות רקע וכותרות מונפשות
                </h3>
                <span className="text-xs bg-slate-800 text-amber-400 font-semibold px-2.5 py-1 rounded-full border border-slate-700">
                  {items.length} תמונות
                </span>
             </div>

             <div className="flex flex-col items-start gap-2 w-full border-b border-slate-700/50 pb-5">
               <h5 className="text-xs font-bold text-slate-300 w-full text-right">הוספת תמונות לגלריה</h5>
               <ImageUpload 
                 multiple 
                 onSelect={handleAddMultiple} 
               />
             </div>

             <div className="space-y-4 pt-1">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-[#0f172a] rounded-lg border border-dashed border-slate-700 text-sm">
                    עדיין לא נבחרו תמונות רקע. השתמש בלחצני ההעלאה למעלה כדי להוסיף תמונות לגלריה.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>רשימת התמונות (ניתן לגרור לשינוי סדר, לקבוע כותרת ומיקום מדויק לכל תמונה):</span>
                    </div>
                    <Reorder.Group 
                      axis="y" 
                      values={items} 
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      {items.map((item, index) => (
                        <Reorder.Item 
                          key={item.id} 
                          value={item} 
                          className="flex flex-col md:flex-row items-stretch md:items-center gap-3.5 p-4 bg-[#0f172a] rounded-xl border border-slate-700 relative group hover:border-amber-500/50 transition-all shadow-md"
                        >
                          {/* Drag handle & thumbnail */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-slate-500 cursor-grab active:cursor-grabbing hover:text-amber-400 transition-colors p-1" title="גרור לשינוי מיקום">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            {/* Clean image thumbnail with replace overlay */}
                            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-slate-700 bg-black/40 shrink-0 group/thumb flex items-center justify-center">
                              <img 
                                src={item.url} 
                                alt={item.title || `תמונה ${index + 1}`} 
                                className="w-full h-full object-cover" 
                              />
                              <ImageUpload
                                customTrigger={(onClick) => (
                                  <button
                                    type="button"
                                    onClick={onClick}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-medium transition-opacity cursor-pointer gap-1"
                                    title="החלף תמונה"
                                  >
                                    <RefreshCw className="w-4 h-4 text-amber-400" />
                                    <span>החלף</span>
                                  </button>
                                )}
                                onSelect={(newUrl) => handleUpdateImageUrl(index, Array.isArray(newUrl) ? newUrl[0] : newUrl)}
                              />
                            </div>
                          </div>

                          {/* Inputs: Title & Position */}
                          <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3 min-w-0">
                            {/* Title text input */}
                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                                <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                כותרת לתמונה זו:
                              </label>
                              <input
                                type="text"
                                value={item.title || ""}
                                onChange={(e) => handleUpdateImageTitle(index, e.target.value)}
                                placeholder="הזן כותרת שתוצג עם התמונה..."
                                className="w-full bg-[#1e293b] text-white text-xs border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500 transition-colors"
                                dir="rtl"
                              />
                            </div>

                            {/* Position dropdown */}
                            <div className="w-full md:w-44 flex flex-col gap-1 shrink-0">
                              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                מיקום הכותרת:
                              </label>
                              <select
                                value={item.position || config.textPosition || "bottom"}
                                onChange={(e) => handleUpdateImagePosition(index, e.target.value)}
                                className="w-full bg-[#1e293b] text-white text-xs border border-slate-700 rounded-lg px-2.5 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                              >
                                <option value="bottom">תחתון ממורכז (רגיל)</option>
                                <option value="bottom-right">תחתון ימין</option>
                                <option value="bottom-left">תחתון שמאל</option>
                                <option value="top">עליון ממורכז</option>
                                <option value="center">מרכז התמונה</option>
                              </select>
                            </div>
                          </div>

                          {/* Remove button */}
                          <div className="flex justify-end md:justify-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                              title="הסר תמונה מהגלריה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 space-y-6">
              
              {/* 1. Dimensions & Height Mode (מימדי גובה ויחס תמונה) */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" /> גובה וממדי תצוגת הגלריה (דסקטופ ומובייל)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { 
                      id: "natural", 
                      label: "גובה טבעי מקורי (100% ללא חיתוך)", 
                      desc: "מציג בדיוק את מלוא התמונה לפי יחס הגובה-רוחב המקורי שלה ללא שום חיתוך. מומלץ ביותר לבאנרים מעוצבים!",
                      recommended: true
                    },
                    { 
                      id: "16:9", 
                      label: "באנר קולנועי רחב (16:9)", 
                      desc: "יחס קלאסי רחב ומאוזן, תואם פורמט מסכים וסרטונים" 
                    },
                    { 
                      id: "21:9", 
                      label: "באנר פנורמי (21:9)", 
                      desc: "באנר פנורמי רחב במיוחד בסגנון אתרי יוקרה" 
                    },
                    { 
                      id: "3:1", 
                      label: "באנר עליון צר (3:1)", 
                      desc: "באנר צר וקומפקטי בראש העמוד" 
                    },
                    { 
                      id: "2.35:1", 
                      label: "באנר סינמסקופ (2.35:1)", 
                      desc: "יחס קולנועי פנורמי עמוק" 
                    },
                    { 
                      id: "tall", 
                      label: "גובה מסך מוגדל (72vh)", 
                      desc: "תופס כ-72% מגובה מסך הצופה" 
                    },
                    { 
                      id: "normal", 
                      label: "גובה מסך סטנדרטי (60vh)", 
                      desc: "תופס כ-60% מגובה מסך הצופה" 
                    },
                    { 
                      id: "extra-tall", 
                      label: "גובה מסך ענק (85vh)", 
                      desc: "תופס כמעט את כל גובה המסך (85%)" 
                    }
                  ].map((h) => {
                    const isSelected = (config.desktopHeight || "natural") === h.id || ((config.desktopHeight === "auto") && h.id === "natural");
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => updateField("desktopHeight", h.id)}
                        className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                          isSelected
                            ? "bg-amber-500/20 text-white border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50"
                            : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-slate-200"}`}>
                            {h.label}
                          </span>
                          {h.recommended && (
                            <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded-full shrink-0">
                              מומלץ
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {h.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Object Fit Mode (התאמת תמונה במסגרת) */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-amber-400" /> אופן מילוי התמונה (Object Fit)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { 
                      id: "cover", 
                      label: "כיסוי מלא (Cover)", 
                      desc: "ממלא את מלוא רוחב וגובה המסגרת" 
                    },
                    { 
                      id: "contain", 
                      label: "מכיל מלא - ללא חיתוך (Contain)", 
                      desc: "מציג 100% מכל שטח התמונה ללא שום חיתוך של שוליים" 
                    },
                    { 
                      id: "fill", 
                      label: "מתיחה (Fill / Stretch)", 
                      desc: "מתיחת התמונה לכל רוחב וגובה המסגרת" 
                    },
                    { 
                      id: "scale-down", 
                      label: "התאמה מוקטנת (Scale Down)", 
                      desc: "שומר על הגודל המקורי של התמונה" 
                    }
                  ].map((fit) => {
                    const isSelected = (config.objectFit || "cover") === fit.id;
                    return (
                      <button
                        key={fit.id}
                        type="button"
                        onClick={() => updateField("objectFit", fit.id)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? "bg-amber-500/15 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                            : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-slate-200"}`}>
                          {fit.label}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {fit.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Transition Effect */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" /> אפקט מעבר בין תמונות בגלריה
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "fade", label: "מעבר הדרגתי (Fade)" },
                    { id: "zoom-in", label: "התקרבות קולנועית (Zoom)" },
                    { id: "slide", label: "החלקה חלקה (Slide)" },
                    { id: "digital-squares", label: "ריבועים דיגיטליים" }
                  ].map((eff) => {
                    const isSelected = (config.effect || "fade") === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => updateField("effect", eff.id)}
                        className={`py-3 px-4 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-amber-500 text-black font-bold border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                            : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {eff.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Title Display Effect */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> אפקט תצוגת הכותרת לתמונות
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { 
                      id: "cinematic", 
                      label: "קולנועי מוזהב (Cinematic Glass)", 
                      desc: "כרטיס זכוכית יוקרתי עם מסגרת זהב ונקודת אור מהבהבת" 
                    },
                    { 
                      id: "glow", 
                      label: "זוהר אמבר יוקרתי (Golden Glow)", 
                      desc: "כיתוב זוהר עם הילת זהב עמוקה וטקסט בולט" 
                    },
                    { 
                      id: "badge", 
                      label: "תג צף מעוצב (Modern Badge)", 
                      desc: "תגית מעוצבת וקומפקטית" 
                    },
                    { 
                      id: "fade-up", 
                      label: "פס הצללה הדרגתי (Gradient Bar)", 
                      desc: "פס הצללה הדרגתי לכל הרוחב" 
                    }
                  ].map((eff) => {
                    const isSelected = (config.titleEffect || "cinematic") === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => updateField("titleEffect", eff.id)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? "bg-amber-500/15 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                            : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-slate-200"}`}>
                          {eff.label}
                        </span>
                        <span className="text-[11px] text-slate-400 leading-relaxed">
                          {eff.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Default Text Position */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" /> מיקום כותרת ברירת מחדל
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "bottom", label: "תחתון מרכז" },
                    { id: "bottom-right", label: "תחתון ימין" },
                    { id: "bottom-left", label: "תחתון שמאל" },
                    { id: "top", label: "עליון מרכז" },
                    { id: "center", label: "מרכז" },
                  ].map((pos) => {
                    const isSelected = (config.textPosition || "bottom") === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => updateField("textPosition", pos.id)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-amber-500 text-black font-bold border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                            : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Background Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                  צבע רקע (כשהתמונה במצב מכיל / שוליים)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.backgroundColor || "#0f172a"}
                    onChange={(e) => updateField("backgroundColor", e.target.value)}
                    className="w-12 h-10 bg-transparent rounded cursor-pointer border border-slate-700"
                  />
                  <span className="text-xs text-slate-400 font-mono" dir="ltr">
                    {config.backgroundColor || "#0f172a"}
                  </span>
                </div>
              </div>

              {/* 7. Anchor ID */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                  מזהה עוגן (Anchor ID)
                </label>
                <input
                  type="text"
                  value={config.anchorId || ""}
                  onChange={(e) => updateField("anchorId", e.target.value)}
                  className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 text-xs md:text-sm focus:outline-none focus:border-amber-500"
                  placeholder="videoGallery"
                  dir="ltr"
                />
              </div>

           </div>
        </div>
      )}
    </div>
  );
};
