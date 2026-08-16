import Link from "next/link";
import { 
  User, 
  Plus,
  TrendingUp,
  Megaphone,
  Mic,
  MessageCircle,
  Wrench,
  Cog,
  Calculator,
  PieChart,
  Menu
} from "lucide-react";
import { RhombusMenu } from "@/components/layout/RhombusMenu";

export const metadata = {
  title: "המחולל | ראשי",
  description: "ממשק פסיפס מעוינים מתקדם",
};

export default function GenDashboardPage() {
  const marketingIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Megaphone className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 text-amber-500/80 stroke-[1.5]" />
      <TrendingUp className="absolute top-4 left-0 w-5 h-5 md:w-6 md:h-6 text-amber-200/80 stroke-[1.5]" />
    </div>
  );

  const communitiesIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Mic className="absolute top-1 right-2 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
      <MessageCircle className="absolute top-3 left-0 w-5 h-5 md:w-7 md:h-7 text-amber-200/80 stroke-[1.5]" />
    </div>
  );

  const projectsIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Cog className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 text-amber-500/80 stroke-[1.5]" />
      <Wrench className="absolute top-4 left-0 w-5 h-5 md:w-6 md:h-6 text-amber-200/80 stroke-[1.5]" />
    </div>
  );

  const accountingIcon = (
    <div className="relative w-16 h-16 md:w-20 md:h-20 group-hover:scale-110 transition-transform duration-300">
      <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-amber-400 stroke-[1.5]" />
      <Calculator className="absolute top-2 right-1 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 stroke-[1.5]" />
      <PieChart className="absolute top-0 left-1 w-5 h-5 md:w-6 md:h-6 text-amber-200/80 stroke-[1.5]" />
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <RhombusMenu
        topRight={{
          label: "שיווק",
          icon: marketingIcon,
          href: "/dashboard/services",
        }}
        topLeft={{
          label: "קהילות",
          icon: communitiesIcon,
          href: "/dashboard/crm",
        }}
        bottomRight={{
          label: "פרויקטים",
          icon: projectsIcon,
          href: "/dashboard/generator",
        }}
        bottomLeft={{
          label: "הנהלת חשבונות",
          icon: accountingIcon,
          href: "/gen-clo",
        }}
        center={{
          content: <span className="text-white font-black text-2xl md:text-4xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">המחולל</span>
        }}
      />
    </div>
  );
}
