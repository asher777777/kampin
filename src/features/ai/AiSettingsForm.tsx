"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { getAiSettings, saveAiSettings } from "./actions";

import { requestServiceConnection } from "@/features/crm/actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function AiSettingsForm() {
  const [settings, setSettings] = useState({ googleAiKey: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    getAiSettings().then((data) => {
      if (data) setSettings(data as any);
      setIsLoading(false);
    });
  }, []);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const res = await requestServiceConnection("Google AI (Gemini)");
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

  const isConnected = !!settings.googleAiKey;

  return (
    <div className="space-y-6 max-w-xl bg-card border rounded-2xl p-6 shadow-sm" dir="rtl">
      <div>
        <h2 className="text-lg font-bold mb-4">חיבור בינה מלאכותית (Google AI)</h2>
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${isConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {isConnected ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800">השירות מחובר ופעיל</p>
                <p className="text-sm text-emerald-600">מפתח ה-API הוגדר בהצלחה על ידי מנהל המערכת.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-bold text-red-800">השירות אינו מחובר</p>
                <p className="text-sm text-red-600">כדי להשתמש בבינה המלאכותית יש לבקש חיבור ממנהל המערכת.</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {!isConnected && (
        <Button onClick={handleRequest} disabled={isRequesting} className="w-full h-12">
          {isRequesting ? "שולח בקשה..." : "בקש חיבור לשירות"}
        </Button>
      )}
    </div>
  );
}
