import { Suspense } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, Database, LogOut, Settings, FileText, Receipt, Wand2, Calendar, Sparkles } from "lucide-react";
import { signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-white" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-amber-500">ניהול מערכת</h1>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1 mt-8">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-500 font-semibold hover:bg-amber-500/20 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            ראשי
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
            ניהול משתמשים
          </Link>
          <Link href="/admin/receipts" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Receipt className="w-5 h-5" />
            הפקת קבלות
          </Link>
          <Link href="/admin/form-builder" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Wand2 className="w-5 h-5" />
            מחולל הטפסים (מיכאל)
          </Link>
          <Link href="/admin/content" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
            תוכן וטפסים (אתר)
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            הגדרות API גלובליות
          </Link>
          <Link href="/admin/calendar" className="flex items-center gap-3 px-4 py-3 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors">
            <Calendar className="w-5 h-5" />
            יומן המחולל
          </Link>
          <Link href="/dashboard/generator" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Sparkles className="w-5 h-5 text-amber-500" />
            מחולל פרויקטים
          </Link>
          <div className="my-4 border-t border-slate-800"></div>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Database className="w-5 h-5" />
            למערכת ה-CRM שלי
          </Link>
        </nav>

        <ThemeToggle />
        <form action={async () => {
          "use server";
          await signOut();
        }}>
          <button type="submit" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 w-full transition-colors">
            <LogOut className="w-5 h-5" />
            התנתק
          </button>
        </form>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Suspense fallback={<div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-slate-700 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-700 rounded col-span-2"></div><div className="h-2 bg-slate-700 rounded col-span-1"></div></div><div className="h-2 bg-slate-700 rounded"></div></div></div></div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
