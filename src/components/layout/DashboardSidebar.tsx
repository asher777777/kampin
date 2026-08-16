"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Home, 
  MessageSquare, 
  FileText, 
  Mail, 
  Network,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  Zap,
  Calendar,
  LayoutGrid,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Receipt,
  Wand2
} from "lucide-react";
import { QuickActionsModal } from "./QuickActionsModal";
import { Button } from "@/components/ui/Button";

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const isMainDashboard = pathname === "/dashboard";
  
  // State for sidebar open/close
  const [isOpen, setIsOpen] = useState(isMainDashboard);
  // State for mobile view
  const [isMobile, setIsMobile] = useState(false);
  // State for submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    campaigns: false
  });
  // State for Quick Actions modal
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);


  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(pathname === "/dashboard");
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pathname]);

  // When pathname changes (except resize), auto-close if not main dashboard
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(pathname === "/dashboard");
    } else {
      setIsOpen(false);
    }
  }, [pathname, isMobile]);

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const navGroups = [
    {
      title: "ראשי",
      links: [
        { name: "לוח בקרה", href: "/dashboard", icon: LayoutDashboard },
        { name: "תצוגת פסיפס", href: "/dashboard/mosaic", icon: LayoutGrid },
        { name: "יומן המחולל", href: "/dashboard/calendar", icon: Calendar },
        { name: "ניהול CRM", href: "/dashboard/crm", icon: Users },
        { name: "הוצאות", href: "/dashboard/expenses", icon: Receipt },
        { name: "קבלות ידניות", href: "/dashboard/receipts", icon: FileText },
        { name: "יצירת תוכן", href: "/dashboard/services", icon: Sparkles },
        { name: "מחולל פרויקטים", href: "/dashboard/generator", icon: Wand2 },
      ]
    },
    {
      title: "שיווק",
      submenu: {
        key: "campaigns",
        name: "קמפיינים",
        icon: Mail,
        links: [
          { name: "וואטסאפ", href: "/dashboard/whatsapp", icon: MessageSquare },
          { name: "מייל", href: "/dashboard/emails", icon: Mail },
          { name: "אוטומציות", href: "/dashboard/automations", icon: Network },
        ]
      }
    }
  ];

  return (
    <>
      {/* Mobile Toggle Button - only visible if sidebar is closed on mobile */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 right-4 z-40 p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-700"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar Toggle Button (Desktop) - when sidebar is closed */}
      {!isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="sticky top-4 right-4 z-40 p-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/60 text-slate-700 hover:bg-slate-50 transition-colors mr-4 mt-4"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Overlay for all viewports when sidebar is open to close it easily */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0, x: 50 }}
            animate={{ width: 280, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed top-0 right-0 z-50 h-[100dvh] bg-white border-l border-slate-200 shadow-xl flex flex-col shrink-0 overflow-y-auto overflow-x-hidden",
              className
            )}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 min-w-[280px]">
              <div className="flex items-center gap-2 text-primary font-black text-xl">
                <LayoutDashboard className="w-6 h-6" />
                <span>לוח בקרה</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isMobile ? <X className="w-5 h-5" /> : <ChevronRightIcon />}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-slate-100 min-w-[280px]">
              <Button
                variant="primary"
                className="w-full justify-start gap-3 rounded-xl py-6 shadow-sm hover:shadow-md transition-all group"
                onClick={() => setIsQuickActionsOpen(true)}
              >
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                פעולות מהירות
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-4 flex flex-col gap-6 min-w-[280px]">
              {navGroups.map((group, idx) => (
                <div key={idx} className="px-4 flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-slate-400 mb-2 px-2">
                    {group.title}
                  </h4>
                  
                  {/* Render flat links */}
                  {group.links?.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        onClick={() => isMobile && setIsOpen(false)}
                      >
                        <link.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                        {link.name}
                      </Link>
                    );
                  })}

                  {/* Render submenu */}
                  {group.submenu && (
                    <div className="flex flex-col">
                      <button
                        onClick={() => toggleSubmenu(group.submenu.key)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 w-full"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <group.submenu.icon className="w-5 h-5 text-slate-400" />
                          {group.submenu.name}
                        </div>
                        <ChevronLeft 
                          className={cn(
                            "w-4 h-4 text-slate-400 transition-transform duration-200",
                            openSubmenus[group.submenu.key] ? "-rotate-90" : ""
                          )} 
                        />
                      </button>

                      <AnimatePresence>
                        {openSubmenus[group.submenu.key] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pr-11 pl-3 py-1 flex flex-col gap-1 border-r-2 border-slate-100 mr-5 mt-1">
                              {group.submenu.links.map(sublink => {
                                const isActive = pathname === sublink.href;
                                return (
                                  <Link
                                    key={sublink.name}
                                    href={sublink.href}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                      isActive
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    )}
                                    onClick={() => isMobile && setIsOpen(false)}
                                  >
                                    <sublink.icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                                    {sublink.name}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Links */}
            <div className="p-4 border-t border-slate-100 min-w-[280px]">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200"
              >
                <Home className="w-5 h-5 text-slate-400" />
                חזרה לאתר
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <QuickActionsModal 
        isOpen={isQuickActionsOpen} 
        onClose={() => setIsQuickActionsOpen(false)} 
      />
    </>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
