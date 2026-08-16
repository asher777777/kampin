"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Database, LogOut, Settings, FileText, Receipt, Wand2, Calendar, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface AdminSidebarTestProps {
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}

export function AdminSidebarTest({ onSignOut, children }: AdminSidebarTestProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Helper to map links to test routes if applicable
  const getTestLink = (href: string) => {
    if (href === "/admin") return "/admin-test";
    return href;
  };

  const navLinks = [
    { href: "/admin", label: "ראשי", icon: LayoutDashboard },
    { href: "/admin/users", label: "ניהול משתמשים", icon: Users },
    { href: "/admin/receipts", label: "הפקת קבלות", icon: Receipt },
    { href: "/admin/form-builder", label: "מחולל הטפסים (מיכאל)", icon: Wand2 },
    { href: "/admin/content", label: "תוכן וטפסים (אתר)", icon: FileText },
    { href: "/admin/settings", label: "הגדרות API גלובליות", icon: Settings },
    { href: "/admin/calendar", label: "יומן המחולל", icon: Calendar },
    { href: "/dashboard/generator", label: "מחולל פרויקטים", icon: Sparkles },
  ];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-amber-500" />
          <h1 className="text-xl font-bold text-amber-500">ניהול מערכת</h1>
        </div>
        <button 
          className="md:hidden p-1 text-slate-400 hover:text-white"
          onClick={() => setIsMobileOpen(false)}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex flex-col gap-2 flex-1 mt-6 overflow-y-auto no-scrollbar">
        {navLinks.map((link) => {
          const testHref = getTestLink(link.href);
          const isActive = pathname === testHref || (testHref !== "/admin-test" && pathname.startsWith(testHref));
          return (
            <Link
              key={link.href}
              href={testHref}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-amber-500/10 text-amber-500 font-semibold border-r-4 border-amber-500"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive && "text-amber-500")} />
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
        <div className="my-2 border-t border-slate-800"></div>
        <Link 
          href="/dashboard-test" 
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Database className="w-5 h-5" />
          <span className="text-sm">למערכת ה-CRM שלי</span>
        </Link>
      </nav>
      
      <div className="my-2">
        <ThemeToggle />
      </div>

      <form action={onSignOut} className="mt-auto pt-4 border-t border-slate-800">
        <button type="submit" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 w-full transition-colors font-semibold cursor-pointer">
          <LogOut className="w-5 h-5" />
          <span className="text-sm">התנתק</span>
        </button>
      </form>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-950 text-white overflow-hidden" dir="rtl">
      
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR (md:flex, hidden on mobile) */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-l border-slate-800 p-6 flex-col gap-6 shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* ======================================================== */}
      {/* MOBILE HEADER & DRAWER (md:hidden) */}
      {/* ======================================================== */}
      <div className="md:hidden flex flex-col w-full shrink-0">
        <header className="h-16 bg-[#0f172a] border-b border-slate-800/80 px-4 flex items-center justify-between z-40 relative">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-500" />
            <span className="text-base font-bold text-amber-500">ניהול מערכת</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="פתח תפריט"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Slide-out Menu Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="relative w-64 bg-slate-900 h-full p-6 flex flex-col gap-6 border-l border-slate-800/80 animate-in slide-in-from-right duration-300 z-50 shadow-2xl">
              {sidebarContent}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto no-scrollbar relative min-h-0">
        {children}
      </main>

    </div>
  );
}
