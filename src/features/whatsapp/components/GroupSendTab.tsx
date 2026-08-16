"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getContacts, getCRMFilters } from "@/features/crm/actions";
import { sendWhatsAppMessage, sendWhatsAppFile, saveWhatsAppCampaign } from "../actions";
import { WhatsAppRecipient } from "../types";
import { Contact } from "@/features/crm/types";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Paperclip, X, StopCircle, RefreshCw, ChevronLeft, ChevronRight, Check } from "lucide-react";

const HEBREW_ALPHABET = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"];

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

export function GroupSendTab() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Data Cache
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [filtersConfig, setFiltersConfig] = useState<{ tags: string[]; lead_sources: string[] }>({ tags: [], lead_sources: [] });

  // Filters State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [alphabetStart, setAlphabetStart] = useState("");
  const [alphabetEnd, setAlphabetEnd] = useState("");

  // Step 2 & 3 State
  const [matchingContacts, setMatchingContacts] = useState<Contact[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Composer State
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewContactId, setPreviewContactId] = useState("");
  const [resolvedPreview, setResolvedPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sending Campaign State
  const [isSending, setIsSending] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState("");
  const cancelSendingRef = useRef(false);

  // Load Contacts and Filters Config
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [contactsRes, filtersRes] = await Promise.all([
          getContacts({ status: "active", per_page: 999999 }),
          getCRMFilters(),
        ]);
        setAllContacts(contactsRes.contacts);
        setFiltersConfig({
          tags: filtersRes.tags || [],
          lead_sources: filtersRes.lead_sources || [],
        });
      } catch (err) {
        console.error("Failed to load campaign data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute filtered contacts live
  useEffect(() => {
    let list = [...allContacts];

    // Filter by Alphabet range
    if (alphabetStart || alphabetEnd) {
      list = list.filter((c) => {
        const firstLetter = (c.conta_name || "").trim().charAt(0);
        if (!firstLetter) return false;
        
        if (alphabetStart && alphabetEnd) {
          if (alphabetStart > alphabetEnd) {
            return firstLetter >= alphabetStart || firstLetter <= alphabetEnd;
          }
          return firstLetter >= alphabetStart && firstLetter <= alphabetEnd;
        } else if (alphabetStart) {
          return firstLetter >= alphabetStart;
        } else {
          return firstLetter <= alphabetEnd;
        }
      });
    }

    // Filter by Tags
    if (selectedTags.length > 0) {
      list = list.filter((c) => 
        (c.tg1 && selectedTags.includes(c.tg1)) || 
        (c.tg2 && selectedTags.includes(c.tg2)) || 
        (c.tg3 && selectedTags.includes(c.tg3))
      );
    }

    // Filter by Gender
    if (selectedGenders.length > 0) {
      list = list.filter((c) => c.gender && selectedGenders.includes(c.gender));
    }

    // Filter by Lead Source
    if (selectedSources.length > 0) {
      list = list.filter((c) => c.lead_source && selectedSources.includes(c.lead_source));
    }

    setMatchingContacts(list);
    // By default, match step 2 selections to the filtered list
    setSelectedRecipients(list);
  }, [allContacts, alphabetStart, alphabetEnd, selectedTags, selectedGenders, selectedSources]);

  // Update Dynamic Preview
  useEffect(() => {
    if (!message) {
      setResolvedPreview("");
      return;
    }

    const contact = selectedRecipients.find((c) => c.id === previewContactId) || selectedRecipients[0];
    if (!contact) {
      setResolvedPreview(message);
      return;
    }

    let preview = message;
    Object.keys(FIELD_LABELS).forEach((key) => {
      const label = FIELD_LABELS[key];
      const val = (contact as any)[key] ? String((contact as any)[key]) : "";
      
      const variations = [`{${label}}`, `{${key}}`, `{{${label}}}`, `{{${key}}}`];
      variations.forEach((tag) => {
        preview = preview.replaceAll(tag, val);
      });
    });

    setResolvedPreview(preview);
  }, [message, previewContactId, selectedRecipients]);

  // Set default preview contact
  useEffect(() => {
    if (selectedRecipients.length > 0 && !previewContactId) {
      setPreviewContactId(selectedRecipients[0].id || "");
    }
  }, [selectedRecipients, previewContactId]);

  // Tag list toggling helpers
  const toggleFilter = (val: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(val)) {
      setter(list.filter((x) => x !== val));
    } else {
      setter([...list, val]);
    }
  };

  const resetFilters = () => {
    setSelectedTags([]);
    setSelectedGenders([]);
    setSelectedSources([]);
    setAlphabetStart("");
    setAlphabetEnd("");
  };

  // Step Nav validation
  const handleNextStep = () => {
    if (step === 1) {
      if (matchingContacts.length === 0) {
        alert("לא נמצאו אנשי קשר תואמים לסינון הנוכחי.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedRecipients.length === 0) {
        alert("יש לבחור לפחות נמען אחד כדי להמשיך.");
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  // Recipient checkboxes
  const handleToggleRecipient = (contact: Contact) => {
    if (selectedRecipients.some((r) => r.id === contact.id)) {
      setSelectedRecipients(selectedRecipients.filter((r) => r.id !== contact.id));
    } else {
      setSelectedRecipients([...selectedRecipients, contact]);
    }
  };

  const handleSelectAll = () => {
    setSelectedRecipients(matchingContacts);
  };

  const handleDeselectAll = () => {
    setSelectedRecipients([]);
  };

  // Insert tag helper in textarea
  const handleInsertTag = (tag: string) => {
    setMessage((m) => m + ` {${tag}}`);
  };

  // File Upload Helper
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

  // Trigger Send Campaign
  const handleSendCampaign = async () => {
    if (!message && !file) {
      alert("יש לכתוב הודעה או לצרף קובץ לשליחה.");
      return;
    }

    if (selectedRecipients.length === 0) {
      alert("לא נבחרו נמענים לשליחה.");
      return;
    }

    if (!window.confirm(`האם אתה בטוח שברצונך לשלוח את ההודעה ל-${selectedRecipients.length} נמענים?`)) {
      return;
    }

    setIsSending(true);
    cancelSendingRef.current = false;
    setProgressPercent(0);
    setProgressText("מתחיל שליחה...");

    let successCount = 0;
    let failureCount = 0;
    const recipientsLog: WhatsAppRecipient[] = [];

    // Filter duplicate phone numbers
    const uniqueRecipientsMap = new Map<string, Contact>();
    selectedRecipients.forEach((r) => {
      const cleanPhone = r.conta_phone.replace(/\D/g, "");
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

      setProgressPercent(pct);
      setProgressText(`שולח אל: ${contact.conta_name} (${countIndex}/${uniqueRecipients.length})`);

      // 1. Resolve Dynamic Tags
      let personalizedMsg = message;
      Object.keys(FIELD_LABELS).forEach((key) => {
        const label = FIELD_LABELS[key];
        const val = (contact as any)[key] ? String((contact as any)[key]) : "";
        const variations = [`{${label}}`, `{${key}}`, `{{${label}}}`, `{{${key}}}`];
        variations.forEach((tag) => {
          personalizedMsg = personalizedMsg.replaceAll(tag, val);
        });
      });

      // 2. Perform Send
      try {
        let res;
        if (file) {
          const formData = new FormData();
          formData.append("phone", phone);
          formData.append("file", file);
          if (personalizedMsg) {
            formData.append("caption", personalizedMsg);
          }
          res = await sendWhatsAppFile(formData);
        } else {
          res = await sendWhatsAppMessage(phone, personalizedMsg);
        }

        successCount++;
        recipientsLog.push({
          name: contact.conta_name + (contact.f_m ? " " + contact.f_m : ""),
          phone: phone,
          status: "השליחה הצליחה",
          messageId: res.idMessage || "",
          apiResponse: JSON.stringify(res),
          personalizedContent: personalizedMsg,
        });
      } catch (err: any) {
        console.error("Failed to send message to", phone, err);
        failureCount++;
        recipientsLog.push({
          name: contact.conta_name + (contact.f_m ? " " + contact.f_m : ""),
          phone: phone,
          status: `השליחה נכשלה: ${err.message || "שגיאה בשרת"}`,
          personalizedContent: personalizedMsg,
        });
      }

      // Add safety network spacing delay (700ms)
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    // 3. Save Campaign History to Firestore
    try {
      await saveWhatsAppCampaign({
        messageContent: message || `קובץ מצורף: ${file?.name}`,
        totalRecipients: uniqueRecipients.length,
        successCount,
        failureCount,
        recipients: recipientsLog,
      });
      alert(`הקמפיין הושלם!\nהצלחות: ${successCount}\nכשלונות: ${failureCount}`);
    } catch (e) {
      console.error("Failed to save campaign stats:", e);
      alert("השליחה הושלמה אך אירעה שגיאה בשמירת נתוני ההיסטוריה.");
    }

    setIsSending(false);
    // Reset wizard
    setStep(1);
    setMessage("");
    setFile(null);
  };

  const handleCancelSending = () => {
    cancelSendingRef.current = true;
    setProgressText("מבטל שליחה... ממתין לסיום השלב הנוכחי");
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">טוען אנשי קשר ומסננים...</span>
      </div>
    );
  }

  // Display Search-filtered List in Step 2
  const searchedContacts = searchQuery
    ? matchingContacts.filter(
        (c) =>
          (c.conta_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.f_m || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.conta_phone || "").includes(searchQuery)
      )
    : matchingContacts;

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-sm text-right space-y-6" dir="rtl">
      {/* Indicator Panel */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">אשף שליחה קבוצתית</h3>
          <p className="text-xs text-muted-foreground mt-0.5">שלח הודעות וואטסאפ מותאמות אישית לרשימת תפוצה מסוננת</p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-50 border px-3 py-1.5 rounded-xl">
          <span className={step >= 1 ? "text-indigo-600 font-black" : ""}>1. סינון</span>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className={step >= 2 ? "text-indigo-600 font-black" : ""}>2. נמענים</span>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className={step >= 3 ? "text-indigo-600 font-black" : ""}>3. כתיבה</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Filters panel */}
            <div className="lg:col-span-8 space-y-6">
              {/* Hebrew Alphabet range */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">טווח אותיות לשם פרטי</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">מאות</label>
                    <select
                      value={alphabetStart}
                      onChange={(e) => setAlphabetStart(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-1 text-sm focus:outline-none"
                    >
                      <option value="">הכל</option>
                      {HEBREW_ALPHABET.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">עד אות</label>
                    <select
                      value={alphabetEnd}
                      onChange={(e) => setAlphabetEnd(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-1 text-sm focus:outline-none"
                    >
                      <option value="">הכל</option>
                      {HEBREW_ALPHABET.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tags multiselect */}
              {filtersConfig.tags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">סנן לפי תוויות</h4>
                  <div className="flex flex-wrap gap-2">
                    {filtersConfig.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFilter(tag, selectedTags, setSelectedTags)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                            isSelected 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Genders select */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">סנן לפי מגדר</h4>
                <div className="flex gap-2">
                  {["זכר", "נקבה", "אחר"].map((gender) => {
                    const isSelected = selectedGenders.includes(gender);
                    return (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => toggleFilter(gender, selectedGenders, setSelectedGenders)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {gender}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lead sources select */}
              {filtersConfig.lead_sources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">סנן לפי מקור הגעה</h4>
                  <div className="flex flex-wrap gap-2">
                    {filtersConfig.lead_sources.map((src) => {
                      const isSelected = selectedSources.includes(src);
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => toggleFilter(src, selectedSources, setSelectedSources)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Results Live Count Card */}
            <div className="lg:col-span-4 bg-slate-50 border rounded-3xl p-6 flex flex-col justify-between items-center text-center space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-600 mt-2">אנשי קשר תואמים לסינון</h4>
                <span className="text-5xl font-black text-slate-800 leading-none">{matchingContacts.length}</span>
              </div>

              <div className="space-y-2 w-full">
                <Button 
                  onClick={resetFilters} 
                  variant="outline" 
                  className="w-full border-slate-200 text-slate-600 rounded-xl"
                >
                  אפס מסננים
                </Button>
                <Button 
                  onClick={handleNextStep} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                >
                  <span>המשך לבחירת נמענים</span>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Checklist Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש נמען לפי שם או טלפון..."
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSelectAll} className="border-slate-200 rounded-xl text-slate-700">בחר הכל</Button>
                <Button variant="outline" onClick={handleDeselectAll} className="border-slate-200 rounded-xl text-slate-700">בטל בחירה</Button>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full border-collapse text-right">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 border-b select-none">
                  <tr>
                    <th className="p-3 w-12 text-center">מסומן</th>
                    <th className="p-3">שם מלא</th>
                    <th className="p-3">מספר טלפון</th>
                    <th className="p-3">תוויות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {searchedContacts.map((c) => {
                    const isSelected = selectedRecipients.some((r) => r.id === c.id);
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => handleToggleRecipient(c)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? "bg-slate-50/20" : ""}`}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // Handle handled by row click
                            className="rounded-md h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{c.conta_name} {c.f_m}</td>
                        <td className="p-3 font-mono text-slate-500" dir="ltr">{c.conta_phone}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {c.tg1 && <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] text-slate-500 rounded font-semibold">{c.tg1}</span>}
                            {c.tg2 && <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] text-slate-500 rounded font-semibold">{c.tg2}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {searchedContacts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">לא נמצאו אנשי קשר.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Step 2 Footer */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs text-slate-500 font-bold">
                נבחרו {selectedRecipients.length} מתוך {matchingContacts.length} נמענים
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrevStep} className="border-slate-200 rounded-xl flex items-center gap-1">
                  <ChevronRight className="w-4 h-4" />
                  הקודם
                </Button>
                <Button onClick={handleNextStep} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1">
                  המשך לכתיבה
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {isSending ? (
              // Active campaign sending status view
              <div className="py-12 max-w-md mx-auto text-center space-y-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-slate-100">
                    <span className="text-sm font-black text-slate-800">{progressPercent}%</span>
                    <svg className="absolute -rotate-90 w-24 h-24">
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="44" 
                        stroke="rgb(79, 70, 229)" 
                        strokeWidth="4" 
                        fill="transparent" 
                        strokeDasharray={276}
                        strokeDashoffset={276 - (276 * progressPercent) / 100}
                        className="transition-all duration-300"
                      />
                    </svg>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg">שולח הודעות קמפיין...</h4>
                  <p className="text-xs text-slate-500 px-6 font-bold">{progressText}</p>
                </div>

                <Button 
                  variant="destructive" 
                  onClick={handleCancelSending}
                  className="rounded-xl font-bold flex items-center gap-1.5 justify-center mx-auto"
                >
                  <StopCircle className="w-4 h-4" />
                  עצור שליחה
                </Button>
              </div>
            ) : (
              // Standard composer view
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Editor columns */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Dynamic Tags Helper Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">הוסף תג דינמי</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(FIELD_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleInsertTag(label)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border text-[10px] font-bold text-indigo-700 rounded-lg transition-colors"
                        >
                          +{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">תוכן ההודעה</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={7}
                      placeholder="כתוב את ההודעה שלך כאן... ניתן לשלב תגים דינמיים כגון {שם פרטי}"
                      className="w-full p-4 border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  {/* Attachment input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">צרף קובץ (תמונה, מסמך, PDF - אופציונלי)</label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border-slate-200 text-slate-600 flex items-center gap-1.5 h-10 px-4"
                      >
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        בחר קובץ
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                      {file && (
                        <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border">
                          <span className="font-semibold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setFile(null)} 
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview columns */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-2">
                    {/* Preview dropdown contact selector */}
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">תצוגה מקדימה עבור:</label>
                      {selectedRecipients.length > 1 && (
                        <select
                          value={previewContactId}
                          onChange={(e) => setPreviewContactId(e.target.value)}
                          className="rounded-lg border text-xs px-2 py-1 max-w-[150px] outline-none"
                        >
                          {selectedRecipients.map((r) => (
                            <option key={r.id} value={r.id}>{r.conta_name} {r.f_m}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* WhatsApp mock balloon */}
                    <div className="bg-[#E5DDD5] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] border border-slate-200/60 p-4 rounded-3xl min-h-[180px] flex flex-col justify-end space-y-2 select-none shadow-sm">
                      <div className="bg-[#DCF8C6] border rounded-xl p-3 text-slate-800 text-xs shadow-sm max-w-[85%] self-start text-right whitespace-pre-wrap leading-relaxed">
                        {file && (
                          <div className="bg-slate-200/50 p-2 rounded-lg mb-2 flex items-center gap-2 border border-black/5">
                            <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="font-bold text-[10px] truncate max-w-[150px]">{file.name}</span>
                          </div>
                        )}
                        <p>{resolvedPreview || "ההודעה שלכם תוצג כאן..."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 Footer buttons */}
                <div className="lg:col-span-12 flex justify-between items-center border-t pt-4">
                  <Button variant="outline" onClick={handlePrevStep} className="border-slate-200 rounded-xl flex items-center gap-1">
                    <ChevronRight className="w-4 h-4" />
                    הקודם
                  </Button>
                  
                  <Button 
                    onClick={handleSendCampaign}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 px-6"
                  >
                    <Send className="w-4 h-4" />
                    שלח הודעות קמפיין
                  </Button>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
