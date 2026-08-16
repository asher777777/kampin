"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProjectData, WbsTask, ChangeRequest, WarRoomMessage } from "../types";
import { submitChangeRequestAction, approveChangeRequestAction, addWarRoomMessage } from "../actions";
import { MessageSquare, PlusCircle, AlertTriangle, ShieldCheck, DollarSign, Clock, Lock, Send, Eye, Users, RefreshCw, ChevronLeft } from "lucide-react";

interface VirtualWarRoomProps {
  project: ProjectData;
  onUpdateProject: (updated: ProjectData) => void;
  onBack: () => void;
}

export default function VirtualWarRoom({
  project,
  onUpdateProject,
  onBack
}: VirtualWarRoomProps) {
  const [currentUserRole, setCurrentUserRole] = useState<"PM" | "Supplier">("PM");
  const [selectedChannel, setSelectedChannel] = useState("כללי");
  const [typedMessage, setTypedMessage] = useState("");
  const [messages, setMessages] = useState<WarRoomMessage[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  
  // Change Request Form State
  const [showCrModal, setShowCrModal] = useState(false);
  const [crTitle, setCrTitle] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crBudgetImpact, setCrBudgetImpact] = useState(0);
  const [crScheduleImpact, setCrScheduleImpact] = useState(0);
  const [crImpactReport, setCrImpactReport] = useState<{ allowed: boolean; warn: boolean; message: string } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize data
  useEffect(() => {
    if (project) {
      setMessages(project.warRoomMessages || []);
      setChangeRequests(project.changeRequests || []);
    }
  }, [project]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannel]);

  // Calculate change impact dynamically as user types in form
  useEffect(() => {
    if (!crTitle) {
      setCrImpactReport(null);
      return;
    }

    const budgetAfterChange = (project.metrics?.budget || 0) + Number(crBudgetImpact);
    const approvedBudget = project.charter?.lockedBudget || 0;
    
    let isBlocked = false;
    let isWarning = false;
    let message = "השינוי תואם את גבולות התקציב של האמנה.&rlm;";

    // Budget check
    if (budgetAfterChange > approvedBudget) {
      isBlocked = true;
      message = `חריגה בתקציב האמנה! התקציב הכולל יגיע ל-₪${budgetAfterChange.toLocaleString()} לעומת ₪${approvedBudget.toLocaleString()} המאושרים באמנה. המערכת תחסום אישור אוטומטי.&rlm;`;
    }

    // Schedule check (check if any contractual milestone is delayed)
    const milestoneTasks = project.baseline?.milestones || [];
    if (Number(crScheduleImpact) > 0 && milestoneTasks.length > 0) {
      isWarning = true;
      if (!isBlocked) {
        message = `אזהרה: שינוי לוחות הזמנים עשוי לדחות אבני דרך חוזיות בכ-${crScheduleImpact} ימים.&rlm;`;
      }
    }

    setCrImpactReport({
      allowed: !isBlocked,
      warn: isWarning,
      message
    });

  }, [crBudgetImpact, crScheduleImpact, crTitle]);

  // Submit Change Request
  const handleCreateChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) return;

    try {
      const res = await submitChangeRequestAction(
        project.id!,
        crTitle,
        crDesc,
        Number(crBudgetImpact),
        Number(crScheduleImpact),
        currentUserRole === "PM" ? "מנהל הפרויקט" : "ספק חיצוני"
      );

      if (res.success && res.changeRequests) {
        setChangeRequests(res.changeRequests);
        setShowCrModal(false);
        // Reset form
        setCrTitle("");
        setCrDesc("");
        setCrBudgetImpact(0);
        setCrScheduleImpact(0);
        
        // Log in war room chat
        await handleSendMessage(`הוגשה בקשת שינוי חדשה: "${crTitle}" באומדן השפעה של ₪${Number(crBudgetImpact).toLocaleString()} ותוספת של ${crScheduleImpact} ימים.&rlm;`, "מערכת", "מערכת", "כללי");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Change Request
  const handleApproveRequest = async (requestId: string) => {
    const request = changeRequests.find(r => r.id === requestId);
    if (!request) return;

    const budgetAfterChange = (project.metrics?.budget || 0) + request.budgetImpact;
    const approvedBudget = project.charter?.lockedBudget || 0;

    // RACI/PM strict logic: Block if budget limit exceeded unless PM confirms bypass
    if (budgetAfterChange > approvedBudget && currentUserRole !== "PM") {
      alert("אישור חסום: חריגה מהתקציב המאושר באמנה מחייבת אישור מנהל פרויקט (PM) בלבד!");
      return;
    }

    if (budgetAfterChange > approvedBudget) {
      const confirmOverride = confirm("שינוי זה חורג מתקציב האמנה הנעול. האם ברצונך לבצע מעקף ידני (PM Override) ולאשר את עדכון ה-Baseline?");
      if (!confirmOverride) return;
    }

    try {
      const res = await approveChangeRequestAction(project.id!, requestId, "מנהל הפרויקט (RACI A)");
      if (res.success && res.data) {
        onUpdateProject(res.data);
        setChangeRequests(res.data.changeRequests || []);
        
        // Log to war room
        await handleSendMessage(`בקשת השינוי "${request.title}" אושרה רשמית על ידי מורשה החתימה. עץ המשימות וה-Baseline של הפרויקט עודכנו.&rlm;`, "מערכת", "מערכת", "כללי");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send message
  const handleSendBtn = async () => {
    if (!typedMessage.trim()) return;
    const senderName = currentUserRole === "PM" ? "מיכאל (מנהל פרויקט)" : "ספק חיצוני (לוגיסטיקה)";
    const senderRole = currentUserRole === "PM" ? "PM" : "Supplier";
    await handleSendMessage(typedMessage.trim(), senderName, senderRole, selectedChannel);
    setTypedMessage("");
  };

  const handleSendMessage = async (text: string, senderName: string, senderRole: string, channel: string) => {
    try {
      const res = await addWarRoomMessage(project.id!, {
        senderName,
        senderRole,
        message: text,
        channel
      });
      if (res.success && res.message) {
        setMessages(prev => [...prev, res.message!]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // RBAC Filter: Suppliers only see channels: 'כללי', and their assigned area, PM sees all.
  const allChannels = ["כללי", "לוגיסטיקה", "שיווק", "כספים"];
  const visibleChannels = currentUserRole === "PM" 
    ? allChannels 
    : ["כללי", "לוגיסטיקה"]; // Locked to assigned supplier sector

  // Filter messages for current channel and role accessibility
  const filteredMessages = messages.filter(msg => msg.channel === selectedChannel);

  // Supplier tasks
  const supplierTasks = project.tasks.filter(t => t.raci.r.includes("ספק") || t.raci.r.includes("לוגיסטיקה") || t.raci.r.includes("צלם") || t.raci.r.includes("מעצב"));

  return (
    <div className="w-full max-w-6xl mx-auto p-4 text-right" dir="rtl">
      
      {/* Role Switcher for Testing */}
      <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 px-4 py-2.5 rounded-2xl mb-6 text-xs">
        <div className="flex items-center gap-2">
          <Eye className="w-4.5 h-4.5 text-[#f59e0b]" />
          <span className="font-bold text-zinc-600 dark:text-zinc-400">החלף תצוגת בדיקה:</span>
          <select
            value={currentUserRole}
            onChange={(e) => {
              const role = e.target.value as "PM" | "Supplier";
              setCurrentUserRole(role);
              if (role === "Supplier") setSelectedChannel("כללי");
            }}
            className="bg-white dark:bg-black border border-zinc-300 dark:border-white/10 rounded-lg py-1 px-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="PM">מנהל פרויקט (God View)</option>
            <option value="Supplier">ספק/חבר צוות (Contributor View - Zero Noise)</option>
          </select>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">מצב הרשאות פעיל: {currentUserRole === "PM" ? "מנהל על (RACI A)" : "ספק לוגיסטיקה (RACI R)"}</span>
      </div>

      {/* Grid War Room */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[550px]">
        
        {/* Panel 1 (Left): Personal access, Change Request button */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-3xl flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-4 flex items-center gap-1.5 border-b border-zinc-200 dark:border-white/5 pb-2">
              <Users className="w-4.5 h-4.5 text-[#f59e0b]" />
              משתתפי הפרויקט
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-800 dark:text-white">מיכאל (מנהל פרויקט)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">רכז מתנדבים (RACI C)</span>
              </div>
              {(project.roles || []).map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${role.status === "active" ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {role.assignedContactName || role.roleTitle} {role.status !== "active" && "(טרם נקלט)"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 dark:border-white/5 pt-4">
            <button
              onClick={() => setShowCrModal(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              הגש בקשת שינוי
            </button>
          </div>
        </div>

        {/* Panel 2 (Center): Dashboard / Personal Task List */}
        <div className="lg:col-span-2 space-y-6">
          
          {currentUserRole === "PM" ? (
            /* Manager's God View */
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-3xl shadow-lg space-y-6">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">מרכז בקרת פרויקט: {project.name}</h3>
                <span className="text-xs text-zinc-500">מבט-על מלא על לוחות זמנים, תקציב וסיכונים מנועלים.</span>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                  <span className="text-[10px] text-zinc-500 block mb-1">תקציב פעיל:</span>
                  <span className="text-sm font-black text-[#f59e0b] font-mono">₪{project.metrics?.budget.toLocaleString()}</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">מתוך ₪{project.charter?.lockedBudget.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                  <span className="text-[10px] text-zinc-500 block mb-1">לוח זמנים:</span>
                  <span className="text-sm font-black text-zinc-800 dark:text-white font-mono">{project.metrics?.deadlineDays} ימים</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                  <span className="text-[10px] text-zinc-500 block mb-1">אבני דרך:</span>
                  <span className="text-sm font-black text-zinc-800 dark:text-white font-mono">
                    {project.baseline?.milestones.length || 0}
                  </span>
                </div>
              </div>

              {/* Change Requests Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  בקשות שינוי ממתינות לאישור (Change Control)
                </h4>

                {changeRequests.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4 border border-dashed border-zinc-200 dark:border-white/5 rounded-xl">אין בקשות שינוי פעילות.&rlm;</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {changeRequests.map(req => {
                      const isApproved = req.status === "approved";
                      const isBudgetWarning = (project.metrics?.budget || 0) + req.budgetImpact > (project.charter?.lockedBudget || 0);

                      return (
                        <div
                          key={req.id}
                          className={`p-3.5 rounded-xl border transition-all text-right ${
                            isApproved
                              ? "bg-green-950/15 border-green-500/30 text-green-400"
                              : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-bold text-zinc-800 dark:text-white block">{req.title}</span>
                              <span className="text-[10px] text-zinc-400">הוגש על ידי: {req.requestedBy}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isApproved ? "bg-green-950 border-green-500 text-green-400" : "bg-amber-950 border-amber-500 text-amber-400"
                            }`}>
                              {isApproved ? "אושר" : "ממתין לחתימה"}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">{req.description}</p>
                          
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-white/5 pt-2.5">
                            <div className="flex gap-3 text-[10px] font-bold font-mono">
                              <span className={req.budgetImpact > 0 ? 'text-red-500' : 'text-zinc-400'}>תקציב: +₪{req.budgetImpact.toLocaleString()}</span>
                              <span className={req.scheduleImpactDays > 0 ? 'text-red-500' : 'text-zinc-400'}>זמן: +{req.scheduleImpactDays} ימים</span>
                            </div>
                            
                            {!isApproved && (
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                              >
                                {isBudgetWarning ? "אשר חריגה (PM Bypass)" : "אשר ועדכן Baseline"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Contributor View: Personal Tasks & Deadlines (Zero Noise) */
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-3xl shadow-lg space-y-6">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">לוח המשימות שלי</h3>
                <span className="text-xs text-zinc-500">רשימת משימות ולוחות זמנים אישיים המשויכים אליך.</span>
              </div>

              {supplierTasks.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-6 border border-dashed border-zinc-200 dark:border-white/5 rounded-xl">אין משימות פתוחות המשויכות לתפקידך.&rlm;</p>
              ) : (
                <div className="space-y-3">
                  {supplierTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/30 flex justify-between items-center text-right"
                    >
                      <div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-white block">{task.title}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">עלות: ₪{task.cost.toLocaleString()} | משך: {task.durationDays} ימים</span>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-400 font-bold">בתהליך עבודה</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 3 (Right): Zero-Noise communications channel panel */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-4 rounded-3xl flex flex-col justify-between shadow-lg h-[500px]">
          <div>
            <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-200 dark:border-white/5">
              ערוצי תקשורת (RBAC)
            </h3>
            <div className="space-y-1.5">
              {allChannels.map(channel => {
                const isVisible = visibleChannels.includes(channel);
                const isSelected = selectedChannel === channel;

                return (
                  <button
                    key={channel}
                    onClick={() => isVisible && setSelectedChannel(channel)}
                    disabled={!isVisible}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all text-right flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#f59e0b] text-black shadow-md"
                        : isVisible
                        ? "text-zinc-600 dark:text-gray-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                        : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{channel}</span>
                    </span>
                    {!isVisible && <Lock className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Messages Log & Sender */}
          <div className="flex-1 flex flex-col justify-between mt-4 border-t border-zinc-200 dark:border-white/5 pt-4 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 text-xs font-medium">
              {filteredMessages.map(msg => {
                const isSystem = msg.senderRole === "מערכת";
                return (
                  <div key={msg.id} className={`p-2.5 rounded-xl border ${
                    isSystem 
                      ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-500 text-center font-bold text-[10px]' 
                      : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-250 dark:border-white/5 text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {!isSystem && (
                      <div className="flex justify-between items-center mb-0.5 text-[9px] font-bold text-[#f59e0b]">
                        <span>{msg.senderName}</span>
                        <span className="text-[8px] text-zinc-400 font-mono">{new Date(msg.timestamp).toLocaleTimeString("he-IL", {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    )}
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="הקלד הודעה..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendBtn()}
                className="flex-1 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none transition-colors"
              />
              <button
                onClick={handleSendBtn}
                className="bg-[#f59e0b] text-black p-2 rounded-xl hover:bg-[#d97706] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Change Request Modal (Change Control Protocol Form) */}
      {showCrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-6 rounded-3xl w-full max-w-md text-right shadow-2xl relative">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-4 flex items-center gap-1.5 border-b border-zinc-250 dark:border-white/5 pb-2">
              <AlertTriangle className="w-5 h-5 text-[#f59e0b] animate-pulse" />
              פרוטוקול בקשת שינוי (Change Request)
            </h3>
            
            <form onSubmit={handleCreateChangeRequest} className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">נושא השינוי:</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: הוספת סדנה נוספת בכנס"
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 font-bold block mb-1">תיאור והסבר לשינוי:</label>
                <textarea
                  rows={3}
                  placeholder="פרט את הסיבות לצורך בשינוי..."
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold block mb-1">תוספת תקציב (₪):</label>
                  <input
                    type="number"
                    value={crBudgetImpact}
                    onChange={(e) => setCrBudgetImpact(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold block mb-1">תוספת זמן (ימים):</label>
                  <input
                    type="number"
                    value={crScheduleImpact}
                    onChange={(e) => setCrScheduleImpact(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2.5 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Impact Report Analysis */}
              {crImpactReport && (
                <div className={`p-3 rounded-xl border text-[10px] leading-relaxed font-bold ${
                  crImpactReport.allowed 
                    ? crImpactReport.warn 
                      ? 'bg-amber-950/20 border-amber-500/20 text-amber-500' 
                      : 'bg-green-950/20 border-green-500/20 text-green-400' 
                    : 'bg-red-950/20 border-red-500/20 text-red-500'
                }`}>
                  {crImpactReport.message}
                </div>
              )}

              <div className="flex gap-2.5 justify-end mt-6 border-t border-zinc-200 dark:border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCrModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white text-xs hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors font-bold cursor-pointer"
                >
                  בטל
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#f59e0b] text-black text-xs hover:bg-[#d97706] font-black transition-colors cursor-pointer"
                >
                  הגש בקשת שינוי
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-between items-center border-t border-zinc-200 dark:border-white/10 pt-6 mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-white font-bold text-xs py-3 px-6 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          חזור לשידוך משאבים
        </button>
      </div>

    </div>
  );
}
