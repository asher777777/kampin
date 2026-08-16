"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, Sparkles, Home, MessageSquare, 
  FileText, Mail, Network, Menu, X, Calendar, LayoutGrid, Receipt,
  Wand2
} from "lucide-react";

export function NavigationMenuPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navGroups = [
    {
      title: "ראשי",
      links: [
        { name: "לוח בקרה", href: "/dashboard", icon: LayoutDashboard },
        { name: "תצוגת פסיפס", href: "/dashboard/mosaic", icon: LayoutGrid },
        { name: "יומן מסונכרן", href: "/dashboard/calendar", icon: Calendar },
        { name: "ניהול CRM", href: "/dashboard/crm", icon: Users },
        { name: "הוצאות", href: "/dashboard/expenses", icon: Receipt },
        { name: "קבלות ידניות", href: "/dashboard/receipts", icon: FileText },
        { name: "יצירת תוכן", href: "/dashboard/services", icon: Sparkles },
        { name: "מחולל פרויקטים", href: "/dashboard/generator", icon: Wand2 },
      ]
    },
    {
      title: "שיווק",
      links: [
        { name: "וואטסאפ", href: "/dashboard/whatsapp", icon: MessageSquare },
        { name: "מייל", href: "/dashboard/emails", icon: Mail },
        { name: "אוטומציות", href: "/dashboard/automations", icon: Network },
      ]
    }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-6 md:bottom-6 md:left-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center"
        title="תפריט ניווט"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Popup Menu (Bottom Sheet on Mobile, Popover on Desktop) */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/40 z-[9999] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 md:fixed md:bottom-24 md:left-6 md:right-auto md:inset-x-auto md:w-64 z-[99999] bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl border-t border-slate-100 md:border border-slate-200/60 overflow-hidden flex flex-col max-h-[85vh] md:max-h-[70vh]"
              dir="rtl"
            >
              {/* Top notch indicator for mobile swipe hint */}
              <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
              
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Menu className="w-5 h-5 text-slate-500" />
                  <h3 className="font-black text-slate-800 text-base">ניווט במערכת</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="md:hidden p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-4 space-y-5">
                {navGroups.map((group, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-[10px] font-black text-indigo-600/80 tracking-wider uppercase px-2">
                      {group.title}
                    </h4>
                    <div className="space-y-1">
                      {group.links.map(link => {
                        const isActive = pathname === link.href;
                        return (
                          <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200",
                              isActive
                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                : "text-slate-600 hover:bg-slate-50 active:scale-98"
                            )}
                          >
                            <link.icon className={cn("w-4.5 h-4.5", isActive ? "text-indigo-600" : "text-slate-400")} />
                            <span>{link.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold shadow-sm hover:bg-slate-100 transition-all duration-200"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  חזרה לאתר הראשי
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
