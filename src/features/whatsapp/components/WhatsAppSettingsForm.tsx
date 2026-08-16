"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { getWhatsAppSettings, saveWhatsAppSettings } from "../actions";

import { requestServiceConnection } from "@/features/crm/actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function WhatsAppSettingsForm() {
  const [settings, setSettings] = useState({ idInstance: "", apiToken: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    getWhatsAppSettings().then((data) => {
      if (data) setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const res = await requestServiceConnection("WhatsApp (Green API)");
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

  const isConnected = !!(settings.idInstance && settings.apiToken);

  return (
    <div className="space-y-6 max-w-xl bg-card border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-sm text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-bold mb-4 text-slate-800">חיבור וואטסאפ (Green API)</h2>
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${isConnected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {isConnected ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800">השירות מחובר ופעיל</p>
                <p className="text-sm text-emerald-600">החיבור לוואטסאפ הוגדר בהצלחה על ידי מנהל המערכת.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-bold text-red-800">השירות אינו מחובר</p>
                <p className="text-sm text-red-600">כדי לשלוח הודעות וואטסאפ דרך המערכת יש לבקש חיבור ממנהל המערכת.</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {!isConnected && (
        <Button onClick={handleRequest} disabled={isRequesting} className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
          {isRequesting ? "שולח בקשה..." : "בקש חיבור לשירות"}
        </Button>
      )}
    </div>
  );
}
