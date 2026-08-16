"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { getWhatsAppConnection, getWhatsAppQR, logoutWhatsApp } from "../actions";
import { WhatsAppConnectionState } from "../types";
import { CheckCircle, AlertCircle, RefreshCw, LogOut, QrCode, User } from "lucide-react";

export function ConnectionTab() {
  const [connection, setConnection] = useState<WhatsAppConnectionState>({ status: "checking" });
  const [loading, setLoading] = useState(false);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWhatsAppConnection();
      setConnection(res);
    } catch (e) {
      setConnection({ status: "error", error: "שגיאה בבדיקת החיבור" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Polling hook when QR is displayed
  useEffect(() => {
    if (connection.status !== "qr") return;

    const interval = setInterval(async () => {
      try {
        const res = await getWhatsAppConnection();
        if (res.status === "authorized") {
          setConnection(res);
          clearInterval(interval);
        }
      } catch (err) {
        console.warn("QR Poll connection check failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [connection.status]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await getWhatsAppQR();
      setConnection(res);
    } catch (e) {
      setConnection({ status: "error", error: "שגיאה בקבלת קוד QR" });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך להתנתק ממופע הוואטסאפ?")) return;
    setLoading(true);
    try {
      const res = await logoutWhatsApp();
      if (res.success) {
        setConnection({ status: "notAuthorized" });
      } else {
        alert("שגיאה בהתנתקות: " + res.error);
      }
    } catch (e) {
      alert("שגיאה בתקשורת עם השרת");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-sm text-right space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">מצב חיבור וואטסאפ</h3>
          <p className="text-xs text-muted-foreground mt-0.5">בדוק ונהל את הקישור של המערכת למופע ה-Green API</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={checkConnection} 
          disabled={loading}
          className="h-10 w-10 border-slate-200"
          title="רענן מצב חיבור"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {connection.status === "checking" && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">בודק מצב חיבור...</span>
        </div>
      )}

      {connection.status === "authorized" && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4 text-emerald-700">
            <CheckCircle className="w-8 h-8 shrink-0 text-emerald-600" />
            <div>
              <h4 className="font-extrabold text-sm md:text-base">וואטסאפ מחובר ותקין!</h4>
              <p className="text-xs text-emerald-600/90 mt-0.5">המערכת מוכנה לשליחה וסנכרון של הודעות.</p>
            </div>
          </div>

          <div className="bg-slate-50 border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              {connection.avatar ? (
                <img src={connection.avatar} alt="WhatsApp Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div>
              <h4 className="font-black text-slate-800 text-lg">{connection.name}</h4>
              <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5" dir="ltr">+{connection.phoneNumber}</p>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              disabled={loading}
              className="rounded-xl font-bold flex items-center gap-1.5 h-11 px-5 w-full justify-center"
            >
              <LogOut className="w-4 h-4" />
              נתק מכשיר זה
            </Button>
          </div>
        </div>
      )}

      {connection.status === "notAuthorized" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4 text-amber-800">
            <AlertCircle className="w-8 h-8 shrink-0 text-amber-600" />
            <div>
              <h4 className="font-extrabold text-sm md:text-base">מופע הוואטסאפ אינו מחובר</h4>
              <p className="text-xs text-amber-700 mt-0.5">יש לחבר את מופע הוואטסאפ שלכם כדי להשתמש באפשרויות השליחה והסנכרון.</p>
            </div>
          </div>

          <div className="flex justify-center py-4">
            <Button 
              onClick={handleConnect} 
              disabled={loading}
              className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 h-12 px-6 shadow-md"
            >
              <QrCode className="w-5 h-5" />
              התחבר באמצעות קוד QR
            </Button>
          </div>
        </div>
      )}

      {connection.status === "qr" && (
        <div className="space-y-6 max-w-md mx-auto text-center">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 flex items-center gap-3 text-right">
            <QrCode className="w-8 h-8 shrink-0 text-indigo-600" />
            <div>
              <h4 className="font-extrabold text-xs md:text-sm">סרוק קוד QR באמצעות הטלפון</h4>
              <p className="text-[10px] text-indigo-600 mt-0.5">פתח את אפליקציית WhatsApp בנייד &gt; מכשירים מקושרים &gt; לקשר מכשיר &gt; וסרוק את הקוד המוצג מטה.</p>
            </div>
          </div>

          <div className="border border-slate-200/80 p-4 rounded-3xl bg-white shadow-sm inline-block mx-auto">
            {connection.qrCode ? (
              <img src={connection.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto object-contain" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-slate-50 rounded-2xl">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-2 font-bold animate-pulse">ממתין לסריקת קוד QR מהטלפון...</p>
          </div>

          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setConnection({ status: "notAuthorized" })}
              className="border-slate-200 text-slate-600 rounded-xl"
            >
              ביטול
            </Button>
          </div>
        </div>
      )}

      {connection.status === "error" && (
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-700">
            <AlertCircle className="w-8 h-8 shrink-0 text-red-600" />
            <div>
              <h4 className="font-extrabold text-sm md:text-base">שגיאה בחיבור לוואטסאפ</h4>
              <p className="text-xs text-red-600/90 mt-0.5">{connection.error}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={checkConnection} 
              disabled={loading}
              className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 h-11 px-5"
            >
              <RefreshCw className="w-4 h-4" />
              נסה שוב
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
