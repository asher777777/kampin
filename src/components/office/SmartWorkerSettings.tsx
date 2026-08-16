"use client";

import React, { useState, useEffect } from "react";
import { 
  SmartWorkerConfig, 
  DEFAULT_SMART_WORKER_CONFIG, 
  DEFAULT_PERMISSION_MATRIX, 
  DEFAULT_ALLOWED_COLLECTIONS,
  PermissionMatrix,
  UserRolePermissions 
} from "@/lib/types/office";
import { 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Folder, 
  Loader2, 
  Check, 
  Bot, 
  Sliders, 
  Cpu, 
  Lock, 
  Users, 
  MessageSquare, 
  Database, 
  Code2, 
  FileText, 
  Wrench,
  X,
  Send,
  Zap,
  Layers,
  Table,
  CheckSquare,
  Square
} from "lucide-react";

interface SmartWorkerSettingsProps {
  officeSlug: string;
  workerSlug?: string;
  config?: SmartWorkerConfig;
  onSaveSuccess?: (savedConfig: SmartWorkerConfig) => void;
}

// ---------------------------------------------------------------------------
// CONSTANTS & DESCRIPTIVE LABELS
// ---------------------------------------------------------------------------

const AI_CAPABILITIES_OPTIONS = [
  { id: "text_response", label: "תשובה בטקסט", labelEn: "Text Response", icon: MessageSquare },
  { id: "research", label: "מחקר", labelEn: "Research", icon: Cpu },
  { id: "read_documents", label: "קריאת מסמכים", labelEn: "Read Documents", icon: FileText },
  { id: "generate_images", label: "יצירת תמונות", labelEn: "Generate Images", icon: Sparkles },
  { id: "generate_videos", label: "יצירת סרטונים", labelEn: "Generate Videos", icon: Bot },
  { id: "write_code", label: "כתיבת קוד", labelEn: "Code Writing", icon: Code2 },
];

const AVAILABLE_COLLECTIONS_OPTIONS = [
  { id: "digital_offices", label: "משרדים וטאבים דיגיטליים", labelEn: "Digital Offices & Tabs" },
  { id: "landing_pages", label: "דפי נחיתה", labelEn: "Landing Pages" },
  { id: "pages", label: "עמודים כלליים", labelEn: "General Pages" },
  { id: "event_page", label: "עמודי אירועים", labelEn: "Event Pages" },
  { id: "post_page", label: "עמודי פוסטים ותוכן", labelEn: "Post Pages" },
  { id: "service_page", label: "עמודי שירותים", labelEn: "Service Pages" },
  { id: "site_pages", label: "עמודי אתרים", labelEn: "Site Pages" },
  { id: "user_pages", label: "עמודי משתמשים", labelEn: "User Pages" },
  { id: "users", label: "בסיס נתוני משתמשים", labelEn: "Users Database" },
  { id: "contacts", label: "אנשי קשר ו-CRM", labelEn: "Contacts & CRM" },
  { id: "transactions", label: "עסקאות ופיננסים", labelEn: "Transactions & Revenue" },
];

const PRIMARY_ROLES_OPTIONS = [
  { id: "Advisor", label: "יועץ (Advisor)" },
  { id: "Code Writer", label: "כותב קוד (Code Writer)" },
  { id: "Content Writer", label: "כותב תוכן (Content Writer)" },
  { id: "Analytics", label: "אנליטיקה (Analytics)" },
  { id: "Page Builder", label: "בונה עמודים (Page Builder)" },
  { id: "Project Manager", label: "מנהל פרויקטים (Project Manager)" },
  { id: "Automations Manager", label: "מנהל אוטומציות (Automations Manager)" },
  { id: "Campaigns Manager", label: "מנהל קמפיינים (Campaigns Manager)" },
  { id: "Accountant", label: "מנהל חשבונות (Accountant)" },
  { id: "Security Manager", label: "מנהל אבטחה (Security Manager)" },
];

const COLLABORATING_WORKERS = [
  { id: "dotty-creative-worker", name: "Dotty", role: "Creative & Content Agent" },
  { id: "alex-security-worker", name: "Alex", role: "Security & Access Manager" },
  { id: "sarah-campaigns-worker", name: "Sarah", role: "Campaigns & Growth Specialist" },
  { id: "michael-finance-worker", name: "Michael", role: "Finance & Accounts Agent" },
];

