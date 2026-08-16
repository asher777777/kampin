import Link from "next/link";
import { Users, CreditCard, Sparkles, Globe, LayoutDashboard, Zap, Mail, Settings, Coins, FileText } from "lucide-react";
import { getGlobalSettings } from "@/features/settings/actions";

export default async function MosaicDashboardPage() {
  const settings = await getGlobalSettings();
  const siteUrl = settings?.miniSiteSlug ? `/${settings.miniSiteSlug}` : "/";

  return (
    <div className="min-h-full bg-[#0a0f1c] w-full flex flex-col items-center justify-center p-4 md:p-8 relative" dir="rtl">
      
      {/* Background dot pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="flex flex-col gap-6 z-10 w-full max-w-4xl mx-auto items-center">
        
        {/* Row 1: 4 Buttons */}
        <div className="flex w-full bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 p-4 md:p-6 rounded-[2rem] shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <Link href="/dashboard/crm" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Users className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">אנשי קשר</span>
            </Link>
            <Link href="/dashboard/revenue" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Coins className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">יצירת הכנסה</span>
            </Link>
            <Link href="/dashboard/services" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <FileText className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">יצירת תוכן</span>
            </Link>
            <Link href={siteUrl} target={settings?.miniSiteSlug ? "_blank" : undefined} className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Globe className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">מעבר לאתר</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Banner */}
        <div className="flex flex-row-reverse items-center justify-between p-8 md:p-12 bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-[2rem] w-full gap-8 relative overflow-hidden shadow-2xl">
           {/* Inner Glow */}
           <div className="absolute left-10 w-40 h-40 bg-indigo-600/20 blur-[50px] rounded-full"></div>
           
           {/* Icon */}
           <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-950/50 border border-indigo-500/20 rounded-[2rem] flex items-center justify-center relative z-10 shrink-0">
             <LayoutDashboard className="w-10 h-10 md:w-12 md:h-12 text-indigo-400" />
           </div>
           
           {/* Text */}
           <div className="flex flex-col items-end text-right relative z-10">
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm">מחולל הקהילות</h1>
             <p className="text-indigo-300 text-lg md:text-xl font-medium mt-2">מרכז הבקרה של הקהילה שלך</p>
           </div>
        </div>

        {/* Row 3: Buttons */}
        <div className="flex w-full bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 p-4 md:p-6 rounded-[2rem] shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <Link href="/dashboard/automations" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Zap className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">אוטומציה</span>
            </Link>
            <Link href="/dashboard/campaigns" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Mail className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">קמפיינים</span>
            </Link>
            <Link href="/dashboard/settings" className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1e293b]/50 border border-slate-700/50 rounded-3xl hover:bg-slate-800 transition-all hover:border-indigo-500/50 group">
              <Settings className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-slate-200">הגדרות</span>
            </Link>
            <Link href="/system-map" className="flex flex-col items-center justify-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl hover:bg-amber-500/20 transition-all hover:border-amber-500/60 group">
              <Sparkles className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-amber-300">מפת מערכת</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
