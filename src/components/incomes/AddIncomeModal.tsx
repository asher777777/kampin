"use client";

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { KesherManualReceiptsForm } from "@/features/kesher/KesherManualReceiptsForm";

interface AddIncomeModalProps {
  onClose: () => void;
}

export function AddIncomeModal({ onClose }: AddIncomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="bg-black w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden relative border border-amber-500/50"
      >
        {/* Header */}
        <div className="p-6 text-center relative z-10 border-b border-amber-500/20 bg-black flex justify-between items-center">
          <div className="w-10"></div> {/* Spacer for centering */}
          <h2 className="text-xl font-black text-amber-500 tracking-wider">הוספת הכנסה חדשה</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black">
          <KesherManualReceiptsForm />
        </div>
      </motion.div>
    </div>
  );
}
