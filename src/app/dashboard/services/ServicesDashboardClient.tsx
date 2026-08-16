"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, LayoutGrid, Edit3, Home, User, Megaphone, TrendingUp, Menu, Plus } from "lucide-react";
import { ServiceListClient } from "./ServiceListClient";
import { ServiceForm } from "./ServiceForm";
import { RhombusMenu } from "@/components/layout/RhombusMenu";

interface ServicesDashboardClientProps {
  initialServices: any[];
}

export function ServicesDashboardClient({ initialServices }: ServicesDashboardClientProps) {
  const [showList, setShowList] = useState(false);

  const openCreateModal = () => {
    const event = new CustomEvent("open-ai-modal", { detail: "create-service" });
    window.dispatchEvent(event);
  };

  if (showList) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto px-4 py-6 h-full overflow-y-auto pb-32" dir="rtl">
        <div className="hidden"><ServiceForm /></div>
        <ServiceListClient initialServices={initialServices} />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="hidden"><ServiceForm /></div>

      <RhombusMenu
        topRight={{
          label: "יצירת תוכן חדש",
          icon: <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-amber-500 mb-3 group-hover:scale-110 transition-transform duration-300 stroke-[1.5]" />,
          onClick: openCreateModal,
        }}
        topLeft={{
          label: "עריכת האתר",
          icon: <Edit3 className="w-8 h-8 md:w-12 md:h-12 text-amber-500 mb-3 group-hover:scale-110 transition-transform duration-300 stroke-[1.5]" />,
          href: "/dashboard/mosaic",
        }}
        bottomRight={{
          label: "התוכן שלי",
          icon: <LayoutGrid className="w-8 h-8 md:w-12 md:h-12 text-amber-500 mb-3 group-hover:scale-110 transition-transform duration-300 stroke-[1.5]" />,
          onClick: () => setShowList(true),
        }}
        bottomLeft={{
          label: "חזרה לראשי",
          icon: <Home className="w-8 h-8 md:w-12 md:h-12 text-amber-500 mb-3 group-hover:scale-110 transition-transform duration-300 stroke-[1.5]" />,
          href: "/gen-dashboard",
        }}
        center={{
          content: (
            <>
              <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2">
                <User className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-14 md:h-14 text-white stroke-[1.5] drop-shadow-md" />
                <Megaphone className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 text-amber-100 stroke-[1.5]" />
                <TrendingUp className="absolute top-4 left-0 w-5 h-5 md:w-6 md:h-6 text-amber-200 stroke-[1.5]" />
              </div>
              <span className="text-white font-black text-xl md:text-2xl tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">שיווק</span>
            </>
          )
        }}
      />
    </div>
  );
}
