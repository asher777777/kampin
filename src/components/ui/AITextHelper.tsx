"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Check, RefreshCw, MessageSquare, X } from "lucide-react";
import { rephraseTextWithAI } from "@/features/ai/actions";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface AITextHelperProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  context?: string;
  isRichText?: boolean;
}

export function AITextHelper({ value, onChange, className = "", context, isRichText = false }: AITextHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState<"warm" | "elegant" | "punchy" | "storytelling">("warm");
  const [customInstruction, setCustomInstruction] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSuggestion(value || "");
    setIsOpen(true);
  };

  const handleImprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    
    const finalInstruction = context ? `${customInstruction}\n\nקונטקסט האתר (למידע כללי): ${context}`.trim() : customInstruction;
    
    try {
      const res = await rephraseTextWithAI(value || suggestion, tone, finalInstruction, true, isRichText);
      if (res.success && res.text) {
        setSuggestion(res.text);
      } else {
        alert(res.error || "שגיאה בשיפור הטקסט");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה בתקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(suggestion);
    setIsOpen(false);
  };

  const tones = [
    { id: "warm", label: "חם ומקרב" },
    { id: "elegant", label: "רשמי ומכובד" },
    { id: "punchy", label: "קצר וקולע" },
    { id: "storytelling", label: "רוחני ומרגש" },
  ];

  return (
    <div className={`absolute z-[90] ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={!loading ? handleOpen : undefined}
        onKeyDown={(e) => {
          if (!loading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleOpen(e as any);
          }
        }}
        className={cn(
          "p-1.5 rounded-lg shadow-md transition-all flex items-center justify-center",
          loading 
            ? "bg-slate-200/50 text-slate-400 cursor-not-allowed" 
            : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white cursor-pointer"
        )}
        title="שפר או שנה סגנון כתיבה עם AI"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
          <span className="text-[10px] font-bold">AI</span>
        </span>
      </div>

      {isOpen && (
        <Modal isOpen={true} onClose={() => setIsOpen(false)}>
          <Modal.Content className="max-w-md p-0 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <Modal.Close className="text-slate-500 hover:text-white z-50 absolute top-4 left-4" />
            <div className="p-6 text-right" dir="rtl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-base font-bold flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-5 h-5" /> עוזר כתיבה AI
                </h3>
              </div>

              {/* Tone Selector */}
              <div className="space-y-2 mb-4">
                <label className="block text-xs font-bold text-slate-400">סגנון כתיבה:</label>
                <div className="grid grid-cols-2 gap-2">
                  {tones.map((t) => {
                    const active = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTone(t.id as any); }}
                        className={cn(
                          "p-2 rounded-lg border text-right transition-all flex items-center gap-2 cursor-pointer text-sm",
                          active
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-950 hover:text-slate-200"
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full shrink-0", active ? "bg-indigo-400" : "bg-slate-600")} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom instruction input */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="הנחיות נוספות (למשל: תפנה בלשון רבים)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Draft / Result preview */}
              <div className="space-y-2 mb-6">
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="הטקסט יופיע כאן..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm leading-relaxed text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={loading || (!value?.trim() && !suggestion.trim())}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  {loading ? "מייצר..." : "ייצר AI"}
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={loading || !suggestion.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  החל
                </button>
              </div>
            </div>
          </Modal.Content>
        </Modal>
      )}
    </div>
  );
}
