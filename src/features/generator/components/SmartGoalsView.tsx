"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { SmartGoals } from "../types";

interface SmartGoalsViewProps {
  smartGoals: SmartGoals;
  onApprove: () => void;
  onBack: () => void;
}

export default function SmartGoalsView({ smartGoals, onApprove, onBack }: SmartGoalsViewProps) {
  const items = [
    {
      letter: "S",
      title: "Specific / ספציפי",
      text: smartGoals.s,
      color: "from-amber-500/20 to-amber-700/5",
      glow: "rgba(245,158,11,0.15)"
    },
    {
      letter: "M",
      title: "Measurable / מדיד",
      text: smartGoals.m,
      color: "from-yellow-500/20 to-yellow-700/5",
      glow: "rgba(234,179,8,0.15)"
    },
    {
      letter: "A",
      title: "Achievable / בר-השגה",
      text: smartGoals.a,
      color: "from-orange-500/20 to-orange-700/5",
      glow: "rgba(249,115,22,0.15)"
    },
    {
      letter: "R",
      title: "Relevant / רלוונטי",
      text: smartGoals.r,
      color: "from-amber-600/20 to-yellow-800/5",
      glow: "rgba(217,119,6,0.15)"
    },
    {
      letter: "T",
      title: "Time-bound / תחום בזמן",
      text: smartGoals.t,
      color: "from-yellow-600/20 to-amber-800/5",
      glow: "rgba(202,138,4,0.15)"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 100, 
        damping: 15 
      } 
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-right" dir="rtl">
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 rounded-full bg-[#f59e0b]/10 flex items-center justify-center border border-[#f59e0b]/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] mb-4">
          <Sparkles className="w-7 h-7 text-[#f59e0b]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">זיקוק הרעיון למודל SMART</h2>
        <p className="text-gray-400 text-sm text-center max-w-md">
          המחולל סידר את מחשבותיך וחילק אותן לחמישה ממדי הצלחה חדים ומדידים המוכנים לאישור שלך.
        </p>
      </div>

      {/* Staggered animated layout for 5 cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
      >
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            variants={cardVariants}
            whileHover={{ y: -5, boxShadow: `0 0 25px ${item.glow}` }}
            className={`relative flex flex-col justify-between bg-gradient-to-b ${item.color} border border-[#f59e0b]/30 hover:border-[#f59e0b] p-5 rounded-2xl min-h-[220px] transition-colors`}
          >
            <div>
              {/* Glowing header letter */}
              <div className="absolute top-2 left-3 text-5xl font-black opacity-10 select-none text-white">
                {item.letter}
              </div>
              
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-[#f59e0b]/30 flex items-center justify-center mb-3">
                <span className="text-[#f59e0b] font-bold text-base font-mono">{item.letter}</span>
              </div>
              
              <h3 className="text-white font-bold text-sm mb-2">{item.title}</h3>
            </div>
            
            {/* Typing text effect simulation */}
            <p className="text-gray-300 text-xs leading-relaxed mt-2 text-justify">
              {item.text}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border border-[#f59e0b]/30 hover:border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b]/10 py-3 px-8 rounded-xl font-semibold transition-all active:scale-95"
        >
          <ArrowRight className="w-5 h-5" />
          <span>ערוך רעיון</span>
        </button>

        <button
          type="button"
          onClick={onApprove}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#f59e0b] text-black hover:bg-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.2)] py-3 px-8 rounded-xl font-semibold transition-all active:scale-95"
        >
          <Check className="w-5 h-5" />
          <span>אשר יעדים והמשך לתיקוף היתכנות</span>
        </button>
      </div>
    </div>
  );
}
