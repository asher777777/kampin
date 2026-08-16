"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldAlert, Sparkles, AlertTriangle, ArrowRight, Loader2, Award } from "lucide-react";
import { SmartGoals, ValidatorResult, ProjectCharter } from "../types";
import { validateProjectNeeds } from "../actions";

interface ValidatorStepProps {
  title: string;
  smartGoals: SmartGoals;
  onNext: (validator: ValidatorResult, charter: ProjectCharter, type: "new" | "recurring") => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function ValidatorStep({ title, smartGoals, onNext, onBack, isLoading }: ValidatorStepProps) {
  // Step sub-states: 
  // 1. Ask question "New or Recurring"
  // 2. Loading / Processing
  // 3. Display X-Ray (Validator results) & Project Charter signing
  const [subStep, setSubStep] = useState<"ask_type" | "loading" | "xray">("ask_type");
  const [projectType, setProjectType] = useState<"new" | "recurring" | null>(null);
  const [validatorResult, setValidatorResult] = useState<ValidatorResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Charter data
  const [lockedBudget, setLockedBudget] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(0);
  const [isSigned, setIsSigned] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signingActive, setSigningActive] = useState(false);

  // Auto-advance logic for selecting project type
  const handleSelectType = async (type: "new" | "recurring") => {
    setProjectType(type);
    setSubStep("loading");
    setValidationError("");
    setValidationLoading(true);

    try {
      const res = await validateProjectNeeds({
        title,
        smartGoals,
        type
      });

      if (res.success && res.data) {
        setValidatorResult(res.data);
        setLockedBudget(res.data.estimatedCostMax); // Default locked budget to max estimate
        setDurationDays(res.data.estimatedDurationDays); // Default duration
        setSubStep("xray");
      } else {
        setValidationError(res.error || "נכשל בתיקוף נתוני הפרויקט");
        setSubStep("ask_type");
      }
    } catch (err: any) {
      setValidationError("שגיאה בחיבור לשרת התיקוף");
      setSubStep("ask_type");
    } finally {
      setValidationLoading(false);
    }
  };

  // Sign charter simulation
  const handleSignCharter = () => {
    if (!signatureName.trim()) {
      alert("אנא הזן את שמך המלא לחתימה על האמנה");
      return;
    }
    setSigningActive(true);
    setTimeout(() => {
      setIsSigned(true);
      setSigningActive(false);
    }, 1500); // 1.5 seconds fingerprint seal simulation
  };

