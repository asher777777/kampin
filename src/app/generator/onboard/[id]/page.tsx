"use client";

import React, { useState, useEffect, use } from "react";
import { getRecruitmentPageData } from "@/features/generator/actions";
import DigitalOnboarding from "@/features/generator/components/DigitalOnboarding";
import { Loader2, Moon, Sun } from "lucide-react";

interface OnboardPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function OnboardPage({ params }: OnboardPageProps) {
  // Resolve params for compatibility with Next.js 14 & 15
  const resolvedParams = params && "then" in params ? use(params) : (params as { id: string });
  const pageId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleData, setRoleData] = useState<any>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check initial dark mode from documentElement
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!pageId) return;

    const loadPageData = async () => {
      try {
        const res = await getRecruitmentPageData(pageId);
        if (res.success && res.data) {
          setRoleData(res.data);
        } else {
          setError(res.error || "עמוד הגיוס לא נמצא במערכת.");
        }
      } catch (err) {
        setError("שגיאה בחיבור לשרת.");
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [pageId]);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.remove("dark");
      setTheme("light");
    } else {
      html.classList.add("dark");
      setTheme("dark");
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white p-6 md:p-10 font-sans transition-colors duration-300 flex flex-col justify-between items-center" dir="rtl">
      
      {/* Header with theme toggle */}
      <div className="w-full max-w-xl flex justify-between items-center mb-6">
        <h1 className="text-sm font-black text-[#f59e0b]">GOLDEN FLUTE</h1>
        
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-[#f59e0b] hover:text-[#f59e0b] transition-colors cursor-pointer flex items-center justify-center"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full flex-1 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#f59e0b]" />
            <span className="text-xs text-zinc-500 font-bold">טוען נתוני משרה...</span>
          </div>
        ) : error ? (
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-red-500/20 p-6 rounded-2xl text-center shadow-lg">
            <span className="text-sm text-red-500 font-bold block mb-4">⚠️ {error}</span>
            <p className="text-xs text-zinc-500">אנא ודא שהקישור שהזנת תקין או פנה למנהל הפרויקט.</p>
          </div>
        ) : (
          <DigitalOnboarding
            pageId={pageId}
            roleTitle={roleData.roleTitle}
            roleRequirements={roleData.roleRequirements}
            budget={roleData.budget}
            onSuccess={() => setSuccess(true)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="w-full text-center py-6 text-[10px] text-zinc-400">
        © 2026 Golden Flute - מערכת גיוס קהילתית מאובטחת.&rlm;
      </div>
    </div>
  );
}
