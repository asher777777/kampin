"use client";

import { Expense } from "@/features/expenses/types";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Trash2, Receipt } from "lucide-react";
import { useState } from "react";
import { deleteExpense } from "@/features/expenses/actions";

interface ExpensesListProps {
  initialExpenses: Expense[];
}

export function ExpensesList({ initialExpenses }: ExpensesListProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק הוצאה זו?")) return;
    
    setIsDeleting(id);
    const res = await deleteExpense(id);
    if (res.success) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else {
      alert("שגיאה במחיקת ההוצאה: " + res.error);
    }
    setIsDeleting(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center">
        <Receipt className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-lg font-bold text-slate-700">אין הוצאות במערכת</h3>
        <p className="text-sm text-slate-500">הוסף את ההוצאה הראשונה שלך למעלה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">סוג הוצאה</th>
              <th className="px-4 py-3">סכום</th>
              <th className="px-4 py-3">צורת תשלום</th>
              <th className="px-4 py-3">תאריך קניה</th>
              <th className="px-4 py-3">תאריך תשלום</th>
              <th className="px-4 py-3">קבלה</th>
              <th className="px-4 py-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{expense.expenseType}</td>
                <td className="px-4 py-3 text-secondary font-bold">₪{expense.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-600">{expense.paymentMethod}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(expense.purchaseDate).toLocaleDateString('he-IL')}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(expense.paymentDate).toLocaleDateString('he-IL')}</td>
                <td className="px-4 py-3">
                  {expense.receiptUrl ? (
                    <a 
                      href={expense.receiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-secondary hover:underline font-medium text-xs bg-primary/5 px-2 py-1 rounded-lg"
                    >
                      <ExternalLink className="w-3 h-3" />
                      צפה בקבלה
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs">אין קבלה</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(expense.id)}
                    disabled={isDeleting === expense.id}
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
