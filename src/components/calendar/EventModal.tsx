"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Calendar as CalendarIcon, CheckSquare, Users, Bell, Loader2, User as UserIcon, MapPin } from "lucide-react";
import { UnifiedEvent, createLocalEvent, syncToGoogleCalendar, fetchContacts } from "@/features/calendar/actions";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  event: UnifiedEvent | null;
}

export default function EventModal({ isOpen, onClose, selectedDate, event }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"task" | "meeting" | "reminder" | "google">("task");
  const [time, setTime] = useState("12:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<{id: string, name: string, phone: string}[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [location, setLocation] = useState("");
  const [syncGoogle, setSyncGoogle] = useState(false);

  useEffect(() => {
    fetchContacts().then(setContacts);
  }, []);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setType(event.type as any);
      try {
        const d = new Date(event.start);
        setTime(format(d, "HH:mm"));
      } catch (e) {
        setTime("12:00");
      }
    } else {
      setTitle("");
      setDescription("");
      setType("task");
      setTime("12:00");
      setSelectedContactId("");
      setLocation("");
      setSyncGoogle(false);
    }
    setError("");
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setLoading(true);
    setError("");
    
    try {
      const [hours, minutes] = time.split(":");
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      const startStr = startDateTime.toISOString();
      const endStr = new Date(startDateTime.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
      
      let result;
      const finalDesc = description + (location ? `\nמיקום: ${location}` : "");
      
      if (type === "google") {
        result = await syncToGoogleCalendar(title, startStr, endStr, finalDesc);
      } else {
        result = await createLocalEvent(type, {
          title,
          description,
          dueDate: startStr,
          startTime: startStr,
          endTime: endStr,
          location: location || undefined,
          contactId: selectedContactId || undefined
        });

        if (result?.success && syncGoogle) {
          await syncToGoogleCalendar(title, startStr, endStr, finalDesc).catch(err => {
            console.error("Failed to sync to Google (optional step)", err);
          });
        }
      }
      
      if (!result?.success) {
        setError(result?.error || "אירעה שגיאה בשמירה");
      } else {
        // Here we could trigger a refresh of the server component
        // For now, we'll just reload the page to get the fresh data
        window.location.reload();
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold text-white">
            {event ? "פרטי אירוע" : `אירוע חדש ב-${format(selectedDate, "dd/MM/yyyy")}`}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 mx-4 mt-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">כותרת</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!!event && event.type === 'interaction'}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="הכנס כותרת לאירוע"
            />
          </div>

          {!event && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">סוג</label>
              <div className="grid grid-cols-4 gap-2">
                <button type="button" onClick={() => setType("task")} className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-colors ${type === "task" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}>
                  <CheckSquare size={18} />
                  <span className="text-xs">משימה</span>
                </button>
                <button type="button" onClick={() => setType("meeting")} className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-colors ${type === "meeting" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}>
                  <Users size={18} />
                  <span className="text-xs">פגישה</span>
                </button>
                <button type="button" onClick={() => setType("reminder")} className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-colors ${type === "reminder" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}>
                  <Bell size={18} />
                  <span className="text-xs">תזכורת</span>
                </button>
                <button type="button" onClick={() => setType("google")} className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-colors ${type === "google" ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}>
                  <CalendarIcon size={18} />
                  <span className="text-xs">Google</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">שעה</label>
            <input 
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              disabled={!!event}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {(type === "meeting" || type === "google") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">מיקום</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <input 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  disabled={!!event}
                  className="w-full bg-black border border-white/10 rounded-lg pr-10 pl-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="הכנס מיקום (אופציונלי)"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-400">תיאור</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!!event}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none h-24"
              placeholder="פרטים נוספים..."
            />
          </div>

          {!event && type !== "google" && contacts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400">קישור איש קשר (אופציונלי)</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-2.5 text-gray-400" size={16} />
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg pr-10 pl-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="">ללא איש קשר</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!event && type !== "google" && (
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input 
                type="checkbox"
                checked={syncGoogle}
                onChange={e => setSyncGoogle(e.target.checked)}
                className="rounded border-white/10 bg-black text-blue-500 focus:ring-blue-500 focus:ring-offset-black"
              />
              <span className="text-sm text-gray-300">סנכרן ל-Google Calendar במקביל</span>
            </label>
          )}

          <div className="mt-4 flex gap-3">
            {!event && (
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg font-medium hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                שמור אירוע
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-white/5 border border-white/10 text-white py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              {event ? "סגור" : "ביטול"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
