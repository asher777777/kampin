import { GlobalCalendarView } from "@/components/ui/GlobalCalendarView";

export const metadata = {
  title: "יומן המחולל | Dashboard",
};

export default function CalendarPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col gap-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">יומן המחולל</h1>
        <p className="text-gray-400">
          כאן תוכל לראות את כל הפגישות, המשימות והאינטראקציות שלך עם אנשי קשר במקום אחד.
        </p>
      </div>
      
      <div className="flex-1 bg-[#111] p-4 rounded-3xl border border-white/5 relative">
        <GlobalCalendarView />
      </div>
    </div>
  );
}
