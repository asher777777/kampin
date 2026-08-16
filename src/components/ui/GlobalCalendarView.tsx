"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History as HistoryIcon, TrendingUp, Calendar as CalendarIcon, Eye, 
  MessageSquare, ShoppingCart, CheckCircle2, AlertCircle, 
  Zap, Filter, Search, ChevronRight, ChevronLeft, Edit3, Trash2, Plus, X, Clock, MapPin, User, Sparkles, UserPlus, MessageCircle,
  Loader2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { getCalendarEvents, deleteCalendarEvent } from "@/features/crm/actions";
import { CalendarEvent } from "@/features/crm/types";
import { TaskModal } from "@/components/ui/TaskModal";

export function GlobalCalendarView() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarEvent | undefined>(undefined);

  useEffect(() => {
    setIsMounted(true);
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const res = await getCalendarEvents();
    if (res.success && res.events) {
      setEvents(res.events);
    }
    setLoading(false);
  };

  const getTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      landing_page_view: 'צפייה בעמוד',
      checkout_start: 'תחילת רכישה',
      payment_success: 'תשלום בוצע',
      payment_failure: 'תשלום נכשל',
      whatsapp_sent: 'וואטסאפ נשלח',
      registration: 'הרשמה חדשה',
      reminder: 'תזכורת',
      manual: 'הערה ידנית',
      product_view: 'צפייה במוצר'
    };
    return labels[type || ""] || type?.replace(/_/g, ' ') || 'פגישה/משימה';
  };

  const getContactName = (log: any) => {
    if (log.contactName) return log.contactName;
    if (log.linkedContacts && log.linkedContacts.length > 0) {
      return log.linkedContacts.map((c: any) => c.name).join(", ");
    }
    return "כללי";
  };

  const filteredLogs = useMemo(() => {
    return events.filter(log => {
      const name = getContactName(log).toLowerCase();
      const message = (log.title || '').toLowerCase() + " " + (log.description || '').toLowerCase();
      const matchesSearch = message.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase());
      
      if (filterType === 'registrations') return log.type === 'registration' && matchesSearch;
      if (filterType === 'pageviews') return log.type === 'landing_page_view' && matchesSearch;
      if (filterType === 'whatsapp_sent') return log.type === 'whatsapp_sent' && matchesSearch;
      
      const matchesType = filterType === 'all' || log.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.start || b.date || 0).getTime() - new Date(a.start || a.date || 0).getTime());
  }, [events, searchTerm, filterType]);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const dayLogs = events.filter(l => {
        const evDate = (l.start || l.date || "").split("T")[0];
        return evDate === dateStr;
      });
      return {
        date: new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' }),
        interactions: dayLogs.length,
        whatsapp: dayLogs.filter(l => l.type === 'whatsapp' || l.type === 'whatsapp_sent').length,
        meetings: dayLogs.filter(l => l.type === 'meeting' || !l.type).length
      };
    });
  }, [events]);

  const typeDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    events.forEach(l => {
      const t = l.type || 'meeting';
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name: getTypeLabel(name), value }));
  }, [events]);

  const handleDelete = async (id?: string) => {
    if (!id || !window.confirm("האם למחוק אינטראקציה זו?")) return;
    const res = await deleteCalendarEvent(id);
    if (res.success) {
      fetchEvents();
    }
  };

  const openEditModal = (item: CalendarEvent) => {
    setEditingItem(item);
    setIsTaskModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsTaskModalOpen(false);
    fetchEvents();
  };

  return (
    <div className="flex flex-col gap-6 font-heebo w-full h-full text-white">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex bg-[#1a1a1a] p-1.5 rounded-2xl border border-white/10 shadow-sm w-full overflow-x-auto no-scrollbar justify-between">
          <NavTab active={activeTab === 'calendar'} icon={<CalendarIcon size={18} />} label="לוח שנה" onClick={() => setActiveTab('calendar')} />
          <NavTab active={activeTab === 'journal'} icon={<HistoryIcon size={18} />} label="יומן פעילות" onClick={() => { setActiveTab('journal'); setFilterType('all'); }} />
          <NavTab active={activeTab === 'registrations'} icon={<UserPlus size={18} />} label="הרשמות" onClick={() => { setActiveTab('registrations'); setFilterType('registration'); }} />
          <NavTab active={activeTab === 'pageviews'} icon={<Eye size={18} />} label="צפיות" onClick={() => { setActiveTab('pageviews'); setFilterType('landing_page_view'); }} />
          <NavTab active={activeTab === 'whatsapp'} icon={<MessageCircle size={18} />} label="וואטסאפ" onClick={() => { setActiveTab('whatsapp'); setFilterType('whatsapp_sent'); }} />
          <NavTab active={activeTab === 'analytics'} icon={<TrendingUp size={18} />} label="אנליטיקה" onClick={() => setActiveTab('analytics')} />
        </div>
        <button 
          onClick={() => { setEditingItem(undefined); setIsTaskModalOpen(true); }}
          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2.5 rounded-xl font-bold hover:bg-amber-400 transition-colors shrink-0"
        >
          <Plus size={18} strokeWidth={3} /> משימה חדשה
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {activeTab === 'calendar' && (
              <AdvancedCalendar 
                logs={events} 
                onEdit={openEditModal} 
                getContactName={getContactName}
              />
            )}

            {(activeTab === 'journal' || activeTab === 'registrations' || activeTab === 'whatsapp' || activeTab === 'pageviews') && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className="bg-[#1a1a1a] p-6 rounded-[2rem] shadow-sm border border-white/5">
                    <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Filter size={16} /> חיפוש וסינון
                    </h3>
                    <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                      <input 
                        type="text" 
                        placeholder="חיפוש..." 
                        className="w-full bg-[#111] border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold text-white outline-none focus:border-amber-500/50 transition-all text-right"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  {filteredLogs.map((log, idx) => (
                    <TimelineItem 
                      key={log.id || idx}
                      log={log}
                      contactName={getContactName(log)}
                      onEdit={() => openEditModal(log)}
                      onDelete={() => handleDelete(log.id)}
                      getTypeLabel={getTypeLabel}
                    />
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-20 bg-[#1a1a1a] rounded-[2.5rem] border-2 border-dashed border-white/10">
                      <div className="text-white/40 mb-2">לא נמצאו פעילויות</div>
                      <div className="text-xs text-white/20">נסה לשנות את הסינון או החיפוש</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-sm border border-white/5">
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xl font-black text-white">מגמת פעילות שבועית</h3>
                   </div>
                   <div className="w-full relative overflow-hidden min-h-[300px]" dir="ltr">
                      {isMounted && (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12, fontWeight: 700}} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#222', color: '#fff' }} />
                            <Area type="monotone" dataKey="interactions" stroke="#f59e0b" strokeWidth={4} fill="rgba(245, 158, 11, 0.2)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                </div>

                <div className="flex flex-col gap-6">
                   <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-sm border border-white/5 flex-1">
                      <h3 className="text-lg font-black text-white mb-8 text-right">התפלגות סוגי פעולות</h3>
                      <div className="w-full relative overflow-hidden min-h-[250px]" dir="ltr">
                        {isMounted && (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={typeDistribution} layout="vertical">
                              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#aaa', fontSize: 11, fontWeight: 700}} width={90} />
                              <XAxis type="number" hide />
                              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px' }} />
                              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                {typeDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#a855f7'][index % 4]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={handleModalSuccess}
        editingEvent={editingItem}
      />
    </div>
  );
}

// ----------------------------------------------------
// UI Sub-Components
// ----------------------------------------------------

const NavTab = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-bold whitespace-nowrap ${
      active ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon} <span className="hidden sm:inline">{label}</span>
  </button>
);

const TimelineItem = ({ log, contactName, onDelete, onEdit, getTypeLabel }: any) => {
  const getIcon = () => {
    switch (log.type) {
      case 'landing_page_view': return <Eye size={18} className="text-blue-400" />;
      case 'whatsapp_sent': return <MessageSquare size={18} className="text-emerald-400" />;
      case 'registration': return <User size={18} className="text-purple-400" />;
      case 'reminder': return <CalendarIcon size={18} className="text-amber-500" />;
      default: return <Zap size={18} className="text-slate-400" />;
    }
  };

  const getBadgeStyle = () => {
    switch (log.type) {
      case 'whatsapp_sent': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'registration': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'landing_page_view': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'reminder': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-white/5 text-white/60 border-white/10';
    }
  };

  return (
    <div className="relative group pl-8">
      <div className="absolute right-0 top-6 w-3 h-3 rounded-full border-2 border-[#111] ring-4 ring-[#111] bg-amber-500 transition-all group-hover:scale-150 z-10 translate-x-[5px]"></div>
      <div className="absolute right-[5px] top-9 bottom-[-24px] w-0.5 bg-white/5 group-last:hidden"></div>
      
      <div className="bg-[#1a1a1a] p-6 rounded-[2rem] shadow-sm border border-white/5 relative hover:border-amber-500/30 transition-all cursor-pointer" onClick={onEdit}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
           <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-2xl border ${getBadgeStyle()}`}>
                {getIcon()}
              </div>
              <div>
                <h4 className="font-black text-white leading-tight">{log.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${getBadgeStyle()}`}>
                    {getTypeLabel(log.type)}
                  </span>
                  <span className="text-xs text-white/40">{contactName}</span>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[11px] text-white/40 font-bold uppercase tracking-tight">
                {new Date(log.start || log.date).toLocaleDateString('he-IL')} {new Date(log.start || log.date).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
              </span>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={16} /></button>
              </div>
           </div>
        </div>
        {log.description && (
          <p className="text-sm text-white/60 font-medium leading-relaxed pr-2">{log.description}</p>
        )}
        
        {/* Pending Status Badge */}
        {log.status === 'ממתין לטיפול' && (
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 w-fit">
            <Clock size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">ממתין לטיפול מנהל</span>
          </div>
        )}

        {/* Smart Suggestions */}
        {log.metadata?.suggestions && log.metadata.suggestions.length > 0 && (
          <div className="mt-5 p-4 bg-[#111] rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-amber-500">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">הצעות להמשך טיפול (AI)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {log.metadata.suggestions.map((suggestion: string, sIdx: number) => (
                <div key={sIdx} className="bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-white/80 shadow-sm">
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Custom Calendar Sub-Components
// ----------------------------------------------------

const AdvancedCalendar = ({ logs, onEdit, getContactName }: any) => {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const next = () => {
    if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    else if (view === 'year') setCurrentDate(new Date(currentDate.getFullYear() + 1, 0));
    else setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const prev = () => {
    if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    else if (view === 'year') setCurrentDate(new Date(currentDate.getFullYear() - 1, 0));
    else setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const renderView = () => {
    if (view === 'year') return <YearView currentDate={currentDate} onMonthClick={(m: number) => { setCurrentDate(new Date(currentDate.getFullYear(), m)); setView('month'); }} />;
    if (view === 'month') return <MonthView currentDate={currentDate} logs={logs} onDayClick={(d: Date) => { setCurrentDate(d); setView('day'); }} />;
    if (view === 'day') return <DayView date={currentDate} logs={logs} onEdit={onEdit} getContactName={getContactName} />;
  };

  return (
    <div className="bg-[#1a1a1a] p-6 lg:p-8 rounded-[2rem] shadow-sm border border-white/5 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-black text-amber-500">
            {view === 'day' ? currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }) :
             view === 'month' ? currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' }) :
             currentDate.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <button onClick={prev} className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/10 text-white"><ChevronRight size={20} /></button>
            <button onClick={next} className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/10 text-white"><ChevronLeft size={20} /></button>
          </div>
        </div>

        <div className="flex bg-[#111] p-1 rounded-2xl border border-white/10 self-stretch sm:self-auto">
          <ViewBtn active={view === 'day'} label="יום" onClick={() => setView('day')} />
          <ViewBtn active={view === 'month'} label="חודש" onClick={() => setView('month')} />
          <ViewBtn active={view === 'year'} label="שנה" onClick={() => setView('year')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + currentDate.getTime()}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const ViewBtn = ({ active, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-amber-500 text-black shadow-sm' : 'text-white/40 hover:text-white'}`}
  >
    {label}
  </button>
);

const MonthView = ({ currentDate, logs, onDayClick }: any) => {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const getDayItems = (day: number) => {
    const dStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA'); // YYYY-MM-DD local
    return logs.filter((it: CalendarEvent) => (it.start || it.date || "").split("T")[0] === dStr);
  };

  return (
    <div className="grid grid-cols-7 gap-2 lg:gap-4 h-full auto-rows-fr">
      {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
        <div key={d} className="text-center text-xs font-black text-white/40 uppercase py-2 shrink-0 h-fit">{d}'</div>
      ))}
      {padding.map((_, i) => <div key={`p-${i}`} className="min-h-[80px]"></div>)}
      {days.map(day => {
        const items = getDayItems(day);
        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

        return (
          <div 
            key={day} 
            onClick={() => onDayClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            className={`min-h-[80px] rounded-[1rem] lg:rounded-[1.5rem] border p-2 lg:p-3 flex flex-col items-center justify-start gap-2 transition-all cursor-pointer group hover:border-amber-500/50 ${
              isToday ? 'bg-amber-500/10 border-amber-500/50' :
              items.length > 0 ? 'bg-white/5 border-white/10' : 'bg-[#111] border-transparent hover:border-white/10'
            }`}
          >
            <span className={`text-sm lg:text-base font-black ${isToday ? 'text-amber-500' : items.length > 0 ? 'text-white' : 'text-white/30'}`}>{day}</span>
            <div className="flex flex-wrap gap-1 justify-center w-full">
              {items.slice(0, 3).map((it: CalendarEvent, i: number) => (
                <div key={i} className={`w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full ${it.type === 'whatsapp_sent' ? 'bg-emerald-400' : 'bg-amber-500'}`}></div>
              ))}
              {items.length > 3 && <span className="text-[9px] font-black text-white/50 w-full text-center mt-1">+{items.length-3}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const YearView = ({ currentDate, onMonthClick }: any) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 h-full content-start">
    {Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentDate.getFullYear(), i);
      const isCurrentMonth = i === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
      return (
        <div 
          key={i} 
          onClick={() => onMonthClick(i)}
          className={`aspect-[4/3] rounded-[1.5rem] border flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${isCurrentMonth ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' : 'bg-[#111] text-white/60 border-transparent hover:border-white/10 hover:text-white'}`}
        >
          <span className="font-black text-sm lg:text-lg">{monthDate.toLocaleString('he-IL', { month: 'long' })}</span>
        </div>
      );
    })}
  </div>
);

const DayView = ({ date, logs, onEdit, getContactName }: any) => {
  const dayItems = useMemo(() => {
    const dStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString('en-CA');
    return logs.filter((it: CalendarEvent) => (it.start || it.date || "").split("T")[0] === dStr).sort((a: any, b: any) => {
      const timeA = a.time || new Date(a.start).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
      const timeB = b.time || new Date(b.start).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
      return timeA.localeCompare(timeB);
    });
  }, [date, logs]);

  return (
    <div className="flex flex-col gap-4">
      {dayItems.length > 0 ? (
        dayItems.map((item: CalendarEvent) => (
          <div 
            key={item.id} 
            onClick={() => onEdit(item)}
            className="p-5 rounded-[1.5rem] bg-[#111] border border-white/5 hover:border-amber-500/30 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="font-black text-white">{item.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-white/40">
                  <span className="flex items-center gap-1"><User size={12} /> {getContactName(item)}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {item.time || new Date(item.start || item.date).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-white/5 text-white/60">
                {item.type || 'משימה'}
              </span>
              <ChevronLeft size={16} className="text-white/20" />
            </div>
          </div>
        ))
      ) : (
        <div className="py-20 text-center text-white/20 h-full flex flex-col items-center justify-center">
          <CalendarIcon size={48} className="mb-4 opacity-20" />
          <p className="font-bold">אין פעילות או משימות ליום זה</p>
        </div>
      )}
    </div>
  );
};
