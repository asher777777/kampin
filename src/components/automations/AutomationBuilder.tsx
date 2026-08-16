"use client";

import { useState, useEffect } from "react";
import type { Automation, ActionStep, Trigger } from "@/lib/automations/engine";
import { updateAutomation } from "@/features/automations/actions";
import { ArrowRight, Save, Plus, Trash2, Webhook, Users, MessageSquare, Clock, Calendar, FormInput, FileText, Mail, Sparkles } from "lucide-react";

interface Props {
  automation: Automation;
  onClose: () => void;
  onSave: (auto: Automation) => void;
}

export default function AutomationBuilder({ automation, onClose, onSave }: Props) {
  const [name, setName] = useState(automation.name);
  const [trigger, setTrigger] = useState<Trigger>(automation.trigger);
  const [steps, setSteps] = useState<ActionStep[]>(automation.steps || []);
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(process.env.NEXT_PUBLIC_APP_URL || "https://hakel.club");
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const updated = { ...automation, name, trigger, steps };
    await updateAutomation(automation.id, { name, trigger, steps });
    onSave(updated);
    setIsSaving(false);
  };

  const addStep = (type: ActionStep["type"]) => {
    let newStep: ActionStep | undefined;
    switch (type) {
      case "whatsapp_send":
        newStep = { type, config: { phoneField: "{{phone}}", messageTemplate: "היי {{name}}, קיבלנו את פנייתך!" } };
        break;
      case "crm_create_contact":
        newStep = { type, config: { nameField: "{{name}}", phoneField: "{{phone}}", emailField: "{{email}}" } };
        break;
      case "crm_add_reminder":
        newStep = { type, config: { contactIdField: "{{contactId}}", title: "תזכורת אוטומטית", text: "לחזור ללקוח", timeField: "" } };
        break;
      case "email_send":
        newStep = { type, config: { contactIdField: "{{contactId}}", emailField: "{{email}}", subject: "תודה על פנייתך", bodyTemplate: "היי {{name}}, קיבלנו את המייל." } };
        break;
      case "create_invoice":
        newStep = { type, config: { nameField: "{{name}}", amountField: "{{amount}}", description: "תשלום עבור שירות" } };
        break;
      case "generate_ai_post":
        newStep = { type, config: { promptTemplate: "כתוב פוסט על {{topic}}", tone: "מקצועי" } };
        break;
      case "crm_update_with_receipt":
        newStep = { type, config: { phoneField: "{{customer_phone}}", amountField: "{{total}}", documentNumberField: "{{doc_number}}", documentUrlField: "{{doc_url}}" } };
        break;
      default:
        return;
    }
    setSteps([...steps, newStep]);
  };

  const updateStepConfig = (index: number, key: string, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], config: { ...newSteps[index].config, [key]: value } } as ActionStep;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowRight className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-800 placeholder-slate-400"
            placeholder="שם האוטומציה"
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "שומר..." : "שמור אוטומציה"}
        </button>
      </div>

      {/* Builder Canvas */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
          
          {/* Trigger Node */}
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                {trigger.type === "webhook" && <Webhook className="w-6 h-6" />}
                {trigger.type === "form_submission" && <FormInput className="w-6 h-6" />}
                {trigger.type === "specific_time" && <Clock className="w-6 h-6" />}
                {trigger.type === "specific_date" && <Calendar className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <select 
                  value={trigger.type}
                  onChange={(e) => {
                    const t = e.target.value;
                    if (t === "webhook") setTrigger({ type: "webhook", webhookId: trigger.type === "webhook" ? trigger.webhookId : Math.random().toString(36).substring(2, 10) });
                    if (t === "form_submission") setTrigger({ type: "form_submission", formId: "" });
                    if (t === "specific_time") setTrigger({ type: "specific_time", cronExpression: "08:00" });
                    if (t === "specific_date") setTrigger({ type: "specific_date", dateIso: "" });
                  }}
                  className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 text-lg w-full p-0 cursor-pointer"
                >
                  <option value="webhook">טריגר: Webhook נכנס</option>
                  <option value="form_submission">טריגר: מילוי טופס פנימי</option>
                  <option value="specific_time">טריגר: בשעה קבועה ביום</option>
                  <option value="specific_date">טריגר: בתאריך ושעה ספציפיים</option>
                </select>
              </div>
            </div>

            {/* Trigger Configs */}
            {trigger.type === "webhook" && (
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <code className="text-sm text-indigo-700 flex-1 truncate" dir="ltr">
                  {origin}/api/webhooks/{trigger.webhookId}
                </code>
                <button 
                  onClick={() => navigator.clipboard.writeText(`${origin}/api/webhooks/${trigger.webhookId}`)}
                  className="text-xs font-semibold bg-white border px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
                >
                  העתק
                </button>
              </div>
            )}

            {trigger.type === "form_submission" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">מזהה הטופס (Form ID):</label>
                <input 
                  type="text"
                  value={trigger.formId}
                  onChange={e => setTrigger({ ...trigger, formId: e.target.value })}
                  placeholder="לדוגמה: contact_form_1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}

            {trigger.type === "specific_time" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">שעת הרצה ביום (HH:MM):</label>
                <input 
                  type="time"
                  value={trigger.cronExpression}
                  onChange={e => setTrigger({ ...trigger, cronExpression: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}

            {trigger.type === "specific_date" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">תאריך ושעת הרצה מדויקים:</label>
                <input 
                  type="datetime-local"
                  value={trigger.dateIso}
                  onChange={e => setTrigger({ ...trigger, dateIso: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}

            <div className="mt-4 text-xs text-slate-500">
              * בשלבים הבאים, תוכל להשתמש במשתנים כגון <code className="bg-slate-200 px-1 rounded text-slate-700">{'{{field_name}}'}</code>.
            </div>
            
            <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-slate-300"></div>
          </div>

          {/* Action Nodes */}
          {steps.map((step, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative mt-6">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    {step.type.includes('crm') && <Users className="w-6 h-6 text-blue-500" />}
                    {step.type === 'whatsapp_send' && <MessageSquare className="w-6 h-6 text-emerald-500" />}
                    {step.type === 'email_send' && <Mail className="w-6 h-6 text-rose-500" />}
                    {step.type === 'create_invoice' && <FileText className="w-6 h-6 text-amber-500" />}
                    {step.type === 'generate_ai_post' && <Sparkles className="w-6 h-6 text-purple-500" />}
                    {step.type === 'crm_update_with_receipt' && <FileText className="w-6 h-6 text-indigo-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {step.type === 'crm_create_contact' && 'צור/עדכן איש קשר ב-CRM'}
                      {step.type === 'crm_add_reminder' && 'הוסף תזכורת ב-CRM'}
                      {step.type === 'whatsapp_send' && 'שלח הודעת וואטסאפ'}
                      {step.type === 'email_send' && 'שלח אימייל'}
                      {step.type === 'create_invoice' && 'הפקת קבלה (Kesher)'}
                      {step.type === 'generate_ai_post' && 'יצירת פוסט ב-AI'}
                      {step.type === 'crm_update_with_receipt' && 'עדכן איש קשר עם נתוני קבלה'}
                    </h3>
                  </div>
                </div>
                <button onClick={() => removeStep(index)} className="text-slate-400 hover:text-rose-500 transition-colors p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Step Configuration Forms */}
              <div className="space-y-4">
                {step.type === 'crm_create_contact' && (
                  <>
                    <InputGroup label="שם מלא (חובה)" value={(step.config as any).nameField} onChange={v => updateStepConfig(index, 'nameField', v)} />
                    <InputGroup label="טלפון (חובה)" value={(step.config as any).phoneField} onChange={v => updateStepConfig(index, 'phoneField', v)} />
                    <InputGroup label="אימייל" value={(step.config as any).emailField} onChange={v => updateStepConfig(index, 'emailField', v)} />
                  </>
                )}

                {step.type === 'crm_add_reminder' && (
                  <>
                    <InputGroup label="מזהה איש קשר (Contact ID)" value={(step.config as any).contactIdField} onChange={v => updateStepConfig(index, 'contactIdField', v)} />
                    <InputGroup label="כותרת" value={(step.config as any).title} onChange={v => updateStepConfig(index, 'title', v)} />
                    <InputGroup label="תוכן התזכורת" value={(step.config as any).text} onChange={v => updateStepConfig(index, 'text', v)} />
                  </>
                )}

                {step.type === 'crm_update_with_receipt' && (
                  <>
                    <InputGroup label="טלפון לזיהוי לקוח (חובה)" value={(step.config as any).phoneField} onChange={v => updateStepConfig(index, 'phoneField', v)} />
                    <InputGroup label="סכום לתשלום" value={(step.config as any).amountField} onChange={v => updateStepConfig(index, 'amountField', v)} />
                    <InputGroup label="מספר מסמך" value={(step.config as any).documentNumberField} onChange={v => updateStepConfig(index, 'documentNumberField', v)} />
                    <InputGroup label="קישור למסמך (URL)" value={(step.config as any).documentUrlField} onChange={v => updateStepConfig(index, 'documentUrlField', v)} />
                  </>
                )}

                {step.type === 'whatsapp_send' && (
                  <>
                    <InputGroup label="מספר טלפון יעד" value={(step.config as any).phoneField} onChange={v => updateStepConfig(index, 'phoneField', v)} />
                    <TextareaGroup label="תוכן ההודעה" value={(step.config as any).messageTemplate} onChange={v => updateStepConfig(index, 'messageTemplate', v)} />
                  </>
                )}

                {step.type === 'email_send' && (
                  <>
                    <InputGroup label="כתובת אימייל יעד" value={(step.config as any).emailField} onChange={v => updateStepConfig(index, 'emailField', v)} />
                    <InputGroup label="נושא (Subject)" value={(step.config as any).subject} onChange={v => updateStepConfig(index, 'subject', v)} />
                    <TextareaGroup label="תוכן ההודעה (גוף המייל)" value={(step.config as any).bodyTemplate} onChange={v => updateStepConfig(index, 'bodyTemplate', v)} />
                  </>
                )}

                {step.type === 'create_invoice' && (
                  <>
                    <InputGroup label="שם הלקוח בקבלה" value={(step.config as any).nameField} onChange={v => updateStepConfig(index, 'nameField', v)} />
                    <InputGroup label="סכום (₪)" value={(step.config as any).amountField} onChange={v => updateStepConfig(index, 'amountField', v)} />
                    <InputGroup label="תיאור/עבור מה התשלום" value={(step.config as any).description} onChange={v => updateStepConfig(index, 'description', v)} />
                  </>
                )}

                {step.type === 'generate_ai_post' && (
                  <>
                    <InputGroup label="סגנון/טון" value={(step.config as any).tone} onChange={v => updateStepConfig(index, 'tone', v)} />
                    <TextareaGroup label="הנחיה ל-AI (Prompt)" value={(step.config as any).promptTemplate} onChange={v => updateStepConfig(index, 'promptTemplate', v)} />
                  </>
                )}
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-slate-300"></div>
              )}
            </div>
          ))}

          {/* Add Step Dropdown */}
          <div className="flex justify-center pt-6">
            <select 
              className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              onChange={(e) => {
                if (e.target.value) {
                  addStep(e.target.value as ActionStep["type"]);
                  e.target.value = "";
                }
              }}
              value=""
            >
              <option value="" disabled>+ הוסף פעולה (Action)</option>
              <option value="crm_create_contact">CRM: עדכון/יצירת איש קשר</option>
              <option value="crm_add_reminder">CRM: הוספת תזכורת לפולואפ</option>
              <option value="crm_update_with_receipt">EZcount/CRM: עדכון איש קשר עם פרטי קבלה</option>
              <option value="whatsapp_send">וואטסאפ: שליחת הודעה</option>
              <option value="email_send">מייל: שליחת אימייל</option>
              <option value="create_invoice">קשר/סליקה: הפקת קבלה</option>
              <option value="generate_ai_post">AI: יצירת פוסט/מאמר אטומטי</option>
            </select>
          </div>

        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input 
        type="text" 
        value={value || ""} 
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
}

function TextareaGroup({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea 
        value={value || ""} 
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
      />
    </div>
  );
}
