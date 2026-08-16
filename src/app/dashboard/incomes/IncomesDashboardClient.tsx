"use client";

import { useState } from "react";
import { Plus, List, ArrowRight, Banknote, CreditCard, Activity } from "lucide-react";
import { RhombusMenu } from "@/components/layout/RhombusMenu";
import { AddIncomeModal } from "@/components/incomes/AddIncomeModal";
import { IncomesHistoryModal } from "@/components/incomes/IncomesHistoryModal";
import { Income } from "@/features/incomes/types";

interface IncomesDashboardClientProps {
  incomes: Income[];
}

export function IncomesDashboardClient({ incomes }: IncomesDashboardClientProps) {
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const addIncomeIcon = (
    <div className="relative w-12 h-12 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300 mx-auto">
      <Banknote className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 text-amber-400 stroke-[1.5]" />
      <Plus className="absolute top-0 right-0 md:top-1 md:right-1 w-4 h-4 md:w-5 md:h-5 text-green-500/80 stroke-[2]" />
    </div>
  );

  const historyIcon = (
    <div className="relative w-12 h-12 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300 mx-auto">
      <List className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 text-amber-400 stroke-[1.5]" />
      <Activity className="absolute top-0 left-0 md:top-1 md:left-1 w-4 h-4 md:w-5 md:h-5 text-amber-500/80 stroke-[1.5]" />
    </div>
  );

  const paymentIcon = (
    <div className="relative w-12 h-12 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300 opacity-50 cursor-not-allowed mx-auto">
      <CreditCard className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 text-amber-400 stroke-[1.5]" />
    </div>
  );

  const backIcon = (
    <div className="relative w-12 h-12 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300 mx-auto">
      <ArrowRight className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 text-amber-400 stroke-[1.5]" />
    </div>
  );

  const centerContent = (
    <>
      <span className="text-white font-black text-xl md:text-2xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center">ניהול<br/>הכנסות</span>
    </>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RhombusMenu
        topRight={{
          label: "הוסף הכנסה",
          icon: addIncomeIcon,
          onClick: () => setIsAddIncomeOpen(true)
        }}
        topLeft={{
          label: "עמוד תשלום (בקרוב)",
          icon: paymentIcon,
          href: "#"
        }}
        bottomRight={{
          label: "היסטוריית הכנסות",
          icon: historyIcon,
          onClick: () => setIsHistoryOpen(true)
        }}
        bottomLeft={{
          label: "ראשי",
          icon: backIcon,
          href: "/gen-dashboard",
        }}
        center={{
          content: centerContent
        }}
      />

      {isAddIncomeOpen && (
        <AddIncomeModal 
          onClose={() => setIsAddIncomeOpen(false)}
        />
      )}

      <IncomesHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        incomes={incomes}
      />
    </div>
  );
}
