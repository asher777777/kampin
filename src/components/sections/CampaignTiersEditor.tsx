"use client";

import React from "react";
import { DonationTier } from "@/lib/types/campaign";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { IconPicker } from "@/components/ui/IconPicker";
import { Plus, Trash2, Image as ImageIcon, Heart, CreditCard, CheckCircle2, FlaskConical, MessageSquare, Sparkles, Clock, Check } from "lucide-react";

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

      {/* Test Mode Switch Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        config.testMode 
          ? "bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/40" 
          : "bg-slate-800/90 border-slate-700/80"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 text-right flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <FlaskConical className={`w-5 h-5 ${config.testMode ? "text-amber-400 animate-pulse" : "text-slate-400"}`} />
              <label htmlFor="test-mode-toggle" className="font-black text-sm text-white cursor-pointer select-none">
                מצב טסט לבדיקת רישום תשלומים (ללא חיוב אשראי)
              </label>
              {config.testMode && (
                <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide">
                  פעיל
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              בסימון תיבה זו, ביצוע תרומה במערכת ידמה תשלום מוצלח באופן מיידי (סטטוס <span className="text-emerald-400 font-bold">'משולם'</span>) <strong className="text-amber-300">ללא פנייה לחברת האשראי</strong>. התרומה תירשם במסד הנתונים, תעדכן את סכומי הקמפיין והשגרירים, ותפעיל את כרטיס ה-UI וההתראות.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="test-mode-toggle"
              type="checkbox"
              checked={Boolean(config.testMode)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                onChange({
                  ...config,
                  testMode: isChecked,
                  drawerConfig: {
                    ...(config.drawerConfig || {}),
                    testMode: isChecked,
                  }
                });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
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
                <div className="space-y-2">
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

                  {/* Tier Display Mode & Shape Controls (When image is present or customized) */}
                  {t.imageSrc && (
                    <div className="grid grid-cols-2 gap-2 pt-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">מצב תצוגת כפתור</label>
                        <select
                          value={t.displayMode || "text"}
                          onChange={(e) => handleUpdateTier(idx, "displayMode", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-[10px]"
                        >
                          <option value="text">טקסט + תמונה</option>
                          <option value="full_image">תמונה מלאה (100% מהכפתור)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">צורת התמונה</label>
                        <select
                          value={t.imageShape || "rounded"}
                          onChange={(e) => handleUpdateTier(idx, "imageShape", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-[10px]"
                        >
                          <option value="rounded">מרובע מעוגל 🔲 (ללא חיתוך)</option>
                          <option value="circle">עיגול ⚪</option>
                          <option value="full">מילוי כפתור מלא 🖼️</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
              {/* Drawer Configurations Section */}
        <div className="pt-4 space-y-4 border-t border-slate-700/60 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <Heart className="w-4.5 h-4.5" />
              <span>עיצוב טופס תרומה (מודל השלבים)</span>
            </div>
            
            {/* Theme Toggle (Dark / Light) */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => onChange({ ...config, drawerConfig: { ...config.drawerConfig, theme: "dark" } })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  config.drawerConfig?.theme === "dark" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                🌙 לילה
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...config, drawerConfig: { ...config.drawerConfig, theme: "light" } })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  config.drawerConfig?.theme !== "dark" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                ☀️ יום
              </button>
            </div>
          </div>

          {/* Global Tier Button Style Selectors */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">תצוגת כפתורי תרומה</label>
              <select
                value={config.drawerConfig?.tierDisplayMode || "auto"}
                onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, tierDisplayMode: e.target.value as any } })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold"
              >
                <option value="auto">מותאם אישית / טקסט + תמונה</option>
                <option value="full_image">תמונות מלאות (100% מהכפתור)</option>
                <option value="text">טקסט בלבד (סכום וכותרת)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">צורת תמונות בכפתורים</label>
              <select
                value={config.drawerConfig?.tierImageShape || "rounded"}
                onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, tierImageShape: e.target.value as any } })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold"
              >
                <option value="rounded">מרובע מעוגל 🔲 (מותאם לכרטיסים)</option>
                <option value="circle">עיגול ⚪</option>
                <option value="full">מילוי כפתור מלא 🖼️</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">צבע רקע של שדות</label>
              <input
                type="color"
                value={config.drawerConfig?.fieldBgColor || "#1e293b"}
                onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, fieldBgColor: e.target.value } })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">צבע מסגרת לשדות</label>
              <input
                type="color"
                value={config.drawerConfig?.borderColor || "#334155"}
                onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, borderColor: e.target.value } })}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">הגדלת פונטים</label>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={config.drawerConfig?.fontSizeScale || 1}
              onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, fontSizeScale: parseFloat(e.target.value) } })}
              className="w-full"
            />
            <div className="text-center text-[10px] text-slate-400">Scale: {config.drawerConfig?.fontSizeScale || 1}x</div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-slate-300">כותרת ראשית של המודל</label>
                <input
                  type="text"
                  value={config.drawerConfig?.mainTitle || "תרומה לקמפיין"}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, mainTitle: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold"
                />
              </div>
              <div>
                <IconPicker
                  value={config.drawerConfig?.mainIcon || "Heart"}
                  onChange={(val) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, mainIcon: val } })}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-3">
              <label className="block text-xs font-bold text-emerald-400">שלב א: בחירת סכום</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.drawerConfig?.step1Title || "שלב א: בחירת סכום"}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step1Title: e.target.value } })}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
                />
                <IconPicker
                  value={config.drawerConfig?.step1Icon || ""}
                  onChange={(val) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step1Icon: val } })}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-3">
              <label className="block text-xs font-bold text-emerald-400">שלב ב: פרטים אישיים</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.drawerConfig?.step2Title || "שלב ב: פרטים אישיים"}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step2Title: e.target.value } })}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
                />
                <IconPicker
                  value={config.drawerConfig?.step2Icon || ""}
                  onChange={(val) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step2Icon: val } })}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-3">
              <label className="block text-xs font-bold text-emerald-400">שלב ג: תשלום</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.drawerConfig?.step3Title || "שלב ג: תשלום מאובטח"}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step3Title: e.target.value } })}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
                />
                <IconPicker
                  value={config.drawerConfig?.step3Icon || ""}
                  onChange={(val) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, step3Icon: val } })}
                />
              </div>
            </div>

            {/* Thank You & Social Sharing Window Configuration */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 rounded-xl border border-emerald-500/50 space-y-3.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>עריכת חלון תודה ושיתוף ברשתות חברתיות</span>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">כותרת חלון התודה</label>
                <input
                  type="text"
                  placeholder="תודה רבה על תרומתך! ❤️"
                  value={config.drawerConfig?.thankYouTitle || ""}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouTitle: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">הודעת תודה מותאמת אישית (אופציונלי)</label>
                <textarea
                  rows={2}
                  placeholder="תרומתך עברה בהצלחה ונוספה מיידית ליעד הקמפיין!"
                  value={config.drawerConfig?.thankYouSubtitle || ""}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouSubtitle: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              {/* Thank You Custom Image */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">תמונת תודה / באנר מוצג בחלון (אופציונלי)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <ImageIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="כתובת תמונה (URL) או העלה תמונה"
                      value={config.drawerConfig?.thankYouImage || ""}
                      onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouImage: e.target.value } })}
                      className="w-full pr-8 pl-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white"
                    />
                  </div>
                  <ImageUpload
                    compact={true}
                    currentImage={config.drawerConfig?.thankYouImage}
                    onSelect={(url) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouImage: url } })}
                    customTrigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        className="px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>העלאה / גלריה</span>
                      </button>
                    )}
                  />
                </div>
                {config.drawerConfig?.thankYouImage && (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-emerald-500/50 mt-1">
                    <img src={config.drawerConfig.thankYouImage} alt="תמונת תודה" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouImage: "" } })}
                      className="absolute top-1 left-1 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded text-[10px] cursor-pointer"
                      title="הסר תמונה"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Social Share Message Text */}
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-300">טקסט שיתוף מוכן לרשתות חברתיות (וואטסאפ, פייסבוק, טלגרם)</label>
                <textarea
                  rows={2}
                  placeholder="תרמתי עכשיו לקמפיין החשוב, הצטרפו גם אתם ועזרו להגיע ליעד!"
                  value={config.drawerConfig?.thankYouShareText || ""}
                  onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, thankYouShareText: e.target.value } })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>
            </div>

            {/* WhatsApp Automated Messages Section (GREEN-API) */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-green-950/40 rounded-xl border border-emerald-500/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                  <span>הודעות WhatsApp אוטומטיות (GREEN-API)</span>
                </div>

                {/* Enable/Disable WhatsApp Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.drawerConfig?.whatsapp_enabled !== false}
                    onChange={(e) => onChange({
                      ...config,
                      drawerConfig: { ...config.drawerConfig, whatsapp_enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {config.drawerConfig?.whatsapp_enabled !== false && (
                <div className="space-y-4">
                  {/* Explanatory Box with Interactive Clickable Placeholders */}
                  <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-xl text-xs space-y-2">
                    <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      הסבר על מנגנון הוואטסאפ האוטומטי לתרומות
                    </h4>
                    <p className="text-amber-300/90 leading-relaxed text-[11px]">
                      הודעות וואטסאפ יישלחו אוטומטית דרך <strong>GREEN-API</strong> למספר הטלפון שהתורם יזין בטופס.
                      לחצו על כפתורי השדות למטה להוספת פלייסהולדרים, והמערכת תחלץ את הנתונים בזמן אמת:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: "שם מלא", tag: "{שם מלא}" },
                        { label: "מספר טלפון", tag: "{טלפון}" },
                        { label: "אימייל", tag: "{דוא\"ל}" },
                        { label: "סכום תרומה", tag: "{סכום}" },
                        { label: "שם מסלול", tag: "{מסלול}" },
                        { label: "סוג תרומה", tag: "{סוג תרומה}" },
                        { label: "מספר חודשים", tag: "{מספר חודשים}" },
                        { label: "שם קמפיין", tag: "{שם קמפיין}" },
                        { label: "שם שגריר", tag: "{שם שגריר}" },
                        { label: "הקדשה / ברכה", tag: "{הקדשה}" },
                        { label: "קישור לקבלה", tag: "{link_kabala}" },
                        { label: "קישור לתשלום", tag: "{קישור לתשלום}" },
                      ].map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const curr = config.drawerConfig?.whatsapp_success_message || "";
                              onChange({
                                ...config,
                                drawerConfig: {
                                  ...config.drawerConfig,
                                  whatsapp_success_message: curr ? `${curr} ${item.tag}` : item.tag,
                                },
                              });
                            }}
                            className="px-2 py-1 rounded bg-amber-900/60 hover:bg-amber-800 border border-amber-500/40 text-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                            title={`הוסף ${item.tag} להודעת ההצלחה`}
                          >
                            {item.tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Success Message Card */}
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-emerald-500/40 space-y-3">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs border-b border-slate-700/80 pb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>1. הודעה לאחר תרומה מוצלחת (סליקה מאושרת)</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">נוסח ההודעה</label>
                        <textarea
                          rows={3}
                          value={config.drawerConfig?.whatsapp_success_message ?? "שלום {שם מלא}, תודה רבה על תרומתך בסך ₪{סכום} עבור {שם קמפיין}! תזכו למצוות ולברכה."}
                          onChange={(e) => onChange({
                            ...config,
                            drawerConfig: { ...config.drawerConfig, whatsapp_success_message: e.target.value }
                          })}
                          placeholder="שלום {שם מלא}, תודה רבה על תרומתך..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">תמונת תודה / באנר מצורף להודעה (אופציונלי)</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <ImageIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="כתובת תמונה (URL) או העלה תמונה"
                              value={config.drawerConfig?.whatsapp_success_image_url || ""}
                              onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_success_image_url: e.target.value } })}
                              className="w-full pr-8 pl-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white"
                            />
                          </div>
                          <ImageUpload
                            compact={true}
                            currentImage={config.drawerConfig?.whatsapp_success_image_url}
                            onSelect={(url) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_success_image_url: url } })}
                            customTrigger={(open) => (
                              <button
                                type="button"
                                onClick={open}
                                className="px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow cursor-pointer"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>העלאה / גלריה</span>
                              </button>
                            )}
                          />
                        </div>
                        {config.drawerConfig?.whatsapp_success_image_url && (
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-emerald-500/50 mt-1.5">
                            <img src={config.drawerConfig.whatsapp_success_image_url} alt="תמונת וואטסאפ" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_success_image_url: "" } })}
                              className="absolute top-1 left-1 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded text-[10px] cursor-pointer"
                              title="הסר תמונה"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pending Message Card (Sent after 5 mins if unpaid) */}
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/40 space-y-3">
                      <div className="space-y-1 border-b border-slate-700/80 pb-2">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>2. תזכורת לתרומה בהמתנה לתשלום (ממתין 5 דקות)</span>
                        </div>
                        <p className="text-[10px] text-amber-300/80">
                          ⏰ נשלחת אוטומטית לתורם רק אם עברו 5 דקות משלב הפרטים והסליקה טרם הושלמה.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">נוסח הודעת התזכורת</label>
                        <textarea
                          rows={3}
                          value={config.drawerConfig?.whatsapp_pending_message ?? "שלום {שם מלא}, שמנו לב שהתחלת תרומה בסך ₪{סכום} עבור {שם קמפיין} אך התהליך טרם הושלם. לחץ כאן להשלמת התרומה: {קישור לתשלום}"}
                          onChange={(e) => onChange({
                            ...config,
                            drawerConfig: { ...config.drawerConfig, whatsapp_pending_message: e.target.value }
                          })}
                          placeholder="שלום {שם מלא}, שמנו לב שהתחלת תרומה..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">תמונה מצורפת לתזכורת (אופציונלי)</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <ImageIcon className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="כתובת תמונה (URL) או העלה תמונה"
                              value={config.drawerConfig?.whatsapp_pending_image_url || ""}
                              onChange={(e) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_pending_image_url: e.target.value } })}
                              className="w-full pr-8 pl-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white"
                            />
                          </div>
                          <ImageUpload
                            compact={true}
                            currentImage={config.drawerConfig?.whatsapp_pending_image_url}
                            onSelect={(url) => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_pending_image_url: url } })}
                            customTrigger={(open) => (
                              <button
                                type="button"
                                onClick={open}
                                className="px-2.5 py-1.5 bg-amber-700/80 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors shadow cursor-pointer"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>העלאה / גלריה</span>
                              </button>
                            )}
                          />
                        </div>
                        {config.drawerConfig?.whatsapp_pending_image_url && (
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-amber-500/50 mt-1.5">
                            <img src={config.drawerConfig.whatsapp_pending_image_url} alt="תמונת תזכורת" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => onChange({ ...config, drawerConfig: { ...config.drawerConfig, whatsapp_pending_image_url: "" } })}
                              className="absolute top-1 left-1 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded text-[10px] cursor-pointer"
                              title="הסר תמונה"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
