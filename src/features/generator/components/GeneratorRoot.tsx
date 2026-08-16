"use client";

import React, { useState, useEffect } from "react";
import RawInputStep from "./RawInputStep";
import SmartGoalsView from "./SmartGoalsView";
import ValidatorStep from "./ValidatorStep";
import WbsCanvasStep from "./WbsCanvasStep";
import PlanningBaseline from "./PlanningBaseline";
import ResourceMatching from "./ResourceMatching";
import VirtualWarRoom from "./VirtualWarRoom";
import { SmartGoals, ValidatorResult, ProjectCharter, WbsTask, ProjectBaseline, RoleRequirement, ProjectData } from "../types";
import { generateSmartGoals, generateProjectWbs, getProjects, deleteProject, getProjectById, saveProject } from "../actions";
import { Sparkles, ArrowLeft, RefreshCw, CheckCircle, Sun, Moon, Plus, Trash2, FolderOpen, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { GlobalCalendarView } from "@/components/ui/GlobalCalendarView";

type Step = "projects" | "input" | "smart_goals" | "validator" | "wbs_canvas" | "planning_baseline" | "resource_matching" | "war_room" | "calendar" | "success";

export default function GeneratorRoot() {
  const [step, setStep] = useState<Step>("projects");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<"dashboard" | "back" | "reset" | null>(null);

  // Projects list state
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsSearch, setProjectsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "active" | "completed">("all");

  // Warn on browser unload if there are unsaved WBS changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === "wbs_canvas" && canvasSaveStatus !== "saved") {
        e.preventDefault();
        e.returnValue = "שינויים שלא נשמרו יאבדו. האם לצאת בכל זאת?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, canvasSaveStatus]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const fetchAllProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await getProjects();
      if (res.success && res.data) {
        setProjectsList(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (step === "projects") {
      fetchAllProjects();
    }
  }, [step]);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.remove("dark");
      setTheme("light");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // Captured data
  const [projectTitle, setProjectTitle] = useState("");
  const [smartGoals, setSmartGoals] = useState<SmartGoals | null>(null);
  const [projectType, setProjectType] = useState<"new" | "recurring" | null>(null);
  const [validatorResult, setValidatorResult] = useState<ValidatorResult | null>(null);
  const [charter, setCharter] = useState<ProjectCharter | null>(null);
  const [wbsTasks, setWbsTasks] = useState<WbsTask[]>([]);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<ProjectBaseline | null>(null);
  const [roles, setRoles] = useState<RoleRequirement[] | null>(null);
  const [fullProjectData, setFullProjectData] = useState<ProjectData | null>(null);

  // Transitions
  const handleInputSubmit = async (data: { text: string; fileBase64?: string; fileType?: string; fileName?: string }) => {
    setIsLoading(true);
    setError("");
    
    // Extrapolate a name for the project from the input or default
    const titleSnippet = data.text.split("\n")[0].slice(0, 35) || "פרויקט מחולל";
    setProjectTitle(titleSnippet);

    try {
      const res = await generateSmartGoals({
        text: data.text,
        fileBase64: data.fileBase64,
        fileType: data.fileType
      });

      if (res.success && res.data) {
        setSmartGoals(res.data);
        setStep("smart_goals");
      } else {
        setError(res.error || "נכשל בניתוח הרעיון וזיקוק יעדי SMART");
      }
    } catch (err: any) {
      setError("שגיאת תקשורת עם שרת ה-AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmartGoalsApprove = () => {
    setStep("validator");
  };

  const handleValidatorSubmit = async (valResult: ValidatorResult, projCharter: ProjectCharter, type: "new" | "recurring") => {
    setValidatorResult(valResult);
    setCharter(projCharter);
    setProjectType(type);
    setIsLoading(true);
    setError("");

    try {
      if (!smartGoals) throw new Error("יעדי SMART חסרים");
      const res = await generateProjectWbs({
        title: projectTitle,
        smartGoals,
        validator: valResult
      });

      if (res.success && res.tasks) {
        setWbsTasks(res.tasks);
        setStep("wbs_canvas");
      } else {
        setError(res.error || "נכשל ביצירת עץ המשימות וה-RACI");
      }
    } catch (err: any) {
      setError("שגיאה ביצירת ה-WBS מול השרת");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveComplete = (projectId: string) => {
    setCreatedProjectId(projectId);
    // Stay on step "wbs_canvas" as requested by user
  };

  const handleLeaveToDashboard = () => {
    if (step === "wbs_canvas" && canvasSaveStatus !== "saved") {
      setShowLeaveConfirm("dashboard");
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleWbsBack = () => {
    if (canvasSaveStatus !== "saved") {
      setShowLeaveConfirm("back");
    } else {
      setStep("validator");
    }
  };

  const handleResetClick = () => {
    if (step === "wbs_canvas" && canvasSaveStatus !== "saved") {
      setShowLeaveConfirm("reset");
    } else {
      handleReset();
    }
  };

  const handleReset = () => {
    setStep("projects");
    setProjectTitle("");
    setSmartGoals(null);
    setProjectType(null);
    setValidatorResult(null);
    setCharter(null);
    setWbsTasks([]);
    setCreatedProjectId(null);
    setError("");
  };

  const handleLoadProject = (proj: any) => {
    setProjectTitle(proj.name);
    setWbsTasks(proj.tasks);
    setCharter(proj.charter);
    setProjectType(proj.type);
    setCreatedProjectId(proj.id);
    setBaseline(proj.baseline || null);
    setRoles(proj.roles || null);
    setFullProjectData(proj);
    setStep("wbs_canvas");
    setCanvasSaveStatus("saved");
  };

  const handleSaveBaseline = async (newBaseline: ProjectBaseline) => {
    setBaseline(newBaseline);
    if (!createdProjectId) return;
    try {
      const projRes = await getProjectById(createdProjectId);
      if (projRes.success && projRes.data) {
        const updatedPayload: ProjectData = {
          ...projRes.data,
          baseline: newBaseline
        };
        await saveProject(updatedPayload);
        setFullProjectData(updatedPayload);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRoles = async (newRoles: RoleRequirement[]) => {
    setRoles(newRoles);
    if (!createdProjectId) return;
    try {
      const projRes = await getProjectById(createdProjectId);
      if (projRes.success && projRes.data) {
        const updatedPayload: ProjectData = {
          ...projRes.data,
          roles: newRoles
        };
        await saveProject(updatedPayload);
        setFullProjectData(updatedPayload);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProjectClick = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("האם אתה בטוח שברצונך למחוק פרויקט זה?")) return;
    try {
      const res = await deleteProject(projectId);
      if (res.success) {
        setProjectsList(prev => prev.filter(p => p.id !== projectId));
      } else {
        alert(res.error || "שגיאה במחיקת הפרויקט");
      }
    } catch (err) {
      alert("שגיאת תקשורת");
    }
  };

  const renderProjectsList = () => {
    const filtered = projectsList.filter(proj => {
      const matchesSearch = proj.name.toLowerCase().includes(projectsSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || proj.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="w-full max-w-4xl mx-auto p-4 text-right" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-[#f59e0b]">הפרויקטים שלי</h2>
            <p className="text-xs text-gray-400">צפייה וניהול של כל הפרויקטים שחוללו במערכת</p>
          </div>
          
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-1.5 bg-[#f59e0b] text-black font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-[#d97706] transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            חולל פרויקט חדש
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6 bg-zinc-950 border border-white/10 p-3 rounded-2xl">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="חפש פרויקט..."
              value={projectsSearch}
              onChange={(e) => setProjectsSearch(e.target.value)}
              className="w-full bg-black border border-white/10 focus:border-[#f59e0b] rounded-xl py-2 pr-9 pl-3 text-xs text-white focus:outline-none transition-colors text-right"
            />
            <span className="absolute right-3 top-2.5 text-gray-500">🔍</span>
          </div>

          <div className="flex bg-black border border-white/10 p-0.5 rounded-xl">
            {(["all", "draft", "active", "completed"] as const).map((status) => {
              const label = status === "all" ? "הכל" : status === "draft" ? "טיוטות" : status === "active" ? "פעילים" : "הושלמו";
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === status
                      ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {loadingProjects ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#f59e0b]" />
            <span className="text-xs text-gray-400">טוען פרויקטים...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-zinc-950/40 border border-white/5 rounded-2xl">
            <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-bold mb-1">לא נמצאו פרויקטים</p>
            <p className="text-xs text-gray-500">צור פרויקט חדש או שנה את פילטר החיפוש.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((proj) => {
              const date = new Date(proj.updatedAt || proj.createdAt).toLocaleDateString("he-IL");
              const taskCount = proj.tasks?.length || 0;
              const budget = proj.metrics?.budget || 0;
              const hours = proj.metrics?.hours || 0;

              return (
                <div
                  key={proj.id}
                  onClick={() => handleLoadProject(proj)}
                  className="bg-zinc-950 border border-white/10 hover:border-[#f59e0b]/50 p-5 rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-white text-sm font-black truncate max-w-[200px] group-hover:text-[#f59e0b] transition-colors" title={proj.name}>
                        {proj.name}
                      </h3>
                      
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        proj.status === "completed"
                          ? "bg-green-950/40 border-green-500/30 text-green-400"
                          : proj.status === "active"
                          ? "bg-blue-950/40 border-blue-500/30 text-blue-400"
                          : "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]"
                      }`}>
                        {proj.status === "completed" ? "הושלם" : proj.status === "active" ? "פעיל" : "טיוטה"}
                      </span>
                    </div>

                    <span className="text-[10px] text-gray-500 font-mono block mb-4">עודכן בתאריך: {date}</span>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-900/30 p-2.5 rounded-xl border border-white/5 text-right mb-4">
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-0.5">משימות:</span>
                        <span className="text-xs text-white font-bold">{taskCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-0.5">תקציב:</span>
                        <span className="text-xs text-[#f59e0b] font-bold font-mono">₪{budget.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-0.5">שעות עבודה:</span>
                        <span className="text-xs text-white font-bold">{hours.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-auto">
                    <span className="text-xs text-[#f59e0b] font-bold group-hover:underline flex items-center gap-1">
                      ערוך בקנבס ◀
                    </span>
                    
                    <button
                      onClick={(e) => handleDeleteProjectClick(proj.id, e)}
                      className="p-1.5 bg-red-950/10 hover:bg-red-950/40 border border-red-500/10 hover:border-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="מחק פרויקט"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white p-6 md:p-10 font-sans transition-colors duration-300" dir="rtl">
      
      {/* Sub-Navigation Tabs Menu (Main Hub) */}
      {(step === "projects" || step === "input" || step === "calendar") && (
        <div className="w-full max-w-4xl mx-auto flex bg-zinc-950 border border-white/10 p-1.5 rounded-2xl mb-8 shadow-2xl h-14 items-center">
          <button
            onClick={() => setStep("projects")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "projects"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            פרויקטים
          </button>
          <button
            onClick={() => setStep("input")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "input"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Plus className="w-4 h-4" />
            פתיחת פרויקט חדש
          </button>
          <button
            onClick={() => setStep("calendar")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "calendar"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" />
            יומן הפרויקטים
          </button>
        </div>
      )}

      {/* Top Breadcrumb / Progress Bar (Only visible inside creation steps) */}
      {step !== "projects" && step !== "calendar" && step !== "success" && (
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between mb-8 border-b border-zinc-200 dark:border-zinc-900 pb-4 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLeaveToDashboard}
              className="text-gray-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-4 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              <span>חזור ללוח הבקרה</span>
            </button>
            <button 
              onClick={handleResetClick}
              className="text-[#f59e0b] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              המחולל
            </button>
            <span>/</span>
            <span className="text-zinc-800 dark:text-white">
              {step === "input" && "איסוף חומרי גלם"}
              {step === "smart_goals" && "זיקוק SMART"}
              {step === "validator" && "תיקוף והצהרת אמנה"}
              {step === "wbs_canvas" && "קנבס WBS ו-RACI"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[#f59e0b]/20 bg-zinc-900/50 hover:bg-zinc-800 text-[#f59e0b] hover:text-white transition-colors cursor-pointer ml-3 flex items-center justify-center"
              title={theme === "dark" ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`w-3 h-3 rounded-full border ${step === "input" ? "bg-[#f59e0b] border-[#f59e0b]" : "border-gray-700 bg-transparent"}`} />
            <div className={`w-3 h-3 rounded-full border ${step === "smart_goals" ? "bg-[#f59e0b] border-[#f59e0b]" : "border-gray-700 bg-transparent"}`} />
            <div className={`w-3 h-3 rounded-full border ${step === "validator" ? "bg-[#f59e0b] border-[#f59e0b]" : "border-gray-700 bg-transparent"}`} />
            <div className={`w-3 h-3 rounded-full border ${step === "wbs_canvas" ? "bg-[#f59e0b] border-[#f59e0b]" : "border-gray-700 bg-transparent"}`} />
          </div>
        </div>
      )}

      {/* Project Steps Tab Menu (Step 2 Integration) */}
      {(step === "wbs_canvas" || step === "planning_baseline" || step === "resource_matching" || step === "war_room") && (
        <div className="w-full max-w-4xl mx-auto flex bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-1.5 rounded-2xl mb-8 shadow-2xl h-14 items-center">
          <button
            onClick={() => setStep("wbs_canvas")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "wbs_canvas"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : "text-zinc-500 dark:text-gray-400 hover:text-[#f59e0b] dark:hover:text-white"
            }`}
          >
            1. עץ משימות (WBS)
          </button>
          
          <button
            onClick={async () => {
              if (createdProjectId) {
                // Fetch latest project state from DB
                const res = await getProjectById(createdProjectId);
                if (res.success && res.data) {
                  setWbsTasks(res.data.tasks);
                  setCharter(res.data.charter);
                  if (res.data.baseline) setBaseline(res.data.baseline);
                  if (res.data.roles) setRoles(res.data.roles);
                  setFullProjectData(res.data);
                }
                setStep("planning_baseline");
              } else {
                alert("אנא שמור את הפרויקט תחילה על מנת להמשיך לשלב הבא!&rlm;");
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "planning_baseline"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : createdProjectId
                ? "text-zinc-500 dark:text-gray-400 hover:text-[#f59e0b] dark:hover:text-white"
                : "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-40"
            }`}
          >
            2. הצהרת תכולה וסיכונים
          </button>

          <button
            onClick={async () => {
              if (createdProjectId) {
                const res = await getProjectById(createdProjectId);
                if (res.success && res.data) {
                  setWbsTasks(res.data.tasks);
                  setCharter(res.data.charter);
                  if (res.data.baseline) setBaseline(res.data.baseline);
                  if (res.data.roles) setRoles(res.data.roles);
                  setFullProjectData(res.data);
                }
                setStep("resource_matching");
              } else {
                alert("אנא שמור את הפרויקט תחילה על מנת להמשיך לשלב הבא!&rlm;");
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "resource_matching"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : createdProjectId
                ? "text-zinc-500 dark:text-gray-400 hover:text-[#f59e0b] dark:hover:text-white"
                : "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-40"
            }`}
          >
            3. שידוך משאבים וספקים
          </button>

          <button
            onClick={async () => {
              if (createdProjectId) {
                const res = await getProjectById(createdProjectId);
                if (res.success && res.data) {
                  setWbsTasks(res.data.tasks);
                  setCharter(res.data.charter);
                  if (res.data.baseline) setBaseline(res.data.baseline);
                  if (res.data.roles) setRoles(res.data.roles);
                  setFullProjectData(res.data);
                }
                setStep("war_room");
              } else {
                alert("אנא שמור את הפרויקט תחילה על מנת להמשיך לשלב הבא!&rlm;");
              }
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer h-11 flex items-center justify-center gap-2 ${
              step === "war_room"
                ? "bg-[#f59e0b] text-black shadow-lg"
                : createdProjectId
                ? "text-zinc-500 dark:text-gray-400 hover:text-[#f59e0b] dark:hover:text-white"
                : "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-40"
            }`}
          >
            4. חדר בקרה ושינויים
          </button>
        </div>
      )}

      {/* Main step routing switch */}
      <div className="w-full">
        {error && (
          <div className="w-full max-w-xl mx-auto mb-6 text-red-400 text-sm bg-red-950/20 border border-red-500/20 p-4 rounded-xl flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={handleReset} className="text-xs bg-red-500 text-black px-3 py-1 rounded-lg font-bold">התחל מחדש</button>
          </div>
        )}

        {step === "projects" && (
          renderProjectsList()
        )}

        {step === "calendar" && (
          <div className="w-full max-w-5xl mx-auto bg-zinc-950 p-6 rounded-3xl border border-white/5 relative h-[calc(100vh-200px)]">
            <GlobalCalendarView />
          </div>
        )}

        {step === "input" && (
          <RawInputStep onNext={handleInputSubmit} isLoading={isLoading} />
        )}

        {step === "smart_goals" && smartGoals && (
          <SmartGoalsView 
            smartGoals={smartGoals} 
            onApprove={handleSmartGoalsApprove} 
            onBack={() => setStep("input")} 
          />
        )}

        {step === "validator" && smartGoals && (
          <ValidatorStep 
            title={projectTitle} 
            smartGoals={smartGoals} 
            onNext={handleValidatorSubmit} 
            onBack={() => setStep("smart_goals")} 
            isLoading={isLoading}
          />
        )}

        {step === "wbs_canvas" && charter && (
          <WbsCanvasStep 
            projectId={createdProjectId}
            title={projectTitle} 
            projectType={projectType!} 
            charter={charter} 
            initialTasks={wbsTasks} 
            onBack={handleWbsBack} 
            onSaveComplete={handleSaveComplete} 
            onSaveStatusChange={setCanvasSaveStatus}
          />
        )}

        {step === "planning_baseline" && (
          <PlanningBaseline
            projectId={createdProjectId}
            title={projectTitle}
            tasks={wbsTasks}
            initialBaseline={baseline}
            onSaveBaseline={handleSaveBaseline}
            onNext={() => setStep("resource_matching")}
            onBack={() => setStep("wbs_canvas")}
          />
        )}

        {step === "resource_matching" && createdProjectId && (
          <ResourceMatching
            projectId={createdProjectId}
            tasks={wbsTasks}
            initialRoles={roles}
            onSaveRoles={handleSaveRoles}
            onNext={async () => {
              if (createdProjectId) {
                const res = await getProjectById(createdProjectId);
                if (res.success && res.data) {
                  setFullProjectData(res.data);
                }
              }
              setStep("war_room");
            }}
            onBack={() => setStep("planning_baseline")}
          />
        )}

        {step === "war_room" && (fullProjectData || (createdProjectId && (wbsTasks.length > 0))) && (
          <VirtualWarRoom
            project={fullProjectData || {
              id: createdProjectId!,
              name: projectTitle,
              type: projectType!,
              status: "draft",
              smartGoals: smartGoals || { s: "", m: "", a: "", r: "", t: "" },
              charter: charter!,
              tasks: wbsTasks,
              userId: "",
              baseline: baseline || undefined,
              roles: roles || undefined
            }}
            onUpdateProject={(updated) => {
              setFullProjectData(updated);
              setWbsTasks(updated.tasks);
              if (updated.baseline) setBaseline(updated.baseline);
              if (updated.roles) setRoles(updated.roles);
            }}
            onBack={() => setStep("resource_matching")}
          />
        )}

        {step === "success" && (
          <div className="w-full max-w-md mx-auto text-center py-16 bg-zinc-950 border border-green-500/30 p-8 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-950 flex items-center justify-center border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">פרויקט חולל בהצלחה!</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              הפרויקט "{projectTitle}" ואמנת התקציב שלו ננעלו ונשמרו בהצלחה בבסיס הנתונים הארגוני.&rlm;
              עץ המשימות (WBS) ומערכת ה-RACI מוכנים לשלב 2 של שידוך המשאבים הקהילתיים.
            </p>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-[#f59e0b] text-black font-bold py-3.5 px-8 rounded-xl hover:bg-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>חולל פרויקט נוסף</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Custom Leave Confirmation Warning Dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-zinc-950 border-2 border-amber-500/80 p-6 rounded-2xl w-full max-w-md text-right shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <h4 className="text-white font-bold text-base mb-3 border-b border-amber-500/20 pb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f59e0b] animate-pulse" />
              שינויים שלא נשמרו יאבדו!
            </h4>
            <p className="text-gray-300 text-xs mb-6 leading-relaxed">
              האם אתה בטוח שברצונך לעזוב את דף עריכת עץ המשימות (WBS)?
              כל השינויים שביצעת מאז השמירה האחרונה יימחקו לחלוטין.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(null)}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs hover:bg-zinc-800 transition-colors font-bold cursor-pointer"
              >
                הישאר וערוך
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = showLeaveConfirm;
                  setShowLeaveConfirm(null);
                  if (target === "dashboard") {
                    window.location.href = "/dashboard";
                  } else if (target === "back") {
                    setStep("validator");
                  } else if (target === "reset") {
                    handleReset();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-950/40 text-xs font-bold transition-colors cursor-pointer"
              >
                עזוב ללא שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
