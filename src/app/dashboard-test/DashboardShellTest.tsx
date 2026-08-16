"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, Globe, Zap, Mail, LayoutDashboard, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardQuickActions } from "../dashboard/DashboardQuickActions";
import { stopImpersonating } from "@/features/users/impersonate";

interface DashboardShellProps {
  children: React.ReactNode;
  geminiActive: boolean;
  kesherActive: boolean;
  dbActive: boolean;
  userLogoUrl?: string | null;
  miniSiteSlug?: string | null;
  isImpersonating?: boolean;
}

export function DashboardShellTest({
  children,
  userLogoUrl,
  miniSiteSlug,
  isImpersonating,
}: DashboardShellProps) {
  const pathname = usePathname();

  // Map links to dashboard-test for test pages, keep original for others
  const getTestLink = (href: string) => {
    if (href === "/dashboard") return "/dashboard-test";
    if (href === "/dashboard/crm") return "/dashboard-test/crm";
    return href;
  };

  const topNavLinks = [
    { href: "/dashboard/crm", label: "ניהול קהילה", icon: Users },
    { href: "/dashboard/receipts", label: "הפקת מסמך", icon: FileText },
    { href: "/dashboard/services", label: "יצירת תוכן", icon: Sparkles },
    { href: miniSiteSlug ? `/${miniSiteSlug}` : "/", label: "מעבר לאתר", icon: Globe, target: miniSiteSlug ? "_blank" : undefined },
  ];

  const bottomNavLinks = [
    { href: "/dashboard", label: "ראשי", icon: LayoutDashboard },
    { href: "/dashboard/automations", label: "אוטומציה", icon: Zap },
    { href: "/dashboard/campaigns", label: "קמפיינים", icon: Mail },
    { href: "/dashboard/settings", label: "הגדרות", icon: Settings },
  ];

  // Combined links for desktop sidebar
  const sidebarLinks = [
    { href: "/dashboard", label: "ראשי", icon: LayoutDashboard },
    { href: "/dashboard/crm", label: "ניהול קהילה", icon: Users },
    { href: "/dashboard/receipts", label: "הפקת מסמך", icon: FileText },
    { href: "/dashboard/services", label: "יצירת תוכן", icon: Sparkles },
    { href: "/dashboard/automations", label: "אוטומציה", icon: Zap },
    { href: "/dashboard/campaigns", label: "קמפיינים", icon: Mail },
    { href: "/dashboard/settings", label: "הגדרות", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white overflow-hidden" dir="rtl">
      
      {/* ======================================================== */}
      {/* DESKTOP LAYOUT (md:flex, hidden on mobile) */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-row w-full h-full overflow-hidden">
        {/* Right Sidebar (Start side in RTL) */}
        <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 shrink-0 h-full">
          <div className="flex items-center gap-3">
            {userLogoUrl ? (
              <img src={userLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <LayoutDashboard className="w-8 h-8 text-amber-500" />
            )}
            <span className="text-xl font-bold text-amber-500">לוח בקרה</span>
          </div>

          {isImpersonating && (
            <div className="bg-amber-500 text-black text-center text-xs py-1.5 font-bold rounded-xl flex flex-col items-center gap-1 shrink-0">
              <span>אתה מחובר כמשתמש</span>
              <button
                onClick={async () => {
                  await stopImpersonating();
                  window.location.href = "/admin-test/users";
                }}
                className="px-2 py-0.5 bg-black/10 hover:bg-black/20 rounded-md transition-colors text-black text-[10px] font-bold cursor-pointer"
              >
                חזור לאדמין
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-2 flex-1 mt-4 overflow-y-auto no-scrollbar">
            {sidebarLinks.map((link) => {
              const testHref = getTestLink(link.href);
              const isActive = pathname === testHref || (testHref !== "/dashboard-test" && pathname.startsWith(testHref));
              return (
                <Link
                  key={link.href}
                  href={testHref}
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
            
            {/* View Site link */}
            <Link
              href={miniSiteSlug ? `/${miniSiteSlug}` : "/"}
              target={miniSiteSlug ? "_blank" : undefined}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mt-auto"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm">מעבר לאתר</span>
            </Link>
          </nav>
        </aside>

        {/* Left Content Area (End side in RTL) */}
        <main className="flex-1 min-w-0 relative flex flex-col bg-[#0f172a] h-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 w-full h-full overflow-y-auto no-scrollbar p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
          {pathname !== "/dashboard-test/crm" && <DashboardQuickActions />}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MOBILE LAYOUT (md:hidden, retains exact original mobile design) */}
      {/* ======================================================== */}
      <div className="md:hidden flex flex-col w-full h-[100dvh] bg-[#0f172a] relative overflow-hidden">
        {isImpersonating && (
          <div className="bg-amber-500 text-black text-center text-xs py-1.5 font-bold flex justify-center items-center gap-2 shrink-0">
            אתה מחובר כרגע כמשתמש
            <button
              onClick={async () => {
                await stopImpersonating();
                window.location.href = "/admin/users";
              }}
              className="px-2 py-0.5 bg-black/10 hover:bg-black/20 rounded-md transition-colors text-black flex items-center gap-1 cursor-pointer"
            >
              <LayoutDashboard className="w-3 h-3" />
              חזור לאדמין
            </button>
          </div>
        )}

        {/* Top Navigation Bar */}
        <header className="h-[100px] shrink-0 bg-[#0f172a] text-white flex items-center justify-between px-4 z-50 relative">
          {userLogoUrl && (
            <div className="flex items-center gap-2">
              <img src={userLogoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            </div>
          )}
          
          <div className="flex flex-row items-center gap-2 flex-1 justify-center">
            <nav className="flex items-center justify-center gap-2">
              {topNavLinks.map((link) => {
                const testHref = getTestLink(link.href);
                const isActive = pathname.startsWith(testHref) && testHref !== "/dashboard-test";
                const isSettings = testHref === "/dashboard/settings" && pathname.startsWith("/dashboard/settings");
                return (
                  <Link
                    key={link.href}
                    href={testHref}
                    target={(link as any).target}
                    className={cn(
                      "group flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl min-w-[70px] border transition-all duration-300 ease-out hover:-translate-y-1",
                      isActive || isSettings
                        ? "border-white/30 bg-white/10 text-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]" 
                        : "border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:border-white/30 hover:text-white"
                    )}
                  >
                    <link.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", (isActive || isSettings) && "drop-shadow-md text-indigo-300")} />
                    <span className="text-[10px] font-bold">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 relative w-full flex flex-col border-t border-slate-700/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-24 p-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>



        {pathname !== "/dashboard-test/crm" && <DashboardQuickActions />}

        {/* Bottom Navigation Bar */}
        <footer className="h-[90px] shrink-0 bg-[#0f172a] flex items-center justify-center z-50 px-2 pb-2">
          <div className="w-full flex items-center justify-around gap-2">
            {bottomNavLinks.map((link) => {
              const testHref = getTestLink(link.href);
              const isActive = pathname.startsWith(testHref) && testHref !== "/";

              return (
                <Link
                  key={link.href}
                  href={testHref}
                  className={cn(
                    "group flex flex-col items-center justify-center gap-1.5 px-2 py-2 rounded-2xl min-w-[70px] border transition-all duration-300 ease-out hover:-translate-y-1",
                    isActive
                      ? "border-white/30 bg-white/10 text-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]"
                      : "border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:border-white/30 hover:text-white"
                  )}
                >
                  <link.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive && "drop-shadow-sm text-indigo-300")} />
                  <span className="text-[10px] font-bold">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </footer>
      </div>

    </div>
  );
}
