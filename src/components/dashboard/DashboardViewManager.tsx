"use client";

import { useState } from "react";
import { AgentDashboardChat } from "@/components/layout/AgentDashboardChat";
import { Settings, Globe, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardViewManagerProps {
  classicDashboard: React.ReactNode;
}

export function DashboardViewManager({ classicDashboard }: DashboardViewManagerProps) {
  const [isAiMode, setIsAiMode] = useState(true);

  return (
    <div className="w-full relative min-h-screen">
      {/* Top Navigation Bar for AI Mode */}
      <AnimatePresence>
        {isAiMode && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-slate-200/60 p-4 rounded-3xl mb-6 shadow-sm"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-800 tracking-tight">מצב סוכן חכם</h2>
                <p className="text-xs text-slate-500">מרכז הבקרה שלך בתצורה שיחתית</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="hidden md:flex rounded-xl gap-2 h-10">
                  <Settings className="w-4 h-4" />
                  הגדרות
                </Button>
              </Link>
              <Link href="/" target="_blank">
                <Button variant="outline" size="sm" className="hidden md:flex rounded-xl gap-2 h-10">
                  <Globe className="w-4 h-4" />
                  לאתר הראשי
                </Button>
              </Link>
              <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />
              <Button 
                onClick={() => setIsAiMode(false)} 
                variant="outline"
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 rounded-xl gap-2 h-10 font-bold"
              >
                יציאה ללוח קלאסי
                <LayoutDashboard className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isAiMode ? (
            <motion.div
              key="ai-mode"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <AgentDashboardChat onExit={() => setIsAiMode(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="classic-mode"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {classicDashboard}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bubble (Only visible in Classic Mode) */}
      <AnimatePresence>
        {!isAiMode && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAiMode(true)}
            className="fixed bottom-6 left-6 z-[100] p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all flex items-center justify-center group"
            title="חזור למצב AI"
          >
            <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
