import Link from "next/link";
import { 
  Home, 
  Receipt,
  TrendingDown,
  Banknote,
  TrendingUp,
  LineChart,
  PieChart,
  Calculator,
  User
} from "lucide-react";
import { RhombusMenu } from "@/components/layout/RhombusMenu";

export const metadata = {
  title: "המחולל | הנהלת חשבונות",
  description: "עמוד הבית להנהלת חשבונות",
};

export default function GenCloPage() {
  const expensesIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <Receipt className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <TrendingDown className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 text-red-500/80 stroke-[1.5]" />
    </div>
  );

  const incomesIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <Banknote className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <TrendingUp className="absolute top-2 left-2 w-5 h-5 md:w-6 md:h-6 text-green-500/80 stroke-[1.5]" />
    </div>
  );

  const analyticsIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <LineChart className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <PieChart className="absolute top-0 right-1 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
    </div>
  );

  const mainIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <Home className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
    </div>
  );

  const centerContent = (
    <>
      <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2">
        <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-white stroke-[1.5] drop-shadow-md" />
        <Calculator className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 text-amber-100 stroke-[1.5]" />
      </div>
      <span className="text-white font-black text-xl md:text-2xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center">הנהלת<br/>חשבונות</span>
    </>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RhombusMenu
        topRight={{
          label: "הוצאות",
          icon: expensesIcon,
          href: "/dashboard/expenses",
        }}
        topLeft={{
          label: "הכנסות",
          icon: incomesIcon,
          href: "/dashboard/incomes",
        }}
        bottomRight={{
          label: "אנליטיקה",
          icon: analyticsIcon,
          href: "/dashboard/analytics",
        }}
        bottomLeft={{
          label: "ראשי",
          icon: mainIcon,
          href: "/gen-dashboard",
        }}
        center={{
          content: centerContent
        }}
      />
    </div>
  );
}
