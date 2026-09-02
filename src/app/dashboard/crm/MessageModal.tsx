"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Contact } from "@/features/crm/types";
import { sendWhatsAppAction, sendEmailAction, addContactReminder } from "@/features/crm/actions";
import { sendWhatsAppMessage, sendWhatsAppFile, sendWhatsAppFileByUrl, saveWhatsAppCampaign } from "@/features/whatsapp/actions";
import { WhatsAppRecipient } from "@/features/whatsapp/types";
import { MessageCircle, Mail, Clock, Send, AlertCircle, Paperclip, X, StopCircle, CheckCircle, Sparkles, Link as LinkIcon, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FIELD_LABELS: Record<string, string> = {
  conta_name: "שם פרטי",
  f_m: "שם משפחה",
  conta_phone: "טלפון",
  gender: "מגדר",
  tg1: "תג 1",
  tg2: "תג 2",
  tg3: "תג 3",
  lead_source: "מקור הליד",
  last_form_name: "הטופס האחרון",
  notes: "הערות",
  company_name: "שם החברה",
};

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  type: "whatsapp" | "email" | "reminder" | null;
  onSuccess: () => void;
  communityId?: string;
  communityName?: string;
}

export function MessageModal({ 
  isOpen, 
  onClose, 
  contacts, 
  type, 
  onSuccess,
  communityId,
  communityName 
}: MessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaLink, setMediaLink] = useState("");
  const [title, setTitle] = useState(""); // For reminder
  const [reminderTime, setReminderTime] = useState(""); // For reminder
  const [previewContactId, setPreviewContactId] = useState("");
  const [resolvedPreview, setResolvedPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sending progress state for bulk WhatsApp
  const [isSending, setIsSending] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState("");
  const cancelSendingRef = useRef(false);

  // Reset fields on open
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      setSubject("");
      setBody("");
      setFile(null);
      setTitle("תזכורת");
      setIsSending(false);
      setProgressPercent(0);
      setProgressText("");
      cancelSendingRef.current = false;
      if (contacts.length > 0) {
        setPreviewContactId(contacts[0].id || "");
      }
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReminderTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen, type, contacts]);

  // Real-time Preview Resolver for WhatsApp
  useEffect(() => {
    if (!body || type !== "whatsapp") {
      setResolvedPreview("");
      return;
    }

    const currentContact = contacts.find((c) => c.id === previewContactId) || contacts[0];
    if (!currentContact) {
      setResolvedPreview(body);
      return;
    }

    let parsed = body;
    Object.keys(FIELD_LABELS).forEach((key) => {
      const label = FIELD_LABELS[key];
      const val = (currentContact as any)[key] ? String((currentContact as any)[key]) : "";
      const variations = [`{${label}}`, `{${key}}`, `{{${label}}}`, `{{${key}}}`];
      variations.forEach((tag) => {
        parsed = parsed.replaceAll(tag, val);
      });
    });

    setResolvedPreview(parsed);
  }, [body, previewContactId, contacts, type]);

  if (!type || contacts.length === 0) return null;

  const isBulk = contacts.length > 1;

  const handleInsertTag = (tag: string) => {
    setBody((b) => b + ` {${tag}}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        alert("גודל הקובץ עולה על 50MB. אנא בחר קובץ קטן יותר.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleCancelSending = () => {
    cancelSendingRef.current = true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "email" && !subject) {
      setError("נושא המייל הוא שדה חובה");
      return;
    }
    if (!body && !file && type !== "reminder") {
      setError("יש לכתוב הודעה או לצרף קובץ לשליחה");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    // Special enhanced flow for WhatsApp
    if (type === "whatsapp") {
      setIsSending(true);
      cancelSendingRef.current = false;
      setProgressPercent(0);
      setProgressText("מתחיל שליחה...");

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      const recipientsLog: WhatsAppRecipient[] = [];

      // Filter duplicate phone numbers
      const uniqueRecipientsMap = new Map<string, Contact>();
      contacts.forEach((r) => {
        const cleanPhone = (r.conta_phone || (r as any).phone || "").replace(/\D/g, "");
        if (cleanPhone && !uniqueRecipientsMap.has(cleanPhone)) {
          uniqueRecipientsMap.set(cleanPhone, r);
        }
      });

      const uniqueRecipients = Array.from(uniqueRecipientsMap.entries());

      for (let i = 0; i < uniqueRecipients.length; i++) {
        if (cancelSendingRef.current) {
          setProgressText("השליחה נעצרה על ידי המשתמש.");
          break;
        }

        const [phone, contact] = uniqueRecipients[i];
        const countIndex = i + 1;
        const pct = Math.round((countIndex / uniqueRecipients.length) * 100);
        const contactDisplayName = contact.conta_name || (contact as any).name || contact.f_m || "איש קשר";

        setProgressPercent(pct);
        setProgressText(`שולח אל: ${contactDisplayName} (${countIndex}/${uniqueRecipients.length})`);

        // Resolve tags for this recipient
        let personalizedMsg = body;
        Object.keys(FIELD_LABELS).forEach((key) => {
          const label = FIELD_LABELS[key];
          const val = (contact as any)[key] ? String((contact as any)[key]) : "";
          const variations = [`{${label}}`, `{${key}}`, `{{${label}}}`, `{{${key}}}`];
          variations.forEach((tag) => {
            personalizedMsg = personalizedMsg.replaceAll(tag, val);
          });
        });

        try {
          let res: any;
          if (file) {
            const formData = new FormData();
            formData.append("phone", phone);
            formData.append("file", file);
            formData.append("caption", personalizedMsg);
            res = await sendWhatsAppFile(formData);
          } else if (mediaLink.trim()) {
            res = await sendWhatsAppFileByUrl(phone, mediaLink.trim(), "attachment", personalizedMsg);
          } else {
            res = await sendWhatsAppMessage(phone, personalizedMsg);
          }

          const isSuccess = res && !res.error;
          if (isSuccess) {
            successCount++;
            recipientsLog.push({
              contactId: contact.id,
              name: `${contact.conta_name || ""} ${contact.f_m || ""}`.trim() || contactDisplayName,
              phone,
              status: "השליחה הצליחה",
              messageId: res?.idMessage || "",
              apiResponse: JSON.stringify(res),
              personalizedContent: personalizedMsg,
            });
          } else {
            failCount++;
            errors.push(`שגיאה בשליחה ל-${contactDisplayName}: ${res?.error || "שגיאה בשרת"}`);
            recipientsLog.push({
              contactId: contact.id,
              name: `${contact.conta_name || ""} ${contact.f_m || ""}`.trim() || contactDisplayName,
              phone,
              status: "נכשל",
              apiResponse: res?.error || "שגיאה בשרת",
              personalizedContent: personalizedMsg,
            });
          }
        } catch (itemErr: any) {
          failCount++;
          errors.push(`כשל ב-${contactDisplayName}: ${itemErr.message || String(itemErr)}`);
          recipientsLog.push({
            contactId: contact.id,
            name: `${contact.conta_name || ""} ${contact.f_m || ""}`.trim() || contactDisplayName,
            phone,
            status: "נכשל",
            apiResponse: itemErr.message || String(itemErr),
            personalizedContent: personalizedMsg,
          });
        }

        await new Promise((r) => setTimeout(r, 600));
      }

      const effectiveMediaUrl = file ? file.name : (mediaLink.trim() || undefined);

      // Log Campaign & Contact Events
      try {
        await saveWhatsAppCampaign({
          name: communityName ? `שליחה לקהילת ${communityName}` : undefined,
          messageContent: body,
          mediaUrl: effectiveMediaUrl,
          communityId,
          communityName,
          totalRecipients: uniqueRecipients.length,
          successCount,
          failureCount: failCount,
          recipients: recipientsLog,
        });
      } catch (saveErr) {
        console.warn("Could not log whatsapp campaign:", saveErr);
      }

      setIsSending(false);
      setLoading(false);

      if (failCount === 0) {
        setSuccessMsg(`ההודעות נשלחו בהצלחה ל-${successCount} נמענים!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(`הושלמו בהצלחה: ${successCount}. נכשלו: ${failCount}.\n` + errors.join("\n"));
      }
      return;
    }

    // Standard flow for Email & Reminders
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const contact of contacts) {
        if (!contact.id) continue;

        try {
          if (type === "email") {
            const email = contact.email;
            if (!email) {
              failCount++;
              errors.push(`לאיש הקשר ${contact.conta_name} אין כתובת דוא"ל`);
              continue;
            }
            const res = await sendEmailAction(contact.id, email, subject, body);
            if (res.success) {
              successCount++;
            } else {
              failCount++;
              errors.push(`שגיאה בשליחה ל-${contact.conta_name}: ${res.error}`);
            }
          } else if (type === "reminder") {
            const res = await addContactReminder(contact.id, title, body, reminderTime);
            if (res.success) {
              successCount++;
            } else {
              failCount++;
              errors.push(`שגיאה בשמירה ל-${contact.conta_name}: ${res.error}`);
            }
          }
        } catch (err: any) {
          failCount++;
          errors.push(`כשל ב-${contact.conta_name}: ${err.message || String(err)}`);
        }
      }

      if (failCount === 0) {
        setSuccessMsg(isBulk ? `הפעולה הושלמה בהצלחה עבור ${successCount} אנשי קשר!` : "הפעולה הושלמה בהצלחה!");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(`הושלמו בהצלחה: ${successCount}. נכשלו: ${failCount}.\n` + errors.join("\n"));
      }
    } catch (err: any) {
      setError("שגיאה כללית בביצוע הפעולה: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const getTitleText = () => {
    const targetName = isBulk ? `${contacts.length} אנשי קשר` : contacts[0].conta_name + " " + (contacts[0].f_m || "");
    if (type === "whatsapp") return `שליחת הודעת וואטסאפ ל-${targetName}`;
    if (type === "email") return `שליחת מייל ל-${targetName}`;
    return `הוספת תזכורת/פעילות ל-${targetName}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className={type === "whatsapp" ? "max-w-4xl rounded-[2rem] p-0 flex flex-col max-h-[90vh] overflow-hidden bg-white shadow-2xl" : "max-w-xl rounded-[2rem] p-0 flex flex-col max-h-[90vh] overflow-hidden bg-white shadow-2xl"}>
        <div dir="rtl" className="w-full flex flex-col flex-1 overflow-hidden text-right">
          
          {/* 1. Modal Header (Sticky Top) */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === "whatsapp" && (
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
              )}
              {type === "email" && (
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
              )}
              {type === "reminder" && (
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {getTitleText()}
                </h3>
                {type === "whatsapp" && (
                  <p className="text-xs text-slate-500 font-medium">
                    שלב 3: כתיבה ושליחה קבוצתית עם התאמה אישית דינמית
                  </p>
                )}
              </div>
            </div>

            <Modal.Close className="relative top-auto right-auto p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" />
          </div>

          {/* 2. Modal Body & Form */}
          {isSending ? (
            // Active Sending Progress Bar View
            <div className="p-8 sm:p-12 flex-1 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-slate-100">
                  <span className="text-sm font-black text-slate-800 font-mono">{progressPercent}%</span>
                  <svg className="absolute -rotate-90 w-24 h-24">
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="44" 
                      stroke="rgb(16, 185, 129)" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={276}
                      strokeDashoffset={276 - (276 * progressPercent) / 100}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
                <h4 className="font-extrabold text-slate-800 text-lg">שולח הודעות וואטסאפ...</h4>
                <p className="text-xs text-slate-500 px-6 font-bold">{progressText}</p>
              </div>

              <Button 
                variant="destructive" 
                onClick={handleCancelSending}
                className="rounded-xl font-bold flex items-center gap-1.5 justify-center mx-auto cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>עצור שליחה</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-start gap-2 whitespace-pre-line">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {type === "email" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">נושא המייל *</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="הקלד נושא למייל..."
                      required
                      className="rounded-xl"
                      disabled={loading}
                    />
                  </div>
                )}

                {type === "reminder" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">סוג הפעילות / כותרת *</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="לדוגמה: שיחת טלפון, פגישה..."
                        required
                        className="rounded-xl"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">תאריך ושעה *</label>
                      <Input
                        type="datetime-local"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        required
                        className="rounded-xl"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {type === "whatsapp" ? (
                  // Step 3 WhatsApp Composer Layout with Tags and Live Preview
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column: Composer */}
                    <div className="lg:col-span-7 space-y-3.5">
                      {/* Dynamic Tags Helper Buttons */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                          הוסף שדה דינמי להודעה:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(FIELD_LABELS).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleInsertTag(label)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              +{label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message Body */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                          תוכן ההודעה
                        </label>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          rows={5}
                          placeholder="שלום {שם פרטי}, אנו שמחים לפנות אליך..."
                          className="flex w-full rounded-2xl border border-slate-200 bg-background p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                          disabled={loading}
                        />
                      </div>

                      {/* File Attachment & Media Link */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                          צרף קובץ או קישור לקובץ/מדיה (אופציונלי)
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-xl border-slate-200 text-slate-700 flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold cursor-pointer shrink-0"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            <span>בחר קובץ מהמחשב</span>
                          </Button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                          {file && (
                            <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                              <span className="font-semibold text-slate-700 truncate max-w-[160px]">{file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => setFile(null)} 
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Optional Direct Media Link */}
                        <div className="pt-0.5">
                          <Input
                            type="url"
                            value={mediaLink}
                            onChange={(e) => setMediaLink(e.target.value)}
                            placeholder="או הדבק קישור ישיר לקובץ / תמונה / מסמך (https://...)"
                            className="h-8.5 rounded-xl text-xs bg-white border-slate-200 placeholder:text-slate-400"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Mock Preview */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                            תצוגה מקדימה עבור:
                          </label>
                          {contacts.length > 1 && (
                            <select
                              value={previewContactId}
                              onChange={(e) => setPreviewContactId(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white text-slate-700 text-xs px-2 py-1 max-w-[150px] outline-none"
                            >
                              {contacts.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.conta_name || (c as any).name || "איש קשר"} {c.f_m || ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* WhatsApp Mock Bubble */}
                        <div className="bg-[#E5DDD5] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] border border-slate-200 p-3.5 rounded-2xl min-h-[170px] flex flex-col justify-end space-y-2 select-none shadow-sm">
                          <div className="bg-[#DCF8C6] border border-black/5 rounded-xl p-3 text-slate-800 text-xs shadow-sm max-w-[90%] self-start text-right whitespace-pre-wrap leading-relaxed">
                            {file && (
                              <div className="bg-slate-200/60 p-1.5 rounded-lg mb-1.5 flex items-center gap-1.5 border border-black/5">
                                <Paperclip className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="font-bold text-[10px] truncate max-w-[130px]">{file.name}</span>
                              </div>
                            )}
                            <p>{resolvedPreview || "ההודעה שלכם תוצג כאן..."}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      {type === "reminder" ? "פרטי התזכורת / הערות" : "תוכן ההודעה *"}
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      placeholder={
                        type === "email" 
                          ? "הקלד את גוף המייל לכאן..." 
                          : "הקלד פרטים נוספים על התזכורת..."
                      }
                      required={type !== "reminder"}
                      className="flex w-full rounded-2xl border border-slate-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              {/* 3. Modal Footer (Sticky Bottom with Send Button) */}
              <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
                <Button
                  onClick={onClose}
                  type="button"
                  variant="outline"
                  className="rounded-xl font-bold h-9.5 px-4 text-xs border-slate-200 text-slate-600 cursor-pointer"
                  disabled={loading}
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  className={
                    type === "whatsapp"
                      ? "rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white h-9.5 px-6 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 text-xs"
                      : "rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-9.5 px-5 flex items-center gap-1.5 text-xs"
                  }
                  disabled={loading}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? "שולח..." : type === "whatsapp" ? `שלח וואטסאפ ל-${contacts.length} נמענים` : "שלח / שמור"}</span>
                </Button>
              </div>
            </form>
          )}

        </div>
      </Modal.Content>
    </Modal>
  );
}

