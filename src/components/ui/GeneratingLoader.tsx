"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";

interface GeneratingLoaderProps {
  isOpen: boolean;
  title?: string;
}

const STEPS = [
  { id: 1, text: "יוצר קשר מאובטח עם ה-AI..." },
  { id: 2, text: "מנתח את הדרישות ומגבש מבנה עמוד..." },
  { id: 3, text: "מנסח כותרות וטקסטים שיווקיים בעברית עשירה..." },
  { id: 4, text: "מעצב את האזורים ומחולל תמונת Hero ייעודית..." },
  { id: 5, text: "שומר לבסיס הנתונים ומכין את התצוגה המקדימה..." },
];

export function GeneratingLoader({ isOpen, title = "מייצר עמוד חדש ב-AI" }: GeneratingLoaderProps) {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      return;
    }

    // Progress through steps gradually to keep the user informed and engaged
    const timers = [
      setTimeout(() => setCurrentStep(2), 2000),   // Step 2 after 2s
      setTimeout(() => setCurrentStep(3), 5000),   // Step 3 after 5s
      setTimeout(() => setCurrentStep(4), 8500),   // Step 4 after 8.5s
      setTimeout(() => setCurrentStep(5), 12500),  // Step 5 after 12.5s
    ];

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 dark:border-slate-800 text-right flex flex-col gap-6" dir="rtl">
        {/* Header with glowing icon and flute animation */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse"></div>
            <div className="relative z-10 flex gap-2 items-center">
              <Sparkles className="w-6 h-6 animate-wiggle" />
              <span className="text-3xl animate-bounce" style={{ animationDuration: '2s' }}>🪈</span>
            </div>
            <Loader2 className="absolute inset-0 w-16 h-16 text-indigo-600/30 dark:text-indigo-400/30 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">זה לוקח כ-15-20 שניות. אנא המתן בזמן שהחליל שלנו מנגן את הקסם...</p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3.5 my-2">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            
            return (
              <div 
                key={step.id} 
                className={`flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? "bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 translate-x-1" 
                    : "border border-transparent"
                }`}
              >
                {/* Step indicator status icon */}
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 shrink-0 ${
                  isCompleted 
                    ? "bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.2)]" 
                    : isActive 
                    ? "bg-indigo-600 text-white animate-pulse shadow-[0_2px_10px_rgba(79,70,229,0.2)]" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                }`}>
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step text */}
                <span className={`text-sm font-medium transition-all duration-300 ${
                  isCompleted 
                    ? "text-slate-400 dark:text-slate-500 line-through" 
                    : isActive 
                    ? "text-indigo-600 dark:text-indigo-400 font-bold" 
                    : "text-slate-600 dark:text-slate-400"
                }`}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom progress bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 transition-all duration-1000 ease-out" 
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
