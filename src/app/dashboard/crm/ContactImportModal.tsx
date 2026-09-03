"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  RefreshCw,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { importContacts } from "@/features/crm/actions";
import { Contact } from "@/features/crm/types";

interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContactImportModal({
  isOpen,
  onClose,
  onSuccess
}: ContactImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<Partial<Contact>[]>([]);
  const [previewSample, setPreviewSample] = useState<any[]>([]);
  const [defaultTag, setDefaultTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedContacts([]);
    setPreviewSample([]);
    setDefaultTag("");
    setStep("upload");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Helper to extract values by multiple candidate header names
  const getValue = (row: any, candidates: string[]) => {
    const rowKeys = Object.keys(row);
    for (const cand of candidates) {
      // 1. Exact match
      if (row[cand] !== undefined && row[cand] !== null && String(row[cand]).trim() !== "") {
        return String(row[cand]).trim();
      }
      // 2. Case-insensitive / trimmed match
      const lowerCand = cand.toLowerCase().trim();
      const matchedKey = rowKeys.find(k => k.toLowerCase().trim() === lowerCand);
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== "") {
        return String(row[matchedKey]).trim();
      }
    }
    return "";
  };

  // Sanitize phone number (digits and optional leading +)
  const sanitizePhone = (val: string) => {
    if (!val) return "";
    let cleaned = val.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+972")) {
      cleaned = "0" + cleaned.substring(4);
    } else if (cleaned.startsWith("972")) {
      cleaned = "0" + cleaned.substring(3);
    }
    return cleaned;
  };

  // Download Sample Contacts Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "שם פרטי": "ישראל",
        "שם משפחה": "ישראלי",
        "טלפון נייד": "0501234567",
        "דוא\"ל": "israel@example.com",
        "תגית 1": "לקוח VIP",
        "תגית 2": "תורם קבוע",
        "קהילה": "תניא ופרשה במדרש לאה",
        "סכום ששולם / תרומה": 500,
        "עיר": "ירושלים",
        "רחוב": "יפו 12",
        "מקור הליד": "פייסבוק",
        "תפקיד": "מנהל",
        "שם חברה": "ישראלי בע\"מ",
        "הערות": "לקוח ותיק"
      },
      {
        "שם פרטי": "שרה",
        "שם משפחה": "לוי",
        "טלפון נייד": "0527654321",
        "דוא\"ל": "sara@example.com",
        "תגית 1": "מתעניינת",
        "תגית 2": "",
        "קהילה": "מוערבות וחברה",
        "סכום ששולם / תרומה": 1000,
        "עיר": "תל אביב",
        "רחוב": "דיזנגוף 50",
        "מקור הליד": "המלצה",
        "תפקיד": "יועצת",
        "שם חברה": "",
        "הערות": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אנשי קשר לדוגמה");
    XLSX.writeFile(wb, "תבנית_ייבוא_אנשי_קשר_לדוגמה.xlsx");
  };

  // Process uploaded Excel File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = wb.SheetNames[0];
      const worksheet = wb.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        throw new Error("קובץ האקסל ריק מנתונים");
      }

      // Map spreadsheet columns to CRM Contact fields
      const mappedContacts: Partial<Contact>[] = [];

      json.forEach((row) => {
        const conta_name = getValue(row, ["שם פרטי", "שם", "שם מלא", "שם לקוח", "איש קשר", "Name", "First Name", "Full Name", "contact_name"]);
        const f_m = getValue(row, ["שם משפחה", "משפחה", "Last Name", "Surname", "last_name"]);
        const conta_phone = sanitizePhone(getValue(row, ["טלפון נייד", "טלפון", "נייד", "סלולרי", "Phone", "Mobile", "Cell", "phone_number"]));
        const email = getValue(row, ["דוא\"ל", "דואל", "דואר אלקטרוני", "אימייל", "מייל", "Email", "mail"]);
        
        // Explicit Community extraction (non-numeric)
        const comm_raw = getValue(row, ["קהילה", "שם קהילה", "community"]);
        const community = (comm_raw && !/^\d+$/.test(comm_raw.trim())) ? comm_raw.trim() : "";

        // Explicit Tag extraction
        const tg1 = getValue(row, ["תג 1", "תג1", "תגית 1", "תגית", "תגיות", "Tag 1", "Tag", "tag"]);
        const tg2 = getValue(row, ["תג 2", "תג2", "תגית 2", "Tag 2"]);
        const tg3 = getValue(row, ["תג 3", "תג3", "תגית 3", "Tag 3"]);
        
        const mh_crm_city = getValue(row, ["עיר", "יישוב", "City", "city"]);
        const mh_crm_street = getValue(row, ["רחוב", "כתובת", "Street", "Address", "address"]);
        const total_spent_raw = getValue(row, ["סכום", "סכום ששולם", "סכום ששולם / תרומה", "תרומה", "תשלום", "Amount", "Total Spent", "amount", "total_spent"]);
        const lead_source = getValue(row, ["מקור הליד", "מקור", "מקור הגעה", "Lead Source", "source"]);
        const job_title = getValue(row, ["תפקיד", "Job Title", "Role", "role"]);
        const company_name = getValue(row, ["שם חברה", "חברה", "ארגון", "Company", "Company Name", "company"]);
        const notes = getValue(row, ["הערות", "הערה", "Notes", "Comment", "notes"]);
        const birth_date = getValue(row, ["תאריך לידה", "יום הולדת", "Birth Date", "Date of Birth", "birth_date"]);

        // Build tags array
        const tags: string[] = [];
        if (community && !tags.includes(community)) tags.push(community);
        if (tg1 && !tags.includes(tg1)) tags.push(tg1);
        if (tg2 && !tags.includes(tg2)) tags.push(tg2);
        if (tg3 && !tags.includes(tg3)) tags.push(tg3);

        if (conta_name || conta_phone || email) {
          mappedContacts.push({
            conta_name: conta_name || (f_m ? `משפחת ${f_m}` : "לקוח ללא שם"),
            f_m: f_m || "",
            conta_phone: conta_phone || "",
            email: email || "",
            community: community || "",
            tags: tags,
            tg1: tg1 || "",
            tg2: tg2 || "",
            tg3: tg3 || "",
            mh_crm_city: mh_crm_city || "",
            mh_crm_street: mh_crm_street || "",
            total_spent: total_spent_raw ? Number(total_spent_raw) : 0,
            lead_source: lead_source || "ייבוא אקסל",
            job_title: job_title || "",
            company_name: company_name || "",
            notes: notes || "",
            birth_date: birth_date || "",
            status: "active"
          });
        }
      });

      if (mappedContacts.length === 0) {
        throw new Error("לא זוהו אנשי קשר תקינים בקובץ (נדרש לפחות שם, טלפון או מייל)");
      }

      setParsedContacts(mappedContacts);
      setPreviewSample(mappedContacts.slice(0, 8));
      setStep("preview");
    } catch (err: any) {
      console.error("Error parsing contacts Excel:", err);
      setError(err.message || "שגיאה בפענוח קובץ האקסל");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Submit and execute import
  const handleExecuteImport = async () => {
    if (parsedContacts.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const contactsToImport = parsedContacts.map(c => {
        const currentTags = Array.isArray(c.tags) ? [...c.tags] : [];
        if (defaultTag.trim() && !currentTags.includes(defaultTag.trim())) {
          currentTags.push(defaultTag.trim());
        }
        return {
          ...c,
          tags: currentTags,
          community: c.community || defaultTag.trim() || undefined
        };
      });

      const res = await importContacts(contactsToImport);

      const summaryMsg = `ייבוא אנשי הקשר הושלם בהצלחה!\n` +
        `• נוצרו: ${res.created} אנשי קשר חדשים\n` +
        `• עודכנו: ${res.updated} אנשי קשר קיימים\n` +
        (res.skipped > 0 ? `• דולגו: ${res.skipped} שורות ללא שם` : "");

      alert(summaryMsg);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Import contacts error:", err);
      setError(err.message || "שגיאה בתהליך ייבוא אנשי הקשר");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Content className="max-w-2xl w-full max-h-[90vh] flex flex-col dir-rtl text-right">
        <Modal.Close className="left-4 right-auto top-4 z-10" />
        
        <Modal.Header 
          title="ייבוא אנשי קשר מאקסל"
          description="העלאת קובץ Excel (.xlsx / .csv) להוספה ועדכון מרוכז של אנשי קשר ב-CRM"
        />

        <Modal.Body className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "upload" ? (
            <div className="space-y-6">
              {/* Dropzone / Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 transition-all rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xs border border-indigo-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                </div>
                <h4 className="text-base font-bold text-slate-800">לחץ לבחירת קובץ Excel (.xlsx / .xls / .csv)</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  המערכת תזהה אוטומטית שמות, מספרי טלפון, כתובות מייל, קהילות, סכומים ועיר
                </p>

                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <Button 
                  type="button" 
                  disabled={loading}
                  className="mt-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 h-10 px-5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{loading ? "מפענח קובץ..." : "בחר קובץ אקסל"}</span>
                </Button>
              </div>

              {/* Sample Template Download Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">רוצה מבנה מוכן לאנשי קשר?</div>
                    <div className="text-[11px] text-slate-500">הורד תבנית Excel לדוגמה עם כל עמודות אנשי הקשר</div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="rounded-xl font-bold border-emerald-200 text-emerald-800 bg-white hover:bg-emerald-50 text-xs h-9 px-3 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>הורד תבנית</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-1">
                    <Users className="w-4 h-4" />
                    <span>אנשי קשר לייבוא:</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{parsedContacts.length}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">זוהו מהקובץ שהועלה</div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>שם הקובץ:</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 truncate mt-1">{file?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">סנכרון לפי טלפון / מייל</div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>תצוגה מקדימה (שורות ראשונות):</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">מציג עד 8 שורות ראשונות</span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-48 overflow-y-auto bg-white">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">שם מלא</th>
                        <th className="p-2.5">טלפון</th>
                        <th className="p-2.5">תגית 1</th>
                        <th className="p-2.5">קהילה</th>
                        <th className="p-2.5">סכום (₪)</th>
                        <th className="p-2.5">עיר</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSample.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-800">{c.conta_name} {c.f_m || ""}</td>
                          <td className="p-2.5 font-mono text-slate-600" dir="ltr">{c.conta_phone || "-"}</td>
                          <td className="p-2.5 font-semibold text-amber-700 bg-amber-50/50 rounded">{c.tg1 || "-"}</td>
                          <td className="p-2.5 font-semibold text-indigo-700">{c.community || "-"}</td>
                          <td className="p-2.5 font-bold text-emerald-700">{c.total_spent ? `₪${c.total_spent.toLocaleString()}` : "-"}</td>
                          <td className="p-2.5 text-slate-600">{c.mh_crm_city || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Optional Default Tag / Community */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  הוסף תגית / שם קהילה לכל אנשי הקשר בקובץ (אופציונלי):
                </label>
                <input
                  type="text"
                  value={defaultTag}
                  onChange={(e) => setDefaultTag(e.target.value)}
                  placeholder="לדוגמה: תורמי פסח 2026 / קהילת ירושלים"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500">
                  אם ייקבע ערך, תגית זו תתווסף לכל איש קשר שיובא מהקובץ הנוכחי.
                </p>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={loading}
                className="rounded-xl h-10 px-4 text-xs font-bold"
              >
                חזור לבחירת קובץ
              </Button>

              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={loading}
                className="rounded-xl h-10 px-6 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{loading ? "מייבא אנשי קשר..." : `בצע ייבוא (${parsedContacts.length} אנשי קשר)`}</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl h-10 px-5 text-xs font-bold mr-auto"
            >
              ביטול
            </Button>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
