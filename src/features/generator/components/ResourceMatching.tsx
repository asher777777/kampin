"use client";

import React, { useState, useEffect } from "react";
import { WbsTask, RoleRequirement } from "../types";
import { Contact } from "@/features/crm/types";
import { matchCrmContactsAction, createPublicRecruitmentPage } from "../actions";
import { Users, Bot, DollarSign, ExternalLink, Link, Check, Loader2, ArrowRight, UserPlus, Globe, Sparkles } from "lucide-react";

interface ResourceMatchingProps {
  projectId: string;
  tasks: WbsTask[];
  initialRoles: RoleRequirement[] | null;
  onSaveRoles: (roles: RoleRequirement[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ResourceMatching({
  projectId,
  tasks,
  initialRoles,
  onSaveRoles,
  onNext,
  onBack
}: ResourceMatchingProps) {
  const [roles, setRoles] = useState<RoleRequirement[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [candidates, setCandidates] = useState<{ contact: Contact; score: number; reason: string }[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [generatedPages, setGeneratedPages] = useState<Record<string, string>>({}); // roleId -> link url

  // Initialize roles from WBS tasks
  useEffect(() => {
    if (initialRoles && initialRoles.length > 0) {
      setRoles(initialRoles);
      if (initialRoles.length > 0) {
        setSelectedTaskId(initialRoles[0].taskId);
      }
    } else {
      const generatedRoles: RoleRequirement[] = tasks.map(task => ({
        id: task.id,
        taskId: task.id,
        roleTitle: task.raci.r || "ספק / בעל תפקיד גנרי",
        requirements: `דרוש מומחה עבור משימת: ${task.title}. נדרשת מיומנות ספציפית וניסיון מוכח. נוכחות חובה באבני דרך.`,
        budget: task.cost || 500,
        status: "draft"
      }));
      setRoles(generatedRoles);
      if (generatedRoles.length > 0) {
        setSelectedTaskId(generatedRoles[0].taskId);
      }
    }
  }, [tasks, initialRoles]);

  // Fetch CRM matches when selected task changes
  useEffect(() => {
    if (!selectedTaskId) return;
    const currentRole = roles.find(r => r.taskId === selectedTaskId);
    if (!currentRole) return;

    const fetchMatches = async () => {
      setLoadingCandidates(true);
      try {
        const res = await matchCrmContactsAction(currentRole.roleTitle, currentRole.requirements);
        if (res.success && res.data) {
          setCandidates(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCandidates(false);
      }
    };

    fetchMatches();
  }, [selectedTaskId, roles]);

  const selectedRole = roles.find(r => r.taskId === selectedTaskId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Update budget comparison
  const totalAllocatedBudget = roles.reduce((acc, curr) => acc + curr.budget, 0);
  const totalTaskBudget = tasks.reduce((acc, curr) => acc + curr.cost, 0);

  // Assign contact
  const handleAssignContact = (contact: Contact) => {
    setRoles(prev => prev.map(r => {
      if (r.taskId === selectedTaskId) {
        return {
          ...r,
          assignedContactId: contact.id,
          assignedContactName: contact.conta_name,
          status: "active"
        };
      }
      return r;
    }));
  };

  // Generate Fallback Recruitment Page
  const handleGenerateFallback = async () => {
    if (!selectedRole || !selectedTask) return;
    setGeneratingLink(selectedRole.id);
    try {
      const res = await createPublicRecruitmentPage(
        projectId,
        selectedRole.id,
        selectedRole.roleTitle,
        selectedRole.requirements,
        selectedRole.budget
      );
      if (res.success && res.url) {
        setGeneratedPages(prev => ({
          ...prev,
          [selectedRole.id]: window.location.origin + res.url
        }));
        // Update role status to invited (external candidate)
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, status: "invited" } : r));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingLink(null);
    }
  };

  // Handle proceed
  const handleProceed = () => {
    onSaveRoles(roles);
    onNext();
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-[#f59e0b] dark:text-[#f59e0b] text-zinc-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#f59e0b]" />
            שלב 2.2: אפיון פרסונלי ושידוך משאבים חכם (CRM Match)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            שדך ספקים ומתנדבים מתוך קהילת ה-CRM או הפק דפי נחיתה לגיוס חיצוני.
          </p>
        </div>
      </div>

      {/* Budget Meter */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-4 rounded-2xl mb-8 shadow-md">
        <div className="flex justify-between items-center mb-2 text-xs font-bold">
          <span className="text-zinc-500 dark:text-zinc-400">ניצול תקציב מתוכנן מול תקציב משימות מאושר:</span>
          <span className={`${totalAllocatedBudget > totalTaskBudget ? 'text-red-500' : 'text-green-500 dark:text-green-400'}`}>
            ₪{totalAllocatedBudget.toLocaleString()} / ₪{totalTaskBudget.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-200 dark:border-white/5">
          <div 
            className={`h-full transition-all duration-500 ${totalAllocatedBudget > totalTaskBudget ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-[#f59e0b]'}`}
            style={{ width: `${Math.min((totalAllocatedBudget / (totalTaskBudget || 1)) * 100, 100)}%` }}
          />
        </div>
        {totalAllocatedBudget > totalTaskBudget && (
          <p className="text-[10px] text-red-500 mt-1 font-bold">
            ⚠️ שים לב: תקציב המשאבים המוקצים חורג מהתקציב המתוכנן של המשימות!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List: Tasks requiring resources */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
            משימות הדורשות משאבים
          </h3>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {roles.map(role => {
              const task = tasks.find(t => t.id === role.taskId);
              const isSelected = role.taskId === selectedTaskId;
              const hasAssignment = !!role.assignedContactId || role.status === "invited";

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedTaskId(role.taskId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-right flex justify-between items-center ${
                    isSelected
                      ? "bg-[#f59e0b]/10 border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-zinc-800 dark:text-white block truncate">{task?.title}</span>
                    <span className="text-[10px] text-[#f59e0b] font-bold block mt-0.5">{role.roleTitle}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">תקציב: ₪{role.budget.toLocaleString()}</span>
                  </div>

                  {hasAssignment ? (
                    <div className="w-6 h-6 rounded-full bg-green-950/50 border border-green-500 flex items-center justify-center text-green-400" title="משאב משויך">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 flex items-center justify-center text-zinc-400">
                      <span className="text-[9px] font-bold">?</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: Selected role requirements & candidate matchmaker */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRole && selectedTask && (
            <>
              {/* Card 1: Role specification card */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white">{selectedRole.roleTitle}</h3>
                    <span className="text-xs text-zinc-500">עבור משימה: {selectedTask.title}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-1 rounded-xl">
                    <DollarSign className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span className="text-xs font-bold text-[#f59e0b] font-mono">₪{selectedRole.budget.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block mb-1">אפיון ודרישות תפקיד:</span>
                    <textarea
                      rows={2}
                      value={selectedRole.requirements}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, requirements: val } : r));
                      }}
                      className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2 px-3 text-xs text-zinc-800 dark:text-white focus:outline-none transition-colors"
                    />
                  </div>

                  {selectedRole.assignedContactName && (
                    <div className="bg-green-950/20 border border-green-500/20 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="text-green-400 font-bold">✓ משויך כעת אל: {selectedRole.assignedContactName}</span>
                      <button
                        onClick={() => {
                          setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, assignedContactId: undefined, assignedContactName: undefined, status: "draft" } : r));
                        }}
                        className="text-red-400 hover:underline cursor-pointer"
                      >
                        בטל שיוך
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: CRM Matchmaking list */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
                <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">
                  מועמדים מתאימים מה-CRM בארגון
                </h4>

                {loadingCandidates ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[#f59e0b]" />
                    <span className="text-xs text-zinc-500">מבצע שידוך חכם מול ה-CRM...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">אין אנשי קשר מתאימים במאגר לכישורים אלו.</p>
                ) : (
                  <div className="space-y-3">
                    {candidates.map(({ contact, score, reason }) => {
                      const isAssigned = selectedRole.assignedContactId === contact.id;

                      return (
                        <div
                          key={contact.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group relative ${
                            isAssigned
                              ? "bg-green-950/15 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.05)]"
                              : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 hover:border-[#f59e0b]/55 hover:shadow-[0_0_15px_rgba(245,158,11,0.04)]"
                          }`}
                        >
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-zinc-800 dark:text-white">{contact.conta_name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                score >= 80 ? "bg-green-950/50 border-green-500/30 text-green-400" :
                                score >= 50 ? "bg-amber-950/50 border-amber-500/30 text-amber-400" :
                                "bg-zinc-950 border-zinc-800 text-zinc-400"
                              }`}>
                                {score}% התאמה
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{reason}</p>
                            {contact.email && <span className="text-[9px] text-zinc-500 font-mono block mt-1">{contact.email}</span>}
                          </div>

                          <button
                            onClick={() => handleAssignContact(contact)}
                            disabled={isAssigned}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer w-full md:w-auto ${
                              isAssigned
                                ? "bg-green-600 text-white cursor-default"
                                : "bg-[#f59e0b] hover:bg-[#d97706] text-black shadow-md shadow-[#f59e0b]/10 group-hover:scale-105 active:scale-95"
                            }`}
                          >
                            {isAssigned ? "משויך לפרויקט" : "בחר ושדרג הרשאה"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: External Fallback recruitment landing page */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    נתיב חיצוני (External Fallback)
                  </h4>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 px-2 py-0.5 rounded-md">קול קורא</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                  במידה ואין מועמד מתאים במאגר, הפק בלחיצה משרה דיגיטלית ציבורית המאפשרת לספקים חיצוניים להגיש הצעת מחיר ולחתום דיגיטלית.
                </p>

                {generatedPages[selectedRole.id] ? (
                  <div className="space-y-3">
                    <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 p-3 rounded-xl flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 truncate select-all">{generatedPages[selectedRole.id]}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPages[selectedRole.id]);
                          alert("הקישור הועתק ללוח! שתף אותו עם הספק החיצוני.");
                        }}
                        className="text-xs text-[#f59e0b] font-bold hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Link className="w-3.5 h-3.5" />
                        העתק קישור
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={generatedPages[selectedRole.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b] font-bold text-xs py-2.5 rounded-xl hover:bg-[#f59e0b]/10 transition-all text-center"
                      >
                        <Globe className="w-4 h-4" />
                        תצוגה מקדימה של עמוד המשרה
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateFallback}
                    disabled={generatingLink === selectedRole.id}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-[#f59e0b] text-[#f59e0b] font-black text-xs py-3 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    {generatingLink === selectedRole.id ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        מפיק עמוד דיגיטלי...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5 text-[#f59e0b] animate-pulse" />
                        חולל דרישת תפקיד / קול קורא חיצוני
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Next/Prev Action Buttons */}
      <div className="flex justify-between items-center border-t border-zinc-200 dark:border-white/10 pt-6 mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-white font-bold text-xs py-3 px-6 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          חזור ל-Baseline
        </button>

        <button
          onClick={handleProceed}
          className="flex items-center gap-1.5 bg-[#f59e0b] text-black font-bold text-xs py-3 px-8 rounded-xl hover:bg-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all cursor-pointer active:scale-95"
        >
          <span>המשך לחדר הישיבות הוירטואלי (War Room)</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );
}
