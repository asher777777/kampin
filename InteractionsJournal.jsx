import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History as HistoryIcon, TrendingUp, Calendar as CalendarIcon, Eye, 
  MessageSquare, ShoppingCart, CheckCircle2, AlertCircle, 
  Zap, Filter, Search, ChevronRight, ChevronLeft, Edit3, Trash2, Plus, X, Clock, MapPin, User, Sparkles, UserPlus, MessageCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { db, appId } from '../../lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';

const InteractionsJournal = ({ initialTab }) => {
  const { activityLogs, allRealtors, buyers, reminders, marketingPages, addReminder, updateReminderStatus } = useStore();
  const [activeTab, setActiveTab] = useState(initialTab || 'calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(initialTab === 'pageviews' ? 'pageviews' : (initialTab === 'registrations' ? 'registrations' : (initialTab === 'whatsapp' ? 'whatsapp_sent' : 'all')));

  const [isMounted, setIsMounted] = React.useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getContactName = (log) => {
    if (log.metadata?.contactName) return log.metadata.contactName;
    if (log.type === 'landing_page_view' && log.page === 'Home') return 'אורח באתר (עמוד הבית)';
    if (log.type === 'registration') return log.metadata?.contactName || 'נרשם חדש';
    const realtor = allRealtors.find(r => r.id === log.realtorId);
    if (realtor) return realtor.realtor_name || realtor.displayName;
    const buyer = buyers.find(b => b.id === log.contactId);
    if (buyer) return buyer.full_name || buyer.name;
    return log.metadata?.contactName || 'אורח לא מזוהה';
  };

  const getTypeLabel = (type) => {
    const labels = {
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
    return labels[type] || type?.replace(/_/g, ' ') || 'כללי';
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const name = getContactName(log).toLowerCase();
      const message = (log.message || '').toLowerCase();
      const matchesSearch = message.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase());
      
      if (filterType === 'registrations') return log.type === 'registration' && matchesSearch;
      if (filterType === 'pageviews') return log.type === 'landing_page_view' && matchesSearch;
      if (filterType === 'whatsapp_sent') return log.type === 'whatsapp_sent' && matchesSearch;
      
      const matchesType = filterType === 'all' || log.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [activityLogs, searchTerm, filterType, allRealtors, buyers]);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayLogs = activityLogs.filter(l => {
        const logDate = l.timestamp?.seconds ? new Date(l.timestamp.seconds * 1000).toISOString().split('T')[0] : '';
        return logDate === date;
      });
      return {
        date: new Date(date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' }),
        interactions: dayLogs.length,
        views: dayLogs.filter(l => l.type === 'landing_page_view').length,
        payments: dayLogs.filter(l => l.type === 'payment_success').length
      };
    });
  }, [activityLogs]);

  const typeDistribution = useMemo(() => {
    const types = {};
    activityLogs.forEach(l => {
      types[l.type] = (types[l.type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [activityLogs]);

  const handleDelete = async (id, type) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק?")) return;
    try {
      const collectionName = type === 'reminder' ? 'reminders' : 'activity_logs';
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, id));
    } catch (e) {
      alert("שגיאה במחיקה");
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 font-heebo animate-in fade-in duration-500 relative min-h-[800px]">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">יומן אנטרקציות חכם</h1>
          <p className="text-slate-500 mt-1">ניהול משימות, פגישות ותיעוד פעילות במקום אחד.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar">
          <NavTab active={activeTab === 'calendar'} icon={<CalendarIcon size={18} />} label="לוח שנה" onClick={() => setActiveTab('calendar')} />
          <NavTab active={activeTab === 'journal'} icon={<HistoryIcon size={18} />} label="יומן פעילות" onClick={() => { setActiveTab('journal'); setFilterType('all'); }} />
          <NavTab active={activeTab === 'registrations'} icon={<UserPlus size={18} />} label="הרשמות" onClick={() => { setActiveTab('registrations'); setFilterType('registrations'); }} />
          <NavTab active={activeTab === 'pageviews'} icon={<Eye size={18} />} label="צפיות" onClick={() => { setActiveTab('pageviews'); setFilterType('pageviews'); }} />
          <NavTab active={activeTab === 'whatsapp'} icon={<MessageCircle size={18} />} label="וואטסאפ" onClick={() => { setActiveTab('whatsapp'); setFilterType('whatsapp_sent'); }} />
          <NavTab active={activeTab === 'analytics'} icon={<TrendingUp size={18} />} label="אנליטיקה" onClick={() => setActiveTab('analytics')} />
        </div>
      </div>

      <button 
        onClick={() => { setEditingItem(null); setIsTaskModalOpen(true); }}
        className="fixed bottom-10 left-10 w-16 h-16 bg-kushan-orange text-white rounded-full shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] group"
      >
        <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <div className="flex-1">
        {activeTab === 'calendar' && (
          <AdvancedCalendar 
            logs={activityLogs} 
            reminders={reminders} 
            marketingPages={marketingPages}
            onEdit={openEditModal} 
            getContactName={getContactName}
          />
        )}

        {(activeTab === 'journal' || activeTab === 'registrations' || activeTab === 'whatsapp' || activeTab === 'pageviews') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Filter size={16} /> חיפוש וסינון
                </h3>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="חיפוש..." 
                    className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold outline-none focus:ring-4 focus:ring-kushan-navy/5 transition-all text-right"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              {filteredLogs.map(log => (
                <div 
                  key={log.id} 
                  onClick={() => openEditModal(log)}
                  className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-kushan-orange/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                   <div className="flex justify-between items-center">
                     <div>
                       <div className="text-sm font-black text-slate-800">{getContactName(log)}</div>
                       <div className="text-xs text-slate-400 mt-1">{getTypeLabel(log.type)}</div>
                     </div>
                     <div className="text-[10px] font-bold text-slate-400">
                       {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleDateString('he-IL') : ''}
                     </div>
                   </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="text-slate-400 mb-2">לא נמצאו פעילויות</div>
                  <div className="text-xs text-slate-300">נסה לשנות את הסינון או החיפוש</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black text-slate-800">מגמת פעילות שבועית</h3>
               </div>
               <div className="w-full relative overflow-hidden min-h-[400px]">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" aspect={2}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                        <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none' }} />
                        <Area type="monotone" dataKey="interactions" stroke="#1e293b" strokeWidth={4} fill="#e2e8f0" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[400px]" />}
               </div>
            </div>

            <div className="flex flex-col gap-8">
               <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 flex-1">
                  <h3 className="text-lg font-black text-slate-800 mb-8">התפלגות סוגי פעולות</h3>
                  <div className="w-full relative overflow-hidden min-h-[300px]">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" aspect={1.5}>
                        <BarChart data={typeDistribution} layout="vertical">
                          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} width={120} />
                          <XAxis type="number" hide />
                          <Tooltip cursor={{fill: '#f8fafc'}} />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                            {typeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#1e293b', '#fb923c', '#10b981', '#3b82f6'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-[300px]" />}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        editingItem={editingItem}
        buyers={buyers}
      />
    </div>
  );
};

const AdvancedCalendar = ({ logs, reminders, marketingPages, onEdit, getContactName }) => {
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
    if (view === 'year') return <YearView currentDate={currentDate} onMonthClick={(m) => { setCurrentDate(new Date(currentDate.getFullYear(), m)); setView('month'); }} />;
    if (view === 'month') return <MonthView currentDate={currentDate} logs={logs} reminders={reminders} marketingPages={marketingPages} onDayClick={(d) => { setCurrentDate(d); setView('day'); }} />;
    if (view === 'day') return <DayView date={currentDate} logs={logs} reminders={reminders} marketingPages={marketingPages} onEdit={onEdit} getContactName={getContactName} />;
  };

  return (
    <div className="bg-white p-6 lg:p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-black text-slate-800">
            {view === 'day' ? currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }) :
             view === 'month' ? currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' }) :
             currentDate.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <button onClick={prev} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-gray-100"><ChevronRight size={20} /></button>
            <button onClick={next} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-gray-100"><ChevronLeft size={20} /></button>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-2xl border border-gray-100 self-stretch sm:self-auto">
          <ViewBtn active={view === 'day'} label="יום" onClick={() => setView('day')} />
          <ViewBtn active={view === 'month'} label="חודש" onClick={() => setView('month')} />
          <ViewBtn active={view === 'year'} label="שנה" onClick={() => setView('year')} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view + currentDate.getTime()}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ViewBtn = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${active ? 'bg-white text-kushan-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {label}
  </button>
);

const MonthView = ({ currentDate, logs, reminders, marketingPages, onDayClick }) => {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const getDayItems = (day) => {
    const l = logs.filter(it => {
      const d = new Date(it.timestamp?.seconds * 1000);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
    const r = reminders.filter(it => {
      const d = new Date(it.dueDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
    const p = (marketingPages || []).filter(it => {
      if (it.type !== 'event' || !it.eventDateTime) return false;
      const d = new Date(it.eventDateTime);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
    return [...l, ...r, ...p];
  };

  return (
    <div className="grid grid-cols-7 gap-3 lg:gap-6">
      {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
        <div key={d} className="text-center text-xs font-black text-slate-400 uppercase py-2 lg:py-4">{d}'</div>
      ))}
      {padding.map((_, i) => <div key={`p-${i}`} className="aspect-square"></div>)}
      {days.map(day => {
        const items = getDayItems(day);
        const hasEvent = items.some(it => it.type === 'event');
        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

        return (
          <div 
            key={day} 
            onClick={() => onDayClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            className={`aspect-square rounded-[1.5rem] lg:rounded-[2.5rem] border p-2 lg:p-4 flex flex-col items-center justify-center lg:justify-between transition-all cursor-pointer group hover:scale-105 active:scale-95 ${
              isToday ? 'bg-kushan-navy text-white border-kushan-navy ring-4 ring-slate-100' :
              hasEvent ? 'bg-purple-50 border-purple-200' :
              items.length > 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent hover:border-gray-200'
            }`}
          >
            <span className={`text-sm lg:text-lg font-black ${isToday ? 'text-white' : items.length > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{day}</span>
            <div className="flex flex-wrap gap-1 justify-center mt-1">
              {items.slice(0, 3).map((it, i) => (
                <div key={i} className={`w-1 lg:w-2 h-1 lg:h-2 rounded-full ${it.type === 'event' ? 'bg-purple-400' : it.type ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
              ))}
              {items.length > 3 && <span className="text-[8px] font-black opacity-50">+{items.length-3}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const YearView = ({ currentDate, onMonthClick }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-6">
    {Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentDate.getFullYear(), i);
      const isCurrentMonth = i === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
      return (
        <div 
          key={i} 
          onClick={() => onMonthClick(i)}
          className={`p-6 rounded-[2rem] border text-center cursor-pointer transition-all hover:scale-105 ${isCurrentMonth ? 'bg-kushan-navy text-white border-kushan-navy' : 'bg-slate-50 border-transparent hover:border-gray-200'}`}
        >
          <span className="font-black text-sm">{monthDate.toLocaleString('he-IL', { month: 'long' })}</span>
        </div>
      );
    })}
  </div>
);

const DayView = ({ date, logs, reminders, marketingPages, onEdit, getContactName }) => {
  const dayItems = useMemo(() => {
    const l = logs.filter(it => {
      const d = new Date(it.timestamp?.seconds * 1000);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).map(it => ({ ...it, isLog: true }));
    
    const r = reminders.filter(it => {
      const d = new Date(it.dueDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).map(it => ({ ...it, isReminder: true }));

    const p = (marketingPages || []).filter(it => {
      if (it.type !== 'event' || !it.eventDateTime) return false;
      const d = new Date(it.eventDateTime);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).map(it => ({ ...it, isEventPage: true }));
    
    return [...l, ...r, ...p].sort((a, b) => {
      const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.dueDate || a.eventDateTime).getTime();
      const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.dueDate || b.eventDateTime).getTime();
      return tA - tB;
    });
  }, [date, logs, reminders, marketingPages]);

  return (
    <div className="flex flex-col gap-6">
      {dayItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          {dayItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => onEdit(item)}
              className={`p-6 rounded-[2rem] border-2 border-transparent hover:border-kushan-navy/20 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                item.isEventPage ? 'bg-purple-50' : 
                item.isReminder ? 'bg-orange-50/50' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${
                  item.isEventPage ? 'bg-purple-100 text-purple-600' :
                  item.isReminder ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                }`}>
                   {item.isEventPage ? <Sparkles size={20} /> :
                    item.isReminder ? <Clock size={20} /> : <Zap size={20} />}
                </div>
                <div>
                  <h4 className="font-black text-slate-800">{item.isEventPage ? item.title : item.isReminder ? item.text : item.message}</h4>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><User size={12} /> {item.isEventPage ? 'דף אירוע' : getContactName(item)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.isReminder ? item.dueDate : item.isEventPage ? item.eventDateTime : item.timestamp?.seconds * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.isEventPage && item.showCountdown && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-purple-600 bg-white px-2 py-1 rounded-lg">
                    <Zap size={10} /> ספירה לאחור פעילה
                  </span>
                )}
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                  item.isEventPage ? 'bg-purple-100 text-purple-600' :
                  item.isReminder ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {item.isEventPage ? 'אירוע שיווקי' : item.isReminder ? 'משימה' : item.type?.replace(/_/g, ' ')}
                </span>
                <ChevronLeft size={16} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-300">
          <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold italic">אין פעילות או משימות ליום זה</p>
        </div>
      )}
    </div>
  );
};

const TaskModal = ({ isOpen, onClose, editingItem, buyers }) => {
  const { addReminder, updateReminderStatus } = useStore();
  const [formData, setFormData] = useState({
    contactId: '',
    text: '',
    dueDate: new Date().toISOString().slice(0, 16),
    status: 'pending',
    sendToContact: false
  });

  useEffect(() => {
    if (editingItem) {
      // Safety check for date
      let rawDate = editingItem.dueDate || editingItem.eventDateTime || (editingItem.timestamp?.seconds ? editingItem.timestamp.seconds * 1000 : new Date());
      let parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) parsedDate = new Date(); // Fallback to now if invalid

      setFormData({
        contactId: editingItem.contactId || '',
        text: editingItem.text || editingItem.message || editingItem.title || '',
        dueDate: parsedDate.toISOString().slice(0, 16),
        status: editingItem.status || 'pending',
        sendToContact: editingItem.sendToContact || false
      });
    } else {
      setFormData({
        contactId: '',
        text: '',
        dueDate: new Date().toISOString().slice(0, 16),
        status: 'pending',
        sendToContact: false
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const contact = buyers.find(b => b.id === formData.contactId);
      const data = {
        ...formData,
        contactName: contact?.full_name || 'כללי',
        contactPhone: contact?.phone_primary || '',
        updatedAt: serverTimestamp()
      };

      if (editingItem && editingItem.id) {
        // Update
        const collectionName = editingItem.isReminder || !editingItem.type ? 'reminders' : 'activity_logs';
        await updateDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, editingItem.id), data);
      } else {
        // Create new Reminder
        await addReminder(data);
      }
      onClose();
    } catch (err) {
      alert("שגיאה בשמירה");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-black text-slate-800">{editingItem ? 'עריכת פריט' : 'משימה חדשה'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {editingItem?.isEventPage && (
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-purple-900">דף אירוע שיווקי</h4>
                <p className="text-xs text-purple-600">צפה בעמוד הנחיתה של האירוע</p>
              </div>
              <a 
                href={`/m/${editingItem.slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all border border-purple-100"
              >
                <Eye size={14} />
                <span>צפה בעמוד</span>
              </a>
            </div>
          )}

          {editingItem?.metadata?.suggestions && (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-kushan-navy">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">הצעות של המערכת ללקוח זה:</span>
              </div>
              <div className="flex flex-col gap-2">
                {editingItem.metadata.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 bg-kushan-orange rounded-full" />
                    <span className="text-xs font-bold text-slate-700">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">לקוח / איש קשר</label>
            <select 
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-sm outline-none"
              value={formData.contactId}
              onChange={e => setFormData({...formData, contactId: e.target.value})}
              required
            >
              <option value="">בחר איש קשר...</option>
              {buyers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">תיאור המשימה / הערה</label>
            <textarea 
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-sm outline-none min-h-[120px] resize-none"
              value={formData.text}
              onChange={e => setFormData({...formData, text: e.target.value})}
              placeholder="מה צריך לעשות?"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">מועד (תאריך ושעה)</label>
            <input 
              type="datetime-local"
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-sm outline-none"
              value={formData.dueDate}
              onChange={e => setFormData({...formData, dueDate: e.target.value})}
              required
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
             <input 
              type="checkbox" 
              className="w-5 h-5 accent-kushan-orange" 
              checked={formData.sendToContact}
              onChange={e => setFormData({...formData, sendToContact: e.target.checked})}
             />
             <span className="text-sm font-bold text-orange-800">שלח תזכורת וואטסאפ אוטומטית לנמען</span>
          </div>

          <button className="w-full py-5 bg-kushan-navy text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
            שמור משימה
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const NavTab = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 font-bold whitespace-nowrap ${
      active ? 'bg-kushan-navy text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const TimelineItem = ({ log, contactName, onDelete, onEdit }) => {
  const getIcon = () => {
    switch (log.type) {
      case 'landing_page_view': return <Eye size={18} className="text-blue-500" />;
      case 'checkout_start': return <ShoppingCart size={18} className="text-orange-500" />;
      case 'payment_success': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'payment_failure': return <AlertCircle size={18} className="text-red-500" />;
      case 'whatsapp_sent': return <MessageSquare size={18} className="text-emerald-500" />;
      case 'registration': return <User size={18} className="text-purple-500" />;
      case 'reminder': return <CalendarIcon size={18} className="text-orange-500" />;
      case 'manual': return <Edit3 size={18} className="text-orange-400" />;
      case 'landing_page_view': return <Eye size={18} className="text-blue-500" />;
      default: return <Zap size={18} className="text-slate-400" />;
    }
  };

  const getBadgeStyle = () => {
    switch (log.type) {
      case 'payment_success': return 'bg-green-50 text-green-600 border-green-100';
      case 'payment_failure': return 'bg-red-50 text-red-600 border-red-100';
      case 'whatsapp_sent': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'registration': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'landing_page_view': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'reminder': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-slate-50 text-slate-500 border-gray-100';
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -right-[46px] top-0 w-3 h-3 rounded-full border-2 border-white ring-4 ring-white bg-kushan-navy transition-all group-hover:scale-150"></div>
      <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative hover:border-slate-300 transition-all">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
           <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-2xl border ${getBadgeStyle()}`}>
                {getIcon()}
              </div>
              <div>
                <h4 className="font-black text-slate-800 leading-tight">{contactName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${getBadgeStyle()}`}>
                    {getTypeLabel(log.type)}
                  </span>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString('he-IL') : 'זה עתה'}
              </span>
              <div className="flex gap-2">
                <button onClick={onEdit} className="p-2 text-slate-300 hover:text-kushan-navy transition-all"><Edit3 size={16} /></button>
                <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
              </div>
           </div>
        </div>
        <p className="text-sm text-slate-600 font-medium leading-relaxed pr-2">{log.message}</p>
        
        {/* Pending Status Badge */}
        {log.status === 'pending' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 w-fit">
            <Clock size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">ממתין לטיפול מנהל</span>
          </div>
        )}

        {/* Smart Suggestions */}
        {log.metadata?.suggestions && log.metadata.suggestions.length > 0 && (
          <div className="mt-6 p-5 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-kushan-navy">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">הצעות להמשך טיפול (AI Suggested)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {log.metadata.suggestions.map((suggestion, sIdx) => (
                <div key={sIdx} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 shadow-sm">
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

export default InteractionsJournal;
