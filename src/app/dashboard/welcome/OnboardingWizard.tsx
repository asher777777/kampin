"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, Coins, LifeBuoy, Users, ChevronLeft, Loader2, Sparkles, CheckCircle2, ChevronUp, ChevronDown, Edit2, Save, Plus, X } from "lucide-react";
import { createCommunity } from "@/features/communities/actions";
import { getGlobalSettings, saveGlobalSettings } from "@/features/settings/actions";
import { useRouter } from "next/navigation";

type FormData = {
  segment: string | null;
  goal: string | null;
  name: string;
  color: string;
};

const colors = [
  { id: "#3b82f6", name: "כחול אמין" },
  { id: "#8b5cf6", name: "סגול יצירתי" },
  { id: "#10b981", name: "ירוק צומח" },
  { id: "#f59e0b", name: "כתום אנרגטי" },
  { id: "#ec4899", name: "ורוד בולט" },
  { id: "#0f172a", name: "שחור יוקרתי" },
];

export interface OnboardingWizardProps {
  onClose?: () => void;
  initialData?: any;
  onSaveAction?: (data: any) => Promise<any>;
  showStrategyOnSuccess?: boolean;
}

export function OnboardingWizard({ 
  onClose, 
  initialData, 
  onSaveAction,
  showStrategyOnSuccess = true 
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialData?.id ? 0 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    segment: initialData?.segment || null,
    goal: initialData?.goal || null,
    name: initialData?.name || "",
    color: initialData?.color || "#3b82f6",
  });

  const [customAudiences, setCustomAudiences] = useState<string[]>([]);
  const [isAddingOther, setIsAddingOther] = useState(false);
  const [newAudience, setNewAudience] = useState("");

  const [customGoals, setCustomGoals] = useState<string[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    getGlobalSettings().then(settings => {
      if (settings.customAudiences) {
        setCustomAudiences(settings.customAudiences);
      }
      if (settings.customGoals) {
        setCustomGoals(settings.customGoals);
      }
    });
  }, []);

  const handleSaveNewAudience = async () => {
    if (!newAudience.trim()) return;
    const aud = newAudience.trim();
    const updated = [...customAudiences, aud];
    setCustomAudiences(updated);
    setFormData({ ...formData, segment: aud });
    setIsAddingOther(false);
    setNewAudience("");
    await saveGlobalSettings({ customAudiences: updated });
    setTimeout(() => handleNext(2), 200);
  };

  const handleSaveNewGoal = async () => {
    if (!newGoal.trim()) return;
    const goal = newGoal.trim();
    const updated = [...customGoals, goal];
    setCustomGoals(updated);
    setFormData({ ...formData, goal: goal });
    setIsAddingGoal(false);
    setNewGoal("");
    await saveGlobalSettings({ customGoals: updated });
    setTimeout(() => handleNext(3), 200);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.segment || !formData.goal)) return;
    if (step === 2 && !formData.name) return;
    setStep((prev) => prev + 1);
  };

  const handleTabToggle = async (tabNumber: number) => {
    if (step === tabNumber) {
      if (initialData?.id && onSaveAction) {
        setIsSubmitting(true);
        try {
          await onSaveAction({
            ...initialData,
            name: formData.name,
            color: formData.color,
            segment: formData.segment,
            goal: formData.goal,
            icon: initialData?.icon || "Users",
          });
        } catch (error) {
          console.error("Failed to auto-save:", error);
        } finally {
          setIsSubmitting(false);
        }
      }
      setStep(0);
    } else {
      setStep(tabNumber);
    }
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    
    try {
      if (onSaveAction) {
        await onSaveAction({
          ...initialData,
          name: formData.name,
          color: formData.color,
          segment: formData.segment,
          goal: formData.goal,
          icon: initialData?.icon || "Users",
        });
        setIsSubmitting(false);
        if (showStrategyOnSuccess) {
          setShowStrategy(true);
        } else {
          onClose?.();
        }
        return;
      }

      // Default Save to CRM / Communities
      await createCommunity({
        name: formData.name,
        color: formData.color,
        icon: "Users", // default
      } as any);
      
      // Simulate AI processing time for the strategy presentation
      setTimeout(() => {
        setIsSubmitting(false);
        if (showStrategyOnSuccess) {
          setShowStrategy(true);
        } else {
          onClose?.();
        }
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  if (showStrategy) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-8"
      >
        <div className="mx-auto w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">האסטרטגיה שלך מוכנה!</h2>
        <div className="bg-[#181818] border border-white/5 p-6 rounded-2xl text-right space-y-4 max-w-lg mx-auto shadow-sm">
          <p className="text-gray-300 font-medium">בנינו עבורך את התשתית המושלמת לקהילת <strong className="text-white">{formData.name}</strong>:</p>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>עמוד בית ממוקד <strong className="text-white">{formData.goal}</strong> שיעזור לך להמיר גולשים לחברי קהילה באופן אוטומטי.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>עיצוב ייחודי מבוסס על צבעי המותג שבחרת שמייצר תחושת שייכות.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>הקהילה סונכרנה ישירות למערכת ה-CRM – עכשיו כל ליד שייכנס יישמר וינוהל שם.</span>
            </li>
          </ul>
        </div>
        <button 
          onClick={() => router.push("/dashboard")}
          className="mt-8 bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-500 transition shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50"
        >
          בוא נראה את האתר המוגמר
        </button>
      </motion.div>
    );
  }

  const isStepComplete = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return formData.name.trim().length > 1;
      case 2: return formData.segment !== null;
      case 3: return formData.goal !== null;
      case 4: return formData.color !== "";
      default: return false;
    }
  };

  const handleNext = (currentStep: number) => {
    if (isStepComplete(currentStep)) {
      setStep(currentStep + 1);
    }
  };

  return (
    <div className="relative overflow-x-hidden overflow-y-auto w-full h-full flex flex-col bg-[#111] p-6 sm:p-8" dir="rtl">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-[0.03] bg-white" />
      
      <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        {onClose && (
          <div className="mb-4 relative z-10 shrink-0 flex justify-end">
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Accordion List */}
        <div className="flex-1 space-y-4 relative z-10 pb-8">
          
          {/* Tab 1: Name */}
          <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => handleTabToggle(1)} className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors">
              <span className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isStepComplete(1) ? 'bg-emerald-500/20 text-emerald-400' : step === 1 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                  {isStepComplete(1) && step !== 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <h3 className="font-bold text-sm text-white">שם הקהילה</h3>
                {isStepComplete(1) && step !== 1 && <span className="hidden sm:inline-block mr-2 text-xs text-emerald-400 font-medium font-normal bg-emerald-500/10 px-3 py-1 rounded-full">{formData.name}</span>}
              </span>
              <div className="flex items-center gap-2">
                {step === 1 ? <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"><Save className="h-4 w-4" /><span className="text-xs">שמור</span></div> : <div className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"><Edit2 className="h-4 w-4" /></div>}
              </div>
            </button>
            
            <AnimatePresence>
              {step === 1 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#111] border-t border-white/5 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="לדוגמה: מועדון המשקיעים / קהילת העובדים"
                        className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 focus:bg-[#151515] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none text-right text-white text-sm transition-all placeholder:text-gray-600"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!initialData?.id) handleNext(1);
                            else handleTabToggle(1);
                          }}
                          disabled={!isStepComplete(1)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTabToggle(1)}
                          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab 2: Segment */}
          <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => handleTabToggle(2)} className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors">
              <span className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isStepComplete(2) ? 'bg-emerald-500/20 text-emerald-400' : step === 2 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                  {isStepComplete(2) && step !== 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
                <h3 className="font-bold text-sm text-white">קהל יעד</h3>
                {isStepComplete(2) && step !== 2 && <span className="hidden sm:inline-block mr-2 text-xs text-emerald-400 font-medium font-normal bg-emerald-500/10 px-3 py-1 rounded-full">{formData.segment}</span>}
              </span>
              <div className="flex items-center gap-2">
                {step === 2 ? <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"><Save className="h-4 w-4" /><span className="text-xs">שמור</span></div> : <div className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"><Edit2 className="h-4 w-4" /></div>}
              </div>
            </button>
            
            <AnimatePresence>
              {step === 2 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#111] border-t border-white/5 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col gap-3">
                      {isAddingOther ? (
                        <div className="p-4 rounded-xl border border-indigo-500/50 bg-[#151515]">
                          <h4 className="text-white font-bold text-sm mb-3">שם קהל היעד</h4>
                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              value={newAudience}
                              onChange={(e) => setNewAudience(e.target.value)}
                              placeholder="לדוגמה: משקיעים, תלמידים..."
                              className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-indigo-500/50 outline-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveNewAudience}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setIsAddingOther(false)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {["עובדים", "לקוחות", "מתנדבים", ...customAudiences].map(aud => (
                            <button
                              key={aud}
                              onClick={() => { setFormData({ ...formData, segment: aud }); setTimeout(() => handleNext(2), 200); }}
                              className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${formData.segment === aud ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-black/40 hover:bg-white/5'}`}
                            >
                              <div className={`p-2 rounded-lg ${formData.segment === aud ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400'}`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-white text-sm">{aud}</div>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => setIsAddingOther(true)}
                            className="p-4 rounded-xl border transition-all flex items-center gap-3 border-dashed border-white/10 bg-black/40 hover:bg-white/5"
                          >
                            <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                              <Plus className="w-4 h-4" />
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-400 text-sm">אחר...</div>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab 3: Goal */}
          <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => handleTabToggle(3)} className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors">
              <span className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isStepComplete(3) ? 'bg-emerald-500/20 text-emerald-400' : step === 3 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                  {isStepComplete(3) && step !== 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                </div>
                <h3 className="font-bold text-sm text-white">מטרת הקהילה</h3>
                {isStepComplete(3) && step !== 3 && <span className="hidden sm:inline-block mr-2 text-xs text-emerald-400 font-medium font-normal bg-emerald-500/10 px-3 py-1 rounded-full">{formData.goal}</span>}
              </span>
              <div className="flex items-center gap-2">
                {step === 3 ? <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"><Save className="h-4 w-4" /><span className="text-xs">שמור</span></div> : <div className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"><Edit2 className="h-4 w-4" /></div>}
              </div>
            </button>
            
            <AnimatePresence>
              {step === 3 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#111] border-t border-white/5 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col gap-3">
                      {isAddingGoal ? (
                        <div className="p-4 rounded-xl border border-indigo-500/50 bg-[#151515]">
                          <h4 className="text-white font-bold text-sm mb-3">צור מטרה חדשה</h4>
                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              value={newGoal}
                              onChange={(e) => setNewGoal(e.target.value)}
                              placeholder="לדוגמה: למידה משותפת..."
                              className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-indigo-500/50 outline-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveNewGoal}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setIsAddingGoal(false)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {[
                            { id: "monetization", label: "הכנסה וקורסים", icon: Coins, color: "text-amber-400" },
                            { id: "support", label: "תמיכה ושימור", icon: LifeBuoy, color: "text-emerald-400" },
                            { id: "networking", label: "חיבור ונטוורקינג", icon: Users, color: "text-blue-400" },
                            ...customGoals.map(g => ({ id: g, label: g, icon: Sparkles, color: "text-gray-400" }))
                          ].map((goal) => (
                            <button
                              key={goal.id}
                              onClick={() => { setFormData({ ...formData, goal: goal.label }); setTimeout(() => handleNext(3), 200); }}
                              className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${formData.goal === goal.label ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-black/40 hover:bg-white/5'}`}
                            >
                              <div className={`p-2 rounded-lg ${formData.goal === goal.label ? 'bg-white/10' : 'bg-white/5'} ${goal.color}`}>
                                <goal.icon className="w-5 h-5" />
                              </div>
                              <span className={`text-sm font-bold ${formData.goal === goal.label ? 'text-white' : 'text-gray-400'}`}>{goal.label}</span>
                            </button>
                          ))}
                          <button
                            onClick={() => setIsAddingGoal(true)}
                            className="p-4 rounded-xl border transition-all flex items-center gap-3 border-dashed border-white/10 bg-black/40 hover:bg-white/5"
                          >
                            <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-gray-400">אחר...</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab 4: Color */}
          <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => handleTabToggle(4)} className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors">
              <span className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isStepComplete(4) ? 'bg-emerald-500/20 text-emerald-400' : step === 4 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                  {isStepComplete(4) && step !== 4 ? <CheckCircle2 className="w-4 h-4" /> : '4'}
                </div>
                <h3 className="font-bold text-sm text-white">צבע מותג</h3>
                {isStepComplete(4) && step !== 4 && (
                  <div className="hidden sm:flex items-center gap-2 mr-2 bg-emerald-500/10 px-3 py-1 rounded-full">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.color }} />
                     <span className="text-xs text-emerald-400 font-medium font-normal">נבחר</span>
                  </div>
                )}
              </span>
              <div className="flex items-center gap-2">
                {step === 4 ? <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"><Save className="h-4 w-4" /><span className="text-xs">שמור</span></div> : <div className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"><Edit2 className="h-4 w-4" /></div>}
              </div>
            </button>
            
            <AnimatePresence>
              {step === 4 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#111] border-t border-white/5 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-wrap gap-4 justify-start">
                      {colors.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setFormData({ ...formData, color: color.id })}
                          className={`w-12 h-12 rounded-full cursor-pointer transition-all ${formData.color === color.id ? 'scale-110 ring-2 ring-offset-4 ring-offset-[#111] ring-indigo-500' : 'hover:scale-110 ring-1 ring-white/10 ring-offset-2 ring-offset-[#111]'}`}
                          style={{ backgroundColor: color.id }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Footer / Submit */}
        {!initialData?.id && (
          <div className="mt-auto pt-6 pb-6 border-t border-white/5 shrink-0 relative z-10 flex justify-end">
            <button
              onClick={submitForm}
              disabled={!isStepComplete(1) || !isStepComplete(2) || !isStepComplete(3) || !isStepComplete(4) || isSubmitting}
              className="bg-indigo-600 text-white font-bold text-sm py-3 px-8 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-500/50 min-w-[150px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>שמור</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
