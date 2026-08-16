"use client";

import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { he } from "date-fns/locale/he";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Plus, Trash2, Edit, Save, X, Loader2, Folder } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/features/crm/actions";

const locales = {
  he: he,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export function CalendarView({ contactId, contactName }: { contactId: string, contactName: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [contactId]);

  const loadEvents = async () => {
    setLoading(true);
    const res = await getCalendarEvents(contactId);
    if (res.success && res.events) {
      const formatted = res.events.map((ev: any) => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end)
      }));
      setEvents(formatted);
    }
    setLoading(false);
  };

  const handleSelectSlot = ({ start, end }: any) => {
    setSelectedEvent(null);
    setTitle("");
    setDescription("");
    setStartDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setEndTime(format(end, "HH:mm"));
    setShowEventModal(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setStartDate(format(new Date(event.start), "yyyy-MM-dd"));
    setStartTime(format(new Date(event.start), "HH:mm"));
    setEndDate(format(new Date(event.end), "yyyy-MM-dd"));
    setEndTime(format(new Date(event.end), "HH:mm"));
    setShowEventModal(true);
  };

  const handleSave = async () => {
    if (!title || !startDate || !startTime) return;
    
    setIsSaving(true);
    const startIso = new Date(`${startDate}T${startTime}`).toISOString();
    let endIso = startIso;
    if (endDate && endTime) {
      endIso = new Date(`${endDate}T${endTime}`).toISOString();
    }
    
    const data = {
      title,
      description,
      start: startIso,
      end: endIso,
      contactId,
      contactName,
    };
    
    if (selectedEvent?.id) {
      await updateCalendarEvent(selectedEvent.id, data);
    } else {
      await createCalendarEvent(data);
    }
    
    await loadEvents();
    setShowEventModal(false);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent?.id) return;
    if (!confirm("האם למחוק אירוע זה?")) return;
    
    setIsSaving(true);
    await deleteCalendarEvent(selectedEvent.id);
    await loadEvents();
    setShowEventModal(false);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-[700px] w-full relative">
      <style dangerouslySetInnerHTML={{__html: `
        .rbc-calendar { font-family: 'Heebo', sans-serif; }
        .rbc-toolbar button { color: #fff; border-color: rgba(255,255,255,0.1); }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background-color: #f59e0b; color: #000; font-weight: bold; }
        .rbc-toolbar button:hover { background-color: rgba(245, 158, 11, 0.2); }
        .rbc-header { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px; color: #f59e0b; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: rgba(255,255,255,0.1); border-radius: 1rem; overflow: hidden; }
        .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.1); }
        .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.1); }
        .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
        .rbc-today { background: rgba(245, 158, 11, 0.05); }
        .rbc-time-content { border-top: 1px solid rgba(255,255,255,0.1); }
        .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .rbc-time-header-content { border-left: 1px solid rgba(255,255,255,0.1); }
      `}} />
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="text-xl font-black text-amber-500">יומן אירועים ופגישות</h3>
        <Button type="button" onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })} className="bg-transparent border border-amber-500 hover:bg-amber-500/10 text-amber-500 rounded-xl px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> קבע פגישה
        </Button>
      </div>

      <div className="flex-1 bg-[#111] rounded-2xl p-4 overflow-hidden shadow-lg border border-white/5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="he"
            rtl={true}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            messages={{
              allDay: 'כל היום',
              previous: 'הקודם',
              next: 'הבא',
              today: 'היום',
              month: 'חודש',
              week: 'שבוע',
              day: 'יום',
              agenda: 'סדר יום',
              date: 'תאריך',
              time: 'שעה',
              event: 'אירוע',
              noEventsInRange: 'אין אירועים בטווח זה.',
            }}
            className="text-white h-full"
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: '#f59e0b',
                color: '#000',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                padding: '2px 8px'
              }
            })}
          />
        )}
      </div>

      {showEventModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rtl">
          <div className="bg-[#111] border border-amber-500/30 w-full max-w-md rounded-[2rem] p-6 space-y-6 shadow-2xl relative">
            <button type="button" onClick={() => setShowEventModal(false)} className="absolute top-4 left-4 text-white/50 hover:text-white bg-white/5 rounded-full p-2 transition-all">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-amber-500 text-right">
              {selectedEvent ? 'עריכת אירוע' : 'הוספת אירוע'}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-amber-500">כותרת האירוע *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="לדוגמה: פגישת היכרות" className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500 focus-visible:border-amber-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-amber-500">תאריך התחלה</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-amber-500">שעת התחלה</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-amber-500">תאריך סיום</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-amber-500">שעת סיום</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
                </div>
              </div>
              
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-amber-500">תיאור / הערות</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  placeholder="פרטים נוספים לגבי הפגישה..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between pt-2">
              {selectedEvent ? (
                <Button type="button" onClick={handleDelete} variant="ghost" disabled={isSaving} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl px-3 h-12 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                </Button>
              ) : <div></div>}
              
              <Button type="button" onClick={handleSave} disabled={isSaving || !title || !startDate} variant="ghost" className="bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl px-6 h-12 flex items-center justify-center gap-2 min-w-[120px]">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Folder className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
