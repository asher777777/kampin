"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Trash2, Settings, Check, Sparkles, Copy,
  Settings2, MoveUp, MoveDown, Clock, Coins, Save, Folder, ChevronDown, LayoutTemplate, MessageCircle, Palette, Users,
  AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { getFormTemplates, saveFormTemplate, updateFormTemplate, FormTemplate } from "../formTemplates";
import { getCustomFields, addCustomField, getCustomTabs } from "../actions";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getCommunities } from "@/features/communities/actions";
import { IconPicker } from "@/components/ui/IconPicker";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor").then(m => m.RichTextEditor), { ssr: false });
export interface FormField {
  label: string;
  type: string; // text, tel, email, textarea, select, number, fixed_amount, hidden, step
  map_to: string;
  map_to_2?: string;
  required: boolean;
  submitOnNext?: boolean;
  default_value: string;
  options: string;
  url_param_enable: boolean;
  url_param_name: string;
  cond_enable: boolean;
  cond_field_index: number;
  cond_operator: string; // is, is_not
  cond_value: string;
  step?: number;
  calc_formula?: string;
  icon?: string;
  widthPercentage?: number;
  bgColor?: string;
  borderColor?: string;
  focusColor?: string;
  placeholder?: string;
  height?: string | number;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  fontSize?: number;
  communityId?: string;
  autocomplete?: string;
  payment_doc_type?: string;
  payment_methods?: string[];
  payment_recurring_limit?: string;
  payment_require_id?: boolean;
  step_button_text?: string;
  step_button_icon?: string;
  step_button_bg_color?: string;
  step_button_text_color?: string;
  step_back_button_text?: string;
  step_back_button_bg_color?: string;
  step_back_button_text_color?: string;
}

export interface FormStepConfig {
  step: number;
  title: string;
  icon: string;
}

export interface LogicAction {
  id: string;
  field_index: number;
  operator: "is" | "is_not";
  value: string;
  action_type: "redirect" | "modal" | "payment";
  action_value: string; // URL for redirect, HTML/text for modal
}

export interface FormConfig {
  enabled: boolean;
  form_type: "standard" | "payment" | "register";
  submit_button_text: string;
  submit_button_bg_color: string;
  submit_button_text_color: string;
  continue_button_text?: string;
  continue_button_icon?: string;
  back_button_text?: string;
  back_button_bg_color?: string;
  back_button_text_color?: string;
  step_configs?: FormStepConfig[];
  form_bg_color?: string;
  field_bg_color?: string;
  fields: FormField[];
  save_to_crm: boolean;
  crm_owner_id: string;
  standard_success_message: string;
  standard_redirect_url: string;
  standard_whatsapp_message: string;
  standard_whatsapp_image_url: string;
  payment_amount: number;
  payment_amount_crm_map: string;
  payment_pending_message: string;
  payment_pending_image_url: string;
  payment_success_message: string;
  payment_success_image_url: string;
  payment_group: string;
  payment_zeut_kupa: string;
  payment_receipt_type: string;
  payment_frequency: "one-time" | "recurring" | "user-choice";
  action_rules?: LogicAction[];
  custom_success_modal_enable?: boolean;
  custom_success_modal_content?: string;
  custom_success_modal_image_url?: string;
  crm_save_step?: number;
  register_role?: "DEVELOPING" | "TRIAL";
  templateId?: string;
  templateName?: string;
  communityId?: string;
}

interface CRMFormBuilderProps {
  value: FormConfig;
  onChange: (config: FormConfig) => void;
}

const CRM_DB_FIELDS = {
  "": "-- ללא מיפוי --",
  "conta_name": "שם / שם מלא",
  "f_m": "שם משפחה",
  "gender": "מגדר",
  "birth_date": "תאריך לידה",
  "email": "דוא\"ל ראשי",
  "conta_phone": "טלפון נייד (וואטסאפ)",
  "work_phone": "טלפון (עבודה)",
  "website": "אתר אינטרנט",
  "mh_crm_city": "עיר",
  "mh_crm_street": "רחוב",
  "company_name": "שם החברה",
  "job_title": "תפקיד",
  "lead_source": "מקור הליד (אוטומטי)",
  "notes": "הערות",
  "tg1": "תג 1 (סטטוס פנייה)",
  "tg2": "תג 2",
  "tg3": "תג 3",
  "payment_amount": "סכום לתשלום (עבור טופס תשלום)",

  "total_spent": "סך הכל תרומות/רכישות",
  "order_count": "מספר תרומות/רכישות"
};

const ICON_OPTIONS = [
  { id: "", label: "-- ללא אייקון --" },
  { id: "user", label: "איש קשר" },
  { id: "phone", label: "טלפון" },
  { id: "mail", label: "מייל" },
  { id: "map-pin", label: "מיקום / כתובת" },
  { id: "building", label: "חברה / מוסד" },
  { id: "briefcase", label: "תפקיד / עבודה" },
  { id: "calendar", label: "תאריך" },
  { id: "file-text", label: "הערות / טקסט" },
  { id: "heart", label: "תרומה / לב" },
  { id: "smile", label: "ילד / חיוך" },
  { id: "alert-circle", label: "חשוב / אלרגיה" },
  { id: "credit-card", label: "תשלום / אשראי" },
  { id: "coins", label: "מטבעות" }
];

const WIDTH_OPTIONS = [
  { id: 100, label: "100%" },
  { id: 75, label: "75%" },
  { id: 66, label: "66%" },
  { id: 50, label: "50%" },
  { id: 33, label: "33%" },
  { id: 25, label: "25%" }
];

const HEIGHT_OPTIONS = [
  { id: "", label: "רגיל (Auto)" },
  { id: "30px", label: "30px (קטן מאוד)" },
  { id: "40px", label: "40px (קטן)" },
  { id: "50px", label: "50px (בינוני)" },
  { id: "60px", label: "60px (גדול)" },
  { id: "80px", label: "80px (ענק)" }
];

const FONT_SIZE_OPTIONS = [
  { id: "", label: "רגיל" },
  { id: 10, label: "10px" },
  { id: 12, label: "12px" },
  { id: 14, label: "14px" },
  { id: 16, label: "16px" },
  { id: 18, label: "18px" },
  { id: 20, label: "20px" },
  { id: 24, label: "24px" },
  { id: 28, label: "28px" },
  { id: 32, label: "32px" },
  { id: 36, label: "36px" },
  { id: 42, label: "42px" },
  { id: 48, label: "48px" },
  { id: 54, label: "54px" },
  { id: 60, label: "60px" },
  { id: 68, label: "68px" },
  { id: 75, label: "75px" }
];

const FIELD_TYPES = [
  { id: "text", label: "טקסט חופשי" },
  { id: "tel", label: "טלפון נייד" },
  { id: "email", label: "כתובת אימייל" },
  { id: "textarea", label: "אזור טקסט ארוך" },
  { id: "select", label: "בחירה מרשימה (Dropdown)" },
  { id: "number", label: "מספר (סכום להזנה)" },
  { id: "fixed_amount", label: "סכום קבוע" },
  { id: "hidden", label: "שדה מוסתר" },
  { id: "calculated", label: "שדה חישוב (נוסחה)" },
  { id: "image_display", label: "תמונה לתצוגה (ללא קלט)" },
  { id: "rich_text_display", label: "טקסט מעוצב (WYSIWYG) לתצוגה" },
  { id: "step", label: "--- חוצץ שלב חדש ---" },
  { id: "payment_summary", label: "שלב תשלום: סיכום ועריכת נתונים" },
  { id: "payment_cc", label: "שלב תשלום: נתוני אשראי" }
];

