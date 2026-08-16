"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Users, Sparkles, CreditCard, Globe, Zap, Mail, LayoutDashboard, FileText, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { stopImpersonating } from "@/features/users/impersonate";

interface DashboardShellProps {
  children: React.ReactNode;
  modal: React.ReactNode;
  geminiActive: boolean;
  kesherActive: boolean;
  dbActive: boolean;
  userLogoUrl?: string | null;
  miniSiteSlug?: string | null;
  isImpersonating?: boolean;
}

export function DashboardShell({
  children,
  modal,
  userLogoUrl,
  miniSiteSlug,
  isImpersonating,
}: DashboardShellProps) {
  const pathname = usePathname();

  // Top Bar Links (Swapped as per user request)
  const topNavLinks = [
    { href: "/dashboard/crm", label: "ניהול קהילה", icon: Users },
    { href: "/dashboard/receipts", label: "הפקת מסמך", icon: FileText },
    { href: "/dashboard/services", label: "יצירת תוכן", icon: Sparkles },
    { href: miniSiteSlug ? `/${miniSiteSlug}` : "/", label: "מעבר לאתר", icon: Globe, target: miniSiteSlug ? "_blank" : undefined },
  ];

  // Bottom Bar Links
  const bottomNavLinks = [
    { href: "/dashboard", label: "ראשי", icon: LayoutDashboard },
    { href: "/dashboard/automations", label: "אוטומציה", icon: Zap },
    { href: "/dashboard/campaigns", label: "קמפיינים", icon: Mail },
    { href: "/dashboard/settings", label: "הגדרות", icon: Settings },
  ];

  const allLinks = [...topNavLinks, ...bottomNavLinks];
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 overflow-hidden" dir="rtl">
      {children}
      {modal}
    </div>
  );
}
