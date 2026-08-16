"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, Download } from "lucide-react";

export const EXPORT_COLUMNS = [
  { id: "id", label: "מזהה (ID)" },
  { id: "conta_name", label: "שם פרטי" },
  { id: "f_m", label: "שם משפחה" },
  { id: "conta_phone", label: "טלפון נייד" },
  { id: "email", label: "דוא\"ל" },
  { id: "gender", label: "מגדר" },
  { id: "mh_crm_city", label: "עיר" },
  { id: "mh_crm_street", label: "רחוב" },
  { id: "tg1", label: "תג 1" },
  { id: "tg2", label: "תג 2" },
  { id: "tg3", label: "תג 3" },
  { id: "company_name", label: "שם חברה" },
  { id: "job_title", label: "תפקיד" },
  { id: "lead_source", label: "מקור הליד" },
  { id: "work_phone", label: "טלפון עבודה" },
  { id: "website", label: "אתר" },
  { id: "birth_date", label: "תאריך לידה" },
  { id: "notes", label: "הערות" },
];

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: (options: {
    columns: string[] | "all";
    scope: "all" | "current" | "selected";
    limit?: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => void;
  actionLoading: boolean;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  selectedCount?: number;
}

export function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  onExport,
  actionLoading,
  currentSortBy,
  currentSortOrder,
  selectedCount = 0
}: ImportExportModalProps) {
  const [exportMode, setExportMode] = useState<"all" | "custom">("all");
  const [exportScope, setExportScope] = useState<"all" | "current" | "selected">(selectedCount > 0 ? "selected" : "current");
  const [exportSortBy, setExportSortBy] = useState<string>(currentSortBy || "createdAt");
  const [exportSortOrder, setExportSortOrder] = useState<"asc" | "desc">(currentSortOrder || "desc");
  const [exportLimit, setExportLimit] = useState<number>(0);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.id));

  const toggleColumn = (id: string) => {
    if (selectedColumns.includes(id)) {
      setSelectedColumns(selectedColumns.filter(c => c !== id));
    } else {
      setSelectedColumns([...selectedColumns, id]);
    }
  };

  const handleExport = () => {
    onExport({
      columns: exportMode === "all" ? "all" : selectedColumns,
      scope: exportScope,
      limit: exportLimit > 0 ? exportLimit : undefined,
      sortBy: exportSortBy,
      sortOrder: exportSortOrder
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className="max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <Modal.Close className="left-4 right-auto top-4 z-10" />
        <Modal.Header 
          title="ייבוא וייצוא אנשי קשר"
          description="ייבא רשימת אנשי קשר מקובץ או ייצא את הרשימה הקיימת"
        />

        <Modal.Body className="p-6 md:p-8 bg-slate-50/30 overflow-y-auto flex-1">
          <div dir="rtl" className="w-full space-y-6">
            
            {/* Import Option */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">ייבוא מקובץ Excel / CSV</h3>
                <p className="text-slate-500 text-sm mt-1">
                  העלה קובץ עם נתוני אנשי קשר כדי להוסיף אותם למערכת באופן גורף.
                </p>
              </div>
              <label className="flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer h-12 px-6 transition-all gap-2 font-bold w-full max-w-[200px]">
                <Upload className="w-4 h-4" />
                בחר קובץ להעלאה
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={(e) => {
                    onImport(e);
                    onClose();
                  }} 
                  className="hidden" 
                  disabled={actionLoading}
                />
              </label>
            </div>

            {/* Export Option */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">ייצוא לקובץ Excel</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    הגדר כיצד תרצה שייראה קובץ הייצוא.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {/* Scope Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">כמות להורדה</span>
                  <div className="flex flex-col gap-2">
                    {selectedCount > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                        <input 
                          type="radio" 
                          name="exportScope" 
                          checked={exportScope === "selected"} 
                          onChange={() => setExportScope("selected")} 
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        רק המסומנים ({selectedCount} אנשי קשר)
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input 
                        type="radio" 
                        name="exportScope" 
                        checked={exportScope === "current"} 
                        onChange={() => setExportScope("current")} 
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      רק המוצגים כרגע (לפי חיפוש/סינון)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input 
                        type="radio" 
                        name="exportScope" 
                        checked={exportScope === "all"} 
                        onChange={() => setExportScope("all")} 
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      כל אנשי הקשר במערכת
                    </label>
                    {exportScope !== "selected" && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm text-slate-600 font-semibold">הגבל כמות:</span>
                        <input 
                          type="number"
                          min="0"
                          value={exportLimit || ""}
                          onChange={(e) => setExportLimit(Number(e.target.value))}
                          placeholder="0 = ללא הגבלה"
                          className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sort Selection */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">מיון התוצאות</span>
                  <div className="flex flex-col gap-2">
                    <select
                      value={exportSortBy}
                      onChange={(e) => setExportSortBy(e.target.value)}
                      className="text-sm font-semibold border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="createdAt">תאריך יצירה</option>
                      <option value="updatedAt">תאריך עדכון אחרון</option>
                      <option value="conta_name">שם (א-ב)</option>
                      <option value="total_spent">שווי תורם</option>
                    </select>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setExportSortOrder("asc")}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all border ${exportSortOrder === "asc" ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"}`}
                      >
                        מהתחלה לסוף
                      </button>
                      <button 
                        onClick={() => setExportSortOrder("desc")}
                        className={`flex-1 py-1 rounded-md text-xs font-bold transition-all border ${exportSortOrder === "desc" ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"}`}
                      >
                        מהסוף להתחלה
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 mb-3 block text-center">עמודות לייצוא</span>
                <div className="flex justify-center gap-4 border-b border-slate-100 pb-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="exportMode" 
                      checked={exportMode === "all"} 
                      onChange={() => setExportMode("all")} 
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    כל העמודות
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="exportMode" 
                      checked={exportMode === "custom"} 
                      onChange={() => setExportMode("custom")} 
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    בחירת עמודות
                  </label>
                </div>

                {exportMode === "custom" && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto mt-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">בחר עמודות</span>
                      <button 
                        onClick={() => setSelectedColumns(selectedColumns.length === EXPORT_COLUMNS.length ? [] : EXPORT_COLUMNS.map(c => c.id))}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {selectedColumns.length === EXPORT_COLUMNS.length ? "בטל הכל" : "בחר הכל"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EXPORT_COLUMNS.map(col => (
                        <label 
                          key={col.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${selectedColumns.includes(col.id) ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={selectedColumns.includes(col.id)} 
                            onChange={() => toggleColumn(col.id)} 
                            className="rounded text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300 w-4 h-4 shrink-0"
                          />
                          <span className="text-xs font-semibold truncate">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <Button 
                  onClick={handleExport} 
                  variant="outline"
                  disabled={actionLoading || (exportMode === "custom" && selectedColumns.length === 0)}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-slate-700 flex items-center justify-center gap-2 h-12 px-6 w-full max-w-[200px]"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  ייצא נתונים
                </Button>
              </div>
            </div>

          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white">
          <div className="flex justify-end w-full">
            <Button
              onClick={onClose}
              className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 h-10 px-5"
              type="button"
            >
              סגור
            </Button>
          </div>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
