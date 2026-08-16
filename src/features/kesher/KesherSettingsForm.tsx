"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { getKesherSettings } from "./actions";
import { requestServiceConnection } from "@/features/crm/actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function KesherSettingsForm() {
  const [settings, setSettings] = useState({ paymentPageId: "", apiKey: "", userName: "", ezCountToken: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    getKesherSettings().then((data) => {
      if (data) {
        setSettings({
          paymentPageId: data.paymentPageId || data.terminalNumber || "",
          apiKey: data.apiKey || "",
          userName: data.userName || "",
          ezCountToken: data.ezCountToken || ""
        });
      }
      setIsLoading(false);
    });
  }, []);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const res = await requestServiceConnection("Kesher/EasyCount (סליקה וקבלות)");
      if (res.success) {
        alert("הבקשה נשלחה בהצלחה למנהל המערכת!");
      } else {
        alert("שגיאה בשליחת הבקשה: " + res.error);
      }
    } catch (e) {
      alert("שגיאה בתקשורת עם השרת");
    }
    setIsRequesting(false);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const isKesherConnected = !!(settings.apiKey && settings.paymentPageId && settings.userName);
  const isEzCountConnected = !!settings.ezCountToken;

  return (
    <div className="space-y-6 max-w-2xl bg-card border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-sm text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-bold mb-4 text-slate-800">חיבור לסליקה וקבלות</h2>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${isKesherConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {isKesherConnected ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800">סליקה דרך קשר (Kesher) מחוברת ופעילה</p>
                  <p className="text-sm text-emerald-600">מפתחות הסליקה הוגדרו בהצלחה על ידי מנהל המערכת.</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold text-red-800">סליקה (Kesher) אינה מחוברת</p>
                  <p className="text-sm text-red-600">כדי לאפשר סליקת אשראי יש לבקש חיבור ממנהל המערכת.</p>
                </div>
              </>
            )}
          </div>

          <div className={`p-4 rounded-xl border flex items-center gap-3 ${isEzCountConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {isEzCountConnected ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800">חשבוניות (EasyCount) מחוברות ופעילות</p>
                  <p className="text-sm text-emerald-600">הפקת חשבוניות אוטומטית הוגדרה בהצלחה.</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold text-red-800">חשבוניות (EasyCount) אינן מחוברות</p>
                  <p className="text-sm text-red-600">כדי להפיק קבלות אוטומטיות יש לבקש חיבור ממנהל המערכת.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
