import Link from "next/link";
import { 
  Banknote,
  Receipt,
  Megaphone,
  Briefcase,
  FileText,
  LineChart,
  PieChart,
  BarChart3
} from "lucide-react";
import { RhombusMenu } from "@/components/layout/RhombusMenu";

export const metadata = {
  title: "המחולל | אנליטיקה",
  description: "מרכז דוחות ואנליטיקה",
};

export default function AnalyticsPage() {
  const incomesIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <FileText className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Banknote className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 text-green-500/80 stroke-[1.5]" />
    </div>
  );

  const expensesIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <FileText className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Receipt className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 text-red-500/80 stroke-[1.5]" />
    </div>
  );

  const contentIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <FileText className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Megaphone className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
    </div>
  );

  const projectsIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <FileText className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Briefcase className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
    </div>
  );

  const centerContent = (
    <>
      <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2">
        <LineChart className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-white stroke-[1.5] drop-shadow-md" />
        <PieChart className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 text-amber-100 stroke-[1.5]" />
      </div>
      <span className="text-white font-black text-xl md:text-2xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-center">אנליטיקה<br/>ודוחות</span>
    </>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RhombusMenu
        topRight={{
          label: "דוחות הכנסות",
          icon: incomesIcon,
          href: "#",
        }}
        topLeft={{
          label: "דוחות הוצאות",
          icon: expensesIcon,
          href: "#",
        }}
        bottomRight={{
          label: "דוח תוכן",
          icon: contentIcon,
          href: "#",
        }}
        bottomLeft={{
          label: "דוח פרויקטים",
          icon: projectsIcon,
          href: "#",
        }}
        center={{
          content: centerContent
        }}
      />
    </div>
  );
}
