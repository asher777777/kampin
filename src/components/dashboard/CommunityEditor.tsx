"use client";

import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { ChevronDown, ChevronUp, Save, Users, Check, X, Edit2, Loader2 } from "lucide-react";
import { CommunityData, CommunityGoal } from "@/features/settings/actions";
import { Audience } from "@/features/company-services/actions";
import { GoalGlossaryItem } from "@/features/company-services/goals-actions";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";

const DEFAULT_GOALS: CommunityGoal[] = [
  { name: "הגדלת רווחים", icon: "TrendingUp" },
  { name: "הידוק הקשרים הבין ארגוניים", icon: "Users" },
  { name: "הפצת תוכן", icon: "Share" }
];

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

export function CommunityEditor({ 
  community,
  onUpdate,
  isOpen,
  onToggle,
  isCompleted,
  audiencesList,
  goalsList,
  onAddAudience,
  onAddGoal
}: { 
  community: CommunityData;
  onUpdate: (updated: CommunityData, nextField?: string) => Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
  audiencesList: Audience[];
  goalsList: GoalGlossaryItem[];
  onAddAudience: (name: string) => Promise<string | null>;
  onAddGoal: (name: string, icon: string) => Promise<string | null>;
}) {
  
  
  
  // Community fields
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [brandColor, setBrandColor] = useState("#4f46e5");

  // Audiences Glossary
  const [isOtherAudienceOpen, setIsOtherAudienceOpen] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [savingAudience, setSavingAudience] = useState(false);

  // Goals Glossary
  const [isOtherGoalOpen, setIsOtherGoalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("Target");
  const [savingGoal, setSavingGoal] = useState(false);

  // Editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (community) {
      setName(community.name || "");
      setIcon(community.icon || "");
      setTargetAudiences(community.targetAudiences || []);
      setGoals(community.goals || []);
      setBrandColor(community.brandColor || "#4f46e5");
    }
  }, [community]);

  // Determine which section is open by default based on what is missing
  useEffect(() => {
    if (isOpen && !editingSection && !isCompleted) {
      if (!name) {
        setEditingSection("name");
      } else if (targetAudiences.length === 0) {
        setEditingSection("audience");
      } else if (goals.length === 0) {
        setEditingSection("goal");
      } else if (!brandColor) {
        setEditingSection("color");
      } else {
        setEditingSection(null);
      }
    }
  }, [isOpen, name, targetAudiences, goals, brandColor, editingSection, isCompleted]);

  const handleSaveField = async (field: string) => {
    setSaving(true);
    
    const updatedCommunity: CommunityData = {
      id: community.id,
      name,
      icon,
      targetAudiences,
      goals,
      brandColor
    };

    let nextField: string | undefined = undefined;
    if (field === "name") nextField = "audience";
    if (field === "audience") nextField = "goal";
    if (field === "goal") nextField = "color";
    if (field === "color") nextField = "null";

    await onUpdate(updatedCommunity, nextField);
    setSaving(false);
    
    if (nextField === "null") {
      setEditingSection(null);
    } else if (nextField) {
      setEditingSection(nextField);
    }
  };

  const handleSaveAudience = async () => {
    if (!newAudienceName.trim()) return;
    setSavingAudience(true);
    const id = await onAddAudience(newAudienceName);
    if (id) {
      setTargetAudiences([...targetAudiences, newAudienceName]);
      setIsOtherAudienceOpen(false);
      setNewAudienceName("");
    } else {
      alert("שגיאה ביצירת קהל יעד");
    }
    setSavingAudience(false);
  };

  const handleSaveGoal = async () => {
    if (!newGoalName.trim()) return;
    setSavingGoal(true);
    const id = await onAddGoal(newGoalName, newGoalIcon);
    if (id) {
      setGoals([...goals, { name: newGoalName, icon: newGoalIcon }]);
      setIsOtherGoalOpen(false);
      setNewGoalName("");
      setNewGoalIcon("Target");
    } else {
      alert("שגיאה ביצירת מטרה");
    }
    setSavingGoal(false);
  };

  const isNameOpen = editingSection === "name";
  const isAudienceOpen = editingSection === "audience";
  const isGoalOpen = editingSection === "goal";
  const isColorOpen = editingSection === "color";

  return (
    <div className="w-full border border-white/5 bg-[#181818] rounded-2xl">
      <div className="relative">
        {/* Sticky Header */}
        <div className={`w-full bg-[#181818] transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md border-b border-white/5 rounded-t-2xl' : 'rounded-2xl'}`} dir="rtl">
          <button
            type="button"
            onClick={(e) => {
              onToggle();
              if (!isOpen) scrollToTop(e);
            }}
            className={`w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-4 text-right">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-purple-400'}`}>
                {(() => {
                  if (name && icon) {
                    const CurrentIcon = (LucideIcons as any)[icon] || LucideIcons.Image;
                    return <CurrentIcon className="w-5 h-5" />;
                  }
                  return isCompleted ? <Check className="w-5 h-5" /> : <Users className="w-5 h-5" />;
                })()}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base">{name ? name : "קהילה חדשה"}</span>
                <span className="text-[11px] text-gray-400 font-semibold mt-0.5 font-sans">
                  {targetAudiences.length} קהלים • {goals.length} מטרות
                </span>
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {/* Outer Tab Content */}
        {isOpen && (
          <div className="w-full bg-[#111] animate-in fade-in duration-200 rounded-b-2xl flex flex-col">
            
            {/* 1. שם הקהילה */}
            {!isNameOpen && name ? (
              <div 
                onClick={() => setEditingSection("name")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">שם הקהילה</h4>
                    <p className="text-xs text-emerald-400 mt-0.5 truncate max-w-[200px] sm:max-w-[400px]">נבחר</p>
                  </div>
                </div>
                <Edit2 className="w-4 h-4 text-gray-500" />
              </div>
            ) : (
              <div className={`w-full ${isNameOpen ? 'bg-[#181818] border-b border-white/5 shadow-inner' : 'opacity-50 pointer-events-none'}`} dir="rtl">
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                    <h3 className="text-base sm:text-lg font-bold text-white text-right">שם הקהילה</h3>
                  </div>
                  
                  {isNameOpen && (
                    <div className="space-y-4 pr-11 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col gap-3">
                        <div className="w-full sm:w-64">
                          <IconPicker 
                            value={icon} 
                            onChange={setIcon} 
                            placeholder="בחר סמל לקהילה"
                            triggerClassName="flex items-center gap-2 border rounded-xl p-3 bg-black/40 border-indigo-500/30 text-white cursor-pointer hover:border-indigo-500 transition-colors"
                            iconClassName="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"
                          />
                        </div>
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="לדוגמה: מועדון המשקיעים / קהילת העובדים"
                            className="w-full bg-black/40 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-600 text-right pr-4 pl-24"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && name.trim()) handleSaveField("name");
                            }}
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button 
                              onClick={() => setName("")}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleSaveField("name")}
                              disabled={saving || !name.trim()}
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-lg text-white transition-colors flex items-center justify-center"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. קהל יעד */}
            {!isAudienceOpen && targetAudiences.length > 0 ? (
              <div 
                onClick={() => setEditingSection("audience")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">קהל יעד</h4>
                    <p className="text-xs text-emerald-400 mt-0.5 truncate max-w-[200px] sm:max-w-[400px]">נבחרו {targetAudiences.length} קהלים</p>
                  </div>
                </div>
                <Edit2 className="w-4 h-4 text-gray-500" />
              </div>
            ) : (
              <div className={`w-full ${isAudienceOpen ? 'bg-[#181818] border-b border-white/5 shadow-inner' : 'opacity-50 pointer-events-none'}`} dir="rtl">
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                    <h3 className="text-base sm:text-lg font-bold text-white text-right">קהל יעד</h3>
                  </div>
                  
                  {isAudienceOpen && (
                    <div className="space-y-4 pr-11 animate-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Array.from(new Set(["לקוחות", "תורמים", "עובדים", "חברים", ...audiencesList.map(a => a.name)])).map((aud: string) => (
                            <button
                              key={aud}
                              onClick={() => {
                                if (targetAudiences.includes(aud)) {
                                  setTargetAudiences(targetAudiences.filter((a: string) => a !== aud));
                                } else {
                                  setTargetAudiences([...targetAudiences, aud]);
                                }
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                targetAudiences.includes(aud) 
                                  ? "bg-indigo-600 border-indigo-600 text-white" 
                                  : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                              }`}
                            >
                              {aud}
                            </button>
                          ))}
                          <button
                            onClick={() => setIsOtherAudienceOpen(true)}
                            className="px-4 py-2 rounded-full text-sm font-medium transition-colors border bg-black/40 border-white/10 text-indigo-400 hover:text-indigo-300"
                          >
                            + אחר
                          </button>
                        </div>

                        {isOtherAudienceOpen && (
                          <div className="flex items-center gap-2 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 max-w-sm">
                            <input
                              type="text"
                              value={newAudienceName}
                              onChange={e => setNewAudienceName(e.target.value)}
                              placeholder="קהל יעד חדש..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-0"
                            />
                            <Button onClick={handleSaveAudience} disabled={savingAudience || !newAudienceName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-auto py-2 shrink-0">
                              {savingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                            <button onClick={() => setIsOtherAudienceOpen(false)} className="text-gray-500 hover:text-white p-2 shrink-0"><X className="w-4 h-4" /></button>
                          </div>
                        )}

                        <div className="flex justify-end mt-4">
                          <Button 
                            onClick={() => handleSaveField("audience")}
                            disabled={saving || targetAudiences.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-6 py-2 rounded-xl flex items-center"
                          >
                            שמור והמשך <Save className="w-3 h-3 mr-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. מטרת הקהילה */}
            {/* 3. מטרת הקהילה */}
            {!isGoalOpen && goals.length > 0 ? (
              <div 
                onClick={() => setEditingSection("goal")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">מטרת הקהילה</h4>
                    <p className="text-xs text-emerald-400 mt-0.5 truncate max-w-[200px] sm:max-w-[400px]">נבחרו {goals.length} מטרות</p>
                  </div>
                </div>
                <Edit2 className="w-4 h-4 text-gray-500" />
              </div>
            ) : (
              <div className={`w-full ${isGoalOpen ? 'bg-[#181818] border-b border-white/5 shadow-inner' : 'opacity-50 pointer-events-none'}`} dir="rtl">
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                    <h3 className="text-base sm:text-lg font-bold text-white text-right">מטרת הקהילה</h3>
                  </div>
                  
                  {isGoalOpen && (
                    <div className="space-y-4 pr-11 animate-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        
                        <div className="flex flex-col gap-2 mb-3">
                          {Array.from(
                            new Map([...DEFAULT_GOALS, ...goalsList.map(g => ({ name: g.name, icon: g.icon }))].map(g => [g.name, g])).values()
                          ).map((g) => {
                            const IconCmp = (LucideIcons as any)[g.icon] || LucideIcons.Target;
                            const isSelected = goals.some(sel => sel.name === g.name);
                            return (
                              <button
                                key={g.name}
                                onClick={() => {
                                  if (isSelected) {
                                    setGoals(goals.filter(sel => sel.name !== g.name));
                                  } else {
                                    setGoals([...goals, g]);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
                                  isSelected 
                                    ? "bg-indigo-600/20 border-indigo-600 text-white" 
                                    : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                                }`}
                              >
                                <IconCmp className={`w-5 h-5 ${isSelected ? "text-indigo-400" : "text-gray-500"}`} />
                                <span className="flex-1 text-right">{g.name}</span>
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setIsOtherGoalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors border bg-black/40 border-white/10 text-indigo-400 hover:text-indigo-300"
                          >
                            <LucideIcons.Plus className="w-4 h-4" />
                            אחר
                          </button>
                        </div>

                        {isOtherGoalOpen && (
                          <div className="flex flex-col gap-3 mt-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <h4 className="text-sm font-medium text-white mb-1">הוספת מטרה חדשה</h4>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={newGoalName}
                                  onChange={e => setNewGoalName(e.target.value)}
                                  placeholder="שם המטרה..."
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="w-full sm:w-auto">
                                <IconPicker value={newGoalIcon} onChange={setNewGoalIcon} />
                              </div>
                              <Button onClick={handleSaveGoal} disabled={savingGoal || !newGoalName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5">
                                {savingGoal ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "שמור לגלוסרי"}
                              </Button>
                              <button onClick={() => setIsOtherGoalOpen(false)} className="text-gray-500 hover:text-white p-2 shrink-0 self-center"><X className="w-5 h-5" /></button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end mt-4">
                          <Button 
                            onClick={() => handleSaveField("goal")}
                            disabled={saving || goals.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-6 py-2 rounded-xl flex items-center"
                          >
                            שמור והמשך <Save className="w-3 h-3 mr-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. צבע מותג */}
            {!isColorOpen && brandColor && isCompleted ? (
              <div 
                onClick={() => setEditingSection("color")}
                className="w-full bg-[#181818] rounded-b-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">צבע מותג</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brandColor }}></div>
                      <p className="text-xs text-emerald-400">נבחר</p>
                    </div>
                  </div>
                </div>
                <Edit2 className="w-4 h-4 text-gray-500" />
              </div>
            ) : (
              <div className={`w-full ${isColorOpen ? 'bg-[#181818] rounded-b-2xl shadow-inner' : 'opacity-50 pointer-events-none rounded-b-2xl'}`} dir="rtl">
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">4</div>
                    <h3 className="text-base sm:text-lg font-bold text-white text-right">צבע מותג</h3>
                  </div>
                  
                  {isColorOpen && (
                    <div className="space-y-4 pr-11 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">בחר את הצבע המוביל של הקהילה:</label>
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 outline-none"
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button 
                          onClick={() => handleSaveField("color")}
                          disabled={saving}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-8 py-2.5 rounded-xl flex items-center"
                        >
                          {saving ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
                          סיום ושמירת הקהילה
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
