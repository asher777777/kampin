"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimerSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  targetDate?: string;
  layout?: "classic" | "modern" | "compact";
  isEditing?: boolean;
  onUpdate?: (field: string, value: any) => void;
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  boxBackgroundColor?: string;
  numberColor?: string;
  labelColor?: string;
}

export const TimerSection = ({
  id,
  title = "הזמן אוזל!",
  subtitle = "מהרו להירשם לפני סיום ההרשמה",
  targetDate,
  layout = "classic",
  isEditing = false,
  onUpdate,
  backgroundColor,
  titleColor,
  subtitleColor,
  boxBackgroundColor,
  numberColor,
  labelColor
}: TimerSectionProps) => {
  const effectiveTargetDate = useMemo(() => targetDate || new Date(Date.now() + 86400000).toISOString(), [targetDate]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const calculateTimeLeft = () => {
      const difference = new Date(effectiveTargetDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [effectiveTargetDate]);

  const handleFieldChange = (field: string, value: string) => {
    onUpdate?.(field, value);
  };

  return (
    <section id={id} className="py-12 relative z-20" dir="rtl" style={{ backgroundColor: backgroundColor && backgroundColor !== "transparent" ? backgroundColor : undefined }}>
      <div className="max-w-5xl mx-auto px-6">
        {isEditing && (
          <div className="mb-8 p-6 bg-slate-50 border border-dashed rounded-3xl text-right max-w-3xl mx-auto space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              הגדרות טיימר
            </h4>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">תאריך ושעת יעד</label>
              <input 
                type="datetime-local" 
                value={mounted && effectiveTargetDate ? new Date(new Date(effectiveTargetDate).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""}
                onChange={(e) => handleFieldChange("targetDate", new Date(e.target.value).toISOString())}
                className="p-2 border rounded-xl text-sm w-full bg-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">מבנה (Layout)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "classic", label: "קלאסי" },
                  { id: "modern", label: "מודרני" },
                  { id: "compact", label: "קומפקטי" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleFieldChange("layout", opt.id)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                      layout === opt.id
                        ? "bg-primary border-primary text-white shadow-lg"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="block text-xs font-bold text-slate-700">צבעי האזור</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">רקע כללי</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={backgroundColor && backgroundColor !== "transparent" ? backgroundColor : "#ffffff"} onChange={(e) => handleFieldChange("backgroundColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("backgroundColor", "transparent")}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">צבע כותרת</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={titleColor || "#000000"} onChange={(e) => handleFieldChange("titleColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("titleColor", "")}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">צבע כותרת משנה</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={subtitleColor || "#000000"} onChange={(e) => handleFieldChange("subtitleColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("subtitleColor", "")}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">רקע לריבועי הזמן</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={boxBackgroundColor || "#ffffff"} onChange={(e) => handleFieldChange("boxBackgroundColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("boxBackgroundColor", "")}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">צבע המספרים</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={numberColor || "#000000"} onChange={(e) => handleFieldChange("numberColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("numberColor", "")}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">צבע התוויות</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={labelColor || "#000000"} onChange={(e) => handleFieldChange("labelColor", e.target.value)} />
                    <button className="text-[10px] text-slate-400 hover:text-red-500" onClick={() => handleFieldChange("labelColor", "")}>נקה</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={cn(
            "mx-auto flex flex-col items-center justify-center space-y-6",
            layout === "classic" ? "max-w-3xl text-center bg-slate-50 p-8 rounded-3xl border shadow-sm" : "",
            layout === "modern" ? "max-w-4xl text-center bg-gradient-to-r from-primary to-secondary p-10 rounded-[3rem] text-white shadow-xl" : "",
            layout === "compact" ? "max-w-2xl text-center" : ""
          )}
        >
          <div className="w-full space-y-4">
            {isEditing ? (
              <>
                <div className="relative w-full max-w-xl mx-auto">
                  <input
                    value={title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className={cn(
                      "w-full text-center text-3xl font-black outline-none rounded-xl p-3 border",
                      layout === "modern" ? "bg-white/10 text-white placeholder:text-white/50 border-white/20" : "bg-white text-primary border-slate-200 focus:border-primary"
                    )}
                    placeholder="כותרת טיימר"
                  />
                </div>
                <div className="relative w-full max-w-lg mx-auto">
                  <input
                    value={subtitle}
                    onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                    className={cn(
                      "w-full text-center text-lg outline-none rounded-xl p-3 border",
                      layout === "modern" ? "bg-white/10 text-white/90 placeholder:text-white/50 border-white/20" : "bg-white text-slate-600 border-slate-200 focus:border-primary"
                    )}
                    placeholder="כותרת משנה"
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className={cn(
                  "text-3xl md:text-4xl font-black leading-tight",
                  !titleColor && (layout === "modern" ? "text-white" : "text-primary")
                )} style={{ color: titleColor || undefined }}>
                  {title}
                </h2>
                {subtitle && (
                  <p className={cn(
                    "text-lg",
                    !subtitleColor && (layout === "modern" ? "text-white/90" : "text-slate-600")
                  )} style={{ color: subtitleColor || undefined }}>
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          {mounted && (
            <div className="flex gap-4 items-center justify-center flex-row" dir="ltr">
              {[
                { label: "ימים", value: timeLeft.days },
                { label: "שעות", value: timeLeft.hours },
                { label: "דקות", value: timeLeft.minutes },
                { label: "שניות", value: timeLeft.seconds }
              ].map((unit, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl w-20 h-20 sm:w-24 sm:h-24 shadow-sm border",
                    !boxBackgroundColor && (layout === "modern" ? "bg-white/20 border-white/30 backdrop-blur-sm text-white" : "bg-white border-slate-100 text-slate-800")
                  )}
                  style={{ backgroundColor: boxBackgroundColor || undefined }}
                >
                  <span className="text-2xl sm:text-4xl font-black tabular-nums" style={{ color: numberColor || undefined }}>
                    {unit.value.toString().padStart(2, "0")}
                  </span>
                  <span className={cn(
                    "text-xs font-bold mt-1",
                    !labelColor && (layout === "modern" ? "text-white/80" : "text-slate-500")
                  )} style={{ color: labelColor || undefined }}>
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </div>
    </section>
  );
};
