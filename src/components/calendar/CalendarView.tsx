"use client";

import { useState } from "react";
import { format, startOfWeek, addDays, subDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { UnifiedEvent } from "@/features/calendar/actions";
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon, CheckSquare, Users, Bell, Activity } from "lucide-react";
import EventModal from "./EventModal";

interface CalendarViewProps {
  events: UnifiedEvent[];
}

export default function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [viewType, setViewType] = useState<"month" | "week" | "day">("month");

  const next = () => {
    if (viewType === "month") setCurrentDate(addMonths(currentDate, 1));
    if (viewType === "week") setCurrentDate(addDays(currentDate, 7));
    if (viewType === "day") setCurrentDate(addDays(currentDate, 1));
  };
  const prev = () => {
    if (viewType === "month") setCurrentDate(subMonths(currentDate, 1));
    if (viewType === "week") setCurrentDate(subDays(currentDate, 7));
    if (viewType === "day") setCurrentDate(subDays(currentDate, 1));
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: UnifiedEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const renderMonthOrWeek = () => {
    const isWeek = viewType === "week";
    const startDate = isWeek ? startOfWeek(currentDate, { weekStartsOn: 0 }) : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const endDate = isWeek ? endOfWeek(currentDate, { weekStartsOn: 0 }) : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    
    const dateFormat = "d";
    const rows: React.ReactNode[] = [];
    let days: React.ReactNode[] = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        const dayEvents = events.filter(e => {
          const eventStart = new Date(e.start);
          return isSameDay(eventStart, cloneDay);
        });

        days.push(
          <div
            key={day.toISOString()}
            className={`min-h-[120px] p-2 border border-gray-100/10 transition-all hover:bg-white/5 cursor-pointer flex flex-col gap-1 ${
              !isSameMonth(day, currentDate) && !isWeek
                ? "text-gray-500 bg-black/20"
                : isSameDay(day, new Date())
                ? "bg-blue-500/10 text-blue-200"
                : "text-gray-200 bg-white/5"
            }`}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" : ""}`}>
                {formattedDate}
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[80px] scrollbar-thin">
              {dayEvents.slice(0, 4).map((event, idx) => (
                <div
                  key={event.id + idx}
                  onClick={(e) => handleEventClick(e, event)}
                  className={`text-xs px-2 py-1 rounded-md truncate shadow-sm transition-transform hover:scale-105 flex items-center gap-1.5 ${
                    event.type === "google" ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30" :
                    event.type === "task" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" :
                    event.type === "meeting" ? "bg-amber-500/20 text-amber-200 border border-amber-500/30" :
                    event.type === "interaction" ? "bg-rose-500/20 text-rose-200 border border-rose-500/30" :
                    "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                  }`}
                >
                  {event.type === "google" && <CalendarIcon size={10} />}
                  {event.type === "task" && <CheckSquare size={10} />}
                  {event.type === "meeting" && <Users size={10} />}
                  {event.type === "interaction" && <Activity size={10} />}
                  {event.type === "reminder" && <Bell size={10} />}
                  <span className="truncate">{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 4 && (
                <div className="text-xs text-center text-gray-400 font-medium">
                  +{dayEvents.length - 4} נוספים
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    
    return rows;
  };

  const renderDayView = () => {
    const dayEvents = events.filter(e => isSameDay(new Date(e.start), currentDate));
    
    // Sort events by time
    dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
      <div className="p-4 flex flex-col gap-3 min-h-[500px]">
        {dayEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-10">אין אירועים ביום זה</div>
        ) : (
          dayEvents.map((event, idx) => {
            const timeStr = format(new Date(event.start), "HH:mm");
            return (
              <div
                key={event.id + idx}
                onClick={(e) => handleEventClick(e, event)}
                className={`p-4 rounded-xl cursor-pointer shadow-sm transition-all hover:scale-[1.01] flex flex-col gap-2 border ${
                  event.type === "google" ? "bg-indigo-500/10 border-indigo-500/20" :
                  event.type === "task" ? "bg-emerald-500/10 border-emerald-500/20" :
                  event.type === "meeting" ? "bg-amber-500/10 border-amber-500/20" :
                  event.type === "interaction" ? "bg-rose-500/10 border-rose-500/20" :
                  "bg-blue-500/10 border-blue-500/20"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">{timeStr}</span>
                    <span className="font-semibold text-white">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-black/40">
                    {event.type === "google" && <CalendarIcon size={12} className="text-indigo-400" />}
                    {event.type === "task" && <CheckSquare size={12} className="text-emerald-400" />}
                    {event.type === "meeting" && <Users size={12} className="text-amber-400" />}
                    {event.type === "interaction" && <Activity size={12} className="text-rose-400" />}
                    {event.type === "reminder" && <Bell size={12} className="text-blue-400" />}
                    <span className="capitalize text-gray-300">{event.type}</span>
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-gray-400 mr-12">{event.description}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent border-b border-white/10">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 min-w-[150px]">
            {viewType === "month" && format(currentDate, "MMMM yyyy", { locale: he })}
            {viewType === "week" && `שבוע של ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "d/M")}`}
            {viewType === "day" && format(currentDate, "d MMMM yyyy", { locale: he })}
          </h2>
          
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
            <button 
              onClick={() => setViewType("month")} 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === "month" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              חודש
            </button>
            <button 
              onClick={() => setViewType("week")} 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === "week" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              שבוע
            </button>
            <button 
              onClick={() => setViewType("day")} 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewType === "day" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              יום
            </button>
          </div>

          <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
            <button onClick={prev} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              היום
            </button>
            <button onClick={next} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300">
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
        <button 
          onClick={() => { setSelectedDate(new Date()); setSelectedEvent(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-full shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 font-medium"
        >
          <Plus size={18} />
          <span>אירוע חדש</span>
        </button>
      </div>

      {/* Days Header */}
      {viewType !== "day" && (
        <div className="grid grid-cols-7 text-center bg-black/20 py-3 border-b border-white/5">
          {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"].map((dayName) => (
            <div key={dayName} className="text-sm font-medium text-gray-400">
              {dayName}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {viewType === "day" ? renderDayView() : renderMonthOrWeek()}
      </div>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedDate={selectedDate} 
        event={selectedEvent} 
      />
    </div>
  );
}
