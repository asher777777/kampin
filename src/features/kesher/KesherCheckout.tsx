"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CreditCard, Calendar, Lock, AlertCircle, CheckCircle2, Loader2, User } from "lucide-react";

interface KesherCheckoutProps {
  amount?: number;
  description?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  transactionId?: string;
  onSuccess?: (encryptedCC?: string) => void;
  className?: string;
  installments?: number;
  isInstallmentsMapped?: boolean;
  userId?: string;
  paymentFrequency?: "one-time" | "recurring" | "user-choice";
  btnStyle?: React.CSSProperties;
  theme?: "light" | "dark";
}

export function KesherCheckout({ 
  amount, 
  description, 
  clientName, 
  phone, 
  email, 
  transactionId, 
  onSuccess, 
  className, 
  installments = 1, 
  isInstallmentsMapped = false,
  userId,
  paymentFrequency = "one-time",
  btnStyle,
  theme = "light"
}: KesherCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [ccData, setCcData] = useState({
    creditNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv2: "",
    idNumber: "",
    userInstallments: installments
  });

  const [isRecurringChecked, setIsRecurringChecked] = useState(paymentFrequency === "recurring");

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Basic validation
    if (!ccData.creditNumber || ccData.creditNumber.length < 8) {
      setError("אנא הזן מספר כרטיס תקין");
      setIsLoading(false);
      return;
    }
    if (!ccData.expiryMonth || !ccData.expiryYear) {
      setError("אנא הזן תוקף כרטיס");
      setIsLoading(false);
      return;
    }
    if (!ccData.cvv2 || ccData.cvv2.length < 3) {
      setError("אנא הזן ספרות ביקורת (CVV)");
      setIsLoading(false);
      return;
    }

    const expiry = `${ccData.expiryMonth.padStart(2, "0")}${ccData.expiryYear.padStart(2, "0")}`; // Format MMYY

    const freq = isRecurringChecked || paymentFrequency === "recurring" ? "recurring" : "one-time";

    try {
      const response = await fetch("/api/kesher/send-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          creditNumber: ccData.creditNumber,
          expiry,
          cvv2: ccData.cvv2,
          clientName,
          phone,
          email,
          transactionId: description || transactionId,
          installments: isInstallmentsMapped ? installments : ccData.userInstallments,
          paymentFrequency: freq,
          userId,
          id: ccData.idNumber
        })
      });
      const data = await response.json();
      
      console.log("==== KESHER DEBUG ====");
      if (data.payloadSent) console.log("Payload sent to Kesher:", JSON.stringify(data.payloadSent, null, 2));
      if (data.rawResponse) console.log("Raw Response from Kesher:", data.rawResponse);
      console.log("======================");

      if (data.success) {
        setSuccessMsg(data.message || "התשלום בוצע בהצלחה!");
        if (onSuccess) {
          // Pass transactionId to parent to save in CRM
          setTimeout(() => onSuccess(data.transactionId), 1500);
        }
      } else {
        setError(data.error || "שגיאה בביצוע התשלום");
      }
    } catch (err: any) {
      setError(err.message || "שגיאת תקשורת");
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === "dark";
  const labelClass = isDark ? "text-xs font-bold text-slate-300 flex items-center gap-1.5" : "text-xs font-bold text-slate-700 flex items-center gap-1.5";
  const inputClass = isDark 
    ? "w-full bg-[#111113] text-white border border-white/10 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono tracking-widest text-left"
    : "w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono tracking-widest text-left";
  const selectClass = isDark
    ? "w-full bg-[#111113] text-white border border-white/10 focus:border-amber-500 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
    : "w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-500 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono";

  if (successMsg) {
    return (
      <div className={`py-6 flex flex-col items-center justify-center space-y-4 ${className || ""}`}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>הפעולה בוצעה בהצלחה!</h3>
        <p className={`${isDark ? "text-slate-400" : "text-slate-600"} text-center text-sm`}>{successMsg}</p>
      </div>
    );
  }

  return (
    <div className={`py-2 w-full ${className || ""}`}>
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handlePayment} className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>
            <CreditCard className="w-3.5 h-3.5 text-slate-400" /> מספר כרטיס אשראי
          </label>
          <input
            type="text"
            dir="ltr"
            placeholder="0000 0000 0000 0000"
            value={ccData.creditNumber}
            onChange={(e) => setCcData({...ccData, creditNumber: e.target.value.replace(/\D/g, '')})}
            className={inputClass}
            maxLength={16}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>
            <User className="w-3.5 h-3.5" />
            תעודת זהות (בעל הכרטיס)
          </label>
          <input
            type="text"
            maxLength={9}
            dir="ltr"
            value={ccData.idNumber}
            onChange={(e) => setCcData({...ccData, idNumber: e.target.value.replace(/\D/g, '')})}
            className={inputClass}
            placeholder="000000000"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> תוקף (חודש/שנה)
            </label>
            <div className="flex gap-2">
              <select
                dir="ltr"
                value={ccData.expiryMonth}
                onChange={(e) => setCcData({...ccData, expiryMonth: e.target.value})}
                className={selectClass}
              >
                <option value="" disabled className={isDark ? "bg-[#111113] text-white" : ""}>MM</option>
                {Array.from({length: 12}, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <option key={m} value={m} className={isDark ? "bg-[#111113] text-white" : ""}>{m}</option>
                })}
              </select>
              <span className="text-slate-400 self-center">/</span>
              <select
                dir="ltr"
                value={ccData.expiryYear}
                onChange={(e) => setCcData({...ccData, expiryYear: e.target.value})}
                className={selectClass}
              >
                <option value="" disabled className={isDark ? "bg-[#111113] text-white" : ""}>YY</option>
                {Array.from({length: 15}, (_, i) => {
                  const y = String(new Date().getFullYear() % 100 + i).padStart(2, '0');
                  return <option key={y} value={y} className={isDark ? "bg-[#111113] text-white" : ""}>{y}</option>
                })}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className={labelClass}>
              <Lock className="w-3.5 h-3.5 text-slate-400" /> CVV
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="123"
              value={ccData.cvv2}
              onChange={(e) => setCcData({...ccData, cvv2: e.target.value.replace(/\D/g, '')})}
              className={inputClass}
              maxLength={4}
            />
          </div>
        </div>

        {paymentFrequency === "user-choice" && (
          <div className="pt-4 space-y-4">
            <label 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                const nextChecked = !isRecurringChecked;
                setIsRecurringChecked(nextChecked);
                if (nextChecked) {
                  setCcData({...ccData, userInstallments: 9999});
                } else {
                  setCcData({...ccData, userInstallments: installments || 1});
                }
              }}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isRecurringChecked ? "bg-indigo-600 border-indigo-600" : (isDark ? "border-slate-700 bg-[#111113] group-hover:border-indigo-400" : "border-slate-300 bg-white group-hover:border-indigo-400")
              }`}>
                {isRecurringChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className={`text-sm select-none font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>הפוך להוראת קבע (חיוב מתחדש)</span>
            </label>
          </div>
        )}
        
        {!isInstallmentsMapped && (
          <div className="space-y-1.5 pt-2">
            <label className={isDark ? "text-xs font-medium text-slate-400" : "text-xs font-medium text-slate-600"}>
              {isRecurringChecked || paymentFrequency === "recurring" ? "מספר חודשים לחיוב" : "מספר תשלומים"}
            </label>
            <select
              value={ccData.userInstallments}
              onChange={(e) => setCcData({...ccData, userInstallments: Number(e.target.value)})}
              className={selectClass}
            >
              {(isRecurringChecked || paymentFrequency === "recurring") && (
                <option value={9999} className={isDark ? "bg-[#111113] text-white" : ""}>ללא הגבלה (חיוב קבוע)</option>
              )}
              {Array.from({length: 36}, (_, i) => (
                <option key={i+1} value={i+1} className={isDark ? "bg-[#111113] text-white" : ""}>{i+1} {i === 0 ? ((isRecurringChecked || paymentFrequency === "recurring") ? "חודש (חד פעמי)" : "תשלום (רגיל)") : ((isRecurringChecked || paymentFrequency === "recurring") ? "חודשים" : "תשלומים")}</option>
              ))}
            </select>
          </div>
        )}

        <Button 
          type="submit"
          style={btnStyle}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] cursor-pointer bg-blue-600 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> מעבד תשלום...</>
          ) : (
             <><CreditCard className="w-4 h-4" /> בצע תשלום</>
          )}
        </Button>
      </form>
    </div>
  );
}
