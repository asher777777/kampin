import { getExpenses, getExpenseOptions, createExpense, createExpenseOption } from "@/features/expenses/actions";
import { ExpensesDashboardClient } from "./ExpensesDashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ניהול הוצאות | Kesher",
  description: "מערכת ניהול וקליטת הוצאות בלוח הבקרה",
};

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  const options = await getExpenseOptions();

  // Combine default options with user options (optional, here we just use whatever is in DB)
  const defaultTypes = ["רכישת ציוד", "שירותים חיצוניים", "שיווק ופרסום", "הוצאות משרד"];
  const defaultMethods = ["כרטיס אשראי", "העברה בנקאית", "מזומן", "צ'ק", "הוראת קבע"];

  const mergedTypes = Array.from(new Set([...defaultTypes, ...options.expenseTypes]));
  const mergedMethods = Array.from(new Set([...defaultMethods, ...options.paymentMethods]));

  return (
    <ExpensesDashboardClient 
      expenses={expenses}
      expenseTypes={mergedTypes}
      paymentMethods={mergedMethods}
      createExpenseAction={createExpense}
      createExpenseOptionAction={createExpenseOption}
    />
  );
}
