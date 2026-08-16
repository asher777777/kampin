"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import { getGlobalSettings, saveGlobalSettings, GlobalSettings } from "../actions";
import { Loader2, Save, User, Phone, Globe, ChevronDown, ChevronUp, ImageIcon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserProfileSettingsForm() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("colors");

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getGlobalSettings();
        setSettings(data);
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await saveGlobalSettings(settings);
      setMessage({ type: "success", text: "הפרופיל וההגדרות הגלובליות נשמרו בהצלחה!" });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "שגיאה בשמירת הנתונים ל-Firebase" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof GlobalSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-red-400 py-6 text-center">
        שגיאה בטעינת הגדרות המערכת.
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8" dir="rtl">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border animate-in fade-in duration-200 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">

        {/* Accordion: Personal Details */}
        <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setActiveAccordion(activeAccordion === "personal" ? null : "personal")}
            className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-3">
              <User className="h-5 w-5 text-purple-400" />
              פרטים אישיים
            </span>
            {activeAccordion === "personal" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {activeAccordion === "personal" && (
            <div className="p-6 bg-[#111] border-t border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">שם מלא</label>
                  <input
                    type="text"
                    value={settings.personalName || ""}
                    onChange={(e) => updateField("personalName", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="ישראל ישראלי"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">תפקיד / תואר</label>
                  <input
                    type="text"
                    value={settings.personalTitle || ""}
                    onChange={(e) => updateField("personalTitle", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="מנהל קהילה"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">טלפון אישי</label>
                  <input
                    type="tel"
                    value={settings.personalPhone || ""}
                    onChange={(e) => updateField("personalPhone", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors text-left"
                    placeholder="054-0000000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">אימייל אישי</label>
                  <input
                    type="email"
                    value={settings.personalEmail || ""}
                    onChange={(e) => updateField("personalEmail", e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors text-left"
                    placeholder="personal@email.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Form Submission Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 px-8 font-bold flex items-center gap-2 shadow-lg cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "שומר..." : "שמור שינויים"}
        </Button>
      </div>
    </form>
  );
}
