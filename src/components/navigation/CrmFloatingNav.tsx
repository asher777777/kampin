"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  LayoutDashboard, 
  UserPlus, 
  Compass, 
  X, 
  Home
} from "lucide-react";
import { ContactModal } from "@/app/dashboard/crm/ContactModal";

interface CrmFloatingNavProps {
  onOpenNewContact?: () => void;
  activePage?: "analytics" | "groups" | "home" | "admin" | "crm";
  position?: "bottom-left" | "bottom-right";
}

export function CrmFloatingNav({ 
  onOpenNewContact, 
  activePage,
  position = "bottom-right" 
}: CrmFloatingNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleContactClick = () => {
    setIsOpen(false);
    if (onOpenNewContact) {
      onOpenNewContact();
    } else {
      setLocalModalOpen(true);
    }
  };

  const navItems = [
    {
      id: "new-contact",
      label: "צור איש קשר חדש",
      icon: UserPlus,
      action: handleContactClick,
      color: "from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      isAction: true,
    },
    {
      id: "analytics",
      label: "עמוד האנליטיקה",
      icon: BarChart3,
      href: "/dashboard/crm/analytics",
      active: activePage === "analytics",
      color: "from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      id: "groups",
      label: "עמוד הקבוצות",
      icon: Users,
      href: "/dashboard/crm/groups",
      active: activePage === "groups",
      color: "from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    {
      id: "admin",
      label: "לוח בקרה ראשי",
      icon: LayoutDashboard,
      href: "/admin",
      active: activePage === "admin",
      color: "from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
  ];

  const posClass = position === "bottom-left" ? "left-6" : "right-6";

  return (
    <>
      <div 
        ref={menuRef} 
        className={`fixed bottom-6 ${posClass} z-50 flex flex-col items-end gap-3 select-none`}
        dir="rtl"
      >
        {/* Expanded Navigation Menu */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-2 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/95 border border-emerald-500/40 backdrop-blur-xl shadow-2xl hover:border-emerald-400 text-white transition-all transform hover:-translate-x-1 group cursor-pointer"
                  >
                    <span className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {item.label}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href!}
                  onClick={() => setIsOpen(false)}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/95 border backdrop-blur-xl shadow-2xl transition-all transform hover:-translate-x-1 group cursor-pointer ${
                    item.active 
                      ? "border-amber-500/80 ring-2 ring-amber-500/30 text-amber-400" 
                      : "border-slate-800 hover:border-slate-600 text-slate-200"
                  }`}
                >
                  <span className="text-sm font-bold group-hover:text-white transition-colors">
                    {item.label}
                    {item.active && (
                      <span className="mr-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                        נוכחי
                      </span>
                    )}
                  </span>
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}

            {/* Quick Link to site Home */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md text-slate-400 hover:text-white hover:border-slate-700 transition-all text-xs group"
            >
              <span className="font-medium group-hover:text-slate-200">עמוד הבית של האתר</span>
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                <Home className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="תפריט ניווט מהיר"
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all duration-300 cursor-pointer ${
            isOpen 
              ? "bg-slate-900 border-2 border-amber-500 text-amber-400 rotate-90 scale-105" 
              : "bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950 hover:scale-110 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Compass className="w-6 h-6 animate-spin-slow" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-950"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Fallback ContactModal when trigger is pressed outside full CRM context */}
      {localModalOpen && (
        <ContactModal
          isOpen={localModalOpen}
          onClose={() => setLocalModalOpen(false)}
          contact={null}
          onSuccess={() => {
            setLocalModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
