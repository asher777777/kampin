"use client";

import React, { useState, useEffect } from "react";
import { WbsTask, ProjectBaseline, RiskItem } from "../types";
import { generateScopeAndRisks } from "../actions";
import { ShieldAlert, AlertTriangle, CheckCircle, Sparkles, Plus, Trash2, Calendar, FileText, Loader2, ArrowRight } from "lucide-react";

interface PlanningBaselineProps {
  projectId: string | null;
  title: string;
  tasks: WbsTask[];
  initialBaseline: ProjectBaseline | null;
  onSaveBaseline: (baseline: ProjectBaseline) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PlanningBaseline({
  projectId,
  title,
  tasks,
  initialBaseline,
  onSaveBaseline,
  onNext,
  onBack
}: PlanningBaselineProps) {
  const [loading, setLoading] = useState(false);
  const [baseline, setBaseline] = useState<ProjectBaseline>({
    inScope: [],
    outScope: [],
    milestones: [],
    risks: []
  });

  const [newInScope, setNewInScope] = useState("");
  const [newOutScope, setNewOutScope] = useState("");

  // Initialize or generate baseline using AI
  useEffect(() => {
    if (initialBaseline && (initialBaseline.inScope.length > 0 || initialBaseline.risks.length > 0)) {
      setBaseline(initialBaseline);
    } else {
      handleAutoGenerate();
    }
  }, [initialBaseline]);

  const handleAutoGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateScopeAndRisks(title, tasks);
      if (res.success && res.data) {
        // Preset some milestones from top level tasks
        const topLevelTasks = tasks.filter(t => !t.parentId);
        const presetMilestones = topLevelTasks.slice(0, 3).map((t, idx) => ({
          taskId: t.id,
          financialFlag: idx === 0 ? "אישור מקדמה כספית" : undefined,
          contractualFlag: idx === 1 ? "חתימת חוזה אספקה" : undefined
        }));

        setBaseline({
          ...res.data,
          milestones: presetMilestones
        });
      }
    } catch (err) {
      console.error("Failed to generate scope/risks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Heatmap Stability
  // Safe (Green): all risks mitigated & at least one milestone.
  // Warning (Yellow): some risks unmitigated but plans exist.
  // Danger (Red): no milestones, or high risks with no approved plans.
  const calculateStability = () => {
    if (baseline.risks.length === 0) return { label: "לא מוגדר", color: "bg-gray-500", text: "text-gray-400", border: "border-gray-500/20" };
    const unapprovedHighRisks = baseline.risks.filter(r => (r.probability === "High" || r.impact === "High") && !r.approved);
    const approvedCount = baseline.risks.filter(r => r.approved).length;
    
    if (unapprovedHighRisks.length > 0) {
      return { 
        label: "סכנת חריגה (קריטי)", 
        color: "bg-red-500", 
        text: "text-red-400 dark:text-red-300", 
        border: "border-red-500/30",
        bg: "bg-red-500/10",
        desc: "ישנם סיכונים קריטיים ללא תוכנית מגירה מאושרת. מומלץ לאשר את כל המענים לסיכונים לפני גיוס משאבים.&rlm;"
      };
    }
    if (approvedCount < baseline.risks.length) {
      return { 
        label: "יציבות בינונית (נדרשת בקרה)", 
        color: "bg-amber-500", 
        text: "text-amber-500 dark:text-amber-400", 
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        desc: "ישנן תוכניות מגירה הממתינות לאישור. מומלץ לעבור עליהן כעת.&rlm;"
      };
    }
    return { 
      label: "תכנון חסין ויציב (תקין)", 
      color: "bg-green-500", 
      text: "text-green-500 dark:text-green-400", 
      border: "border-green-500/30",
      bg: "bg-green-500/10",
      desc: "כל המטרות מעוגנות, אבני הדרך מוגדרות ותוכניות המגירה מאושרות במלואן.&rlm;"
    };
  };

  const stability = calculateStability();

  // Add / Remove In-Scope
  const addItem = (type: "in" | "out") => {
    if (type === "in" && newInScope.trim()) {
      setBaseline(prev => ({ ...prev, inScope: [...prev.inScope, newInScope.trim()] }));
      setNewInScope("");
    } else if (type === "out" && newOutScope.trim()) {
      setBaseline(prev => ({ ...prev, outScope: [...prev.outScope, newOutScope.trim()] }));
      setNewOutScope("");
    }
  };

  const removeItem = (type: "in" | "out", index: number) => {
    setBaseline(prev => {
      const list = type === "in" ? [...prev.inScope] : [...prev.outScope];
      list.splice(index, 1);
      return type === "in" ? { ...prev, inScope: list } : { ...prev, outScope: list };
    });
  };

  // Toggle Risk Mitigation Approval
  const toggleRiskApproval = (riskId: string) => {
    setBaseline(prev => ({
      ...prev,
      risks: prev.risks.map(r => r.id === riskId ? { ...r, approved: !r.approved } : r)
    }));
  };

  // Toggle Milestone status on WBS tasks
  const toggleMilestone = (taskId: string) => {
    setBaseline(prev => {
      const exists = prev.milestones.find(m => m.taskId === taskId);
      if (exists) {
        return {
          ...prev,
          milestones: prev.milestones.filter(m => m.taskId !== taskId)
        };
      } else {
        return {
          ...prev,
          milestones: [...prev.milestones, { taskId, financialFlag: "", contractualFlag: "" }]
        };
      }
    });
  };

  const updateMilestoneFlags = (taskId: string, field: "financialFlag" | "contractualFlag", value: string) => {
    setBaseline(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.taskId === taskId ? { ...m, [field]: value } : m)
    }));
  };

  const handleNextStep = () => {
    onSaveBaseline(baseline);
    onNext();
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 text-right" dir="rtl">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black dark:text-[#f59e0b] text-zinc-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#f59e0b] animate-pulse" />
            שלב 2.1: נעילת תכולה, אבני דרך ורגיסטר סיכונים (Baseline)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            אשר את גבולות הגזרה, הגדר נקודות בקרה כספיות ואשר את מעני הסיכונים של הפרויקט.
          </p>
        </div>
        <button
          onClick={handleAutoGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 border border-[#f59e0b]/30 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm animate-pulse"
        >
          <Sparkles className="w-4 h-4" />
          חולל מחדש מבוסס AI
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#f59e0b]" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-bold">מנתח את עץ המשימות ומייצר הצהרת תכולה וסיכונים...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 1. Heatmap / Stability Indicator */}
          {baseline.risks.length > 0 && (
            <div className={`p-5 rounded-2xl border ${stability.border} ${stability.bg} transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${stability.color} inline-block animate-ping`} />
                  <span className={`w-3.5 h-3.5 rounded-full ${stability.color} inline-block absolute`} />
                  <h3 className={`text-base font-black ${stability.text}`}>מדד יציבות ובקרת סיכונים: {stability.label}</h3>
                </div>
                <div className="flex gap-1.5">
                  {baseline.risks.map((r, idx) => (
                    <div
                      key={r.id}
                      className={`w-8 h-2 rounded-full transition-all ${
                        r.approved 
                          ? "bg-green-500" 
                          : r.probability === "High" || r.impact === "High"
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                      title={`${r.risk} (${r.approved ? 'מאושר' : 'ממתין לפתרון'})`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">{stability.desc}</p>
            </div>
          )}

          {/* 2. Scope Statement (In / Out of Scope) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* In Scope */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
              <h3 className="text-sm font-black text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4.5 h-4.5" />
                כלול בתכולת הפרויקט (In Scope)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                רכיבים ויעדים שהוגדרו רשמית. כל בקשה מחוץ לרשימה זו תפעיל פרוטוקול שינויים.
              </p>
              
              <div className="space-y-2.5 max-h-60 overflow-y-auto mb-4 pr-1">
                {baseline.inScope.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-2.5 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 font-medium">
                    <span>{item}</span>
                    <button onClick={() => removeItem("in", idx)} className="text-red-400 hover:text-red-500 p-0.5 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="הוסף פריט תכולה..."
                  value={newInScope}
                  onChange={(e) => setNewInScope(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("in")}
                  className="flex-1 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none transition-colors"
                />
                <button
                  onClick={() => addItem("in")}
                  className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Out of Scope */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
              <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5" />
                מחוץ לתכולה (Out of Scope)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                אזהרת זליגה! נושאים אלו אינם מתוקצבים ואינם נכללים בפרויקט.
              </p>
              
              <div className="space-y-2.5 max-h-60 overflow-y-auto mb-4 pr-1">
                {baseline.outScope.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-2.5 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 font-medium">
                    <span>{item}</span>
                    <button onClick={() => removeItem("out", idx)} className="text-red-400 hover:text-red-500 p-0.5 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="הוסף פריט מחוץ לתכולה..."
                  value={newOutScope}
                  onChange={(e) => setNewOutScope(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("out")}
                  className="flex-1 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 focus:border-[#f59e0b] rounded-xl py-2 px-3 text-xs text-zinc-900 dark:text-white focus:outline-none transition-colors"
                />
                <button
                  onClick={() => addItem("out")}
                  className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Contractual & Financial Milestones selection */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-[#f59e0b]" />
              אבני דרך חוזיות וכספיות (Milestones)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              סמן אילו משימות מהוות אבן דרך מרכזית, והגדר את האישורים הנדרשים עבורן.
            </p>

            <div className="space-y-3">
              {tasks.map(task => {
                const milestone = baseline.milestones.find(m => m.taskId === task.id);
                const isMilestone = !!milestone;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isMilestone
                        ? "bg-[#f59e0b]/5 border-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                        : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleMilestone(task.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            isMilestone
                              ? "bg-[#f59e0b] border-[#f59e0b] text-black"
                              : "border-zinc-300 dark:border-white/20 bg-transparent"
                          }`}
                        >
                          {isMilestone && <span className="text-xs">✓</span>}
                        </button>
                        <div>
                          <span className="text-xs text-zinc-800 dark:text-white font-bold block">{task.title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">תקציב: ₪{task.cost.toLocaleString()} | משך: {task.durationDays} ימים</span>
                        </div>
                      </div>

                      {isMilestone && (
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="אישור פיננסי (למשל: מקדמה ₪2000)"
                            value={milestone.financialFlag || ""}
                            onChange={(e) => updateMilestoneFlags(task.id, "financialFlag", e.target.value)}
                            className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none focus:border-[#f59e0b] w-full sm:w-56"
                          />
                          <input
                            type="text"
                            placeholder="תנאי חוזי (למשל: חתימת חוזה ספק)"
                            value={milestone.contractualFlag || ""}
                            onChange={(e) => updateMilestoneFlags(task.id, "contractualFlag", e.target.value)}
                            className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-900 dark:text-white focus:outline-none focus:border-[#f59e0b] w-full sm:w-56"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. AI Risk Register */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-[#f59e0b]" />
              רגיסטר סיכונים ותוכניות מגירה (AI Risk Register)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              הסיכונים הבאים זוהו על ידי ה-AI. אשר את תוכניות המגירה כדי להגביר את יציבות התכנון.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/10 text-zinc-500 font-bold">
                    <th className="py-3 px-2">סיכון</th>
                    <th className="py-3 px-2 w-24">הסתברות</th>
                    <th className="py-3 px-2 w-24">השפעה</th>
                    <th className="py-3 px-2">תוכנית מגירה (מענה)</th>
                    <th className="py-3 px-2 w-32 text-center">תוכנית מגירה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-medium">
                  {baseline.risks.map(risk => (
                    <tr key={risk.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4 px-2 font-bold text-zinc-800 dark:text-white max-w-[200px] leading-relaxed">{risk.risk}</td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          risk.probability === "High" ? "bg-red-950/40 border border-red-500/30 text-red-400" :
                          risk.probability === "Medium" ? "bg-amber-950/40 border border-amber-500/30 text-amber-400" :
                          "bg-green-950/40 border border-green-500/30 text-green-400"
                        }`}>
                          {risk.probability === "High" ? "גבוהה" : risk.probability === "Medium" ? "בינונית" : "נמוכה"}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          risk.impact === "High" ? "bg-red-950/40 border border-red-500/30 text-red-400" :
                          risk.impact === "Medium" ? "bg-amber-950/40 border border-amber-500/30 text-amber-400" :
                          "bg-green-950/40 border border-green-500/30 text-green-400"
                        }`}>
                          {risk.impact === "High" ? "קריטית" : risk.impact === "Medium" ? "בינונית" : "נמוכה"}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-zinc-600 dark:text-zinc-300 max-w-[300px] leading-relaxed">{risk.mitigation}</td>
                      <td className="py-4 px-2 text-center">
                        <button
                          onClick={() => toggleRiskApproval(risk.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            risk.approved
                              ? "bg-green-600 text-white shadow-md shadow-green-500/10"
                              : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-[#f59e0b] hover:text-[#f59e0b]"
                          }`}
                        >
                          {risk.approved ? "✓ אושרה" : "אשר מענה"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center border-t border-zinc-200 dark:border-white/10 pt-6 mt-8">
            <button
              onClick={onBack}
              className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-white font-bold text-xs py-3 px-6 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              חזור לעץ משימות
            </button>

            <button
              onClick={handleNextStep}
              className="flex items-center gap-1.5 bg-[#f59e0b] text-black font-bold text-xs py-3 px-8 rounded-xl hover:bg-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all cursor-pointer active:scale-95"
            >
              <span>נעל תכולה והמשך לשידוך משאבים</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
