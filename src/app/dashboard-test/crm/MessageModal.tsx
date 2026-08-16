"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Contact } from "@/features/crm/types";
import { sendWhatsAppAction, sendEmailAction, addContactReminder } from "@/features/crm/actions";
import { MessageCircle, Mail, Clock, Send, AlertCircle } from "lucide-react";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  type: "whatsapp" | "email" | "reminder" | null;
  onSuccess: () => void;
}

export function MessageModal({ isOpen, onClose, contacts, type, onSuccess }: MessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState(""); // For reminder
  const [reminderTime, setReminderTime] = useState(""); // For reminder

  // Reset fields on open
  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccessMsg("");
      setSubject("");
      setBody("");
      setTitle("תזכורת");
      // Set to local time in YYYY-MM-DDTHH:mm format
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReminderTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen, type]);

  if (!type || contacts.length === 0) return null;

  const isBulk = contacts.length > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "email" && !subject) {
      setError("נושא המייל הוא שדה חובה");
      return;
    }
    if (!body && type !== "reminder") {
      setError("תוכן ההודעה הוא שדה חובה");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const contact of contacts) {
        if (!contact.id) continue;

        try {
          if (type === "whatsapp") {
            const phone = contact.conta_phone;
            if (!phone) {
              failCount++;
              errors.push(`לאיש הקשר ${contact.conta_name} אין מספר טלפון`);
              continue;
            }
            const res = await sendWhatsAppAction(contact.id, phone, body);
            if (res.success) {
              successCount++;
            } else {
              failCount++;
              errors.push(`שגיאה בשליחה ל-${contact.conta_name}: ${res.error}`);
            }
          } else if (type === "email") {
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
      <Modal.Content className="max-w-xl rounded-[2rem] p-6 md:p-8">
        <div dir="rtl" className="w-full space-y-5 text-right">
          <Modal.Close className="left-4 right-auto" />
          
          <div className="flex items-center gap-3 border-b pb-4">
            {type === "whatsapp" && <MessageCircle className="w-6 h-6 text-emerald-600" />}
            {type === "email" && <Mail className="w-6 h-6 text-indigo-600" />}
            {type === "reminder" && <Clock className="w-6 h-6 text-amber-500" />}
            <h3 className="text-lg md:text-xl font-black text-slate-800">
              {getTitleText()}
            </h3>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-start gap-2 whitespace-pre-line">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">
                {type === "reminder" ? "פרטי התזכורת / הערות" : "תוכן ההודעה *"}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={
                  type === "whatsapp" 
                    ? "הקלד את הודעת הוואטסאפ לכאן..." 
                    : type === "email" 
                    ? "הקלד את גוף המייל לכאן..." 
                    : "הקלד פרטים נוספים על התזכורת..."
                }
                required={type !== "reminder"}
                className="flex w-full rounded-2xl border border-slate-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
              />
            </div>

            <Modal.Footer>
              <div className="flex gap-2 justify-end w-full">
                <Button
                  onClick={onClose}
                  type="button"
                  variant="outline"
                  className="rounded-xl font-bold h-10 px-5"
                  disabled={loading}
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 flex items-center gap-1.5"
                  disabled={loading}
                >
                  <Send className="w-4 h-4" />
                  {loading ? "שולח..." : "שלח / שמור"}
                </Button>
              </div>
            </Modal.Footer>
          </form>
        </div>
      </Modal.Content>
    </Modal>
  );
}
