import { useState, useEffect } from "react";
import { X, User, Megaphone, TrendingUp, Mic, MessageCircle, Cog, Wrench, Calculator, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RhombusMenu } from "./RhombusMenu";

export function MosaicMenuModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenMenu = () => setIsOpen(true);
    window.addEventListener("open-dashboard-sidebar", handleOpenMenu);
    return () => window.removeEventListener("open-dashboard-sidebar", handleOpenMenu);
  }, []);

  if (!isOpen) return null;

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-slate-50/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
        dir="rtl"
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:scale-105 transition-all z-[110]"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="w-full h-full flex items-center justify-center">
          <RhombusMenu
            hideFixedButtons
            topRight={{
              label: "שיווק",
              icon: marketingIcon,
              href: "/dashboard/services",
              onClick: () => setIsOpen(false)
            }}
            topLeft={{
              label: "קהילות",
              icon: communitiesIcon,
              href: "/dashboard/crm",
              onClick: () => setIsOpen(false)
            }}
            bottomRight={{
              label: "פרויקטים",
              icon: projectsIcon,
              href: "/dashboard/generator",
              onClick: () => setIsOpen(false)
            }}
            bottomLeft={{
              label: "הנהלת חשבונות",
              icon: accountingIcon,
              href: "/gen-clo",
              onClick: () => setIsOpen(false)
            }}
            center={{
              content: <span className="text-white font-black text-2xl md:text-4xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">ראשי</span>
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
