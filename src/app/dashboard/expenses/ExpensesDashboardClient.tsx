"use client";

import { useState } from "react";
import { Plus, List, BarChart3, ArrowRight, Receipt, Activity } from "lucide-react";
import { RhombusMenu } from "@/components/layout/RhombusMenu";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { ExpensesHistoryModal } from "@/components/expenses/ExpensesHistoryModal";

interface ExpensesDashboardClientProps {
  expenses: any[];
  expenseTypes: string[];
  paymentMethods: string[];
  createExpenseAction: (data: any) => Promise<any>;
  createExpenseOptionAction: (type: "expenseType" | "paymentMethod", value: string) => Promise<any>;
}

export function ExpensesDashboardClient({ 
  expenses, 
  expenseTypes, 
  paymentMethods,
  createExpenseAction,
  createExpenseOptionAction
}: ExpensesDashboardClientProps) {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const addExpenseIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <Receipt className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Plus className="absolute top-2 right-2 w-5 h-5 md:w-7 md:h-7 text-green-500/80 stroke-[2]" />
    </div>
  );

  const historyIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <List className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Activity className="absolute top-2 left-2 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
    </div>
  );

  const reportsIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <BarChart3 className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
    </div>
  );

  const backIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <ArrowRight className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
    </div>
  );

  const centerContent = (
    <>
      <span className="text-white font-black text-xl md:text-2xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center">ניהול<br/>הוצאות</span>
    </>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RhombusMenu
        topRight={{
          label: "הוספת הוצאה",
          icon: addExpenseIcon,
          onClick: () => setIsAddExpenseOpen(true)
        }}
        topLeft={{
          label: "היסטוריית הוצאות",
          icon: historyIcon,
          onClick: () => setIsHistoryOpen(true)
        }}
        bottomRight={{
          label: "דוחות",
          icon: reportsIcon,
          href: "/dashboard/analytics",
        }}
        bottomLeft={{
          label: "חזרה",
          icon: backIcon,
          href: "/gen-clo",
        }}
        center={{
          content: centerContent
        }}
      />

      <AddExpenseModal 
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        expenseTypes={expenseTypes}
        paymentMethods={paymentMethods}
        onSubmit={createExpenseAction}
        onAddOption={createExpenseOptionAction}
      />

      <ExpensesHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        expenses={expenses}
      />
    </div>
  );
}
