"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Database, 
  LogOut, 
  Settings, 
  FileText, 
  BarChart3, 
  Layers,
  Menu,
  X,
  Shield,
  ChevronLeft,
  UserPlus
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ContactModal } from "@/app/dashboard/crm/ContactModal";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}

export function AdminLayoutClient({ children, signOutAction }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    {
      name: "לוח בקרה ראשי",
      href: "/admin",
      icon: LayoutDashboard,
      activeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20",
      exact: true,
    },
    {
      name: "עמוד האנליטיקה",
      href: "/dashboard/crm/analytics",
      icon: BarChart3,
      activeColor: "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10",
      exact: false,
    },
    {
      name: "עמוד הקבוצות",
      href: "/dashboard/crm/groups",
      icon: Layers,
      activeColor: "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10",
      exact: false,
    },
    {
      name: "תוכן וטפסים (אתר)",
      href: "/admin/content",
      icon: FileText,
      activeColor: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      exact: false,
    },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 overflow-hidden" dir="rtl">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-40 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden cursor-pointer"
            aria-label="פתח תפריט"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/admin" className="flex items-center gap-2">
            <Database className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-base text-amber-500">ניהול מערכת</span>
          </Link>
        </div>

        {/* Top Right Header Actions (Add Contact + Settings icon) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer"
            title="הוסף איש קשר חדש"
          >
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <Link
            href="/admin/settings"
            className={`p-2 rounded-xl border transition-all ${
              pathname === "/admin/settings"
                ? "bg-amber-500/10 border-amber-500 text-amber-500"
                : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500/40"
            }`}
            title="הגדרות מערכת"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex-col gap-6 shrink-0 transition-colors duration-200 shadow-sm z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-amber-500">ניהול מערכת</h1>
          </div>

          {/* Top Settings Icon in Header of Desktop Sidebar */}
          <Link
            href="/admin/settings"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              pathname === "/admin/settings"
                ? "bg-amber-500/15 border-amber-500 text-amber-500 shadow-xs"
                : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500/50"
            }`}
            title="הגדרות מערכת גלובליות"
          >
            <Settings className="w-4.5 h-4.5" />
          </Link>
        </div>

        {/* Action Button: Add New Contact */}
        <button
          onClick={() => setIsContactModalOpen(true)}
          className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all cursor-pointer text-sm"
        >
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-white stroke-[2.5]" />
            <span>הוסף איש קשר חדש</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg font-black">+</span>
        </button>
        
        {/* Clean, Filtered Nav Items */}
        <nav className="flex flex-col gap-2 flex-1 mt-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all ${
                  active 
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-amber-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? "text-amber-500" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400"}`} />
                  <span>{link.name}</span>
                </div>
                {active && <ChevronLeft className="w-4 h-4 text-amber-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Bar: Theme + Logout */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <ThemeToggle />
          <form action={signOutAction}>
            <button 
              type="submit" 
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 w-full transition-colors cursor-pointer text-sm font-medium"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>התנתק</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed top-0 bottom-0 right-0 w-4/5 max-w-xs bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Database className="w-7 h-7 text-amber-500" />
                  <h2 className="font-bold text-lg text-amber-500">ניהול מערכת</h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Add Contact Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsContactModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5" />
                  <span>הוסף איש קשר חדש</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg">+</span>
              </button>

              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href, link.exact);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm transition-all ${
                        active 
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-amber-500" />
                        <span>{link.name}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 opacity-50" />
                    </Link>
                  );
                })}

                <Link
                  href="/admin/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-500" />
                    <span>הגדרות מערכת</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-50" />
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <ThemeToggle />
              <form action={signOutAction}>
                <button 
                  type="submit" 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 w-full transition-colors font-medium text-sm"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>התנתק מהמערכת</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/70 dark:bg-slate-950 transition-colors duration-200">
        {/* Desktop Top Header Bar with Settings button on start/right */}
        <div className="hidden md:flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all shadow-xs text-xs font-semibold group cursor-pointer"
              title="הגדרות מערכת גלובליות"
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              <span>הגדרות מערכת</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>מחובר כמנהל מערכת</span>
            </div>
          </div>
        </div>

        {children}
      </main>

      {/* Embedded Contact Modal for sidebar trigger */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          contact={null}
          onSuccess={() => {
            setIsContactModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
