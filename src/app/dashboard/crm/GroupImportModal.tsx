"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Building, 
  X, 
  RefreshCw,
  HelpCircle,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { 
  importGroupsFromExcelAction, 
  ExcelGroupImportRow, 
  ExcelGroupImportOptions 
} from "@/features/crm/groupsActions";

interface GroupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaigns?: Array<{ id: string; title: string }>;
}

export function GroupImportModal({
  isOpen,
  onClose,
  onSuccess,
  campaigns = []
}: GroupImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ExcelGroupImportRow[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [previewSample, setPreviewSample] = useState<any[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<string[]>([]);
  const [detectedContactsCount, setDetectedContactsCount] = useState(0);
  
  const [autoCreateGroups, setAutoCreateGroups] = useState(true);
  const [tagExistingContacts, setTagExistingContacts] = useState(true);
  const [createNewContacts, setCreateNewContacts] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setRawHeaders([]);
    setPreviewSample([]);
    setDetectedGroups([]);
    setDetectedContactsCount(0);
    setStep("upload");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "שם קבוצה / קהילה": "תניא ופרשה במדרש לאה",
        "שם איש קשר": "ישראל ישראלי",
        "טלפון": "0501234567",
        "דוא\"ל": "israel@example.com",
        "שם מוביל קהילה": "הרב כהן",
        "יעד כספי": 10000,
        "חזון": "פעילות רוחנית ושיעורי תורה",
        "סכום": 500,
        "עיר": "ירושלים",
        "מקור הגעה": "המלצה"
      },
      {
        "שם קבוצה / קהילה": "מוערבות וחברה",
        "שם איש קשר": "שרה לוי",
        "טלפון": "0527654321",
        "דוא\"ל": "sara@example.com",
        "שם מוביל קהילה": "דנה לוי",
        "יעד כספי": 5000,
        "חזון": "סיוע ותמיכה קהילתית",
        "סכום": 1000,
        "עיר": "תל אביב",
        "מקור הגעה": "פייסבוק"
      },
      {
        "שם קבוצה / קהילה": "בוגרי הישיבה",
        "שם איש קשר": "",
        "טלפון": "",
        "דוא\"ל": "",
        "שם מוביל קהילה": "אבי כהן",
        "יעד כספי": 25000,
        "חזון": "איחוד כלל הבוגרים והקמת מערך מלגות",
        "סכום": "",
        "עיר": "",
        "מקור הגעה": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "תבנית ייבוא קבוצות");
    XLSX.writeFile(wb, "תבנית_ייבוא_קבוצות_וקהילות.xlsx");
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

      const headers = Object.keys(json[0] || {});
      setRawHeaders(headers);

      // Smart Mapping of Hebrew / English Column Names
      const mappedRows: ExcelGroupImportRow[] = [];
      const groupsSet = new Set<string>();
      let contactsCount = 0;

      json.forEach((row) => {
        // Find group name
        const groupKey = headers.find(h => 
          /קהילה|קבוצה|שם קבוצה|שם קהילה|group|community|tag|תגית/i.test(h.trim())
        );
        const groupName = groupKey ? String(row[groupKey] || "").trim() : "";

        // Find contact name
        const nameKey = headers.find(h => 
          /שם איש קשר|שם לקוח|שם מלא|שם פרטי|contact|name|full_name/i.test(h.trim()) && !/מוביל|leader/i.test(h.trim())
        );
        const contactName = nameKey ? String(row[nameKey] || "").trim() : "";

        // Find phone
        const phoneKey = headers.find(h => 
          /טלפון|נייד|סלולרי|phone|mobile|tel/i.test(h.trim())
        );
        const phone = phoneKey ? String(row[phoneKey] || "").trim() : "";

        // Find email
        const emailKey = headers.find(h => 
          /דוא"?ל|מייל|אימייל|email|mail/i.test(h.trim())
        );
        const email = emailKey ? String(row[emailKey] || "").trim() : "";

        // Find leader name
        const leaderKey = headers.find(h => 
          /מוביל|מנהל קהילה|ראש קבוצה|leader|head/i.test(h.trim())
        );
        const leaderName = leaderKey ? String(row[leaderKey] || "").trim() : "";

        // Find goal
        const goalKey = headers.find(h => 
          /יעד|יעד כספי|סכום יעד|goal|target/i.test(h.trim())
        );
        const targetGoal = goalKey && row[goalKey] ? Number(row[goalKey]) : undefined;

        // Find vision / description
        const visionKey = headers.find(h => 
          /חזון|מטרה|תיאור|vision|purpose|desc/i.test(h.trim())
        );
        const vision = visionKey ? String(row[visionKey] || "").trim() : "";

        // Find amount / total spent
        const amountKey = headers.find(h => 
          /סכום|תרומה|תשלום|amount|spent/i.test(h.trim()) && !/יעד|goal|target/i.test(h.trim())
        );
        const amount = amountKey && row[amountKey] ? Number(row[amountKey]) : undefined;

        // Find city
        const cityKey = headers.find(h => /עיר|כתובת|city/i.test(h.trim()));
        const city = cityKey ? String(row[cityKey] || "").trim() : "";

        // Find lead source
        const sourceKey = headers.find(h => /מקור|מקור הגעה|מקור ליד|source/i.test(h.trim()));
        const leadSource = sourceKey ? String(row[sourceKey] || "").trim() : "";

        if (groupName) {
          groupsSet.add(groupName);
        }
        if (contactName || phone || email) {
          contactsCount++;
        }

        if (groupName || contactName || phone) {
          mappedRows.push({
            groupName: groupName || "כללי",
            leaderName,
            targetGoal,
            vision,
            contactName,
            phone,
            email,
            amount,
            city,
            leadSource
          });
        }
      });

      if (mappedRows.length === 0) {
        throw new Error("לא זוהו נתונים תואמים (שם קבוצה, איש קשר או טלפון) בקובץ");
      }

      setParsedRows(mappedRows);
      setDetectedGroups(Array.from(groupsSet));
      setDetectedContactsCount(contactsCount);
      setPreviewSample(mappedRows.slice(0, 8));
      setStep("preview");
    } catch (err: any) {
      console.error("Error parsing Excel:", err);
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
    if (parsedRows.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const options: ExcelGroupImportOptions = {
        autoCreateGroups,
        tagExistingContacts,
        createNewContacts,
        defaultCampaignId: selectedCampaignId || undefined,
      };

      const res = await importGroupsFromExcelAction(parsedRows, options);

      if (!res.success) {
        throw new Error(res.error || "שגיאה בביצוע הייבוא");
      }

      const summaryMsg = `הייבוא הושלם בהצלחה!\n` +
        `• נוצרו/עודכנו ${res.createdGroupsCount} קהילות.\n` +
        `• שויכו ועודכנו ${res.updatedContactsCount} אנשי קשר קיימים.\n` +
        (res.createdContactsCount > 0 ? `• נוצרו ${res.createdContactsCount} אנשי קשר חדשים.` : "");

      alert(summaryMsg);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "שגיאה בתהליך הייבוא");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Content className="max-w-2xl w-full max-h-[90vh] flex flex-col dir-rtl text-right">
        <Modal.Close className="left-4 right-auto top-4 z-10" />
        
        <Modal.Header 
          title="ייבוא קבוצות וקהילות מאקסל"
          description="העלאת קובץ Excel להקמת קהילות חדשות ושיוך מרוכז של אנשי קשר"
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
                  המערכת תזהה אוטומטית עמודות של שמות קהילות, שמות אנשי קשר, מספרי טלפון, יעדים וסכומים
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
                    <div className="text-xs font-bold text-slate-800">רוצה מבנה מוכן לייבוא?</div>
                    <div className="text-[11px] text-slate-500">הורד תבנית Excel לדוגמה עם כל העמודות הנתמכות</div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                    <Building className="w-4 h-4" />
                    <span>קהילות שזוהו:</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{detectedGroups.length}</div>
                  <div className="text-[11px] text-indigo-600 truncate mt-0.5">
                    {detectedGroups.slice(0, 3).join(", ")}{detectedGroups.length > 3 ? "..." : ""}
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-1">
                    <Users className="w-4 h-4" />
                    <span>אנשי קשר לייחוס:</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{detectedContactsCount}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">זוהו מהשורות בקובץ</div>
                </div>

                <div className="bg-slate-100/70 border border-slate-200 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>סה"כ שורות:</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">{parsedRows.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{file?.name}</div>
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
                        <th className="p-2.5">קהילה / קבוצה</th>
                        <th className="p-2.5">שם איש קשר</th>
                        <th className="p-2.5">טלפון</th>
                        <th className="p-2.5">מוביל קהילה</th>
                        <th className="p-2.5">יעד (₪)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSample.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-indigo-700">{row.groupName || "-"}</td>
                          <td className="p-2.5 text-slate-800">{row.contactName || "-"}</td>
                          <td className="p-2.5 font-mono text-slate-600" dir="ltr">{row.phone || "-"}</td>
                          <td className="p-2.5 text-slate-600">{row.leaderName || "-"}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{row.targetGoal ? `₪${row.targetGoal.toLocaleString()}` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options Checkboxes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">הגדרות ייבוא:</div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={autoCreateGroups}
                      onChange={(e) => setAutoCreateGroups(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>צור קהילות חדשות אוטומטית ב-CRM במידה ואינן קיימות</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={tagExistingContacts}
                      onChange={(e) => setTagExistingContacts(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>שייך אנשי קשר קיימים לקבוצות (הוספת התגית לכרטיס הלקוח)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={createNewContacts}
                      onChange={(e) => setCreateNewContacts(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>צור כרטיסי איש קשר חדשים אם הלקוח אינו קיים במערכת</span>
                  </label>
                </div>

                {campaigns.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      שיוך קהילות לקמפיין ראשי (אופציונלי):
                    </label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-800 outline-none"
                    >
                      <option value="">-- ללא שיוך לקמפיין --</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                <span>{loading ? "מבצע ייבוא..." : `בצע ייבוא (${parsedRows.length} שורות)`}</span>
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
