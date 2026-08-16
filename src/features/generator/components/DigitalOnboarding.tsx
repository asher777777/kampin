"use client";

import React, { useState, useRef, useEffect } from "react";
import { submitDigitalSignatureAction } from "../actions";
import { User, Phone, Mail, DollarSign, PenTool, ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

interface DigitalOnboardingProps {
  pageId: string; // projectid_roleid
  roleTitle: string;
  roleRequirements: string;
  budget: number;
  onSuccess?: () => void;
}

type OnboardStep = "welcome" | "name" | "phone" | "email" | "price" | "signature" | "complete";

export default function DigitalOnboarding({
  pageId,
  roleTitle,
  roleRequirements,
  budget,
  onSuccess
}: DigitalOnboardingProps) {
  const [step, setStep] = useState<OnboardStep>("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState(budget);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Auto-advance logic on Enter key
  const handleKeyDown = (e: React.KeyboardEvent, nextStep: OnboardStep) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setStep(nextStep);
    }
  };

  // Setup canvas drawing
  useEffect(() => {
    if (step === "signature" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = document.documentElement.classList.contains("dark") ? "#ffffff" : "#000000";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
      }
    }
  }, [step]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    
    // Get mouse/touch coordinates
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!name.trim()) {
      setError("שם מלא הוא שדה חובה");
      setStep("name");
      return;
    }
    if (!phone.trim()) {
      setError("מספר טלפון הוא שדה חובה");
      setStep("phone");
      return;
    }

    setSubmitting(true);
    setError("");

    let signatureBase64 = "";
    if (canvasRef.current) {
      signatureBase64 = canvasRef.current.toDataURL("image/png");
    }

    try {
      const res = await submitDigitalSignatureAction(
        pageId,
        name,
        phone,
        email,
        Number(price) || budget,
        signatureBase64
      );

      if (res.success) {
        setStep("complete");
        if (onSuccess) {
          setTimeout(onSuccess, 3000);
        }
      } else {
        setError(res.error || "שגיאה בתהליך הרישום");
      }
    } catch (err) {
      setError("שגיאת שרת בעיבוד החתימה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 text-right select-none" dir="rtl">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow accent */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#f59e0b]/5 blur-3xl rounded-full" />
        
        {error && (
          <div className="mb-4 text-red-500 bg-red-950/10 border border-red-500/20 p-3 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* 1. Welcome Screen */}
        {step === "welcome" && (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-8 h-8 text-[#f59e0b]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">טופס קליטה ואישור פרויקט</h3>
              <p className="text-xs text-[#f59e0b] font-bold">תפקיד: {roleTitle}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 px-4 leading-relaxed">
                הוזמנת להצטרף לצוות הפרויקט. כדי לקבל גישה לחדר הישיבות הוירטואלי (War Room) ולקבל הרשאות, אנא אמת את פרטיך וחתום דיגיטלית על תנאי העבודה.
              </p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 text-right space-y-2">
              <span className="text-[10px] text-zinc-500 font-bold block">תיאור המשימה והדרישות:</span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{roleRequirements}</p>
              <div className="border-t border-zinc-200 dark:border-white/5 pt-2 mt-2 flex justify-between text-xs font-bold">
                <span className="text-zinc-500">תקציב מוצע:</span>
                <span className="text-[#f59e0b] font-mono">₪{budget.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setStep("name")}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#f59e0b]/10 active:scale-95"
            >
              התחל בתהליך הקליטה
            </button>
          </div>
        )}

        {/* 2. Step: Full Name */}
        {step === "name" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xs text-zinc-400 font-bold">שלב 1 מתוך 5:</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-zinc-800 dark:text-white block">מה שמך המלא?</label>
              <input
                type="text"
                autoFocus
                placeholder="הקלד שם פרטי ושם משפחה"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "phone")}
                className="w-full bg-zinc-50 dark:bg-black border-2 border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => name.trim() ? setStep("phone") : setError("אנא הזן את שמך")}
              className="w-full bg-[#f59e0b] text-black font-black text-xs py-3.5 rounded-xl hover:bg-[#d97706] transition-all cursor-pointer"
            >
              המשך לשלב הבא
            </button>
          </div>
        )}

        {/* 3. Step: Phone */}
        {step === "phone" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xs text-zinc-400 font-bold">שלב 2 מתוך 5:</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-zinc-800 dark:text-white block">מה מספר הטלפון שלך?</label>
              <input
                type="tel"
                autoFocus
                placeholder="למשל: 0501234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "email")}
                className="w-full bg-zinc-50 dark:bg-black border-2 border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("name")} className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white font-bold text-xs py-3 rounded-xl cursor-pointer">
                חזור
              </button>
              <button
                onClick={() => phone.trim() ? setStep("email") : setError("אנא הזן מספר טלפון")}
                className="flex-1 bg-[#f59e0b] text-black font-black text-xs py-3 rounded-xl hover:bg-[#d97706] cursor-pointer"
              >
                המשך
              </button>
            </div>
          </div>
        )}

        {/* 4. Step: Email */}
        {step === "email" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xs text-zinc-400 font-bold">שלב 3 מתוך 5:</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-zinc-800 dark:text-white block">כתובת הדואר האלקטרוני שלך (אופציונלי):</label>
              <input
                type="email"
                autoFocus
                placeholder="למשל: name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "price")}
                className="w-full bg-zinc-50 dark:bg-black border-2 border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("phone")} className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white font-bold text-xs py-3 rounded-xl cursor-pointer">
                חזור
              </button>
              <button
                onClick={() => setStep("price")}
                className="flex-1 bg-[#f59e0b] text-black font-black text-xs py-3 rounded-xl hover:bg-[#d97706] cursor-pointer"
              >
                המשך
              </button>
            </div>
          </div>
        )}

        {/* 5. Step: Price quote */}
        {step === "price" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xs text-zinc-400 font-bold">שלב 4 מתוך 5:</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-zinc-800 dark:text-white block">אשר או עדכן את הצעת המחיר הסופית שלך (₪):</label>
              <input
                type="number"
                autoFocus
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, "signature")}
                className="w-full bg-zinc-50 dark:bg-black border-2 border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-xl py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">תקציב יעד מוגדר באמנה: ₪{budget.toLocaleString()}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("email")} className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white font-bold text-xs py-3 rounded-xl cursor-pointer">
                חזור
              </button>
              <button
                onClick={() => setStep("signature")}
                className="flex-1 bg-[#f59e0b] text-black font-black text-xs py-3 rounded-xl hover:bg-[#d97706] cursor-pointer"
              >
                המשך לחתימה
              </button>
            </div>
          </div>
        )}

        {/* 6. Step: Signature */}
        {step === "signature" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xs text-zinc-400 font-bold">שלב 5 מתוך 5: חתימה דיגיטלית</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block">
                אני מאשר/ת את תנאי הפרויקט והמשימה, ומתחייב/ת לבצע את משימת "{roleTitle}" תמורת ₪{price.toLocaleString()}.&rlm;
              </label>
              <div className="border border-zinc-300 dark:border-white/10 rounded-2xl bg-zinc-50 dark:bg-black overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] cursor-crosshair touch-none"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold">
                <span>צייר את חתימתך בתוך הריבוע למעלה</span>
                <button type="button" onClick={clearCanvas} className="text-[#f59e0b] hover:underline cursor-pointer">
                  נקה לוח
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("price")} className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-white font-bold text-xs py-3 rounded-xl cursor-pointer">
                חזור
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-green-500/10 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    קולט נתונים...
                  </>
                ) : (
                  <>
                    <span>אשר וחתום דיגיטלית</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 7. Step: Complete */}
        {step === "complete" && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-green-950 flex items-center justify-center rounded-full mx-auto border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-bounce">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">ברוך הבא לפרויקט!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                חתימתך הדיגיטלית אושרה בהצלחה. נוצר עבורך מפתח גישה אישי.&rlm;
                אתה מועבר כעת לחדר הישיבות הוירטואלי (War Room) של הפרויקט...
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
