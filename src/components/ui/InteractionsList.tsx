"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { getCalendarEvents, deleteCalendarEvent } from "@/features/crm/actions";
import { TaskModal } from "./TaskModal";

export function InteractionsList({ contactId, contactName }: { contactId: string, contactName: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Form State is handled inside TaskModal
  
  useEffect(() => {
    loadEvents();
  }, [contactId]);

  const loadEvents = async () => {
    setLoading(true);
    const res = await getCalendarEvents(contactId);
    if (res.success && res.events) {
      // Sort by start date descending
      const sorted = res.events.sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
      setEvents(sorted);
    }
    setLoading(false);
  };

  const handleOpenModal = (event?: any) => {
    if (event) {
      setSelectedEvent(event);
    } else {
      setSelectedEvent(null);
    }
    setShowModal(true);
  };

  return (
    <div className="w-full flex flex-col space-y-4 text-right">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-black text-amber-500">היסטוריית אינטראקציות</h3>
        <Button type="button" onClick={() => handleOpenModal()} className="bg-transparent border border-amber-500 hover:bg-amber-500/10 text-amber-500 rounded-xl px-4 py-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> הוסף אינטראקציה
        </Button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center border border-white/5 rounded-2xl text-slate-400 text-sm">
            לא תועדו אינטראקציות.
          </div>
        ) : (
          events.map((ev, idx) => (
            <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex items-start justify-between group hover:border-amber-500/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{ev.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.status === 'בוצע' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {ev.status || 'בוצע'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(ev.start).toLocaleDateString("he-IL")}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ev.start).toLocaleTimeString("he-IL", {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                {ev.description && (
                  <p className="text-sm text-white/70 mt-2 line-clamp-2">{ev.description}</p>
                )}
                {ev.linkedContacts && ev.linkedContacts.length > 0 && (
                  <div className="mt-2 text-xs text-indigo-400 font-bold bg-indigo-500/10 inline-block px-2 py-1 rounded-md">
                    מקושר ל: {ev.linkedContacts.map((c: any) => c.name).join(", ")}
                  </div>
                )}
                {ev.followUpDate && (
                  <div className="mt-2 ml-2 text-xs text-amber-400 font-bold bg-amber-500/10 inline-block px-2 py-1 rounded-md">
                    פולו-אפ: {new Date(ev.followUpDate).toLocaleDateString("he-IL")}
                  </div>
                )}
              </div>
              
              <button type="button" onClick={() => handleOpenModal(ev)} className="text-white/30 hover:text-amber-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                <Edit className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <TaskModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          loadEvents();
        }}
        editingEvent={selectedEvent}
        contactId={contactId}
        contactName={contactName}
      />
    </div>
  );
}
