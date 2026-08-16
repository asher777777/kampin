import { GlobalCalendarView } from "@/components/ui/GlobalCalendarView";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "יומן המחולל | Admin",
};

export default function AdminCalendarPage() {
  return (
    <div className="p-2 md:p-6 h-[calc(100vh-40px)] md:h-[calc(100vh-80px)] w-full flex flex-col gap-4 md:gap-6" dir="rtl">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500 mb-2">יומן המחולל</h1>
          <p className="text-sm md:text-base text-gray-400">
            כאן תוכל לראות את כל הפגישות, המשימות והאינטראקציות שלך עם אנשי קשר במקום אחד.
          </p>
        </div>
        <Link 
          href="/" 
          target="_blank" 
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium shrink-0 border border-white/10"
        >
          <ExternalLink size={16} />
          <span className="hidden sm:inline">צפה באתר</span>
        </Link>
      </div>
      
      <div className="flex-1 w-full h-full bg-[#111] p-2 md:p-4 rounded-3xl border border-white/5 relative flex flex-col">
        <GlobalCalendarView />
      </div>
    </div>
  );
}
