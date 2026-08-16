"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Camera, Upload, Plus, Check } from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadMediaFile } from "@/features/media/actions";
import { motion, AnimatePresence } from "framer-motion";

interface ExpenseFormProps {
  expenseTypes: string[];
  paymentMethods: string[];
  onSubmit: (data: any) => Promise<{ success: boolean; id?: any; error?: any } | void>;
  onAddOption: (type: "expenseType" | "paymentMethod", value: string) => Promise<{ success: boolean; error?: any } | void>;
  hideSubmitButton?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ExpenseForm({ 
  expenseTypes, 
  paymentMethods, 
  onSubmit, 
  onAddOption,
  hideSubmitButton = false,
  formRef,
  onDirtyChange
}: ExpenseFormProps) {
  const [expenseType, setExpenseType] = useState("");
  const [newExpenseType, setNewExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptUrl, setReceiptUrl] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Accordion Step State (0 to 4)
  const [activeStep, setActiveStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Track dirty state
  useEffect(() => {
    const isDirty = 
      expenseType !== "" || 
      newExpenseType !== "" || 
      amount !== "" || 
      paymentMethod !== "" || 
      newPaymentMethod !== "" || 
      receiptUrl !== "" ||
      purchaseDate !== new Date().toISOString().split("T")[0] ||
      paymentDate !== new Date().toISOString().split("T")[0];
      
    onDirtyChange?.(isDirty);
  }, [expenseType, newExpenseType, amount, paymentMethod, newPaymentMethod, purchaseDate, paymentDate, receiptUrl, onDirtyChange]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = file;
      let finalFileName = file.name;

      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/webp",
        };
        fileToUpload = await imageCompression(file, options);
        finalFileName = `receipt_${Date.now()}.webp`;
      } else if (file.type === "application/pdf") {
        if (file.size > 5 * 1024 * 1024) {
          alert("קובץ ה-PDF גדול מ-5MB. למען יעילות המערכת, אנא העלה קובץ קטן יותר.");
          setIsUploading(false);
          e.target.value = "";
          return;
        }
        finalFileName = `receipt_${Date.now()}.pdf`;
      } else {
        alert("סוג קובץ לא נתמך. אנא העלה תמונה או PDF.");
        setIsUploading(false);
        e.target.value = "";
        return;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload, finalFileName);
      
      const uploadRes = await uploadMediaFile(formData);
      if (uploadRes.success && uploadRes.url) {
        setReceiptUrl(uploadRes.url);
        // Auto-advance after upload
        if (activeStep === 4) setActiveStep(-1);
      } else {
        alert("שגיאה בהעלאת הקובץ.");
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה בכיווץ או העלאת הקובץ.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddOption = async (type: "expenseType" | "paymentMethod", value: string) => {
    if (!value.trim()) return;
    await onAddOption(type, value.trim());
    if (type === "expenseType") {
      setExpenseType(value.trim());
      setNewExpenseType("");
      setActiveStep(1); // Advance to amount
    } else {
      setPaymentMethod(value.trim());
      setNewPaymentMethod("");
      setActiveStep(3); // Advance to dates
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseType && !newExpenseType) {
      setActiveStep(0);
      return alert("בחר סוג הוצאה");
    }
    if (!amount) {
      setActiveStep(1);
      return alert("הזן סכום");
    }
    if (!paymentMethod && !newPaymentMethod) {
      setActiveStep(2);
      return alert("בחר צורת תשלום");
    }
    
    setIsSubmitting(true);
    try {
      let finalExpenseType = expenseType;
      let finalPaymentMethod = paymentMethod;

      if (expenseType === "other" && newExpenseType) {
        await handleAddOption("expenseType", newExpenseType);
        finalExpenseType = newExpenseType;
      }
      if (paymentMethod === "other" && newPaymentMethod) {
        await handleAddOption("paymentMethod", newPaymentMethod);
        finalPaymentMethod = newPaymentMethod;
      }

      await onSubmit({
        expenseType: finalExpenseType,
        amount: parseFloat(amount),
        paymentMethod: finalPaymentMethod,
        purchaseDate,
        paymentDate,
        receiptUrl,
      });
      
      // Form reset logic
      setExpenseType("");
      setNewExpenseType("");
      setAmount("");
      setPaymentMethod("");
      setNewPaymentMethod("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReceiptUrl("");
      setActiveStep(0);
      
    } catch (error) {
      console.error("Submit error", error);
      alert("שגיאה בשמירת ההוצאה");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-advance for Enter key in text fields
  const handleKeyDown = (e: React.KeyboardEvent, nextStep: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setActiveStep(nextStep);
    }
  };

  const steps = [
    {
      id: 0,
      title: "סוג הוצאה",
      value: expenseType === "other" ? newExpenseType : expenseType,
      content: (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {expenseTypes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setExpenseType(t); setActiveStep(1); }}
                className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${expenseType === t ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-800 text-white hover:border-amber-500/50'}`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setExpenseType("other")}
              className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${expenseType === "other" ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-800 text-white hover:border-amber-500/50'}`}
            >
              + הוסף חדש...
            </button>
          </div>
          {expenseType === "other" && (
            <input 
              type="text" 
              value={newExpenseType} 
              onChange={(e) => setNewExpenseType(e.target.value)} 
              onKeyDown={(e) => handleKeyDown(e, 1)}
              placeholder="הקלד סוג חדש ולחץ אנטר" 
              className="w-full px-4 py-3 bg-transparent border border-amber-500 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
              autoFocus
            />
          )}
        </div>
      )
    },
    {
      id: 1,
      title: "סכום",
      value: amount ? `₪ ${amount}` : "",
      content: (
        <input 
          type="number" 
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          className="w-full px-4 py-4 bg-transparent border border-amber-500 rounded-xl text-white text-xl text-center focus:ring-2 focus:ring-amber-500/50 outline-none placeholder:text-slate-600"
          placeholder="0.00"
          autoFocus
        />
      )
    },
    {
      id: 2,
      title: "צורת תשלום",
      value: paymentMethod === "other" ? newPaymentMethod : paymentMethod,
      content: (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {paymentMethods.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setPaymentMethod(m); setActiveStep(3); }}
                className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${paymentMethod === m ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-800 text-white hover:border-amber-500/50'}`}
              >
                {m}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaymentMethod("other")}
              className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${paymentMethod === "other" ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-800 text-white hover:border-amber-500/50'}`}
            >
              + הוסף חדש...
            </button>
          </div>
          {paymentMethod === "other" && (
            <input 
              type="text" 
              value={newPaymentMethod} 
              onChange={(e) => setNewPaymentMethod(e.target.value)} 
              onKeyDown={(e) => handleKeyDown(e, 3)}
              placeholder="הקלד צורת תשלום ולחץ אנטר" 
              className="w-full px-4 py-3 bg-transparent border border-amber-500 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
              autoFocus
            />
          )}
        </div>
      )
    },
    {
      id: 3,
      title: "תאריכים",
      value: purchaseDate,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-500">תאריך קניה</label>
            <input 
              type="date" 
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border border-amber-500 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-amber-500">תאריך תשלום בפועל</label>
            <input 
              type="date" 
              value={paymentDate}
              onChange={(e) => {
                setPaymentDate(e.target.value);
              }}
              onKeyDown={(e) => handleKeyDown(e, 4)}
              className="w-full px-4 py-3 bg-transparent border border-amber-500 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded-xl font-bold border border-amber-500/50 transition-colors mt-2"
          >
            המשך
          </button>
        </div>
      )
    },
    {
      id: 4,
      title: "קבלה (אופציונלי)",
      value: receiptUrl ? "צורף קובץ" : "",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <button 
              type="button" 
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-4 border border-amber-500 rounded-xl text-amber-500 flex items-center justify-center gap-2 hover:bg-amber-500/10 transition-colors"
            >
              <Camera className="w-5 h-5" /> צלם קבלה
            </button>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-4 border border-amber-500 rounded-xl text-amber-500 flex items-center justify-center gap-2 hover:bg-amber-500/10 transition-colors"
            >
              <Upload className="w-5 h-5" /> העלה קובץ
            </button>
            
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" />
            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>
          
          {isUploading && (
            <div className="flex items-center justify-center gap-2 text-amber-500 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> מעלה קובץ...
            </div>
          )}
          
          {receiptUrl && !isUploading && (
            <div className="relative w-full h-40 border border-amber-500 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-black/40 flex items-center justify-center">
              {(receiptUrl.toLowerCase().includes('.pdf') || receiptUrl.toLowerCase().includes('%2fpdf')) ? (
                <div className="flex flex-col items-center justify-center text-amber-500 z-0">
                  <div className="w-16 h-16 mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
                    <span className="font-black tracking-widest">PDF</span>
                  </div>
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="underline text-sm hover:text-amber-400 transition-colors relative z-20">צפה בקובץ</a>
                </div>
              ) : (
                <img src={receiptUrl} alt="Receipt preview" className="object-cover w-full h-full opacity-80" />
              )}
              <button 
                type="button" 
                onClick={() => setReceiptUrl("")} 
                className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 border border-white/20 hover:bg-red-500/80 transition-colors z-10"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full space-y-4" dir="rtl">
      {steps.map((step) => {
        const isActive = activeStep === step.id;
        const isCompleted = activeStep > step.id && step.value;

        return (
          <div key={step.id} className="relative">
            <button
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`w-full text-right px-6 py-4 rounded-2xl flex items-center justify-between transition-all duration-300 ${isActive ? 'bg-amber-500/10 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'bg-black border border-slate-800 hover:border-amber-500/30'}`}
            >
              <span className={`font-bold ${isActive ? 'text-amber-500 text-lg' : 'text-slate-400'}`}>
                {step.title}
              </span>
              
              <div className="flex items-center gap-3">
                {step.value && !isActive && (
                  <span className="text-amber-500 font-medium">{step.value}</span>
                )}
                {isCompleted && (
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            </button>

            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 mt-2 bg-black border border-amber-500/30 rounded-2xl">
                    {step.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Hidden submit button since we trigger it via ref */}
      <button type="submit" className="hidden" />
    </form>
  );
}