const GOOGLE_TTS_VOICES = [
  { id: "en-US-Studio-O", name: "Google Studio Male (O)", lang: "en-US" },
  { id: "en-US-Studio-Q", name: "Google Studio Female (Q)", lang: "en-US" },
  { id: "en-US-Neural2-D", name: "Google Neural2 Male (D)", lang: "en-US" },
  { id: "en-US-Wavenet-D", name: "Google Wavenet Deep Male (D)", lang: "en-US" },
  { id: "he-IL-Wavenet-A", name: "Hebrew Wavenet (עברית)", lang: "he-IL" },
];

const TONE_STYLE_OPTIONS = [
  { id: "Authoritative", label: "סמכותי (Authoritative)" },
  { id: "Friendly", label: "חברי (Friendly)" },
  { id: "Formal", label: "רשמי (Formal)" },
  { id: "Professional", label: "מקצועי (Professional)" },
  { id: "Short & Focused", label: "קצר וממוקד (Short & Focused)" },
  { id: "Long & Consultative", label: "ארוך והתייעצותי (Long & Consultative)" },
  { id: "Sales-driven", label: "מכרתי (Sales-driven)" },
  { id: "Down-to-earth", label: "בגובה העיניים (Down-to-earth)" },
];

const PERMISSION_ROWS: Array<{ key: keyof UserRolePermissions; label: string; subtext?: string }> = [
  {
    key: "system_db_read",
    label: "קריאה בסיס הנתונים של המערכת",
  },
  {
    key: "office_db_read",
    label: "קריאה בסיס הנתונים של בעל המשרד",
    subtext: "root\\{office-slug}\\{smart-worker-slug}",
  },
  {
    key: "db_write_edit_delete",
    label: "כתיבה\\עריכה\\מחיקה בסיס הנתונים",
  },
  {
    key: "code_files_write_edit_delete",
    label: "כתיבה\\עריכה\\מחיקה קבצי קוד",
  },
];

