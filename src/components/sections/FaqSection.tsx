"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FaqItem } from "@/features/home/actions";
import { GlobalSettings } from "@/features/settings/actions";

interface FaqSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  items?: FaqItem[];
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  itemTextColor?: string;
  layout?: "classic" | "modern" | "grid";
  questionTextColor?: string;
  answerTextColor?: string;
  activeTabBgColor?: string;
  inactiveTabBgColor?: string;
  tabBorderColor?: string;
  effect?: "glassmorphism" | "glow" | "lift" | "gradient-border" | "minimal";
  globalSettings?: GlobalSettings;
  isEditing?: boolean;
}

export function FaqSection({
  id = "faq",
  title = "שאלות ותשובות נפוצות",
  subtitle = "תשובות לכל השאלות שרציתם לשאול על השירותים והפלטפורמה שלנו",
  items = [],
  backgroundColor,
  titleColor,
  subtitleColor,
  itemTextColor,
  layout = "classic",
  questionTextColor,
  answerTextColor,
  activeTabBgColor,
  inactiveTabBgColor,
  tabBorderColor,
  effect = "glassmorphism",
  globalSettings,
  isEditing = false
}: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggleItem = (itemId: string) => {
    setOpenId(prev => (prev === itemId ? null : itemId));
  };

  // Derive theme colors with fallback to globalSettings & Golden Flute defaults
  const primaryColor = globalSettings?.primaryColor || "#f59e0b"; // amber-500 default
  const resolvedBg = backgroundColor || globalSettings?.backgroundColor || "transparent";
  const resolvedTitleColor = titleColor || globalSettings?.textColorH2 || globalSettings?.textColor || "#ffffff";
  const resolvedSubtitleColor = subtitleColor || globalSettings?.textColor || "#94a3b8";
  const resolvedItemTextColor = itemTextColor || globalSettings?.textColor || "#ffffff";

  // Effect specific class generators
  const getEffectStyles = (isOpen: boolean) => {
    switch (effect) {
      case "glow":
        return cn(
          "transition-all duration-300 border",
          isOpen
            ? "shadow-xl shadow-amber-500/20 ring-1 ring-amber-500/40"
            : "hover:shadow-lg hover:shadow-amber-500/10"
        );
      case "lift":
        return cn(
          "transition-all duration-300 border transform hover:-translate-y-1 hover:shadow-xl",
          isOpen ? "-translate-y-0.5 shadow-2xl" : ""
        );
      case "gradient-border":
        return cn(
          "transition-all duration-300 border relative",
          isOpen ? "border-amber-400/80 shadow-lg shadow-amber-500/10" : "border-slate-800 hover:border-amber-500/40"
        );
      case "minimal":
        return "transition-all duration-200 border-b border-t-0 border-x-0 rounded-none bg-transparent";
      case "glassmorphism":
      default:
        return cn(
          "backdrop-blur-xl transition-all duration-300 border shadow-lg",
          isOpen ? "shadow-2xl shadow-amber-500/10" : "hover:bg-slate-900/60"
        );
    }
  };

  return (
    <section 
      id={id} 
      className="py-24 relative z-20 overflow-hidden" 
      style={{ backgroundColor: resolvedBg }}
      dir="rtl"
    >
      {/* Background Subtle Ambient Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-10 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border shadow-sm"
            style={{ 
              color: primaryColor, 
              borderColor: `${primaryColor}33`, 
              backgroundColor: `${primaryColor}12` 
            }}
          >
            <Sparkles className="w-4 h-4 animate-pulse" style={{ color: primaryColor }} />
            <span>שאלות ותשובות</span>
          </div>

          <h2 
            className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
            style={{ color: resolvedTitleColor }}
          >
            {title}
          </h2>

          {subtitle && (
            <p 
              className="text-base sm:text-lg max-w-2xl mx-auto opacity-80 leading-relaxed font-normal"
              style={{ color: resolvedSubtitleColor }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* FAQ Accordion List */}
        {(!items || items.length === 0) ? (
          <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-slate-700/60 bg-slate-900/40 text-slate-400 text-sm">
            אין שאלות להצגה באזור זה כעת.
          </div>
        ) : (
          <div className={cn(
            layout === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start" : "space-y-4"
          )}>
            {items.map((item) => {
              const isOpen = openId === item.id;
              if (item.isVisible === false) return null;

              // Compute Custom Tab Background and Border Colors
              const itemBg = isOpen 
                ? (activeTabBgColor || "rgba(15, 23, 42, 0.85)") 
                : (inactiveTabBgColor || "rgba(15, 23, 42, 0.4)");
              
              const itemBorder = tabBorderColor || (isOpen ? `${primaryColor}66` : "rgba(255, 255, 255, 0.08)");
              const questionColor = questionTextColor || (isOpen ? primaryColor : "#ffffff");
              const answerColor = answerTextColor || "#cbd5e1";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl transition-all duration-300 overflow-hidden text-start",
                    getEffectStyles(isOpen),
                    layout === "modern" && !isOpen && "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
                  )}
                  style={{
                    backgroundColor: itemBg,
                    borderColor: itemBorder
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full p-5 sm:p-7 flex items-center justify-between gap-4 text-start focus:outline-none group cursor-pointer"
                  >
                    <span 
                      className="text-base sm:text-lg font-bold transition-colors group-hover:text-amber-400 leading-snug flex-1"
                      style={isOpen ? { color: primaryColor } : { color: questionColor || resolvedItemTextColor }}
                    >
                      {item.question}
                    </span>

                    <span 
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 border border-white/10",
                        isOpen && "rotate-180"
                      )}
                      style={{ 
                        backgroundColor: isOpen ? `${primaryColor}25` : "rgba(255, 255, 255, 0.05)",
                        color: isOpen ? primaryColor : "#94a3b8" 
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <div 
                          className="px-5 sm:px-7 pb-6 sm:pb-7 text-sm sm:text-base leading-relaxed border-t border-white/5 pt-4 opacity-95"
                          style={{ color: answerColor }}
                        >
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
