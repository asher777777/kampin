"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Bot, User, Settings as SettingsIcon } from "lucide-react";
import { SettingsTabs } from "@/app/dashboard/settings/SettingsTabs";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

interface CenterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "onboarding" | "settings";

export function CenterSettingsModal({ isOpen, onClose }: CenterSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[100] bg-black text-white overflow-hidden flex flex-col"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-amber-500/20 bg-black shrink-0">
            <h2 className="text-xl font-black text-amber-500 tracking-wider">הגדרות המחולל</h2>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 space-y-4">
            
            {/* Onboarding Tab */}
            <div 
              className={`flex flex-col border border-white/10 bg-[#181818] rounded-2xl overflow-hidden shadow-sm transition-all duration-500 ${activeTab === 'onboarding' ? 'flex-1' : ''}`}
            >
              <button
                onClick={() => setActiveTab(activeTab === "onboarding" ? null : "onboarding")}
                className="w-full p-6 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xl cursor-pointer transition-colors sticky top-0 z-10"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-amber-400">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span>שאלון מיתוג (Onboarding)</span>
                </div>
                {activeTab === "onboarding" ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400 group-hover:text-white" />}
              </button>

              <AnimatePresence>
                {activeTab === "onboarding" && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-1 overflow-y-auto bg-[#111] border-t border-white/5"
                  >
                    <div className="p-6 md:p-10 flex items-center justify-center min-h-full">
                      <div className="w-full max-w-4xl mx-auto">
                        <OnboardingWizard />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings Tab */}
            <div 
              className={`flex flex-col border border-white/10 bg-[#181818] rounded-2xl overflow-hidden shadow-sm transition-all duration-500 ${activeTab === 'settings' ? 'flex-1' : ''}`}
            >
              <button
                onClick={() => setActiveTab(activeTab === "settings" ? null : "settings")}
                className="w-full p-6 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xl cursor-pointer transition-colors sticky top-0 z-10"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-purple-400">
                    <SettingsIcon className="w-6 h-6" />
                  </div>
                  <span>הגדרות משתמש</span>
                </div>
                {activeTab === "settings" ? <ChevronUp className="h-6 w-6 text-gray-400" /> : <ChevronDown className="h-6 w-6 text-gray-400 group-hover:text-white" />}
              </button>

              <AnimatePresence>
                {activeTab === "settings" && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-1 overflow-y-auto bg-[#111] border-t border-white/5"
                  >
                    <div className="p-6 md:p-10 min-h-full">
                       {/* isGoogleConnected needs to be handled properly, passed down or retrieved via context/hook. 
                           For now we'll pass a default or false since this is a UI component and we can wire it up later */}
                      <SettingsTabs isGoogleConnected={false} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
