"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, Plus, Trash2, Send, Loader2, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, Check, HelpCircle, MessageSquare, AlertCircle,
  Pencil, Bot, List, CalendarDays
} from "lucide-react";
import { WbsTask, ProjectCharter, ProjectData } from "../types";
import { updateWbsWithChat, saveProject } from "../actions";

interface WbsCanvasStepProps {
  projectId?: string | null;
  title: string;
  projectType: "new" | "recurring";
  charter: ProjectCharter;
  initialTasks: WbsTask[];
  onBack: () => void;
  onSaveComplete: (projectId: string) => void;
  onSaveStatusChange?: (status: "unsaved" | "saving" | "saved" | "error") => void;
}

export default function WbsCanvasStep({ projectId, title, projectType, charter, initialTasks, onBack, onSaveComplete, onSaveStatusChange }: WbsCanvasStepProps) {
  const [tasks, setTasks] = useState<WbsTask[]>(initialTasks);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectId || undefined);
  
  // View mode: canvas, list, timeline
  const [viewMode, setViewMode] = useState<"canvas" | "list" | "timeline">("canvas");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isMetricsCollapsed, setIsMetricsCollapsed] = useState(false);

  // Save state (Folder styling)
  const [saveStatus, setSaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");

  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Canvas Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(0.95);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 1050, y: 400 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Chat bar state
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "היי! אני המחולל. אתה יכול לבקש ממני לעדכן את העץ, לקצר זמנים, להוסיף משימות או לשנות RACI בקול חופשי." }
  ]);

  // Inline edit state
  const [editingTask, setEditingTask] = useState<WbsTask | null>(null);

  // Topological sort schedule calculator for Timeline view
  const taskSchedule = useMemo(() => {
    const schedule: Record<string, { start: number; end: number }> = {};
    const visiting = new Set<string>();

    const getTimes = (id: string): { start: number; end: number } => {
      if (schedule[id]) return schedule[id];
      
      const task = tasks.find(t => t.id === id);
      if (!task) return { start: 0, end: 0 };

      if (visiting.has(id)) return { start: 0, end: 0 }; // Break loops
      visiting.add(id);

      let maxDepEnd = 0;
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const depTimes = getTimes(depId);
          if (depTimes.end > maxDepEnd) {
            maxDepEnd = depTimes.end;
          }
        });
      }

      const start = maxDepEnd;
      const end = start + (task.durationDays || 1);

      schedule[id] = { start, end };
      visiting.delete(id);
      return schedule[id];
    };

    tasks.forEach(task => {
      getTimes(task.id);
    });

    return schedule;
  }, [tasks]);

  // Dynamic counter animation values (running counter)
  const [displayBudget, setDisplayBudget] = useState(0);
  const [displayHours, setDisplayHours] = useState(0);

  // Calculate actual current WBS totals
  const wbsTotals = useMemo(() => {
    let budget = 0;
    let days = 0;
    tasks.forEach(t => {
      budget += t.cost || 0;
      days += t.durationDays || 0;
    });
    return { budget, hours: days * 8 };
  }, [tasks]);

  // Handle counter animations
  useEffect(() => {
    let budgetStart = displayBudget;
    const budgetEnd = wbsTotals.budget;
    let hoursStart = displayHours;
    const hoursEnd = wbsTotals.hours;
    
    if (budgetStart === budgetEnd && hoursStart === hoursEnd) return;

    const duration = 800; // 800ms animation
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad formula
      const easeProgress = progress * (2 - progress);

      setDisplayBudget(Math.floor(budgetStart + (budgetEnd - budgetStart) * easeProgress));
      setDisplayHours(Math.floor(hoursStart + (hoursEnd - hoursStart) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [wbsTotals]);

  // Layout node coordinates (Tree mind-map algorithm)
  const taskCoordinates = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    
    const Y_SPACING = 160; // Spacious vertical spacing to prevent overlapping
    const X_SPACING = -360; // Right-to-Left tree growth
    
    const categories = tasks.filter(t => t.parentId === null);
    
    const subtreeSlots: Record<string, number> = {};
    
    const calculateSlots = (nodeId: string): number => {
      if (collapsedNodes[nodeId]) {
        subtreeSlots[nodeId] = 1;
        return 1;
      }
      const children = tasks.filter(t => t.parentId === nodeId);
      if (children.length === 0) {
        subtreeSlots[nodeId] = 1;
        return 1;
      }
      let sum = 0;
      children.forEach(child => {
        sum += calculateSlots(child.id);
      });
      subtreeSlots[nodeId] = sum;
      return sum;
    };
    
    let totalSlots = 0;
    categories.forEach(cat => {
      totalSlots += calculateSlots(cat.id);
    });
    
    const assignCoords = (nodeId: string, level: number, parentYStart: number) => {
      const children = tasks.filter(t => t.parentId === nodeId);
      const slots = subtreeSlots[nodeId] || 1;
      const nodeY = parentYStart + (slots * Y_SPACING) / 2 - Y_SPACING / 2;
      
      coords[nodeId] = {
        x: level * X_SPACING,
        y: nodeY
      };
      
      if (!collapsedNodes[nodeId] && children.length > 0) {
        let childYStart = parentYStart;
        children.forEach(child => {
          assignCoords(child.id, level + 1, childYStart);
          childYStart += (subtreeSlots[child.id] || 1) * Y_SPACING;
        });
      }
    };
    
    let categoryYStart = -(totalSlots * Y_SPACING) / 2;
    categories.forEach(cat => {
      assignCoords(cat.id, 1, categoryYStart);
      categoryYStart += subtreeSlots[cat.id] * Y_SPACING;
    });
    
    coords["root"] = { x: 0, y: 0 };
    return coords;
  }, [tasks, collapsedNodes]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    // If target is inside canvas dragging area, not a node card
    if ((e.target as HTMLElement).closest(".node-card") || (e.target as HTMLElement).closest(".action-btn")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(0.4, prev + factor), 1.8));
  };

  // Inline Actions
  const handleDeleteTask = (id: string) => {
    setSaveStatus("unsaved");
    
    // Helper to recursively collect all descendant task IDs
    const getDescendants = (parentId: string): string[] => {
      const children = tasks.filter(t => t.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getDescendants(c.id)];
      });
      return ids;
    };

    const toDelete = [id, ...getDescendants(id)];
    setTasks(prev => prev.filter(t => !toDelete.includes(t.id)));
  };

  const handleAddTask = (parentId: string) => {
    setSaveStatus("unsaved");
    const newId = `t-${Date.now()}`;
    const newTask: WbsTask = {
      id: newId,
      parentId: parentId,
      title: "משימה חדשה...",
      durationDays: 2,
      cost: 500,
      dependencies: [],
      raci: {
        r: "דרוש ביצוע",
        a: "מנהל הפרויקט",
        c: "ללא",
        i: "ללא"
      }
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(newTask); // Open editor modal immediately
  };

  const handleSaveEdit = (edited: WbsTask) => {
    setSaveStatus("unsaved");
    setTasks(prev => prev.map(t => t.id === edited.id ? edited : t));
    setEditingTask(null);
  };

  // Chat adjustment processor
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const msg = chatMessage.trim();
    setChatMessage("");
    setChatHistory(prev => [...prev, { sender: "user", text: msg }]);
    setChatLoading(true);

    try {
      const res = await updateWbsWithChat(tasks, msg, charter.lockedBudget);
      if (res.success && res.tasks) {
        setTasks(res.tasks);
        setSaveStatus("unsaved");
        setChatHistory(prev => [...prev, { sender: "ai", text: "עץ המשימות וה-RACI עודכנו בהצלחה בעקבות בקשתך!" }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "ai", text: res.error || "נכשלתי בעדכון העץ. אנא נסה פקודה אחרת." }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: "ai", text: "שגיאת שרת בעיבוד הבקשה." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Save to Firebase
  const handleSaveToFirestore = async () => {
    setSaveStatus("saving");
    
    const payload: ProjectData = {
      id: currentProjectId,
      name: title,
      type: projectType,
      status: "draft",
      smartGoals: {
        s: initialTasks[0]?.raci.r || "", // Mock fallback or pass down goals properly
        m: "",
        a: "",
        r: "",
        t: ""
      }, // In full integration, we pass state down from GeneratorRoot
      charter,
      tasks,
      userId: "" // Filled on backend
    };

    try {
      const res = await saveProject(payload);
      if (res.success && res.projectId) {
        setSaveStatus("saved");
        setCurrentProjectId(res.projectId);
        setShowToast(true);
        onSaveComplete(res.projectId);
        setTimeout(() => {
          setShowToast(false);
        }, 3500);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      setSaveStatus("error");
    }
  };

  // Toggle Collapse
  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  // Helper to check if task is visible (its ancestor is not collapsed)
  const isNodeVisible = (task: WbsTask): boolean => {
    let currentParentId = task.parentId;
    while (currentParentId) {
      if (collapsedNodes[currentParentId]) return false;
      const parentNode = tasks.find(t => t.id === currentParentId);
      currentParentId = parentNode ? parentNode.parentId : null;
    }
    return true;
  };

  // Render the Nested List view (one under another / outline view)
  const renderNestedList = () => {
    const categories = tasks.filter(t => t.parentId === null);

    const renderTaskRow = (task: WbsTask, depth: number) => {
      const children = tasks.filter(t => t.parentId === task.id);
      const isCollapsed = collapsedNodes[task.id];
      const indentClass = depth === 0 ? "" : depth === 1 ? "pr-8" : "pr-16";

      return (
        <div key={task.id} className="w-full">
          {/* Row */}
          <div className={`flex items-center justify-between py-3.5 px-4 border-b border-white/5 hover:bg-white/5 transition-all ${depth === 0 ? "bg-zinc-900/40" : ""}`}>
            {/* Right: Expand/Collapse & Title */}
            <div className={`flex items-center gap-2 ${indentClass} flex-grow`}>
              {children.length > 0 ? (
                <button
                  onClick={() => toggleCollapse(task.id)}
                  className="p-1 hover:bg-zinc-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-[10px]">{isCollapsed ? "◀" : "▼"}</span>
                </button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center text-gray-600 text-[10px]">•</div>
              )}
              
              {/* Edit Title Inline */}
              <input
                type="text"
                value={task.title}
                onChange={(e) => {
                  const updated = tasks.map(t => t.id === task.id ? { ...t, title: e.target.value } : t);
                  setTasks(updated);
                  setSaveStatus("unsaved");
                }}
                className="bg-transparent border-b border-transparent hover:border-[#f59e0b]/40 focus:border-[#f59e0b] px-1 py-0.5 text-sm text-white focus:outline-none max-w-sm w-80 truncate transition-all text-right font-medium"
              />
            </div>

            {/* Left: Metadata & Actions */}
            <div className="flex items-center gap-6 shrink-0">
              {/* Cost/Budget Input */}
              <div className="flex items-center gap-1.5 w-36 justify-end">
                <span className="text-xs text-gray-500 font-mono">₪</span>
                <input
                  type="number"
                  value={task.cost || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const updated = tasks.map(t => t.id === task.id ? { ...t, cost: val } : t);
                    setTasks(updated);
                    setSaveStatus("unsaved");
                  }}
                  className="bg-transparent border-b border-transparent hover:border-[#f59e0b]/40 focus:border-[#f59e0b] px-1 py-0.5 text-xs text-right text-white focus:outline-none w-24 font-mono font-bold text-amber-500"
                />
              </div>

              {/* Duration Input */}
              <div className="flex items-center gap-1.5 w-32 justify-end">
                <input
                  type="number"
                  value={task.durationDays || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const updated = tasks.map(t => t.id === task.id ? { ...t, durationDays: val } : t);
                    setTasks(updated);
                    setSaveStatus("unsaved");
                  }}
                  className="bg-transparent border-b border-transparent hover:border-[#f59e0b]/40 focus:border-[#f59e0b] px-1 py-0.5 text-xs text-right text-white focus:outline-none w-12 font-mono text-gray-300"
                />
                <span className="text-xs text-gray-500">ימים</span>
              </div>

              {/* RACI roles display */}
              <div className="flex items-center gap-1 w-32 justify-center">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-bold border border-[#f59e0b]/20" title={`Responsible (המבצע): ${task.raci.r}`}>R: {task.raci.r.substring(0, 5)}...</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-gray-400 border border-white/5" title={`Accountable (המאשר): ${task.raci.a}`}>A</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 w-28 justify-end">
                {/* Add subtask */}
                {depth < 2 && (
                  <button
                    onClick={() => handleAddTask(task.id)}
                    className="p-1.5 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 border border-[#f59e0b]/20 text-[#f59e0b] rounded-lg transition-colors cursor-pointer"
                    title="הוסף תת-משימה"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Open detailed editor */}
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="ערוך הגדרות מלאות"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                  title="מחק משימה"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Children render */}
          {!isCollapsed && children.length > 0 && (
            <div className="w-full">
              {children.map(child => renderTaskRow(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="w-full h-full bg-[#050505] p-6 pt-24 overflow-y-auto no-scrollbar" dir="rtl">
        <div className="max-w-5xl mx-auto bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header row */}
          <div className="flex items-center justify-between bg-zinc-900/60 py-3 px-4 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
            <div className="flex-grow">שם המשימה / קטגוריה</div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="w-36 text-right">תקציב משוער</div>
              <div className="w-32 text-right">משך זמן</div>
              <div className="w-32 text-center">RACI</div>
              <div className="w-28 text-left">פעולות</div>
            </div>
          </div>
          
          {/* Categories */}
          <div className="divide-y divide-white/5">
            {categories.map(cat => renderTaskRow(cat, 0))}
            {categories.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">אין משימות זמינות.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render the Timeline Gantt-style view
  const renderTimeline = () => {
    let maxDays = 30;
    Object.values(taskSchedule).forEach(time => {
      if (time.end > maxDays) maxDays = time.end;
    });

    const dayWidth = 14; // Width per day in px
    const gridDays = Math.max(30, Math.ceil(maxDays / 5) * 5 + 5);

    const sortedTasks = [...tasks].sort((a, b) => {
      const aTime = taskSchedule[a.id] || { start: 0 };
      const bTime = taskSchedule[b.id] || { start: 0 };
      return aTime.start - bTime.start;
    });

    return (
      <div className="w-full h-full bg-[#050505] p-6 pt-24 overflow-y-auto no-scrollbar" dir="rtl">
        <div className="max-w-5xl mx-auto bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl p-6 text-right">
          <h3 className="text-sm font-bold text-gray-400 mb-6 border-b border-white/5 pb-3">לוח זמנים לפרויקט (תרשים גאנט)</h3>
          
          <div className="overflow-x-auto pb-4 no-scrollbar">
            <div className="min-w-[800px] flex flex-col">
              {/* Day Header Row */}
              <div className="flex border-b border-white/10 pb-2 mb-2">
                <div className="w-56 text-xs font-bold text-gray-400 shrink-0">שם המשימה</div>
                <div className="flex-grow relative h-6" style={{ width: gridDays * dayWidth }}>
                  {Array.from({ length: Math.ceil(gridDays / 5) }).map((_, idx) => {
                    const day = idx * 5;
                    return (
                      <div
                        key={day}
                        className="absolute text-[10px] text-gray-500 font-mono border-r border-white/5 h-6 pr-1"
                        style={{ right: day * dayWidth }}
                      >
                        יום {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task Rows */}
              <div className="divide-y divide-white/5">
                {sortedTasks.map(task => {
                  const schedule = taskSchedule[task.id] || { start: 0, end: 1 };
                  const isCategory = task.parentId === null;
                  const startX = schedule.start * dayWidth;
                  const barWidth = Math.max(1, (schedule.end - schedule.start)) * dayWidth;

                  return (
                    <div key={task.id} className="flex items-center py-3">
                      {/* Task Title */}
                      <div className="w-56 shrink-0 flex items-center gap-1.5 pr-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCategory ? "bg-[#f59e0b]" : "bg-gray-600"}`} />
                        <span className={`text-xs truncate text-right w-full ${isCategory ? "text-white font-bold" : "text-gray-300"}`} title={task.title}>
                          {task.title}
                        </span>
                      </div>

                      {/* Bar Track */}
                      <div className="flex-grow relative h-8 bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5" style={{ width: gridDays * dayWidth }}>
                        <div
                          className={`absolute top-1.5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold px-1.5 select-none ${
                            isCategory 
                              ? "bg-gradient-to-l from-[#f59e0b] to-yellow-600 text-black shadow-[0_0_10px_rgba(245,158,11,0.15)]" 
                              : "bg-zinc-800 text-gray-300 border border-white/10"
                          }`}
                          style={{
                            right: startX,
                            width: barWidth,
                          }}
                          title={`${task.title} (יום ${schedule.start} - יום ${schedule.end})`}
                        >
                          <span className="truncate">{task.durationDays} ימים</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isBudgetExceeded = wbsTotals.budget > charter.lockedBudget;

  return (
    <div className="w-full h-[calc(100vh-140px)] relative overflow-hidden text-right select-none font-sans" dir="rtl">
      
      {/* 1. Transparent Floating Metrics Panel (Frosted Glass) */}
      {isMetricsCollapsed ? (
        <div 
          onClick={() => setIsMetricsCollapsed(false)}
          className="absolute top-4 right-4 z-20 bg-zinc-950/90 backdrop-blur-md border border-[#f59e0b]/30 py-2.5 px-4 rounded-xl shadow-xl hover:bg-zinc-900 transition-all cursor-pointer flex items-center gap-2 text-right"
        >
          <span className="text-[10px] text-gray-400 font-bold font-sans">מדדי ברזל</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
          <span className="text-xs font-bold text-amber-500 font-mono">₪{displayBudget.toLocaleString()}</span>
          <Maximize2 className="w-3 h-3 text-[#f59e0b] ml-1" />
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-20 bg-zinc-950/80 backdrop-blur-md border border-[#f59e0b]/30 p-5 rounded-2xl shadow-xl w-72 text-right">
          <div className="flex justify-between items-center mb-3 border-b border-[#f59e0b]/15 pb-2">
            <button 
              type="button" 
              onClick={() => setIsMetricsCollapsed(true)}
              className="text-gray-500 hover:text-[#f59e0b] p-0.5 rounded transition-colors cursor-pointer"
              title="מזער מדדים"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <h4 className="text-gray-400 text-xs font-bold font-sans">מדדי ברזל - תקציב ולו"ז</h4>
          </div>
          
          <div className="space-y-3">
            {/* Budget Progress Comparison */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className={`font-bold ${isBudgetExceeded ? "text-red-400" : "text-[#f59e0b]"}`}>
                  {displayBudget.toLocaleString()} / {charter.lockedBudget.toLocaleString()} ₪
                </span>
                <span className="text-gray-400 font-sans">תקציב (עץ / אמנה)</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-300 ${isBudgetExceeded ? "bg-red-500" : "bg-[#f59e0b]"}`}
                  style={{ width: `${Math.min(100, (wbsTotals.budget / charter.lockedBudget) * 100)}%` }}
                />
              </div>
              {isBudgetExceeded && (
                <span className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1 font-sans">
                  <AlertCircle className="w-3 h-3" />
                  חריגה מתקציב האמנה הנעול!
                </span>
              )}
            </div>

            {/* Time Estimate */}
            <div className="flex justify-between items-center text-xs pt-1 font-sans">
              <span className="text-white font-bold">{displayHours.toLocaleString()} שעות</span>
              <span className="text-gray-400">שעות עבודה מוערכות</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 font-sans">
              <span className="text-white font-bold">{charter.durationDays} ימים</span>
              <span className="text-gray-400">דד-ליין מאושר באמנה</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Zoom & Pan Floating Toolbar */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        <button 
          onClick={() => handleZoom(0.1)} 
          className="w-10 h-10 rounded-xl bg-zinc-950/80 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 flex items-center justify-center transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button 
          onClick={() => handleZoom(-0.1)} 
          className="w-10 h-10 rounded-xl bg-zinc-950/80 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 flex items-center justify-center transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button 
          onClick={() => { setZoom(0.95); setPan({ x: 1050, y: 400 }); }} 
          className="w-10 h-10 rounded-xl bg-zinc-950/80 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 flex items-center justify-center transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Floating Toolbar (Save & View Modes) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        {/* Save Folder Button */}
        <button
          onClick={handleSaveToFirestore}
          disabled={saveStatus === "saving"}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-300 active:scale-90 cursor-pointer ${
            saveStatus === "saved"
              ? "bg-amber-950/20 border-[#f59e0b] text-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              : saveStatus === "saving"
              ? "bg-zinc-950 border-[#f59e0b]/50 text-[#f59e0b]"
              : saveStatus === "error"
              ? "bg-red-950 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              : "bg-zinc-950 border-white/30 text-white hover:border-[#f59e0b] hover:text-[#f59e0b]"
          }`}
          title="שמור פרויקט לשרת"
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Folder className={`w-6 h-6 ${saveStatus === "saved" ? "text-[#f59e0b]" : saveStatus === "error" ? "text-red-400" : ""}`} />
          )}
        </button>

        {/* View Mode Toggle Segmented Control */}
        <div className="flex bg-zinc-950/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl h-14 items-center">
          <button
            onClick={() => setViewMode("canvas")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer h-11 flex items-center gap-1.5 ${
              viewMode === "canvas"
                ? "bg-[#f59e0b] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            קנבס עץ
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer h-11 flex items-center gap-1.5 ${
              viewMode === "list"
                ? "bg-[#f59e0b] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            אחד תחת אחד
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer h-11 flex items-center gap-1.5 ${
              viewMode === "timeline"
                ? "bg-[#f59e0b] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            טיים ליין
          </button>
        </div>
      </div>

      {/* 4. Main Views: Canvas, Nested List, or Timeline */}
      {viewMode === "list" ? (
        renderNestedList()
      ) : viewMode === "timeline" ? (
        renderTimeline()
      ) : (
        /* Canvas View */
        <div 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full bg-black cursor-grab active:cursor-grabbing relative overflow-hidden"
        >
          <svg className="w-full h-full absolute inset-0 pointer-events-none">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Draw Connecting Lines */}
              {tasks.map(task => {
                if (!task.parentId || !isNodeVisible(task)) return null;
                
                // Parent coordinates
                const parentCoord = taskCoordinates[task.parentId];
                const childCoord = taskCoordinates[task.id];
                
                if (!parentCoord || !childCoord) return null;

                // Cubic bezier curves
                const midX = (parentCoord.x + childCoord.x) / 2;
                const pathData = `M ${parentCoord.x} ${parentCoord.y} C ${midX} ${parentCoord.y}, ${midX} ${childCoord.y}, ${childCoord.x} ${childCoord.y}`;

                return (
                  <path
                    key={`line-${task.id}`}
                    d={pathData}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeOpacity={0.3}
                  />
                );
              })}

              {/* Draw lines from root to top level categories */}
              {tasks.filter(t => t.parentId === null).map(cat => {
                const childCoord = taskCoordinates[cat.id];
                if (!childCoord) return null;
                
                const pathData = `M 0 0 C -100 0, -160 ${childCoord.y}, ${childCoord.x} ${childCoord.y}`;
                return (
                  <path
                    key={`line-root-${cat.id}`}
                    d={pathData}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeOpacity={0.4}
                  />
                );
              })}
            </g>
          </svg>

          {/* Absolute DOM cards wrapper */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
            {/* Central Root Node (Project Title) */}
            <div 
              className="absolute p-5 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] z-10 w-64 text-center pointer-events-auto border border-[#f59e0b]"
              style={{ left: -128, top: -45 }}
            >
              <h3 className="text-base font-black truncate">{title}</h3>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-60">גרעין הפרויקט</span>
            </div>

            {/* Render all WBS tasks and categories */}
            {tasks.map(task => {
              if (!isNodeVisible(task)) return null;
              const coord = taskCoordinates[task.id];
              if (!coord) return null;

              const isCategory = task.parentId === null;
              const hasChildren = tasks.some(t => t.parentId === task.id);
              const isCollapsed = collapsedNodes[task.id];

              return (
                <div
                  key={task.id}
                  className="absolute w-72 pointer-events-auto node-card"
                  style={{ left: coord.x - 144, top: coord.y - 50 }}
                >
                  <div 
                    className={`bg-zinc-950 border ${
                      isCategory ? "border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.05)]" : "border-[#f59e0b]/40"
                    } p-4 rounded-xl relative hover:border-[#f59e0b] hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all group`}
                    onDoubleClick={() => setEditingTask(task)}
                  >
                    {/* Category / Node title */}
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-white text-sm font-bold truncate max-w-[200px]" title={task.title}>
                        {task.title}
                      </span>
                      
                      <span className="text-xs text-gray-500 font-mono shrink-0">
                        {task.cost > 0 ? `${task.cost} ₪` : ""}
                      </span>
                    </div>

                    {/* Task details: duration */}
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-xs text-gray-400">{task.durationDays} ימי עבודה</span>
                      
                      {/* Collapsible toggle */}
                      {hasChildren && (
                        <button
                          onClick={() => toggleCollapse(task.id)}
                          className="text-[#f59e0b] hover:text-white text-[10px] font-bold action-btn flex items-center gap-0.5"
                        >
                          {isCollapsed ? "[+] הרחב" : "[-] כווץ"}
                        </button>
                      )}
                    </div>

                    {/* RACI matrix tags inside node */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#f59e0b]/10 text-[9px]">
                      <div className="flex gap-1">
                        {/* R */}
                        <div className="flex items-center gap-0.5" title={`Responsible (המבצע): ${task.raci.r}`}>
                          <span className="font-bold text-amber-500">R:</span>
                          {task.raci.r.includes("דרוש") ? (
                            <span className="text-orange-400 font-bold animate-pulse">?</span>
                          ) : (
                            <span className="text-gray-300 font-semibold">{task.raci.r}</span>
                          )}
                        </div>
                        
                        {/* A */}
                        <div className="flex items-center gap-0.5" title={`Accountable (המאשר): ${task.raci.a}`}>
                          <span className="font-bold text-yellow-500">A:</span>
                          <span className="text-gray-300 font-semibold">{task.raci.a}</span>
                        </div>
                      </div>
                    </div>

                    {/* Floating Action Buttons visible on hover */}
                    <div className="absolute -top-3 -left-3 hidden group-hover:flex gap-1.5 action-btn">
                      <button 
                        onClick={() => handleAddTask(task.id)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10 flex items-center justify-center shadow-md active:scale-90"
                        title="הוסף תת משימה"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setEditingTask(task)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10 flex items-center justify-center shadow-md active:scale-90"
                        title="ערוך משימה"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="w-6 h-6 rounded-lg bg-red-950/60 border border-red-500/40 text-red-400 hover:bg-red-950 flex items-center justify-center shadow-md active:scale-90"
                        title="מחק משימה"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Floating AI Assistant Chat Button & Panel */}
      <div className="absolute bottom-4 left-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
        {/* Chat Drawer Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-80 max-h-[450px] bg-zinc-950/95 backdrop-blur-md border border-[#f59e0b]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto text-right"
              dir="rtl"
            >
              {/* Chat Header */}
              <div className="bg-zinc-900/80 px-4 py-3 border-b border-[#f59e0b]/20 flex justify-between items-center text-right" dir="rtl">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#f59e0b]" />
                  <span className="text-white text-xs font-bold">שיח עם המחולל</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Messages list */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin text-right text-xs">
                {chatHistory.map((chat, i) => (
                  <div 
                    key={i} 
                    className={`p-2.5 rounded-lg max-w-[85%] leading-relaxed ${
                      chat.sender === "user" 
                        ? "bg-[#f59e0b]/10 text-white mr-auto text-left" 
                        : "bg-zinc-900 text-gray-300 ml-auto border border-[#f59e0b]/10"
                    }`}
                  >
                    {chat.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-1.5 text-gray-400 p-2 border border-[#f59e0b]/10 rounded-lg ml-auto bg-zinc-900">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f59e0b]" />
                    <span>המחולל חושב ומחשב מחדש...</span>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="p-2 border-t border-[#f59e0b]/15 flex gap-1.5 bg-zinc-900/60">
                <input
                  type="text"
                  value={chatMessage}
                  disabled={chatLoading}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="רשום בקשה ל-AI לשינוי העץ..."
                  className="flex-1 bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-lg px-2.5 py-1.5 text-white text-xs text-right focus:outline-none transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={chatLoading || !chatMessage.trim()}
                  className="p-1.5 rounded-lg bg-[#f59e0b] text-black hover:bg-[#d97706] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bubble Button */}
        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300 active:scale-90 pointer-events-auto cursor-pointer ${
            isChatOpen
              ? "bg-zinc-900 border-[#f59e0b] text-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : "bg-zinc-950 border-white/20 text-white hover:border-[#f59e0b] hover:text-[#f59e0b] shadow-2xl"
          }`}
          title="פתח שיח עם ה-AI"
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
        </button>
      </div>

      {/* 6. Inline Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-[#f59e0b] p-6 rounded-2xl w-full max-w-md text-right" dir="rtl">
            <h4 className="text-white font-bold text-base mb-4 border-b border-[#f59e0b]/15 pb-2">ערוך פרטי משימה</h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[#f59e0b] text-xs font-semibold">שם המשימה:</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2 rounded-lg text-right font-sans focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#f59e0b] text-xs font-semibold">עלות מוערכת (₪):</label>
                  <input
                    type="number"
                    value={editingTask.cost}
                    onChange={(e) => setEditingTask({ ...editingTask, cost: Number(e.target.value) })}
                    className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2 rounded-lg text-right font-sans focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#f59e0b] text-xs font-semibold">ימי עבודה:</label>
                  <input
                    type="number"
                    value={editingTask.durationDays}
                    onChange={(e) => setEditingTask({ ...editingTask, durationDays: Number(e.target.value) })}
                    className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2 rounded-lg text-right font-sans focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* RACI parameters */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <span className="text-gray-400 text-xs font-bold block">תפקידי RACI:</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px]">R (Responsible - מבצע):</label>
                    <input
                      type="text"
                      value={editingTask.raci.r}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        raci: { ...editingTask.raci, r: e.target.value }
                      })}
                      className="w-full bg-black border border-white/10 text-white p-1.5 rounded-lg text-right text-xs focus:outline-none focus:border-[#f59e0b] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px]">A (Accountable - מאשר):</label>
                    <input
                      type="text"
                      value={editingTask.raci.a}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        raci: { ...editingTask.raci, a: e.target.value }
                      })}
                      className="w-full bg-black border border-white/10 text-white p-1.5 rounded-lg text-right text-xs focus:outline-none focus:border-[#f59e0b] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px]">C (Consulted - מייעץ):</label>
                    <input
                      type="text"
                      value={editingTask.raci.c}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        raci: { ...editingTask.raci, c: e.target.value }
                      })}
                      className="w-full bg-black border border-white/10 text-white p-1.5 rounded-lg text-right text-xs focus:outline-none focus:border-[#f59e0b] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px]">I (Informed - מעודכן):</label>
                    <input
                      type="text"
                      value={editingTask.raci.i}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        raci: { ...editingTask.raci, i: e.target.value }
                      })}
                      className="w-full bg-black border border-white/10 text-white p-1.5 rounded-lg text-right text-xs focus:outline-none focus:border-[#f59e0b] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs hover:bg-zinc-800 transition-colors"
                >
                  בטל
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(editingTask)}
                  className="px-5 py-2 rounded-lg bg-[#f59e0b] text-black font-semibold text-xs hover:bg-[#d97706] transition-colors"
                >
                  שמור שינויים
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Alert */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-green-950 border border-green-500 text-green-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-right animate-pulse"
            dir="rtl"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-xs font-bold font-sans">השינויים והעץ נשמרו בהצלחה בבסיס הנתונים!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
