import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IncomesList } from "./IncomesList";
import { Income } from "@/features/incomes/types";

interface IncomesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomes: Income[];
}

export function IncomesHistoryModal({ isOpen, onClose, incomes }: IncomesHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200"
        >
          {/* Header */}
          <div className="bg-black p-6 border-b border-amber-500/20 shadow-sm relative z-10 flex items-center justify-between">
            <h2 className="text-xl font-black text-amber-500 tracking-wide">היסטוריית הכנסות</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <IncomesList initialIncomes={incomes} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