function SearchableSelect({ value, onChange, options, placeholder = "חפש שדה למיפוי..." }: { value: string, onChange: (v: string) => void, options: {value: string, label: string, group?: string}[], placeholder?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.value.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none cursor-pointer flex justify-between items-center"
      >
        <span className={value ? "text-white" : "text-slate-400"}>{selectedLabel || "-- ללא מיפוי --"}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180 text-white" : "text-slate-400"}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          <div className="p-2 sticky top-0 bg-zinc-900 border-b border-white/10 z-10">
            <input 
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-black/50 text-white border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="p-1">
            <div 
              onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
              className="p-2 hover:bg-white/5 rounded-lg cursor-pointer text-sm text-slate-400"
            >
              -- ללא מיפוי --
            </div>
            {filteredOptions.map((opt, i) => {
              const showGroup = i === 0 || filteredOptions[i-1].group !== opt.group;
              return (
                <div key={`${opt.value}-${i}`}>
                  {showGroup && opt.group && <div className="px-2 pt-2 pb-1 text-xs font-bold text-amber-500/70">{opt.group}</div>}
                  <div 
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(""); }}
                    className={`p-2 hover:bg-white/5 rounded-lg cursor-pointer text-sm ${value === opt.value ? "text-amber-400 bg-amber-500/10 font-bold" : "text-white"}`}
                  >
                    {opt.label}
                  </div>
                </div>
              );
            })}
            {filteredOptions.length === 0 && <div className="p-2 text-slate-500 text-sm text-center">לא נמצאו תוצאות</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function CRMFormBuilder({ value: rawValue, onChange }: CRMFormBuilderProps) {
  const value = { ...rawValue, fields: rawValue.fields || [] };
  const [mainTab, setMainTab] = useState<"settings" | "fields">("fields");
  const [activeTab, setActiveTab] = useState<"templates" | "type" | "whatsapp" | "settings" | "communities" | "submit_btn" | "">("");
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [activeFieldTab, setActiveFieldTab] = useState<"settings" | "design" | "mapping" | "advanced">("settings");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customTabs, setCustomTabs] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(rawValue.templateName || "");
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(rawValue.templateId || null);
  const [showAddCustomFieldModal, setShowAddCustomFieldModal] = useState(false);
  const [newCustomFieldCategory, setNewCustomFieldCategory] = useState("details");
  const [newCustomFieldType, setNewCustomFieldType] = useState("text");
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [isAddingCustomField, setIsAddingCustomField] = useState(false);
  
  useEffect(() => {
    getFormTemplates().then(setTemplates);
    getCustomFields().then(setCustomFields);
    getCustomTabs().then(setCustomTabs);
    getCommunities().then(setCommunities);
  }, []);

  const mappingOptions = useMemo(() => {
    const opts: {value: string, label: string, group?: string}[] = [];
    
    // Core fields
    Object.entries(CRM_DB_FIELDS).forEach(([k, v]) => {
      if (k !== "") opts.push({ value: k, label: v, group: "שדות מערכת" });
    });
    
    // Custom fields
    customFields.forEach(cf => {
      if (cf.type === "repeater" && cf.subFields && cf.subFields.length > 0) {
        cf.subFields.forEach((sub: any) => {
          opts.push({ value: `${cf.id}.${sub.id}`, label: `${cf.label} -> ${sub.label}`, group: "שדות חוזרים (מערכים)" });
        });
      } else {
        opts.push({ value: cf.id, label: cf.label, group: "שדות מותאמים אישית" });
      }
    });
    
    opts.push({ value: "__other__", label: "אחר (הוסף שדה חדש)...", group: "פעולות" });
    
    return opts;
  }, [customFields]);

  const handleAddCustomField = async () => {
    if (!newCustomFieldLabel.trim()) return alert("נא להזין שם שדה");
    setIsAddingCustomField(true);
    const res = await addCustomField({
      category: newCustomFieldCategory,
      type: newCustomFieldType,
      label: newCustomFieldLabel
    });
    if (res.success) {
      setCustomFields([...customFields, res.field]);
      setShowAddCustomFieldModal(false);
      setNewCustomFieldLabel("");
    } else {
      alert("שגיאה ביצירת השדה: " + res.error);
    }
    setIsAddingCustomField(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return alert("נא להזין שם לתבנית");
    setIsSavingTemplate(true);
    const res = await saveFormTemplate(templateName, value);
    if (res.success) {
      alert("התבנית נשמרה בהצלחה כחדשה!");
      if (res.id) {
        setLoadedTemplateId(res.id);
        onChange({ ...value, templateId: res.id, templateName: templateName });
      }
      getFormTemplates().then(setTemplates);
    } else {
      alert("שגיאה בשמירת התבנית: " + res.error);
    }
    setIsSavingTemplate(false);
  };

  const handleUpdateTemplate = async () => {
    if (!loadedTemplateId) return;
    if (!templateName.trim()) return alert("נא להזין שם לתבנית");
    setIsSavingTemplate(true);
    const res = await updateFormTemplate(loadedTemplateId, templateName, value);
    if (res.success) {
      alert("התבנית עודכנה בהצלחה!");
      onChange({ ...value, templateName: templateName });
      getFormTemplates().then(setTemplates);
    } else {
      alert("שגיאה בעדכון התבנית: " + res.error);
    }
    setIsSavingTemplate(false);
  };

  const handleLoadTemplate = (templateConfig: FormConfig, id?: string, name?: string) => {
    if (confirm("האם אתה בטוח? פעולה זו תדרוס את הטופס הנוכחי.")) {
      const mergedConfig = { ...templateConfig };
      if (id) mergedConfig.templateId = id;
      if (name) mergedConfig.templateName = name;
      
      onChange(mergedConfig);
      
      if (id && name) {
        setLoadedTemplateId(id);
        setTemplateName(name);
      }
    }
  };
  
  const updateConfig = (updates: Partial<FormConfig>) => {
    onChange({ ...value, ...updates });
  };

  const handleFieldChange = (index: number, updates: Partial<FormField>) => {
    const newFields = [...value.fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateConfig({ fields: newFields });
  };

  const addField = () => {
    const newField: FormField = {
      label: `שדה חדש ${value.fields.length + 1}`,
      type: "text",
      map_to: "",
      required: false,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: ""
    };
    updateConfig({ fields: [...value.fields, newField] });
    setExpandedField(value.fields.length);
  };

  const addStep = () => {
    const newStep: FormField = {
      label: `שלב ${value.fields.filter(f => f.type === 'step').length + 1}`,
      type: "step",
      map_to: "",
      required: false,
      default_value: "",
      options: "",
      url_param_enable: false,
      url_param_name: "",
      cond_enable: false,
      cond_field_index: 0,
      cond_operator: "is",
      cond_value: "",
      icon: "User", // default icon
      submitOnNext: false // user can choose to submit when passing this step
    };
    updateConfig({ fields: [...value.fields, newStep] });
    setExpandedField(value.fields.length);
  };

  const deleteField = (index: number) => {
    const newFields = value.fields.filter((_, i) => i !== index);
    updateConfig({ fields: newFields });
    if (expandedField === index) setExpandedField(null);
  };

  const duplicateField = (index: number) => {
    const fieldToDuplicate = value.fields[index];
    const newField = { 
      ...fieldToDuplicate, 
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
      label: `${fieldToDuplicate.label} (עותק)`
    };
    const newFields = [...value.fields];
    newFields.splice(index + 1, 0, newField);
    updateConfig({ fields: newFields });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === value.fields.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newFields = [...value.fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    updateConfig({ fields: newFields });
    if (expandedField === index) setExpandedField(targetIndex);
    else if (expandedField === targetIndex) setExpandedField(index);
  };

  const handlePlaceholderClick = (placeholder: string, targetField: keyof FormConfig) => {
    const textarea = document.getElementById(targetField) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;
    const resolvedText = text.substring(0, start) + placeholder + text.substring(textarea.selectionEnd);
    
    updateConfig({ [targetField]: resolvedText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    }, 50);
  };

  // Get options for conditional selection (only select fields)
  const selectFields = (value.fields || [])
    .map((f, i) => ({ label: f.label, index: i, type: f.type }))
    .filter(f => f.type === "select");

  return (
    <div className="bg-black border border-white/5 rounded-2xl p-6 space-y-6 text-right text-white" dir="rtl">
      {value.enabled === false && (
        <div className="flex items-center gap-3 bg-zinc-950 border border-white/5 px-4 py-3 rounded-xl shadow-sm">
          <label className="text-sm font-bold text-white cursor-pointer flex-1" htmlFor="form-enabled-toggle">
            הפעל טופס בעמוד זה:
          </label>
          <input
            id="form-enabled-toggle"
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="w-5 h-5 text-amber-500 border-slate-700 bg-slate-800 rounded focus:ring-amber-500 cursor-pointer"
          />
        </div>
      )}

      {value.enabled && value.fields.length === 0 && (
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-10 text-center text-white space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold">ברוכים הבאים לעורך הטפסים!</h3>
          <p className="text-slate-400">האם תרצה לפתוח תבנית קיימת או לייצר טופס חדש מאפס?</p>
          
          <div className="max-w-md mx-auto mt-8 bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
            <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setTemplateName("new")}
                className={`flex-1 py-3 px-4 font-bold text-sm rounded-lg transition-colors ${templateName === "new" || !templateName.startsWith("existing-") ? "bg-amber-500/10 text-amber-500" : "text-slate-400 hover:text-white"}`}
              >
                יצירת טופס חדש
              </button>
              <button
                type="button"
                onClick={() => setTemplateName("existing-")}
                className={`flex-1 py-3 px-4 font-bold text-sm rounded-lg transition-colors ${templateName.startsWith("existing-") ? "bg-amber-500/10 text-amber-500" : "text-slate-400 hover:text-white"}`}
              >
                טען תבנית שמורה
              </button>
            </div>

            {(!templateName || !templateName.startsWith("existing-")) ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2 text-right">
                  <label className="block font-semibold text-sm text-slate-300">שם לטופס החדש</label>
                  <input
                    type="text"
                    placeholder="לדוגמה: טופס הרשמה 2026..."
                    value={templateName === "new" ? "" : templateName}
                    onChange={(e) => {
                      setTemplateName(e.target.value);
                    }}
                    className="w-full bg-zinc-950 text-white border border-white/10 focus:border-amber-500/50 rounded-xl p-3 outline-none font-bold text-sm transition-colors"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const name = templateName === "new" ? "" : templateName;
                    if (!name.trim()) {
                      alert("נא להזין שם לטופס החדש");
                      return;
                    }
                    onChange({ ...value, templateName: name } as any);
                    addField();
                    setMainTab("fields");
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  צור טופס חדש והתחל לערוך
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 text-right">
                <div className="space-y-2">
                  <label className="block font-semibold text-sm text-slate-300">בחר תבנית מהרשימה</label>
                  <select
                    onChange={(e) => {
                      const t = templates.find(t => t.id === e.target.value);
                      if (t) {
                        handleLoadTemplate(t.config, t.id, t.name);
                        setMainTab("fields");
                      }
                    }}
                    className="w-full bg-zinc-950 text-white border border-white/10 focus:border-amber-500/50 rounded-xl p-3 outline-none font-bold text-sm transition-colors"
                  >
                    <option value="">-- לחץ כאן לבחירת תבנית --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {templates.length === 0 && (
                  <p className="text-xs text-amber-500/80 text-center bg-amber-500/10 py-2 rounded-lg border border-amber-500/20">
                    עדיין אין לך תבניות שמורות. ניתן לשמור תבנית לאחר יצירת טופס חדש.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {value.enabled && value.fields.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 mb-4 shadow-inner">
            <button 
              onClick={() => setMainTab("settings")}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${mainTab === "settings" ? "bg-zinc-800 text-amber-400 shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              <Settings2 className="w-4 h-4 inline-block ml-2" />
              הגדרות טופס
            </button>
            <button 
              onClick={() => setMainTab("fields")}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${mainTab === "fields" ? "bg-zinc-800 text-amber-400 shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              <LayoutTemplate className="w-4 h-4 inline-block ml-2" />
              ניהול שדות
            </button>
          </div>

          <div className={mainTab === "settings" ? "space-y-4 animate-in fade-in" : "hidden"}>
          {/* TAB 0: TEMPLATES */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "templates" ? ("" as any) : "templates")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <Folder className="w-4 h-4 text-amber-400" /> תבניות טפסים
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "templates" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "templates" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-4 max-w-3xl mx-auto">
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">טען מתבנית שמורה</label>
                    <select
                      onChange={(e) => {
                        const t = templates.find(t => t.id === e.target.value);
                        if (t) handleLoadTemplate(t.config, t.id, t.name);
                        e.target.value = "";
                      }}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none font-bold"
                    >
                      <option value="">-- בחר תבנית לטעינה --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <label className="block font-semibold mb-2 text-slate-400">שמירת טופס זה כתבנית</label>
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="שם התבנית (למשל: טופס הרשמה לקייטנה)"
                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none text-xs"
                      />
                      <div className="flex gap-2">
                        {loadedTemplateId && (
                          <Button type="button" onClick={handleUpdateTemplate} disabled={isSavingTemplate} className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 h-auto gap-1">
                            {isSavingTemplate ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            עדכן תבנית קיימת
                          </Button>
                        )}
                        <Button type="button" onClick={handleSaveTemplate} disabled={isSavingTemplate} className={`rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2 h-auto border border-white/10 gap-1 ${loadedTemplateId ? 'flex-1' : 'w-full'}`}>
                          <Folder className="w-4 h-4" />
                          שמור כתבנית חדשה
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TAB 0.5: TYPE */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all mt-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "type" ? ("" as any) : "type")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <Settings2 className="w-4 h-4 text-amber-400" /> סוג הטופס
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "type" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "type" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-4 max-w-3xl mx-auto flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-zinc-950 border border-white/5 px-4 py-3 rounded-xl shadow-sm">
                  <label className="text-sm font-bold text-white cursor-pointer flex-1" htmlFor="form-enabled-toggle">
                    הפעל טופס בעמוד:
                  </label>
                  <input
                    id="form-enabled-toggle"
                    type="checkbox"
                    checked={value.enabled}
                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                    className="w-5 h-5 text-amber-500 border-slate-700 bg-slate-800 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm transition-all ${value.form_type === 'payment' ? 'bg-amber-900/30 border-amber-500/50' : 'bg-zinc-950 border-white/5'}`}>
                  <label className={`text-sm font-bold cursor-pointer flex items-center gap-2 flex-1 ${value.form_type === 'payment' ? 'text-amber-300' : 'text-slate-300'}`} htmlFor="form-payment-toggle">
                    <Coins className={`w-5 h-5 ${value.form_type === 'payment' ? 'text-amber-400' : 'text-slate-500'}`} />
                    טופס תשלום:
                  </label>
                  <input
                    id="form-payment-toggle"
                    type="checkbox"
                    checked={value.form_type === "payment"}
                    onChange={(e) => {
                      const isPayment = e.target.checked;
                      if (isPayment) {
                        const newFields = [...value.fields];
                        let changed = false;
                        if (!newFields.some(f => f.type === "payment_summary")) {
                          newFields.push({ type: "step", label: "--- חוצץ שלב חדש ---", map_to: "", required: false, default_value: "", options: "", url_param_enable: false, url_param_name: "", cond_enable: false, cond_field_index: 0, cond_operator: "is", cond_value: "" });
                          newFields.push({ type: "payment_summary", label: "תשלום מאובטח", payment_doc_type: "320", payment_methods: ["one-time", "installments", "recurring", "bit"], payment_recurring_limit: "user-choice", map_to: "", required: true, default_value: "", options: "", url_param_enable: false, url_param_name: "", cond_enable: false, cond_field_index: 0, cond_operator: "is", cond_value: "" });
                          changed = true;
                        }
                        if (!newFields.some(f => f.type === "payment_cc")) {
                          newFields.push({ type: "step", label: "--- חוצץ שלב חדש ---", map_to: "", required: false, default_value: "", options: "", url_param_enable: false, url_param_name: "", cond_enable: false, cond_field_index: 0, cond_operator: "is", cond_value: "" });
                          newFields.push({ type: "payment_cc", label: "פרטי אשראי", payment_require_id: false, bgColor: "#09090b", textColor: "#ffffff", focusColor: "#f59e0b", map_to: "", required: true, default_value: "", options: "", url_param_enable: false, url_param_name: "", cond_enable: false, cond_field_index: 0, cond_operator: "is", cond_value: "" });
                          changed = true;
                        }
                        if (changed) {
                          updateConfig({ form_type: "payment", fields: newFields });
                        } else {
                          updateConfig({ form_type: "payment" });
                        }
                      } else {
                        updateConfig({ form_type: "standard" });
                      }
                    }}
                    className="w-5 h-5 text-amber-500 border-slate-700 bg-slate-800 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm transition-all ${value.form_type === 'register' ? 'bg-amber-900/30 border-amber-500/50' : 'bg-zinc-950 border-white/5'}`}>
                  <label className={`text-sm font-bold cursor-pointer flex items-center gap-2 flex-1 ${value.form_type === 'register' ? 'text-amber-300' : 'text-slate-300'}`} htmlFor="form-register-toggle">
                    <Sparkles className={`w-5 h-5 ${value.form_type === 'register' ? 'text-amber-400' : 'text-slate-500'}`} />
                    הרשמת משתמש:
                  </label>
                  <input
                    id="form-register-toggle"
                    type="checkbox"
                    checked={value.form_type === "register"}
                    onChange={(e) => updateConfig({ form_type: e.target.checked ? "register" : "standard" })}
                    className="w-5 h-5 text-amber-500 border-slate-700 bg-slate-800 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
          </div>

          <div className={mainTab === "fields" ? "w-full animate-in fade-in duration-300" : "hidden"}>
          {/* TAB 1: FIELDS & LOGIC */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl transition-all relative">
            <div className="p-4 bg-zinc-900 border-white/5 space-y-4 max-w-3xl mx-auto relative">
              <div className="flex justify-between items-center bg-zinc-950 border border-white/5 p-4 rounded-2xl">
                <span className="text-xs font-bold text-slate-400">
                  סה"כ פריטים בטופס: {value.fields.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={addStep}
                    className="bg-amber-900/30 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 gap-1 text-xs font-bold py-2 rounded-xl"
                  >
                    <LayoutTemplate className="w-4 h-4" /> הוסף שלב
                  </Button>
                  <Button
                    type="button"
                    onClick={addField}
                    className="bg-amber-500 hover:bg-amber-700 text-white gap-1 text-xs font-bold py-2 rounded-xl"
                  >
                    <Plus className="w-4 h-4" /> הוסף שדה חדש
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {value.fields.map((field, idx) => {
                  const isExpanded = expandedField === idx;
                  return (
                    <div 
                      key={idx}
                      className={`bg-zinc-950 rounded-2xl border transition-all shadow-sm relative !overflow-visible ${
                        isExpanded ? "ring-2 ring-amber-500/20 border-amber-500/50 z-50" : "border-white/5 z-0"
                      }`}
                    >
                      {/* Accordion Trigger */}
                      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFieldChange(idx, { label: e.target.value })}
                            className="font-bold text-white bg-transparent hover:bg-white/5 border-0 outline-none rounded px-2 py-0.5 max-w-[200px]"
                            placeholder="תווית השדה"
                            onClick={(e) => e.stopPropagation()}
                            required
                          />
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-semibold">
                            {FIELD_TYPES.find(t => t.id === field.type)?.label || field.type}
                          </span>
                          {field.map_to && (
                            <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-500/20">
                              ממופה ל-{Object.entries(CRM_DB_FIELDS).find(([k]) => k === field.map_to)?.[1] || field.map_to}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => moveField(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
                            title="הזז למעלה"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(idx, "down")}
                            disabled={idx === value.fields.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
                            title="הזז למטה"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedField(isExpanded ? null : idx);
                              setActiveFieldTab("settings");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateField(idx);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="שכפל שדה"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteField(idx)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="מחק שדה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable options details */}
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/20 rounded-b-2xl text-xs relative !overflow-visible">
                          {/* Tabs */}
                          <div className="flex bg-black/40 border-b border-white/5 overflow-x-auto custom-scrollbar">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveFieldTab("settings"); }} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors ${activeFieldTab === "settings" ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>הגדרות השדה</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveFieldTab("design"); }} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors ${activeFieldTab === "design" ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>עיצוב</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveFieldTab("mapping"); }} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors ${activeFieldTab === "mapping" ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>הגדרות מיפוי</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveFieldTab("advanced"); }} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors ${activeFieldTab === "advanced" ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>הגדרות מתקדמות</button>
                          </div>

                          <div className="p-4 space-y-4">
                            {/* Tab: Settings */}
                            {activeFieldTab === "settings" && (
                              <div className="flex flex-col gap-4 animate-in fade-in">
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="block font-semibold mb-1 text-slate-400">סוג פריט</label>
                                    <select
                                      value={field.type}
                                      onChange={(e) => handleFieldChange(idx, { type: e.target.value })}
                                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                    >
                                      {FIELD_TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1 text-slate-400">אייקון</label>
                                    <IconPicker value={field.icon || ""} onChange={(icon) => handleFieldChange(idx, { icon })} />
                                  </div>
                                </div>
                                
                                {field.type === "step" ? (
                                  <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                      <input
                                        id={`field-submit-next-${idx}`}
                                        type="checkbox"
                                        checked={field.submitOnNext || false}
                                        onChange={(e) => handleFieldChange(idx, { submitOnNext: e.target.checked })}
                                        className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                      />
                                      <label htmlFor={`field-submit-next-${idx}`} className="font-bold text-white cursor-pointer">
                                        הכפתור גם מעביר לשלב הבא וגם שומר את הנתונים הנוכחיים לדאטה-בייס?
                                      </label>
                                    </div>

                                    <h5 className="font-bold text-amber-500 mb-2 mt-4 border-t border-white/5 pt-4">עיצוב כותרת השלב</h5>
                                    <div className="flex flex-col gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                                      <div>
                                        <label className="block font-semibold mb-2 text-slate-400 text-[10px]">יישור כותרת (Title Alignment)</label>
                                        <div className="flex bg-zinc-950 rounded-xl p-1 border border-white/10 w-fit">
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(idx, { textAlign: "right" })}
                                            className={`p-2 rounded-lg transition-colors ${(!field.textAlign || field.textAlign === "right") ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                            title="יישור לימין"
                                          >
                                            <AlignRight className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(idx, { textAlign: "center" })}
                                            className={`p-2 rounded-lg transition-colors ${field.textAlign === "center" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                            title="מרכוז"
                                          >
                                            <AlignCenter className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleFieldChange(idx, { textAlign: "left" })}
                                            className={`p-2 rounded-lg transition-colors ${field.textAlign === "left" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                            title="יישור לשמאל"
                                          >
                                            <AlignLeft className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block font-semibold mb-2 text-slate-400 text-[10px]">צבע כותרת</label>
                                        <div className="flex gap-2 items-center">
                                          <input
                                            type="color"
                                            value={field.textColor || "#ffffff"}
                                            onChange={(e) => handleFieldChange(idx, { textColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer border border-white/10 p-0.5 bg-transparent block"
                                          />
                                          <span className="font-mono text-white text-xs">{field.textColor || "#ffffff"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <h5 className="font-bold text-amber-500 mb-2 mt-4 border-t border-white/5 pt-4">הגדרות כפתור 'המשך' לשלב הבא</h5>
                                    <div>
                                      <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור 'המשך'</label>
                                      <input
                                        type="text"
                                        value={field.step_button_text || ""}
                                        onChange={(e) => handleFieldChange(idx, { step_button_text: e.target.value })}
                                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                        placeholder="לדוגמה: הבא"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור 'חזור' (לשלב הקודם)</label>
                                      <input
                                        type="text"
                                        value={field.step_back_button_text || ""}
                                        onChange={(e) => handleFieldChange(idx, { step_back_button_text: e.target.value })}
                                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                        placeholder="לדוגמה: חזור"
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-semibold mb-1 text-slate-400">אייקון כפתור 'המשך'</label>
                                      <select
                                        value={field.step_button_icon || "chevron-left"}
                                        onChange={(e) => handleFieldChange(idx, { step_button_icon: e.target.value })}
                                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                      >
                                        <option value="chevron-left">חץ שמאלה (רגיל)</option>
                                        <option value="arrow-left">חץ שמאלה (ארוך)</option>
                                        <option value="check">וי (V)</option>
                                        <option value="">ללא אייקון</option>
                                      </select>
                                    </div>
                                    <details className="mt-4 bg-zinc-900 border border-white/5 rounded-xl group">
                                      <summary className="p-3 font-bold text-slate-300 cursor-pointer list-none flex justify-between items-center outline-none">
                                        עיצוב צבעי כפתורים
                                        <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
                                      </summary>
                                      <div className="p-4 pt-0 border-t border-white/5 mt-2">
                                        <div className="grid grid-cols-4 gap-2">
                                          <div>
                                            <label className="block font-semibold mb-2 text-slate-400 text-[10px]">רקע 'המשך'</label>
                                            <div className="flex flex-col gap-1 items-start">
                                              <input
                                                type="color"
                                                value={field.step_button_bg_color || "#f59e0b"}
                                                onChange={(e) => handleFieldChange(idx, { step_button_bg_color: e.target.value })}
                                                className="w-full h-8 border border-white/10 rounded-lg cursor-pointer p-0.5 bg-transparent"
                                              />
                                              <span className="font-mono text-white text-[10px] w-full text-center truncate">{field.step_button_bg_color || "#f59e0b"}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-2 text-slate-400 text-[10px]">טקסט 'המשך'</label>
                                            <div className="flex flex-col gap-1 items-start">
                                              <input
                                                type="color"
                                                value={field.step_button_text_color || "#ffffff"}
                                                onChange={(e) => handleFieldChange(idx, { step_button_text_color: e.target.value })}
                                                className="w-full h-8 border border-white/10 rounded-lg cursor-pointer p-0.5 bg-transparent"
                                              />
                                              <span className="font-mono text-white text-[10px] w-full text-center truncate">{field.step_button_text_color || "#ffffff"}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-2 text-slate-400 text-[10px]">רקע 'חזור'</label>
                                            <div className="flex flex-col gap-1 items-start">
                                              <input
                                                type="color"
                                                value={field.step_back_button_bg_color || "transparent"}
                                                onChange={(e) => handleFieldChange(idx, { step_back_button_bg_color: e.target.value })}
                                                className="w-full h-8 border border-white/10 rounded-lg cursor-pointer p-0.5 bg-transparent"
                                              />
                                              <span className="font-mono text-white text-[10px] w-full text-center truncate">{field.step_back_button_bg_color || "transparent"}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block font-semibold mb-2 text-slate-400 text-[10px]">טקסט 'חזור'</label>
                                            <div className="flex flex-col gap-1 items-start">
                                              <input
                                                type="color"
                                                value={field.step_back_button_text_color || "#cbd5e1"}
                                                onChange={(e) => handleFieldChange(idx, { step_back_button_text_color: e.target.value })}
                                                className="w-full h-8 border border-white/10 rounded-lg cursor-pointer p-0.5 bg-transparent"
                                              />
                                              <span className="font-mono text-white text-[10px] w-full text-center truncate">{field.step_back_button_text_color || "#cbd5e1"}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </details>
                                  </div>
                                ) : (
                                  <>
                                    {field.type === "select" && (
                                      <div>
                                        <label className="block font-semibold mb-1 text-slate-400">אפשרויות לבחירה (כל אפשרות בשורה חדשה)</label>
                                        <textarea
                                          value={field.options}
                                          onChange={(e) => handleFieldChange(idx, { options: e.target.value })}
                                          rows={3}
                                          className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-3 outline-none resize-none font-mono"
                                          placeholder="אפשרות א'&#10;אפשרות ב'&#10;אפשרות ג'"
                                        />
                                      </div>
                                    )}

                                    {["hidden", "fixed_amount", "rich_text_display"].includes(field.type) ? (
                                      <div>
                                        <label className="block font-semibold mb-1 text-slate-400">
                                          {field.type === "rich_text_display" ? "תוכן טקסט עשיר (HTML)" : "ערך קבוע / ברירת מחדל"}
                                        </label>
                                        {field.type === "rich_text_display" ? (
                                          <div className="w-full bg-zinc-950 text-slate-800 rounded-xl overflow-hidden mt-2">
                                            <RichTextEditor
                                              value={field.default_value || ""}
                                              onChange={(val) => handleFieldChange(idx, { default_value: val })}
                                              placeholder="הכנס תוכן מעוצב או HTML כאן..."
                                            />
                                          </div>
                                        ) : (
                                          <input
                                            type="text"
                                            value={field.default_value || ""}
                                            onChange={(e) => handleFieldChange(idx, { default_value: e.target.value })}
                                            className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                            placeholder="הזן ערך מוגדר מראש"
                                          />
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block font-semibold mb-1 text-slate-400">ערך ברירת מחדל</label>
                                          <input
                                            type="text"
                                            value={field.default_value || ""}
                                            onChange={(e) => handleFieldChange(idx, { default_value: e.target.value })}
                                            className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                            placeholder="הזן ערך התחלתי..."
                                          />
                                        </div>
                                        <div>
                                          <label className="block font-semibold mb-1 text-slate-400">טקסט שומר מקום (Placeholder)</label>
                                          <input
                                            type="text"
                                            value={field.placeholder || ""}
                                            onChange={(e) => handleFieldChange(idx, { placeholder: e.target.value })}
                                            className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                            placeholder="הזן טקסט שומר מקום..."
                                          />
                                        </div>
                                        <div>
                                          <label className="block font-semibold mb-1 text-slate-400">מילוי אוטומטי (דפדפן)</label>
                                          <select
                                            value={field.autocomplete || ""}
                                            onChange={(e) => handleFieldChange(idx, { autocomplete: e.target.value })}
                                            className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                          >
                                            <option value="">ללא (כבוי)</option>
                                            <option value="name">שם מלא</option>
                                            <option value="given-name">שם פרטי</option>
                                            <option value="family-name">שם משפחה</option>
                                            <option value="tel">טלפון נייד</option>
                                            <option value="email">אימייל</option>
                                            <option value="organization">חברה/ארגון</option>
                                            <option value="street-address">כתובת</option>
                                            <option value="bday">תאריך לידה</option>
                                          </select>
                                        </div>
                                      </div>
                                    )}

                                    {field.type === "image_display" && (
                                      <div>
                                        <label className="block font-semibold mb-1 text-slate-400">בחר תמונה להצגה בטופס</label>
                                        <ImageUpload
                                          currentImage={field.default_value || ""}
                                          onSelect={(url) => handleFieldChange(idx, { default_value: url })}
                                        />
                                      </div>
                                    )}

                                    {field.type === "calculated" && (
                                      <div className="bg-amber-900/20 p-4 rounded-xl border border-amber-500/30">
                                        <label className="block font-semibold mb-1 text-amber-300">נוסחת חישוב חשבונית</label>
                                        <p className="text-amber-400 mb-2 text-xs">
                                          כתוב נוסחה חשבונית (כפל <code>*</code>, חילוק <code>/</code>, חיבור <code>+</code>, חיסור <code>-</code>).<br/>
                                          כדי להשתמש בערך של שדה אחר, הקלד את שם השדה בתוך סוגריים מרובעים. לדוגמה: <code>[כמות משתתפים] * 50 + 10</code>
                                        </p>
                                        <input
                                          type="text"
                                          value={field.calc_formula || ""}
                                          onChange={(e) => handleFieldChange(idx, { calc_formula: e.target.value })}
                                          className="w-full bg-zinc-950 text-white border border-amber-500/30 rounded-xl p-3 outline-none font-mono text-left"
                                          placeholder="e.g. [amount] * 0.17"
                                          dir="ltr"
                                        />
                                      </div>
                                    )}

                                    {field.type === "payment_summary" && (
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block font-semibold mb-1 text-slate-400">סוג מסמך להפקה בקשר (Kesher)</label>
                                          <select
                                            value={field.payment_doc_type || "320"}
                                            onChange={(e) => handleFieldChange(idx, { payment_doc_type: e.target.value })}
                                            className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                          >
                                            <option value="320">חשבונית מס/קבלה (320)</option>
                                            <option value="400">קבלה (400)</option>
                                            <option value="405">קבלה על תרומה (405)</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block font-semibold mb-1 text-slate-400">אפשרויות תשלום מותרות</label>
                                          <div className="flex flex-wrap gap-4 mt-2">
                                            {["one-time", "installments", "recurring", "bit"].map(method => {
                                              const labels: any = { "one-time": "חד פעמי", "installments": "תשלומים", "recurring": "הוראת קבע", "bit": "אפליקציית Bit" };
                                              const methods = field.payment_methods || ["one-time"];
                                              return (
                                                <label key={method} className="flex items-center gap-2 text-white font-bold cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={methods.includes(method)}
                                                    onChange={(e) => {
                                                      const newMethods = e.target.checked ? [...methods, method] : methods.filter(m => m !== method);
                                                      handleFieldChange(idx, { payment_methods: newMethods });
                                                    }}
                                                    className="w-4 h-4 text-amber-500 rounded bg-slate-800"
                                                  />
                                                  {labels[method]}
                                                </label>
                                              )
                                            })}
                                          </div>
                                        </div>
                                        {(field.payment_methods || []).includes("recurring") && (
                                          <div>
                                            <label className="block font-semibold mb-1 text-slate-400">כמות חיובים (הוראת קבע)</label>
                                            <select
                                              value={field.payment_recurring_limit || "user-choice"}
                                              onChange={(e) => handleFieldChange(idx, { payment_recurring_limit: e.target.value })}
                                              className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                            >
                                              <option value="user-choice">תן ללקוח לבחור בטופס</option>
                                              <option value="unlimited">ללא הגבלה בלבד (עד ביטול)</option>
                                              <option value="12">קבוע ל-12 חודשים (שנה)</option>
                                              <option value="24">קבוע ל-24 חודשים (שנתיים)</option>
                                            </select>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {field.type === "payment_cc" && (
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 pt-2">
                                          <input
                                            id={`field-req-id-${idx}`}
                                            type="checkbox"
                                            checked={field.payment_require_id || false}
                                            onChange={(e) => handleFieldChange(idx, { payment_require_id: e.target.checked })}
                                            className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                          />
                                          <label htmlFor={`field-req-id-${idx}`} className="font-bold text-white cursor-pointer">
                                            דרוש להזין תעודת זהות (ת.ז) בעת החיוב בקשר?
                                          </label>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {/* Tab: Design */}
                            {activeFieldTab === "design" && (
                              <div className="flex flex-col gap-4 animate-in fade-in">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="block font-semibold mb-1 text-slate-400 text-[10px]">רוחב השדה בשורה</label>
                                    <select
                                      value={field.widthPercentage || 100}
                                      onChange={(e) => handleFieldChange(idx, { widthPercentage: Number(e.target.value) })}
                                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none text-xs"
                                    >
                                      {WIDTH_OPTIONS.map(w => (
                                        <option key={w.id} value={w.id}>{w.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1 text-slate-400 text-[10px]">גובה השדה</label>
                                    <select
                                      value={field.height || ""}
                                      onChange={(e) => handleFieldChange(idx, { height: e.target.value })}
                                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none text-xs"
                                      dir="ltr"
                                    >
                                      {HEIGHT_OPTIONS.map(h => (
                                        <option key={h.id} value={h.id}>{h.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1 text-slate-400 text-[10px]">גודל גופן</label>
                                    <select
                                      value={field.fontSize || ""}
                                      onChange={(e) => handleFieldChange(idx, { fontSize: e.target.value ? parseInt(e.target.value) : undefined })}
                                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none text-xs"
                                      dir="ltr"
                                    >
                                      {FONT_SIZE_OPTIONS.map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="mt-4 border-t border-white/5 pt-4">
                                  <label className="block font-semibold mb-2 text-slate-400 text-xs">יישור טקסט (לכותרות ושדות)</label>
                                  <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 w-fit">
                                    <button
                                      type="button"
                                      onClick={() => handleFieldChange(idx, { textAlign: "right" })}
                                      className={`p-2 rounded-lg transition-colors ${(!field.textAlign || field.textAlign === "right") ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                      title="יישור לימין"
                                    >
                                      <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldChange(idx, { textAlign: "center" })}
                                      className={`p-2 rounded-lg transition-colors ${field.textAlign === "center" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                      title="מרכוז"
                                    >
                                      <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldChange(idx, { textAlign: "left" })}
                                      className={`p-2 rounded-lg transition-colors ${field.textAlign === "left" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
                                      title="יישור לשמאל"
                                    >
                                      <AlignLeft className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3 text-center mt-4">
                                  <div>
                                    <label className="block font-semibold mb-2 text-slate-400 text-[10px]">צבע גופן</label>
                                    <input
                                      type="color"
                                      value={field.textColor || "#ffffff"}
                                      onChange={(e) => handleFieldChange(idx, { textColor: e.target.value })}
                                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 mx-auto block"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-2 text-slate-400 text-[10px]">צבע רקע</label>
                                    <input
                                      type="color"
                                      value={field.bgColor || "#09090b"}
                                      onChange={(e) => handleFieldChange(idx, { bgColor: e.target.value })}
                                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 mx-auto block"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-2 text-slate-400 text-[10px]">צבע מסגרת</label>
                                    <input
                                      type="color"
                                      value={field.borderColor || "#ffffff"}
                                      onChange={(e) => handleFieldChange(idx, { borderColor: e.target.value })}
                                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 mx-auto block"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-2 text-slate-400 text-[10px]">צבע פוקוס</label>
                                    <input
                                      type="color"
                                      value={field.focusColor || "#f59e0b"}
                                      onChange={(e) => handleFieldChange(idx, { focusColor: e.target.value })}
                                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 mx-auto block"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab: Mapping */}
                            {activeFieldTab === "mapping" && (
                              <div className="flex flex-col gap-4 animate-in fade-in">
                                <div className="relative z-20">
                                  <label className="block font-semibold mb-1 text-slate-400">מיפוי לשדה CRM</label>
                                  <SearchableSelect
                                    value={field.map_to}
                                    onChange={(val) => {
                                      if (val === "__other__") {
                                        setShowAddCustomFieldModal(true);
                                      } else {
                                        handleFieldChange(idx, { map_to: val });
                                      }
                                    }}
                                    options={mappingOptions}
                                  />
                                </div>
                                
                                <div className="border-t border-white/5 pt-3 relative z-10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      id={`field-map-2-${idx}`}
                                      type="checkbox"
                                      checked={!!field.map_to_2}
                                      onChange={(e) => handleFieldChange(idx, { map_to_2: e.target.checked ? "notes" : undefined })}
                                      className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                    />
                                    <label htmlFor={`field-map-2-${idx}`} className="font-bold text-white cursor-pointer">
                                      מפה לשדה נוסף ב-CRM (מיפוי כפול)
                                    </label>
                                  </div>
                                  {field.map_to_2 && (
                                    <div className="mt-1">
                                      <SearchableSelect
                                        value={field.map_to_2}
                                        onChange={(val) => {
                                          if (val === "__other__") {
                                            setShowAddCustomFieldModal(true);
                                          } else {
                                            handleFieldChange(idx, { map_to_2: val });
                                          }
                                        }}
                                        options={mappingOptions}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tab: Advanced */}
                            {activeFieldTab === "advanced" && (
                              <div className="flex flex-col gap-4 animate-in fade-in">
                                <div className="flex items-center gap-2 pb-2">
                                  <input
                                    id={`field-required-${idx}`}
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => handleFieldChange(idx, { required: e.target.checked })}
                                    className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                  />
                                  <label htmlFor={`field-required-${idx}`} className="font-bold text-white cursor-pointer">
                                    שדה חובה למילוי?
                                  </label>
                                </div>

                                {/* URL params */}
                                <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`field-url-${idx}`}
                                      type="checkbox"
                                      checked={field.url_param_enable}
                                      onChange={(e) => handleFieldChange(idx, { url_param_enable: e.target.checked })}
                                      className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                    />
                                    <label htmlFor={`field-url-${idx}`} className="font-bold text-white cursor-pointer">
                                      משיכת ערך מפרמטר בכתובת URL?
                                    </label>
                                  </div>
                                  {field.url_param_enable && (
                                    <div className="flex items-center gap-1.5 pr-6">
                                      <span className="text-slate-400">שם הפרמטר ב-URL:</span>
                                      <input
                                        type="text"
                                        value={field.url_param_name}
                                        onChange={(e) => handleFieldChange(idx, { url_param_name: e.target.value })}
                                        className="bg-zinc-950 text-white border border-white/10 rounded-xl p-2 outline-none w-32"
                                        placeholder="e.g. promo"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Conditional Logic */}
                                <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`field-cond-${idx}`}
                                      type="checkbox"
                                      checked={field.cond_enable}
                                      onChange={(e) => handleFieldChange(idx, { cond_enable: e.target.checked })}
                                      className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                                    />
                                    <label htmlFor={`field-cond-${idx}`} className="font-bold text-white cursor-pointer">
                                      הפעל לוגיקה תנאית (Conditional Logic)?
                                    </label>
                                  </div>
                                  
                                  {field.cond_enable && (
                                    <div className="bg-amber-900/20 border border-amber-500/30 p-3.5 rounded-2xl flex flex-wrap gap-3 items-center mt-2">
                                      <span className="text-white">הצג שדה זה רק אם שדה:</span>
                                      <select
                                        value={field.cond_field_index}
                                        onChange={(e) => handleFieldChange(idx, { cond_field_index: parseInt(e.target.value) })}
                                        className="bg-zinc-950 text-white border border-white/10 rounded-xl p-2 outline-none min-w-[120px]"
                                      >
                                        <option value="">בחר שדה...</option>
                                        {selectFields
                                          .filter(f => f.index !== idx)
                                          .map(f => (
                                            <option key={f.index} value={f.index}>{f.label}</option>
                                          ))
                                        }
                                      </select>
                                      <select
                                        value={field.cond_operator}
                                        onChange={(e) => handleFieldChange(idx, { cond_operator: e.target.value })}
                                        className="bg-zinc-950 text-white border border-white/10 rounded-xl p-2 outline-none"
                                      >
                                        <option value="is">שווה ל-</option>
                                        <option value="is_not">שונה מ-</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={field.cond_value}
                                        onChange={(e) => handleFieldChange(idx, { cond_value: e.target.value })}
                                        placeholder="הזן ערך"
                                        className="bg-zinc-950 text-white border border-white/10 rounded-xl p-2 outline-none w-32"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all mt-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "submit_btn" ? ("" as any) : "submit_btn")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <Settings2 className="w-4 h-4 text-amber-400" /> הגדרות כפתור שליחה וצבעים (כללי)
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "submit_btn" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "submit_btn" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-4 max-w-3xl mx-auto text-xs">
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2">
                    עיצוב כפתור השליחה
                  </h4>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור שליחה (סיום טופס)</label>
                    <input
                      type="text"
                      value={value.submit_button_text || ""}
                      onChange={(e) => updateConfig({ submit_button_text: e.target.value })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none font-bold"
                      placeholder="המשך לתשלום מאובטח"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור המשך (מעבר שלב)</label>
                    <input
                      type="text"
                      value={value.continue_button_text || ""}
                      onChange={(e) => updateConfig({ continue_button_text: e.target.value })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none font-bold"
                      placeholder="המשך לשלב הבא"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">אייקון כפתור המשך</label>
                    <select
                      value={value.continue_button_icon || "arrow-left"}
                      onChange={(e) => updateConfig({ continue_button_icon: e.target.value })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                    >
                      <option value="">ללא אייקון</option>
                      <option value="arrow-left">חץ שמאלה</option>
                      <option value="chevron-left">חץ קטן שמאלה</option>
                      <option value="check">וי (Check)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע רקע כפתור</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.submit_button_bg_color || "#f59e0b"}
                          onChange={(e) => updateConfig({ submit_button_bg_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-white">{value.submit_button_bg_color || "#f59e0b"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע טקסט כפתור</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.submit_button_text_color || "#ffffff"}
                          onChange={(e) => updateConfig({ submit_button_text_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-white">{value.submit_button_text_color || "#ffffff"}</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-4">
                    עיצוב כפתור חזור (לשלב הקודם)
                  </h4>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור חזור</label>
                    <input
                      type="text"
                      value={value.back_button_text || ""}
                      onChange={(e) => updateConfig({ back_button_text: e.target.value })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none font-bold"
                      placeholder="חזור"
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע רקע כפתור חזור</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.back_button_bg_color || "#27272a"}
                          onChange={(e) => updateConfig({ back_button_bg_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-white">{value.back_button_bg_color || "#27272a"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע טקסט כפתור חזור</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.back_button_text_color || "#cbd5e1"}
                          onChange={(e) => updateConfig({ back_button_text_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-white">{value.back_button_text_color || "#cbd5e1"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Form & Field background color settings */}
                  <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע רקע הטופס</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.form_bg_color || "#09090b"}
                          onChange={(e) => updateConfig({ form_bg_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-white">{value.form_bg_color || "#09090b"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">צבע רקע השדות</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={value.field_bg_color || "#18181b"}
                          onChange={(e) => updateConfig({ field_bg_color: e.target.value })}
                          className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-white">{value.field_bg_color || "#18181b"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          <div className={mainTab === "settings" ? "space-y-4 animate-in fade-in" : "hidden"}>
          {/* TAB 2: WHATSAPP AUTOMATION */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all mt-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "whatsapp" ? ("" as any) : "whatsapp")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-green-400" /> הודעות WhatsApp
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "whatsapp" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "whatsapp" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-6 max-w-3xl mx-auto">
              <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl text-xs space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                  הסבר על מנגנון הוואטסאפ האוטומטי
                </h4>
                <p className="text-amber-400 leading-relaxed">
                  הודעות וואטסאפ יישלחו אוטומטית למספר הטלפון שיוזן בשדה הממופה ל-<strong>"טלפון נייד"</strong> בטופס.
                  תוכלו להשתמש בפלייסהולדרים המייצגים את שדות הטופס על ידי לחיצה על כפתורי השדות למטה, והמערכת תחלץ את התוכן של המשתמש.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {value.fields.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePlaceholderClick(`{${f.label}}`, 
                        value.form_type === "payment" ? "payment_success_message" : "standard_whatsapp_message"
                      )}
                      className="px-2.5 py-1 rounded bg-amber-900/50 hover:bg-amber-800 border border-amber-500/30 text-amber-300 text-[10px] font-bold"
                    >
                      {`{${f.label}}`}
                    </button>
                  ))}
                  {value.form_type === "payment" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePlaceholderClick("{סכום}", "payment_success_message")}
                        className="px-2.5 py-1 rounded bg-purple-900/50 hover:bg-purple-800 border border-purple-500/30 text-purple-300 text-[10px] font-bold"
                      >
                        {`{סכום}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePlaceholderClick("{link_kabala}", "payment_success_message")}
                        className="px-2.5 py-1 rounded bg-purple-900/50 hover:bg-purple-800 border border-purple-500/30 text-purple-300 text-[10px] font-bold"
                      >
                        {`{link_kabala}`}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {value.form_type === "standard" ? (
                /* Standard Lead Form WhatsApp Settings */
                <div className="space-y-4">
                  <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2">
                      וואטסאפ לאחר שליחת ליד מוצלחת
                    </h4>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">נוסח ההודעה</label>
                      <textarea
                        id="standard_whatsapp_message"
                        value={value.standard_whatsapp_message}
                        onChange={(e) => updateConfig({ standard_whatsapp_message: e.target.value })}
                        rows={4}
                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 outline-none resize-none text-xs"
                        placeholder="שלום {שם מלא}, קיבלנו את פרטיך..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">תמונה מצורפת להודעה</label>
                      <ImageUpload
                        currentImage={value.standard_whatsapp_image_url}
                        onSelect={(url) => updateConfig({ standard_whatsapp_image_url: url })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Payment Form WhatsApp Settings (Pending & Success) */
                <div className="flex flex-col gap-6">
                  {/* Pending Form message */}
                  <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="font-bold text-amber-500 text-sm border-b border-white/10 pb-2 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        הודעה בעת יצירת הזמנה (ממתין לתשלום)
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">נוסח ההודעה</label>
                        <textarea
                          id="payment_pending_message"
                          value={value.payment_pending_message}
                          onChange={(e) => updateConfig({ payment_pending_message: e.target.value })}
                          rows={4}
                          className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 outline-none resize-none text-xs"
                          placeholder="שלום {שם מלא}, ההזמנה שלך נוצרה וממתינה לתשלום..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">תמונה מצורפת</label>
                      <ImageUpload
                        currentImage={value.payment_pending_image_url}
                        onSelect={(url) => updateConfig({ payment_pending_image_url: url })}
                      />
                    </div>
                  </div>

                  {/* Success Form message */}
                  <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="font-bold text-emerald-400 text-sm border-b border-white/10 pb-2 flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        הודעה לאחר ביצוע תשלום מוצלח
                      </h4>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">נוסח ההודעה</label>
                        <textarea
                          id="payment_success_message"
                          value={value.payment_success_message}
                          onChange={(e) => updateConfig({ payment_success_message: e.target.value })}
                          rows={4}
                          className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 outline-none resize-none text-xs"
                          placeholder="שלום {שם מלא}, התשלום בסך {סכום} שח בוצע בהצלחה..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">תמונה מצורפת</label>
                      <ImageUpload
                        currentImage={value.payment_success_image_url}
                        onSelect={(url) => updateConfig({ payment_success_image_url: url })}
                      />
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>

          {/* TAB: COMMUNITIES */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all mt-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "communities" ? ("" as any) : "communities")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4 text-indigo-400" /> קהילות
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "communities" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "communities" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-6 max-w-3xl mx-auto">
                <div>
                  <h3 className="font-bold text-lg mb-2">שיוך לקהילה</h3>
                  <p className="text-slate-400 text-xs mb-4">אנשי קשר שיירשמו דרך טופס זה ישויכו אוטומטית לקהילה הנבחרת.</p>
                  
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <label className="block font-semibold mb-2 text-slate-300">בחר קהילה</label>
                    <select
                      value={value.communityId || ""}
                      onChange={(e) => onChange({ ...value, communityId: e.target.value })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-3 outline-none focus:border-amber-500/50 transition-colors"
                    >
                      <option value="">-- ללא שיוך לקהילה מסוימת --</option>
                      {communities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TAB 3: GENERAL SETTINGS & DESIGN */}
          <div className="w-full bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all mt-4">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "settings" ? ("" as any) : "settings")}
              className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer sticky top-0 z-10 bg-zinc-950"
            >
              <span className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-pink-400" /> הגדרות ועיצוב
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform text-gray-400 ${activeTab === "settings" ? "rotate-180 text-white" : ""}`} />
            </button>
            {activeTab === "settings" && (
              <div className="p-4 bg-zinc-900 border-t border-white/5 space-y-6 max-w-3xl mx-auto">
            <div className="flex flex-col gap-6">
              {/* Left Column: Settings */}
              <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 space-y-4 text-xs">


                {/* save_to_crm toggle removed per user request */}

                {value.save_to_crm && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block font-semibold mb-1 text-slate-400">שמור ל-CRM בשלב (הזן מספר שלב, או השאר ריק לשמירה בסוף הטופס)</label>
                    <input
                      type="number"
                      min="1"
                      value={value.crm_save_step || ""}
                      onChange={(e) => updateConfig({ crm_save_step: parseInt(e.target.value) || undefined })}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                      placeholder="לדוגמה: 1"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      * ניתן להגדיר שמירת ליד בשלב מוקדם (למשל שלב 1) גם בטופס רב-שלבי, למניעת נטישת לידים.
                    </p>
                  </div>
                )}

                {/* crm_owner_id select removed per user request to hide user selection */}

                {value.form_type === "standard" && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">הודעת הצלחה לאחר שליחה</label>
                      <input
                        type="text"
                        value={value.standard_success_message}
                        onChange={(e) => updateConfig({ standard_success_message: e.target.value })}
                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none"
                        placeholder="הטופס נשלח בהצלחה."
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-400">העברה לכתובת URL חיצונית (Redirect - אופציונלי)</label>
                      <input
                        type="url"
                        value={value.standard_redirect_url}
                        onChange={(e) => updateConfig({ standard_redirect_url: e.target.value })}
                        className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-2.5 outline-none font-mono"
                        placeholder="https://example.com/thank-you"
                      />
                    </div>
                  </div>
                )}

                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-6">
                  הודעת תודה / פעולות מותנות
                </h4>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="custom-modal-check"
                      type="checkbox"
                      checked={value.custom_success_modal_enable}
                      onChange={(e) => updateConfig({ custom_success_modal_enable: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800"
                    />
                    <label htmlFor="custom-modal-check" className="font-bold text-white cursor-pointer">
                      הצג מודל תודה מעוצב מותאם אישית (מחליף הודעת תודה רגילה)
                    </label>
                  </div>

                  {value.custom_success_modal_enable && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300 border border-white/5 p-4 rounded-xl bg-black/20">
                      <div>
                        <label className="block font-semibold mb-2 text-white">תמונה למודל התודה (אופציונלי)</label>
                        <ImageUpload
                          currentImage={value.custom_success_modal_image_url || ""}
                          onSelect={(url) => updateConfig({ custom_success_modal_image_url: url })}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2 text-white">טקסט להודעת התודה</label>
                        <textarea
                          value={value.custom_success_modal_content || ""}
                          onChange={(e) => updateConfig({ custom_success_modal_content: e.target.value })}
                          className="w-full bg-zinc-950 text-white border border-white/10 rounded-xl p-3 outline-none min-h-[100px] resize-y"
                          placeholder="תודה רבה! נציג יחזור אליך בהקדם."
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block font-semibold text-slate-400">פעולות לוגיות מותנות בעת שליחה</label>
                      <Button
                        type="button"
                        onClick={() => {
                          const newRule = { id: Math.random().toString(36).substr(2, 9), field_index: 0, operator: "is" as const, value: "", action_type: "redirect" as const, action_value: "" };
                          updateConfig({ action_rules: [...(value.action_rules || []), newRule] });
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-2 py-1 h-auto rounded-lg"
                      >
                        <Plus className="w-3 h-3 mr-1" /> הוסף פעולה מותנית
                      </Button>
                    </div>

                    {(value.action_rules || []).map((rule, rIdx) => (
                      <div key={rule.id} className="bg-zinc-900 p-3 rounded-xl border border-white/5 mb-3 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => {
                            const newRules = [...(value.action_rules || [])];
                            newRules.splice(rIdx, 1);
                            updateConfig({ action_rules: newRules });
                          }}
                          className="absolute top-2 left-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-slate-400 font-bold">אם</span>
                          <select
                            value={rule.field_index}
                            onChange={(e) => {
                              const newRules = [...(value.action_rules || [])];
                              newRules[rIdx].field_index = parseInt(e.target.value);
                              updateConfig({ action_rules: newRules });
                            }}
                            className="bg-zinc-950 border border-white/10 text-white rounded px-2 py-1"
                          >
                            {selectFields.map(f => (
                              <option key={f.index} value={f.index}>{f.label}</option>
                            ))}
                          </select>
                          <select
                            value={rule.operator}
                            onChange={(e) => {
                              const newRules = [...(value.action_rules || [])];
                              newRules[rIdx].operator = e.target.value as "is" | "is_not";
                              updateConfig({ action_rules: newRules });
                            }}
                            className="bg-zinc-950 border border-white/10 text-white rounded px-2 py-1"
                          >
                            <option value="is">שווה ל-</option>
                            <option value="is_not">שונה מ-</option>
                          </select>
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => {
                              const newRules = [...(value.action_rules || [])];
                              newRules[rIdx].value = e.target.value;
                              updateConfig({ action_rules: newRules });
                            }}
                            placeholder="ערך"
                            className="bg-zinc-950 border border-white/10 text-white rounded px-2 py-1 w-24"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-white/10">
                          <span className="text-slate-400 font-bold">אז</span>
                          <select
                            value={rule.action_type}
                            onChange={(e) => {
                              const newRules = [...(value.action_rules || [])];
                              newRules[rIdx].action_type = e.target.value as any;
                              updateConfig({ action_rules: newRules });
                            }}
                            className="bg-zinc-950 border border-white/10 text-white rounded px-2 py-1"
                          >
                            <option value="redirect">העבר לקישור (Redirect)</option>
                            <option value="modal">הצג מודל תודה אישי (HTML)</option>
                            <option value="payment">העבר לתשלום (קשר)</option>
                          </select>
                          {rule.action_type !== "payment" && (
                            <input
                              type="text"
                              value={rule.action_value}
                              onChange={(e) => {
                                const newRules = [...(value.action_rules || [])];
                                newRules[rIdx].action_value = e.target.value;
                                updateConfig({ action_rules: newRules });
                              }}
                              placeholder={rule.action_type === "redirect" ? "https://..." : "<h1>תודה</h1>"}
                              className="bg-zinc-950 border border-white/10 text-white rounded px-2 py-1 flex-1"
                              dir="ltr"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    {(value.action_rules || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">לא הוגדרו פעולות מותנות. ברירת המחדל תבוצע.</p>
                    )}
                  </div>
                </div>
              </div>



              {/* Right Column: Preview */}
              <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 space-y-4 text-xs flex flex-col justify-between">

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-center space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">תצוגה מקדימה כפתור</span>
                  <button
                    type="button"
                    style={{
                      backgroundColor: value.submit_button_bg_color,
                      color: value.submit_button_text_color
                    }}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
                  >
                    {value.submit_button_text}
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}
          </div>
          </div>
        </div>
      )}
      
      {/* Add Custom Field Modal */}
      <Modal isOpen={showAddCustomFieldModal} onClose={() => setShowAddCustomFieldModal(false)}>
        <Modal.Content className="max-w-md rounded-[2rem] p-6 text-right bg-zinc-950 border border-white/5 text-white">
          <Modal.Close className="left-4 right-auto text-white/50 hover:text-white" />
          <Modal.Header title="הוספת שדה חדש ל-CRM" description="צור שדה מותאם אישית שיוצג בכרטיס איש הקשר ויהיה זמין למיפוי בטפסים." />
          
          <div className="space-y-4 my-6">
            <div>
              <label className="block text-sm font-bold text-white mb-1">קטגוריה ב-CRM</label>
              <select 
                value={newCustomFieldCategory}
                onChange={(e) => setNewCustomFieldCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 p-2.5 bg-zinc-900 text-white outline-none"
              >
                <option value="details">פרטים כלליים</option>
                <option value="camp">משפחה וקייטנה</option>
                <option value="tags">תיוגים והערות</option>
                <option value="company">חברה ומקור</option>
                <option value="events">אירועים ומפגשים</option>
                {customTabs.length > 0 && (
                  <optgroup label="לשוניות מותאמות אישית">
                    {customTabs.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-white mb-1">סוג השדה</label>
              <select 
                value={newCustomFieldType}
                onChange={(e) => setNewCustomFieldType(e.target.value)}
                className="w-full rounded-xl border border-white/10 p-2.5 bg-zinc-900 text-white outline-none"
              >
                <option value="text">שדה טקסט</option>
                <option value="textarea">אזור טקסט ארוך</option>
                <option value="number">מספר</option>
                <option value="date">תאריך</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-white mb-1">שם השדה (תווית התצוגה)</label>
              <Input 
                value={newCustomFieldLabel}
                onChange={(e) => setNewCustomFieldLabel(e.target.value)}
                placeholder="למשל: שם החיה, מצב משפחתי..."
                className="rounded-xl bg-zinc-900 border-white/10 text-white placeholder-slate-500"
              />
            </div>
          </div>
          
          <Modal.Footer>
            <div className="flex gap-3 justify-end w-full">
              <Button onClick={() => setShowAddCustomFieldModal(false)} className="bg-white/10 text-white hover:bg-white/20">ביטול</Button>
              <Button onClick={handleAddCustomField} disabled={isAddingCustomField} className="bg-amber-500 text-white hover:bg-amber-700">
                {isAddingCustomField ? "שומר..." : "הוסף שדה"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
