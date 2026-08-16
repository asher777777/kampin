"use client";

import { Income } from "@/features/incomes/types";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Trash2, Banknote } from "lucide-react";
import { useState } from "react";
import { deleteIncome } from "@/features/incomes/actions";

interface IncomesListProps {
  initialIncomes: Income[];
}

export function IncomesList({ initialIncomes }: IncomesListProps) {
  const [incomes, setIncomes] = useState(initialIncomes);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק הכנסה זו?")) return;
    
    setIsDeleting(id);
    const res = await deleteIncome(id);
    if (res.success) {
      setIncomes(prev => prev.filter(e => e.id !== id));
    } else {
      alert("שגיאה במחיקת ההכנסה: " + res.error);
    }
    setIsDeleting(null);
  };

  if (incomes.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center">
        <Banknote className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-lg font-bold text-slate-700">אין הכנסות במערכת</h3>
        <p className="text-sm text-slate-500">הוסף את ההכנסה הראשונה שלך למעלה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">שם לקוח</th>
              <th className="px-4 py-3">סכום</th>
              <th className="px-4 py-3">צורת תשלום</th>
              <th className="px-4 py-3">תאריך</th>
              <th className="px-4 py-3">קישור לקבלה (קשר)</th>
              <th className="px-4 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incomes.map((income) => (
              <tr key={income.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{income.clientName}</td>
                <td className="px-4 py-3 text-emerald-600 font-bold">₪{income.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-600">{income.paymentType}</td>
                <td className="px-4 py-3 text-slate-600">{income.date}</td>
                <td className="px-4 py-3">
                  {income.kesherUrl?.startsWith('http') ? (
                    <a 
                      href={income.kesherUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-emerald-500 hover:underline font-medium text-xs bg-primary/5 px-2 py-1 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      צפה בקבלה
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs font-medium bg-slate-100 px-2 py-1 rounded-lg">
                      {income.kesherUrl || "אין קבלה"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(income.id)}
                    disabled={isDeleting === income.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
