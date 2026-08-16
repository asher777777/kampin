"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowRight, Users, Loader2, Filter, Paperclip, Tag, Save, FolderOpen, X } from "lucide-react";
import Link from "next/link";
import { HebrewEmailEditor } from "@/features/emails/components/HebrewEmailEditor";
import { sendCampaign, getContactsForEmailing, getEmailTemplates, saveEmailTemplate, EmailTemplate } from "@/features/emails/actions";
import { uploadMediaFile } from "@/features/media/actions";
import { Contact } from "@/features/crm/types";

export function CreateCampaignForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("<p>הקלד כאן את תוכן המייל...</p>");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  
  const [filterKey, setFilterKey] = useState<string>("all");
  const [filterValue, setFilterValue] = useState<string>("");

  const [fromEmail, setFromEmail] = useState("info@hakel.club");
  const [attachments, setAttachments] = useState<{filename: string, path: string}[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [data, tmpls] = await Promise.all([
          getContactsForEmailing(),
          getEmailTemplates()
        ]);
        setContacts(data);
        setTemplates(tmpls);
      } catch (err) {
        console.error(err);
        setError("שגיאה בטעינת נתונים");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const availableKeys = useMemo(() => {
    const keys = new Set<string>();
    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => {
        if (key !== "id" && key !== "ownerId" && key !== "createdAt" && key !== "updatedAt" && typeof contact[key as keyof Contact] === "string") {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).sort();
  }, [contacts]);

  const keyTranslations: Record<string, string> = {
    conta_name: "שם איש קשר",
    email: "כתובת אימייל",
    conta_phone: "מספר טלפון",
    mh_crm_city: "עיר",
    gender: "מגזר / מין",
    company_name: "שם חברה",
    lead_source: "מקור הגעה",
    status: "סטטוס"
  };

  const filteredContacts = useMemo(() => {
    if (filterKey === "all" || !filterValue.trim()) {
      return contacts;
    }
    return contacts.filter(contact => {
      const val = contact[filterKey as keyof Contact];
      if (!val) return false;
      return String(val).toLowerCase().includes(filterValue.toLowerCase());
    });
  }, [contacts, filterKey, filterValue]);

  const handleSend = async () => {
    if (!subject.trim()) {
      setError("נא להזין נושא לקמפיין");
      return;
    }
    if (filteredContacts.length === 0) {
      setError("אין נמענים לשליחה (בדוק את הסינון)");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await sendCampaign(subject, content, filteredContacts, fromEmail, attachments);
      if (res.success) {
        router.push("/dashboard/emails");
      } else {
        setError(res.error || "שגיאה בשליחת הקמפיין");
      }
    } catch (err: any) {
      setError(err.message || "שגיאה בשליחת הקמפיין");
    } finally {
      setIsSending(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setContent(prev => prev + ` {{${tag}}} `);
  };

  const handleSaveTemplate = async () => {
    if (!subject.trim() || !content.trim()) {
      setError("נא להזין נושא ותוכן לפני שמירת התבנית");
      return;
    }
    setIsSavingTemplate(true);
    setError("");
    try {
      const name = prompt("הכנס שם לתבנית:", subject) || subject;
      const res = await saveEmailTemplate(name, subject, content);
      if (res.success) {
        setSuccessMsg("תבנית נשמרה בהצלחה!");
        const tmpls = await getEmailTemplates();
        setTemplates(tmpls);
      } else {
        setError("שגיאה בשמירת התבנית");
      }
    } catch (e) {
      setError("שגיאה בשמירה");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmplId = e.target.value;
    if (!tmplId) return;
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setContent(tmpl.content);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaFile(formData);
      if (res.success && res.url) {
        setAttachments(prev => [...prev, { filename: file.name, path: res.url as string }]);
      } else {
        setError(res.error || "שגיאה בהעלאת קובץ");
      }
    } catch (err) {
      setError("שגיאה בהעלאה");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/emails"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">יצירת קמפיין חדש</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
          >
            {isSavingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור כתבנית
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSending ? "שולח..." : "שלח קמפיין"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Settings & Templates row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-sm font-semibold text-slate-700">מאת (כתובת שולח)</label>
              <input
                type="text"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="info@yourdomain.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                dir="ltr"
              />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1"><FolderOpen className="w-4 h-4" /> טען תבנית</label>
              <select
                onChange={handleTemplateChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">בחר תבנית קיימת...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <label className="block text-sm font-semibold text-slate-700">נושא המייל</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="לדוגמה: עדכונים חשובים לחודש הקרוב..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              dir="rtl"
            />
          </div>

          {/* Editor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">תוכן המייל</label>
              {/* Dynamic Tags */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleTagClick('conta_name')} className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><Tag className="w-3 h-3"/> שם פרטי</button>
                <button onClick={() => handleTagClick('email')} className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><Tag className="w-3 h-3"/> כתובת מייל</button>
                <button onClick={() => handleTagClick('company_name')} className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"><Tag className="w-3 h-3"/> שם חברה</button>
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <HebrewEmailEditor value={content} onChange={setContent} />
            </div>

            {/* Attachments */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  צרף קובץ למייל
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm text-slate-600">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[150px]" dir="ltr">{att.filename}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Recipients */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold border-b pb-4">
              <Users className="w-5 h-5 text-indigo-500" />
              <h3>בחירת נמענים</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                    <Filter className="w-4 h-4" /> סינון נמענים
                  </label>
                  <select
                    value={filterKey}
                    onChange={(e) => setFilterKey(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">כל אנשי הקשר (בעלי אימייל)</option>
                    {availableKeys.map(key => (
                      <option key={key} value={key}>
                        {keyTranslations[key] || key}
                      </option>
                    ))}
                  </select>

                  {filterKey !== "all" && (
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="הזן ערך לסינון..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div className="p-4 bg-indigo-50 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-900">סה"כ נמענים:</span>
                  <span className="text-xl font-bold text-indigo-700">{filteredContacts.length}</span>
                </div>
                
                <p className="text-xs text-slate-500 text-center">
                  מיילים יישלחו רק לאנשי קשר שהוזנה להם כתובת אימייל תקינה במערכת. הוספת תגיות דינמיות כמו `{"{{conta_name}}"}` תוחלף בערך המתאים.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