  const handleProceed = () => {
    if (!validatorResult || !projectType) return;
    
    const charter: ProjectCharter = {
      lockedBudget: Number(lockedBudget),
      durationDays: Number(durationDays),
      signedBy: isSigned ? signatureName : null,
      signedAt: isSigned ? new Date().toISOString() : null
    };

    onNext(validatorResult, charter, projectType);
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-right" dir="rtl">
      <AnimatePresence mode="wait">
        
        {/* SUB-STEP 1: Ask New or Recurring */}
        {subStep === "ask_type" && (
          <motion.div
            key="ask_type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-black border border-[#f59e0b]/20 p-8 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.03)]"
          >
            <h2 className="text-2xl font-bold text-white mb-6 text-center">תיקוף הפרויקט: סיווג המיזם</h2>
            <p className="text-gray-400 text-sm text-center mb-8">
              לפני שנתחיל לחשב תקציבים ומשימות, המחולל צריך להבין האם פרויקט זה כבר בוצע בעבר בארגון או שהוא יוזמה חדשה לחלוטין.
            </p>

            <div className="space-y-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => handleSelectType("new")}
                className="w-full bg-zinc-950/50 hover:bg-[#f59e0b]/5 border border-[#f59e0b]/30 hover:border-[#f59e0b] p-6 rounded-xl flex items-center justify-between text-right transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-white font-bold text-base group-hover:text-[#f59e0b] transition-colors">מיזם חדש לחלוטין</span>
                  <span className="text-gray-400 text-xs">פרויקט שלא בוצע בעבר בארגון, דורש ניתוח שוק, תיקוף צורך והערכת סיכונים מקיפה.</span>
                </div>
                <div className="w-6 h-6 rounded-full border border-[#f59e0b]/40 flex items-center justify-center shrink-0 group-hover:border-[#f59e0b]">
                  <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-[#f59e0b]" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectType("recurring")}
                className="w-full bg-zinc-950/50 hover:bg-[#f59e0b]/5 border border-[#f59e0b]/30 hover:border-[#f59e0b] p-6 rounded-xl flex items-center justify-between text-right transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-white font-bold text-base group-hover:text-[#f59e0b] transition-colors">פרויקט חוזר או משוכפל</span>
                  <span className="text-gray-400 text-xs">פרויקט שהארגון כבר ביצע בעבר. המחולל יתבסס על ניסיון עבר לשכפול המבנה.</span>
                </div>
                <div className="w-6 h-6 rounded-full border border-[#f59e0b]/40 flex items-center justify-center shrink-0 group-hover:border-[#f59e0b]">
                  <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-[#f59e0b]" />
                </div>
              </button>
            </div>

            {validationError && (
              <div className="text-red-400 text-sm mt-6 text-center bg-red-950/20 p-3 rounded-lg border border-red-500/20 max-w-md mx-auto">
                {validationError}
              </div>
            )}

            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 border border-white/10 hover:border-white/30 text-white px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזור ליעדים</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* SUB-STEP 2: Feasibility Loader */}
        {subStep === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-black border border-[#f59e0b]/10 rounded-2xl"
          >
            <Loader2 className="w-12 h-12 text-[#f59e0b] animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">המחולל סורק היתכנות...</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm px-4">
              אנחנו סורקים כעת נתונים היסטוריים, בודקים אומדני שוק ומזהים דגלים אדומים תפעוליים ורגולטוריים.
            </p>
          </motion.div>
        )}

        {/* SUB-STEP 3: X-Ray & Project Charter */}
        {subStep === "xray" && validatorResult && (
          <motion.div
            key="xray"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Project X-ray dashboard */}
            <div className="bg-zinc-950 border border-[#f59e0b]/20 p-6 rounded-2xl">
              <div className="flex items-center gap-2 border-b border-[#f59e0b]/10 pb-4 mb-4">
                <ShieldAlert className="w-6 h-6 text-[#f59e0b]" />
                <h3 className="text-lg font-bold text-white">תמונת רנטגן לפרויקט</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/50 border border-[#f59e0b]/10 p-4 rounded-xl">
                  <span className="text-gray-400 text-xs block mb-1">צפי עלויות מוערך</span>
                  <span className="text-white font-bold text-lg">
                    {validatorResult.estimatedCostMin.toLocaleString()} - {validatorResult.estimatedCostMax.toLocaleString()} ₪
                  </span>
                </div>
                <div className="bg-black/50 border border-[#f59e0b]/10 p-4 rounded-xl">
                  <span className="text-gray-400 text-xs block mb-1">לוח זמנים מוערך</span>
                  <span className="text-white font-bold text-lg">{validatorResult.estimatedDurationDays} ימי עבודה</span>
                </div>
                <div className="bg-black/50 border border-[#f59e0b]/10 p-4 rounded-xl">
                  <span className="text-gray-400 text-xs block mb-1">סוג המיזם מאושר</span>
                  <span className="text-[#f59e0b] font-bold text-lg">
                    {projectType === "new" ? "חדש בארגון" : "משוכפל/חוזר"}
                  </span>
                </div>
              </div>

              {/* Need Validation Summary */}
              <div className="bg-black/40 border border-[#f59e0b]/10 p-4 rounded-xl mb-4">
                <h4 className="text-sm font-bold text-[#f59e0b] mb-2">תיקוף צרכים (Need Validation):</h4>
                <p className="text-gray-300 text-xs leading-relaxed">{validatorResult.demandValidation}</p>
              </div>

              {/* Risks & Warnings */}
              {validatorResult.risks.length > 0 && (
                <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl">
                  <div className="flex items-center gap-1.5 text-red-400 text-sm font-semibold mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>דגלים אדומים וסיכונים (Risks):</span>
                  </div>
                  <ul className="list-disc list-inside text-gray-300 text-xs space-y-1">
                    {validatorResult.risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Glowing Project Charter Contract */}
            <div className="bg-gradient-to-b from-[#f59e0b]/15 to-black border-2 border-[#f59e0b] p-8 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.1)] relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#f59e0b]/5 rounded-full blur-3xl" />
              
              <div className="flex flex-col items-center mb-6">
                <Award className="w-10 h-10 text-[#f59e0b] mb-2 animate-pulse" />
                <h3 className="text-xl font-bold text-white tracking-wide">אמנת פרויקט - Project Charter</h3>
                <span className="text-gray-500 text-xs">הסכם התנעה רשמי ונעילת תקציבים</span>
              </div>

              <div className="space-y-4 mb-8 text-sm text-gray-300 leading-relaxed max-w-xl mx-auto">
                <p>
                  מסמך זה מאשר את הקמתו הרשמית של הפרויקט <strong>"{title}"</strong> בארגון.
                  בחתימתו על אמנה זו, המנהל מקבל את הסמכות לנהל משאבים, לגייס אנשי צוות, ולהוציא תקציבים לטובת משימות הפרויקט בהתאם למסגרת המוגדרת מטה.
                </p>

                {/* Form fields: Budget and duration input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-1">
                    <label className="text-[#f59e0b] text-xs font-bold block">תקציב קשיח מאושר (₪):</label>
                    <input
                      type="number"
                      value={lockedBudget}
                      disabled={isSigned}
                      onChange={(e) => setLockedBudget(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2.5 rounded-lg text-right font-sans focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#f59e0b] text-xs font-bold block">לוחות זמנים מבוקשים (ימים):</label>
                    <input
                      type="number"
                      value={durationDays}
                      disabled={isSigned}
                      onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2.5 rounded-lg text-right font-sans focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {!isSigned && (
                  <div className="mt-4">
                    <label className="text-[#f59e0b] text-xs font-bold block mb-1">שם המורשה לחתום:</label>
                    <input
                      type="text"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="הכנס שם מלא לחתימה..."
                      className="w-full bg-black border border-[#f59e0b]/40 focus:border-[#f59e0b] text-white p-2.5 rounded-lg text-right font-sans focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Digital signature animation element */}
              <div className="flex flex-col items-center justify-center border-t border-[#f59e0b]/10 pt-6">
                {isSigned ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-950 border border-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <span className="text-green-400 font-bold text-sm">האמנה נחתמה בהצלחה!</span>
                    <span className="text-gray-400 text-xs font-mono">
                      נחתם דיגיטלית על ידי {signatureName} בתאריך {new Date().toLocaleDateString("he-IL")}
                    </span>
                  </motion.div>
                ) : (
                  <div className="w-full max-w-xs">
                    <button
                      type="button"
                      disabled={signingActive || !signatureName}
                      onClick={handleSignCharter}
                      className="w-full bg-[#f59e0b] text-black font-bold py-3.5 px-6 rounded-xl hover:bg-[#d97706] shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {signingActive ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>מחתים אמנה...</span>
                        </>
                      ) : (
                        <span>לחץ לחתימה דיגיטלית ואשראי תקציב</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action flow buttons */}
            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => setSubStep("ask_type")}
                disabled={isSigned}
                className="flex items-center gap-2 border border-[#f59e0b]/30 hover:border-[#f59e0b] text-[#f59e0b] px-6 py-2.5 rounded-xl text-sm transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                <span>ערוך סוג מיזם</span>
              </button>

              <button
                type="button"
                onClick={handleProceed}
                disabled={!isSigned || isLoading}
                className="flex items-center gap-2 bg-[#f59e0b] text-black font-semibold px-8 py-3 rounded-xl hover:bg-[#d97706] shadow-[0_0_25px_rgba(245,158,11,0.2)] transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מייצר עץ משימות...</span>
                  </>
                ) : (
                  <span>עבור לעץ משימות ו-RACI</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
