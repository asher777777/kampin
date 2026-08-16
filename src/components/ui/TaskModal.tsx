"use client";

import React, { useState, useEffect } from "react";
import { X, CalendarIcon, Loader2, Save, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/features/crm/actions";

export function TaskModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingEvent, 
  contactId = "", 
  contactName = "" 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  editingEvent?: any;
  contactId?: string;
  contactName?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState("ממתין");
  const [followUpDate, setFollowUpDate] = useState("");
  const [type, setType] = useState("meeting");
  const [sendToContact, setSendToContact] = useState(false);
  const [linkedContactsStr, setLinkedContactsStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setTitle(editingEvent.title || "");
        setDescription(editingEvent.description || "");
        if (editingEvent.start) {
          const d = new Date(editingEvent.start);
          setDate(d.toISOString().split("T")[0]);
          setTime(d.toTimeString().substring(0, 5));
        } else {
          setDate(editingEvent.date || new Date().toISOString().split("T")[0]);
          setTime(editingEvent.time || new Date().toTimeString().substring(0, 5));
        }
        setStatus(editingEvent.status || "בוצע");
        setType(editingEvent.type || "meeting");
        setFollowUpDate(editingEvent.followUpDate || "");
        setSendToContact(editingEvent.sendToContact || false);
        
        if (editingEvent.linkedContacts && Array.isArray(editingEvent.linkedContacts)) {
          setLinkedContactsStr(editingEvent.linkedContacts.map((c: any) => c.name).join(", "));
        } else if (contactName) {
          setLinkedContactsStr(contactName);
        } else {
          setLinkedContactsStr("");
        }
      } else {
        setTitle("");
        setDescription("");
        const now = new Date();
        setDate(now.toISOString().split("T")[0]);
        setTime(now.toTimeString().substring(0, 5));
        setStatus("ממתין לטיפול");
        setType("meeting");
        setFollowUpDate("");
        setSendToContact(false);
        setLinkedContactsStr(contactName || "");
      }
    }
  }, [isOpen, editingEvent, contactName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title || !date || !time) return;
    setIsSaving(true);
    
    const startIso = new Date(`${date}T${time}`).toISOString();
    
    // Parse linked contacts
    const linkedContacts = linkedContactsStr
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(name => ({ id: "", name }));

    const data = {
      title,
      description,
      start: startIso,
      end: startIso,
      date,
      time,
      status,
      type,
      sendToContact,
      followUpDate,
      linkedContacts,
      contactId,
      contactName
    };
    
    if (editingEvent?.id) {
      await updateCalendarEvent(editingEvent.id, data);
    } else {
      await createCalendarEvent(data);
    }
    
    setIsSaving(false);
    onSuccess();
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;
    if (!confirm("האם למחוק אינטראקציה זו?")) return;
    setIsSaving(true);
    await deleteCalendarEvent(editingEvent.id);
    setIsSaving(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rtl font-heebo">
      <div className="bg-[#111] border border-amber-500/30 w-full max-w-md rounded-[2rem] p-6 space-y-6 shadow-2xl relative">
        <button type="button" onClick={onClose} className="absolute top-4 left-4 text-white/50 hover:text-white bg-white/5 rounded-full p-2 transition-all">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-black text-amber-500 text-right">
          {editingEvent ? 'עריכת משימה/פעילות' : 'הוספת פעילות חדשה'}
        </h3>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-amber-500">כותרת *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="לדוגמה: שיחת היכרות" className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-amber-500">תאריך</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
            </div>
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-amber-500">שעה</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-amber-500">סוג אירוע</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="meeting">פגישה</option>
                <option value="call">שיחת טלפון</option>
                <option value="task">משימה לביצוע</option>
                <option value="whatsapp_sent">הודעת וואטסאפ</option>
                <option value="manual">הערה ידנית</option>
              </select>
            </div>
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-amber-500">סטטוס</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="בוצע">בוצע</option>
                <option value="ממתין לטיפול">ממתין לטיפול</option>
                <option value="בטיפול">בטיפול</option>
                <option value="נדחה">נדחה</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-amber-500">תיאור / סיכום</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              placeholder="סכם את השיחה או רשום הערות..."
            />
          </div>

          {/* WhatsApp Reminder Checkbox */}
          <div className="flex items-center gap-3 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all" onClick={() => setSendToContact(!sendToContact)}>
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${sendToContact ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/50'}`}>
              {sendToContact && <span className="text-black font-black text-xs">✓</span>}
            </div>
            <div className="flex-1 text-right">
              <span className="text-emerald-400 font-bold text-sm block">שלח תזכורת וואטסאפ אוטומטית לנמען</span>
              <span className="text-[10px] text-emerald-400/60 block">המערכת תשלח הודעה במועד שנקבע (נדרשת תמיכה במערכת הרקע)</span>
            </div>
            <MessageCircle size={18} className="text-emerald-400 opacity-50" />
          </div>

          <div className="space-y-1.5 text-right border-t border-white/10 pt-4 mt-2">
            <label className="text-xs font-bold text-amber-500 flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5" />
              תאריך פולו-אפ (מעקב עתידי)
            </label>
            <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-amber-500">אנשי קשר מקושרים</label>
            <Input value={linkedContactsStr} onChange={e => setLinkedContactsStr(e.target.value)} placeholder="לדוגמה: משה כהן, רונית לוי (מופרד בפסיק)" className="bg-[#1a1a1a] border-white/10 text-white rounded-xl focus-visible:ring-amber-500" />
          </div>

          {/* AI Suggestions Display */}
          {editingEvent?.metadata?.suggestions && editingEvent.metadata.suggestions.length > 0 && (
            <div className="mt-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-right">
              <div className="flex items-center gap-2 mb-3 text-amber-500">
                <Sparkles size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">הצעות להמשך טיפול (AI)</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-start">
                {editingEvent.metadata.suggestions.map((suggestion: string, sIdx: number) => (
                  <button 
                    key={sIdx} 
                    type="button"
                    onClick={() => setDescription(prev => prev ? prev + "\n" + suggestion : suggestion)}
                    className="bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-white/80 shadow-sm hover:border-amber-500/50 hover:text-amber-500 transition-all text-right"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {editingEvent ? (
            <Button type="button" onClick={handleDelete} variant="ghost" disabled={isSaving} className="text-red-500 hover:bg-red-500/10 rounded-xl px-3 text-sm font-bold flex items-center gap-2">
              <X className="w-4 h-4" /> מחיקה
            </Button>
          ) : <div></div>}
          
          <Button type="button" onClick={handleSave} disabled={isSaving || !title || !date} className="bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl px-6 flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4" />}
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}
