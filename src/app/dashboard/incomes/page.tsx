import { getIncomes } from "@/features/incomes/actions";
import { IncomesDashboardClient } from "./IncomesDashboardClient";

export const metadata = {
  title: "המחולל | הכנסות",
  description: "ניהול הכנסות וקבלות",
};

export default async function IncomesDashboardPage() {
  const incomes = await getIncomes();

  return (
    <div className="w-full">
      <IncomesDashboardClient 
        incomes={incomes}
      />
    </div>
  );
}
