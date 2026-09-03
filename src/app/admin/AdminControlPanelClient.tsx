"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Home, 
  UserPlus, 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  ChevronLeft,
  CheckCircle2,
  Globe,
  ExternalLink
} from "lucide-react";
import { ContactModal } from "@/app/dashboard/crm/ContactModal";
import { CrmFloatingNav } from "@/components/navigation/CrmFloatingNav";

interface AdminStats {
  totalUsers: number;
  totalContacts: number;
  totalGroups?: number;
  totalIncome?: number;
}

interface AdminControlPanelClientProps {
  initialStats?: AdminStats;
  adminName?: string;
}

export function AdminControlPanelClient({ initialStats, adminName }: AdminControlPanelClientProps) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const router = useRouter();

  const handleContactCreated = () => {
    setIsContactModalOpen(false);
    setSuccessToast("איש הקשר החדש נוצר בהצלחה!");
    setTimeout(() => setSuccessToast(null), 4000);
    router.refresh();
  };

  return (
    <div className="min-h-full space-y-6 pb-16 text-slate-900 dark:text-white transition-colors duration-200" dir="rtl">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-emerald-950/95 dark:bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-sm">{successToast}</span>
        </div>
      )}

      {/* Page Header Title */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-7 bg-amber-500 rounded-full"></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              לוח בקרה ראשי
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              4 מוקדי הניווט והשליטה המרכזיים
            </p>
          </div>
        </div>
      </div>

      {/* 4 Primary Navigation Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {/* Card 1: עמוד האנליטיקה */}
        <Link
          href="/dashboard/crm/analytics"
          className="group relative overflow-hidden rounded-3xl md:rounded-[2rem] bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/60 border border-blue-200 hover:border-blue-400 shadow-md dark:from-[#0e1322] dark:via-[#0d111d] dark:to-[#0a0d14] dark:border-blue-500/20 dark:hover:border-blue-500/60 p-6 md:p-7 flex flex-col justify-between gap-5 md:gap-6 dark:shadow-xl hover:shadow-[0_0_35px_rgba(59,130,246,0.2)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  דוחות וסטטיסטיקה
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                  עמוד האנליטיקה
                </h2>
              </div>
            </div>

            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 flex items-center justify-center transition-all shrink-0">
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
              לוח הבקרה הראשי לדוחות מתקדמים, סינון לפי מקורות הגעה, תגיות, ערים, סכומי תרומות וייצוא דוחות לאקסל בלחיצה אחת.
            </p>
            
            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">גרפים ודיאגרמות</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">פילוח תגיות</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">שמירת תצוגות</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">עריכה בטבלה</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold text-xs md:text-sm pt-2">
            <span>כניסה למרכז האנליטיקה</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </Link>

        {/* Card 2: עמוד הקבוצות */}
        <Link
          href="/dashboard/crm/groups"
          className="group relative overflow-hidden rounded-3xl md:rounded-[2rem] bg-gradient-to-br from-purple-50/90 via-white to-pink-50/60 border border-purple-200 hover:border-purple-400 shadow-md dark:from-[#170e24] dark:via-[#120d1c] dark:to-[#0a0812] dark:border-purple-500/20 dark:hover:border-purple-500/60 p-6 md:p-7 flex flex-col justify-between gap-5 md:gap-6 dark:shadow-xl hover:shadow-[0_0_35px_rgba(168,85,247,0.2)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                <Users className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 mb-1">
                  <Layers className="w-3 h-3" />
                  סגמנטציה וקהילות
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  עמוד הקבוצות
                </h2>
              </div>
            </div>

            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 flex items-center justify-center transition-all shrink-0">
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
              ניהול חכם של קבוצות וסגמנטים, הגדרת חוקי שיוך אוטומטיים לפי תגיות וערים, ושאיבת משתתפים ישירה מקבוצות וואטסאפ.
            </p>
            
            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">חוקים אוטומטיים</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">ייבוא WhatsApp</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">שליחת הודעות</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">שיוך מהיר</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-purple-600 dark:text-purple-400 font-bold text-xs md:text-sm pt-2">
            <span>כניסה לניהול הקבוצות</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </Link>

        {/* Card 3: עמוד הבית */}
        <Link
          href="/"
          target="_blank"
          className="group relative overflow-hidden rounded-3xl md:rounded-[2rem] bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60 border border-amber-200 hover:border-amber-400 shadow-md dark:from-[#1a140b] dark:via-[#141009] dark:to-[#0a0805] dark:border-amber-500/20 dark:hover:border-amber-500/60 p-6 md:p-7 flex flex-col justify-between gap-5 md:gap-6 dark:shadow-xl hover:shadow-[0_0_35px_rgba(245,158,11,0.2)] transition-all duration-300 hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform font-bold shrink-0">
                <Home className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-1">
                  <Globe className="w-3 h-3" />
                  אתר וראשי
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  עמוד הבית
                </h2>
              </div>
            </div>

            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 flex items-center justify-center transition-all shrink-0">
              <ExternalLink className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
              מעבר ישיר לעמוד הבית הציבורי של האתר לצפייה בתצוגת הלקוחות והמבקרים.
            </p>
            
            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">תצוגת אתר מלאה</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">עמודי נחיתה</span>
              <span className="text-[10px] md:text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 px-2.5 py-1 rounded-lg">חוויית משתמש</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold text-xs md:text-sm pt-2">
            <span>צפייה בעמוד הבית של האתר</span>
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </div>
        </Link>

        {/* Card 4: פתיחת מודל צור איש קשר חדש */}
        <div 
          onClick={() => setIsContactModalOpen(true)}
          className="group relative overflow-hidden rounded-3xl md:rounded-[2rem] bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 border border-emerald-200 hover:border-emerald-400 shadow-md dark:from-[#091b15] dark:via-[#081511] dark:to-[#040a08] dark:border-emerald-500/30 dark:hover:border-emerald-500/80 p-6 md:p-7 flex flex-col justify-between gap-5 md:gap-6 dark:shadow-xl hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/30 transition-all"></div>
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white dark:text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform font-bold shrink-0">
                <UserPlus className="w-6 h-6 md:w-7 md:h-7 stroke-[2.5]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  פעולה מהירה
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  צור איש קשר חדש
                </h2>
              </div>
            </div>

            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-slate-950 flex items-center justify-center transition-all font-bold shrink-0">
              +
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm leading-relaxed">
              פתיחה ישירה של טופס יצירת איש קשר מעוצב. מאפשר הזנת פרטים אישיים, כתובת, חברה, שיוך לקהילה ותיוגים מיידיים.
            </p>
            
            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[10px] md:text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">טופס חכם מובנה</span>
              <span className="text-[10px] md:text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">שיוך לקהילה</span>
              <span className="text-[10px] md:text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">הזנת תגיות</span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs md:text-sm pt-2">
            <span className="group-hover:underline">פתח טופס יצירה עכשיו</span>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-black group-hover:scale-105 transition-transform">
              פתח מודל
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <CrmFloatingNav 
        activePage="admin"
        onOpenNewContact={() => setIsContactModalOpen(true)}
      />

      {/* Embedded Contact Modal */}
      {isContactModalOpen && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          contact={null}
          onSuccess={handleContactCreated}
        />
      )}
    </div>
  );
}
