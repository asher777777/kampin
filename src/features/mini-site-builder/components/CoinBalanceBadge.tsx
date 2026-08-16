"use client";

import React, { useState, useEffect } from "react";
import { Coins, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CoinBalanceBadgeProps {
  coins: number;
  highlight?: boolean;
}

export function CoinBalanceBadge({ coins, highlight }: CoinBalanceBadgeProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (highlight) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlight, coins]);

  return (
    <motion.div 
      animate={animate ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-500/30 rounded-2xl shadow-lg backdrop-blur-md text-amber-300 select-none"
      dir="rtl"
    >
      <div className="relative flex items-center justify-center">
        <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
        <AnimatePresence>
          {animate && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -25, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute font-black text-amber-300 text-xs shadow-sm whitespace-nowrap"
            >
              +100 🪙
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1.5 font-black text-sm sm:text-base">
        <span>יתרת מטבעות:</span>
        <span className="text-amber-400 text-lg font-black drop-shadow">{coins}</span>
      </div>
      <Sparkles className="w-4 h-4 text-amber-400/70" />
    </motion.div>
  );
}
