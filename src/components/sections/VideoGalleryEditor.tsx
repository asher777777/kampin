"use client";

import React, { useState } from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Trash2, Monitor, Link2, Film, RefreshCw, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";

interface VideoGalleryConfig {
  visible: boolean;
  images: string[];
  videoUrl: string;
  videoType: "drive-direct" | "iframe" | "auto";
  effect: "fade" | "digital-squares";
  anchorId?: string;
  backgroundColor?: string;
}

interface VideoGalleryEditorProps {
  config: VideoGalleryConfig;
  onChange: (config: VideoGalleryConfig) => void;
}

export const VideoGalleryEditor = ({ config, onChange }: VideoGalleryEditorProps) => {
  const [activeTab, setActiveTab] = useState<"media" | "settings">("media");

  const updateField = (key: keyof VideoGalleryConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleAddMultiple = (urls: any) => {
    const urlsArray = Array.isArray(urls) ? urls : [urls];
    const cleanUrls = urlsArray.filter((u) => typeof u === "string" && u.trim() !== "");
    if (cleanUrls.length === 0) return;
    updateField("images", [...(config.images || []), ...cleanUrls]);
  };

  const handleUpdateImage = (index: number, url: string) => {
    const newImages = [...(config.images || [])];
    newImages[index] = url;
    updateField("images", newImages);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...(config.images || [])];
    newImages.splice(index, 1);
    updateField("images", newImages);
  };

  const handleReorder = (newOrder: string[]) => {
    updateField("images", newOrder);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "media"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          מדיה (תמונות ווידאו)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          הגדרות עיצוב
        </button>
      </div>

      {activeTab === "media" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Video Section */}
          <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-blue-400" /> סרטון גוגל דרייב / יוטיוב
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
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
                  className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg pr-10 pl-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                      <Film className="w-3.5 h-3.5 text-blue-400" />
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
              <label className="block text-sm font-medium text-slate-300 mb-1">
                סוג ניגון סרטון (מומלץ: זיהוי אוטומטי)
              </label>
              <select
                value={config.videoType || "auto"}
                onChange={(e) => updateField("videoType", e.target.value)}
                className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
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
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-purple-400" /> תמונות רקע (גלריה מתחלפת)
                </h3>
                <span className="text-xs text-slate-400">{(config.images || []).length} תמונות</span>
             </div>

             <div className="flex flex-col items-start gap-2 w-full border-b border-slate-700/50 pb-5">
               <h5 className="text-xs font-bold text-slate-300 w-full text-right">הוספת תמונות לגלריה</h5>
               <ImageUpload 
                 multiple 
                 onSelect={handleAddMultiple} 
               />
             </div>

             <div className="space-y-4 pt-1">
                {(config.images || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-[#0f172a] rounded-lg border border-dashed border-slate-700 text-sm">
                    עדיין לא נבחרו תמונות רקע. השתמש בלחצני ההעלאה למעלה כדי להוסיף תמונות לגלריה.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>רשימת התמונות (ניתן לגרור לשינוי סדר ההצגה):</span>
                    </div>
                    <Reorder.Group 
                      axis="y" 
                      values={config.images || []} 
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      {(config.images || []).map((img, index) => (
                        <Reorder.Item 
                          key={`${img}-${index}`} 
                          value={img} 
                          className="flex items-center gap-4 p-3.5 bg-[#0f172a] rounded-xl border border-slate-700 relative group hover:border-slate-600 transition-colors"
                        >
                          <div className="text-slate-500 cursor-grab active:cursor-grabbing hover:text-white transition-colors p-1" title="גרור לשינוי מיקום">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <ImageUpload
                              size="sm"
                              currentImage={img}
                              onSelect={(url) => handleUpdateImage(index, Array.isArray(url) ? url[0] : url)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                            title="הסר תמונה מהגלריה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> אפקט החלפת תמונות
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "fade", label: "מעבר הדרגתי (Fade)" },
                    { id: "digital-squares", label: "ריבועים דיגיטליים" }
                  ].map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => updateField("effect", eff.id)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        config.effect === eff.id
                          ? "bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                          : "bg-[#0f172a] text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {eff.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  צבע רקע (כשהגלריה נטענת)
                </label>
                <input
                  type="color"
                  value={config.backgroundColor || "#0f172a"}
                  onChange={(e) => updateField("backgroundColor", e.target.value)}
                  className="w-full h-10 bg-transparent rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  מזהה עוגן (Anchor ID)
                </label>
                <input
                  type="text"
                  value={config.anchorId || ""}
                  onChange={(e) => updateField("anchorId", e.target.value)}
                  className="w-full bg-[#0f172a] text-white border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  placeholder="לדוגמה: video-section"
                  dir="ltr"
                />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