export function SmartWorkerSettings({
  officeSlug,
  workerSlug = "david",
  config,
  onSaveSuccess,
}: SmartWorkerSettingsProps) {
  const [formData, setFormData] = useState<SmartWorkerConfig>(
    config || DEFAULT_SMART_WORKER_CONFIG
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // AI Prompt Consultant Modal State
  const [isConsultantModalOpen, setIsConsultantModalOpen] = useState(false);
  const [customUserNotes, setCustomUserNotes] = useState("");
  const [isPromptAssisting, setIsPromptAssisting] = useState(false);
  const [consultantPreviewPrompt, setConsultantPreviewPrompt] = useState("");
  const [generatedCacheId, setGeneratedCacheId] = useState("");

  const schemaHeader = `root\\${officeSlug}\\${workerSlug}`;

  const matrix: PermissionMatrix = formData.permission_matrix || DEFAULT_PERMISSION_MATRIX;
  const allowedCollections = formData.allowed_collections || DEFAULT_ALLOWED_COLLECTIONS;

  // Fetch existing settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/office/${officeSlug}/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.smartWorkerConfig) {
            setFormData(data.smartWorkerConfig);
            if (data.smartWorkerConfig.conversation_history_id) {
              setGeneratedCacheId(data.smartWorkerConfig.conversation_history_id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load smart worker config:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [officeSlug]);

  // Toggle Matrix Cell
  const toggleMatrixCell = (role: keyof PermissionMatrix, permKey: keyof UserRolePermissions) => {
    setFormData((prev) => {
      const currentMatrix = prev.permission_matrix || DEFAULT_PERMISSION_MATRIX;
      const currentRoleObj = currentMatrix[role] || DEFAULT_PERMISSION_MATRIX[role];
      const updatedValue = !currentRoleObj[permKey];

      const updatedMatrix: PermissionMatrix = {
        ...currentMatrix,
        [role]: {
          ...currentRoleObj,
          [permKey]: updatedValue,
        },
      };

      return {
        ...prev,
        permission_matrix: updatedMatrix,
        permissions: updatedMatrix.slug_owner, // keep flat permissions in sync
      };
    });
  };

  const toggleArrayItem = (field: "ai_capabilities" | "primary_roles" | "collaboration" | "allowed_collections", value: string) => {
    setFormData((prev) => {
      const arr = prev[field] || [];
      const updated = arr.includes(value) ? arr.filter((i) => i !== value) : [...arr, value];
      return { ...prev, [field]: updated };
    });
  };

  // AI Prompt Assistant Consultation Trigger
  const handleAIPromptAssist = async () => {
    setIsPromptAssisting(true);
    try {
      const res = await fetch(`/api/office/${officeSlug}/prompt-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          custom_user_notes: customUserNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.refinedPrompt) {
          setConsultantPreviewPrompt(data.refinedPrompt);
          if (data.conversation_history_id) {
            setGeneratedCacheId(data.conversation_history_id);
          }
        }
      }
    } catch (err) {
      console.error("AI Prompt Assist error:", err);
    } finally {
      setIsPromptAssisting(false);
    }
  };

  // Apply Prompt from Consultant Modal to Form
  const handleApplyConsultantPrompt = () => {
    if (consultantPreviewPrompt) {
      setFormData((prev) => ({
        ...prev,
        systemPrompt: consultantPreviewPrompt,
        conversation_history_id: generatedCacheId || prev.conversation_history_id,
      }));
    }
    setIsConsultantModalOpen(false);
  };

  // TTS Voice Preview Player
  const handleVoicePreview = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const voiceObj = GOOGLE_TTS_VOICES.find((v) => v.id === formData.tts_voice_id);
      const text = voiceObj?.lang === "he-IL" 
        ? "שלום, זהו שימוע דוגמה של קול ה-TTS המועדף עליך." 
        : `Hello, this is a sample preview of the ${voiceObj?.name || "selected"} voice.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceObj?.lang || "en-US";
      setIsPlayingVoice(true);
      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Save Settings Handler
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/office/${officeSlug}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smartWorkerConfig: formData }),
      });

      if (!res.ok) {
        throw new Error("Save request failed");
      }

      const data = await res.json();
      setSaveMessage("Configuration saved successfully!");
      if (onSaveSuccess) onSaveSuccess(formData);
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      console.error("Error saving smart worker config:", err);
      setSaveMessage("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-amber-400">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span className="text-sm font-semibold">Loading Smart Worker Schema...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-black/90 text-white rounded-3xl border border-amber-400/40 shadow-2xl space-y-6 select-none relative" dir="rtl">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & SCHEMA DEFINITION                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-400/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              הגדרות עובד חכם, קולקציות והרשאות
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Smart Worker Instructions, Allowed Collections Scope & Permission Matrix
          </p>
        </div>

        {/* Schema Header Badge */}
        <div className="bg-slate-950 border border-amber-400/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold text-amber-300 dir-ltr">
            {schemaHeader}
          </span>
        </div>
      </div>

      {/* Save Notification */}
      {saveMessage && (
        <div className="p-3 bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold rounded-xl text-center animate-fadeIn">
          {saveMessage}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. AI CAPABILITIES (יכולות AI)                                */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>יכולות AI (AI Capabilities)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {AI_CAPABILITIES_OPTIONS.map((cap) => {
            const IconComp = cap.icon;
            const isSelected = formData.ai_capabilities?.includes(cap.id);
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => toggleArrayItem("ai_capabilities", cap.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-400/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <IconComp className="w-4 h-4 text-amber-400" />
                  <div className="text-right">
                    <span className="text-xs font-bold block leading-tight">{cap.label}</span>
                    <span className="text-[10px] text-slate-400 block dir-ltr">{cap.labelEn}</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected ? "bg-amber-400 border-amber-400 text-black" : "border-slate-700"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ALLOWED DATABASE COLLECTIONS (בסיסי נתונים וקולקציות מורשים) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span>בסיסי נתונים וקולקציות מורשים לסריקה (Allowed Collections Scope)</span>
          </h3>
          <span className="text-[10px] text-slate-400">
            {allowedCollections.length} קולקציות נבחרו
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {AVAILABLE_COLLECTIONS_OPTIONS.map((col) => {
            const isChecked = allowedCollections.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleArrayItem("allowed_collections", col.id)}
                className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isChecked
                    ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-400/40"
                }`}
              >
                <div className="text-right space-y-0.5">
                  <span className="text-xs font-bold block leading-tight">{col.label}</span>
                  <span className="text-[10px] text-amber-400/70 font-mono block dir-ltr">{col.id}</span>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isChecked ? "bg-amber-400 border-amber-400 text-black" : "border-slate-700"
                }`}>
                  {isChecked && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. 2D PERMISSION MATRIX TABLE (טבלת הרשאות לפי סוג משתמש)      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Table className="w-4 h-4 text-amber-400" />
          <span>טבלת הרשאות לפי סוג משתמש (Permission Matrix Table)</span>
        </h3>

        <div className="overflow-x-auto border border-amber-400/40 rounded-2xl bg-slate-950/90 shadow-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-400/40">
                <th className="p-3.5 font-black text-amber-400 border-l border-slate-800/80 w-2/5">
                  סוג הרשאה
                </th>
                <th className="p-3.5 font-bold text-center text-slate-200 border-l border-slate-800/80 w-1/5">
                  מנהל מערכת
                </th>
                <th className="p-3.5 font-bold text-center text-slate-200 border-l border-slate-800/80 w-1/5">
                  משתמש שהוא הבעלים של הסלאג
                </th>
                <th className="p-3.5 font-bold text-center text-slate-200 w-1/5">
                  משתמש שאינו הבעלים של הסלאג / אורח
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key} className="hover:bg-slate-900/50 transition-colors">
                  {/* Permission Label */}
                  <td className="p-3.5 font-bold text-slate-200 border-l border-slate-800/80">
                    <div className="space-y-0.5">
                      <span className="block">{row.label}</span>
                      {row.subtext && (
                        <span className="block text-[10px] text-amber-300/80 font-mono dir-ltr">
                          root\\{officeSlug}\\{workerSlug}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* System Admin Switch Cell */}
                  <td className="p-3.5 text-center border-l border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleMatrixCell("system_admin", row.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative mx-auto cursor-pointer ${
                        matrix.system_admin?.[row.key] ? "bg-amber-400" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-slate-950 absolute top-0.5 transition-transform ${
                        matrix.system_admin?.[row.key] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>

                  {/* Slug Owner Switch Cell */}
                  <td className="p-3.5 text-center border-l border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleMatrixCell("slug_owner", row.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative mx-auto cursor-pointer ${
                        matrix.slug_owner?.[row.key] ? "bg-amber-400" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-slate-950 absolute top-0.5 transition-transform ${
                        matrix.slug_owner?.[row.key] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>

                  {/* Guest / Non-Owner Switch Cell */}
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleMatrixCell("guest_non_owner", row.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative mx-auto cursor-pointer ${
                        matrix.guest_non_owner?.[row.key] ? "bg-amber-400" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-slate-950 absolute top-0.5 transition-transform ${
                        matrix.guest_non_owner?.[row.key] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. PRIMARY ROLES (תפקיד עיקרי - בחירה מרובה)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>תפקיד עיקרי של העובד (בחירה מרובה)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRIMARY_ROLES_OPTIONS.map((r) => {
            const isSelected = formData.primary_roles?.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleArrayItem("primary_roles", r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border border-amber-300 shadow-md"
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-amber-400/50"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. COLLABORATION (שיתוף פעולה עם עובדים נוספים)               */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span>שיתוף פעולה עם עובדים חכמים נוספים</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COLLABORATING_WORKERS.map((w) => {
            const isSelected = formData.collaboration?.includes(w.id);
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => toggleArrayItem("collaboration", w.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-right transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-400/40"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{w.name}</span>
                  <span className="text-[10px] text-slate-400 block">{w.role}</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected ? "bg-amber-400 border-amber-400 text-black" : "border-slate-700"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. TONE & STYLE AND GOOGLE TTS VOICE                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tone Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-400 block">בחירת סגנון - הטון (Tone & Style)</label>
          <select
            value={formData.tone_style || "Professional"}
            onChange={(e) => setFormData({ ...formData, tone_style: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            {TONE_STYLE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Google TTS Voice Selection & Preview */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-400 block">בחירת קול ב-TTS של Google Studio</label>
          <div className="flex items-center gap-2">
            <select
              value={formData.tts_voice_id || "en-US-Studio-O"}
              onChange={(e) => setFormData({ ...formData, tts_voice_id: e.target.value })}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {GOOGLE_TTS_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleVoicePreview}
              className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="שמע דוגמת קול"
            >
              {isPlayingVoice ? (
                <VolumeX className="w-4 h-4 animate-pulse text-slate-950" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-950" />
              )}
              <span>שמע</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. SYSTEM PROMPT & AI ASSIST BUTTON                           */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-amber-400 block">הנחיה ראשית ופרומפט סוכן (System Prompt)</label>
          
          {/* AI Prompt Engineer Consultation Button */}
          <button
            type="button"
            onClick={() => {
              setConsultantPreviewPrompt(formData.systemPrompt || "");
              setIsConsultantModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>עזרה עם AI (Prompt Engineer)</span>
          </button>
        </div>

        <textarea
          value={formData.systemPrompt || ""}
          onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
          rows={4}
          placeholder="הכנס את ההנחיה הראשית והיחידה של העובד החכם..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
        />

        {(formData.conversation_history_id || generatedCacheId) && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 dir-ltr bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="font-mono text-amber-300">
              Gemini Context Cache ID: {formData.conversation_history_id || generatedCacheId}
            </span>
            <span className="text-slate-400 text-[10px]">Tokens Optimized via Cache</span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER SAVE BUTTON (Folder Icon Rule Compliance)              */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-14 h-14 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-full flex items-center justify-center font-bold shadow-xl shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          title="שמור הגדרות עובד חכם (Save Smart Worker Config)"
        >
          {isSaving ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-950" />
          ) : (
            <Folder className="w-6 h-6 text-black fill-black" />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE AI PROMPT CONSULTANT MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {isConsultantModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-white relative">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-400">
                    יועץ AI לבניית פרומפט ממוקד (AI Prompt Engineer)
                  </h3>
                  <p className="text-xs text-slate-400">
                    סנכרון כל כלי ה-AI, ההרשאות והנתונים ליצירת הנחיה מדויקת וחיסכון בטוקנים
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConsultantModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active AI Tools Suite Summary Badge */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 block">
                נתוני הטופס וכלי ה-AI שיישלחו להתייעצות:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30">
                  תפקידים: {formData.primary_roles?.join(", ") || "יועץ"}
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30">
                  יכולות: {formData.ai_capabilities?.join(", ") || "טקסט, מחקר"}
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30">
                  קולקציות ({allowedCollections.length}): {allowedCollections.slice(0, 3).join(", ")}...
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30">
                  טון: {formData.tone_style || "מקצועי"}
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30 dir-ltr">
                  Voice: {formData.tts_voice_id || "en-US-Studio-O"}
                </span>
              </div>
            </div>

            {/* User Custom Business Goals Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-amber-400 block">
                הנחיות או מטרות עסקיות ממוקדות (אופציונלי):
              </label>
              <input
                type="text"
                value={customUserNotes}
                onChange={(e) => setCustomUserNotes(e.target.value)}
                placeholder="לדוגמה: התמקד בטיפול בלידים של נדל''ן, עדכון CRM אוטומטי ומענה מהיר."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Trigger AI Prompt Generation */}
            <button
              type="button"
              onClick={handleAIPromptAssist}
              disabled={isPromptAssisting}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {isPromptAssisting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>מייצר פרומפט מיוטב עם Gemini AI...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>צור פרומפט מיוטב עכשיו (Generate Optimized Prompt)</span>
                </>
              )}
            </button>

            {/* Generated Prompt Preview */}
            {consultantPreviewPrompt && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-amber-400 block">
                  תצוגה מקדימה של הפרומפט שיוצר:
                </label>
                <textarea
                  value={consultantPreviewPrompt}
                  onChange={(e) => setConsultantPreviewPrompt(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-950 border border-amber-400/50 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                />

                {generatedCacheId && (
                  <div className="text-[10px] text-amber-300 dir-ltr bg-slate-950 p-2 rounded-xl border border-slate-800">
                    Gemini Context Cache ID Saved: {generatedCacheId}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConsultantModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyConsultantPrompt}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>החל הנחיה זו למנהל העובד (Apply Prompt)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
