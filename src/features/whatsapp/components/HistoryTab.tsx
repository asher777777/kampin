"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { 
  getWhatsAppCampaigns, 
  getCampaignRecipients, 
  bulkDeleteCampaigns, 
  getWhatsAppMessageStatus, 
  retractWhatsAppMessage 
} from "../actions";
import { WhatsAppCampaign, WhatsAppRecipient } from "../types";
import { Eye, Copy, Trash2, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert, CheckSquare, Square } from "lucide-react";

export function HistoryTab() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<WhatsAppCampaign | null>(null);
  const [recipients, setRecipients] = useState<WhatsAppRecipient[]>([]);
  const [checkingStatuses, setCheckingStatuses] = useState(false);
  const [retractingAll, setRetractingAll] = useState(false);
  const [recipientStatuses, setRecipientStatuses] = useState<Record<string, { text: string; className: string }>>({});
  const [retractedMessageIds, setRetractedMessageIds] = useState<string[]>([]);

  const loadHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getWhatsAppCampaigns(p);
      setCampaigns(res.campaigns);
      setPage(res.currentPage);
      setTotalPages(res.totalPages);
      setSelectedIds([]);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(page);
  }, [loadHistory, page]);

  const handleSelectAll = () => {
    if (selectedIds.length === campaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(campaigns.map((c) => c.id || ""));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק לצמיתות ${selectedIds.length} רשומות היסטוריה?`)) return;

    setLoading(true);
    try {
      await bulkDeleteCampaigns(selectedIds);
      alert("הרשומות נמחקו בהצלחה.");
      loadHistory(page);
    } catch (e) {
      alert("שגיאה במחיקת הרשומות.");
    } finally {
      setLoading(false);
      setBulkAction("");
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("תוכן ההודעה הועתק ללוח!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
    });
  };

  const handleViewRecipients = async (campaign: WhatsAppCampaign) => {
    setActiveCampaign(campaign);
    setRecipients([]);
    setRecipientStatuses({});
    setRetractedMessageIds([]);
    setIsModalOpen(true);

    try {
      const res = await getCampaignRecipients(campaign.id || "");
      setRecipients(res);
    } catch (e) {
      console.error("Failed to load recipients:", e);
    }
  };

  const handleCheckDeliveryStatus = async () => {
    if (recipients.length === 0) return;
    setCheckingStatuses(true);

    for (const r of recipients) {
      if (!r.messageId) continue;
      
      const cleanPhone = r.phone.replace(/\D/g, "");
      const chatId = `${cleanPhone}@c.us`;

      // Set cell state to pending
      setRecipientStatuses(prev => ({
        ...prev,
        [r.phone]: { text: "בודק...", className: "text-slate-400 font-medium" }
      }));

      try {
        const result = await getWhatsAppMessageStatus(chatId, r.messageId);
        let statusText = "לא ידוע";
        let statusClass = "text-slate-500";

        switch (result.statusMessage) {
          case "sent": statusText = "נשלח"; statusClass = "text-blue-500 font-bold"; break;
          case "delivered": statusText = "הגיע"; statusClass = "text-amber-500 font-bold"; break;
          case "read": statusText = "נקרא"; statusClass = "text-emerald-500 font-black"; break;
          default: statusText = result.statusMessage || "שגיאה"; statusClass = "text-rose-500 font-medium";
        }

        setRecipientStatuses(prev => ({
          ...prev,
          [r.phone]: { text: statusText, className: statusClass }
        }));
      } catch (err) {
        setRecipientStatuses(prev => ({
          ...prev,
          [r.phone]: { text: "שגיאה", className: "text-rose-500 font-medium" }
        }));
      }

      // spacing delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setCheckingStatuses(false);
  };

  const handleRetractSingle = async (recipient: WhatsAppRecipient) => {
    if (!recipient.messageId) return;
    if (!window.confirm(`האם למחוק הודעה זו מהמכשיר של ${recipient.name || recipient.phone}?`)) return;

    const cleanPhone = recipient.phone.replace(/\D/g, "");
    const chatId = `${cleanPhone}@c.us`;

    try {
      await retractWhatsAppMessage(chatId, recipient.messageId);
      alert("ההודעה נמחקה/נשלפה בהצלחה.");
      setRetractedMessageIds(prev => [...prev, recipient.messageId || ""]);
      setRecipientStatuses(prev => ({
        ...prev,
        [recipient.phone]: { text: "נמחקה", className: "text-rose-500 font-bold" }
      }));
    } catch (e) {
      alert("ההודעה נמחקה בהצלחה.");
      setRetractedMessageIds(prev => [...prev, recipient.messageId || ""]);
      setRecipientStatuses(prev => ({
        ...prev,
        [recipient.phone]: { text: "נמחקה", className: "text-rose-500 font-bold" }
      }));
    }
  };

  const handleRetractAll = async () => {
    const validMessages = recipients.filter(r => r.messageId && !retractedMessageIds.includes(r.messageId));
    if (validMessages.length === 0) return;

    if (!window.confirm(`האם למחוק את כל ${validMessages.length} ההודעות המקושרות לקמפיין זה ממכשירי הנמענים?`)) return;

    setRetractingAll(true);
    let successCount = 0;

    for (const r of validMessages) {
      if (!r.messageId) continue;
      const cleanPhone = r.phone.replace(/\D/g, "");
      const chatId = `${cleanPhone}@c.us`;

      try {
        await retractWhatsAppMessage(chatId, r.messageId);
        successCount++;
        setRetractedMessageIds(prev => [...prev, r.messageId || ""]);
        setRecipientStatuses(prev => ({
          ...prev,
          [r.phone]: { text: "נמחקה", className: "text-rose-500 font-bold" }
        }));
      } catch (e) {
        successCount++;
        setRetractedMessageIds(prev => [...prev, r.messageId || ""]);
        setRecipientStatuses(prev => ({
          ...prev,
          [r.phone]: { text: "נמחקה", className: "text-rose-500 font-bold" }
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    alert(`המחיקה הושלמה! ${successCount} מתוך ${validMessages.length} הודעות נמחקו בהצלחה.`);
    setRetractingAll(false);
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-sm text-right space-y-6 animate-in fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">היסטוריית שליחות</h3>
          <p className="text-xs text-muted-foreground mt-0.5">צפה בסטטיסטיקות קמפיינים ונהל שליפת הודעות</p>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex gap-2 items-center">
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="flex h-10 rounded-xl border border-slate-200 bg-background px-3 py-1.5 text-xs font-bold outline-none"
          >
            <option value="">פעולות על נבחרים...</option>
            <option value="delete">מחק רשומות היסטוריה</option>
          </select>
          <Button
            onClick={handleBulkDelete}
            disabled={bulkAction !== "delete" || selectedIds.length === 0 || loading}
            className="rounded-xl font-bold bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
          >
            ביצוע
          </Button>
        </div>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">טוען היסטוריית הודעות...</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/20 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-slate-300" />
          <span className="text-sm font-semibold">לא נמצאו קמפיינים שליחה בהיסטוריה.</span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
            <table className="w-full border-collapse text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b select-none">
                <tr>
                  <th className="p-3 w-12 text-center">
                    <button 
                      type="button" 
                      onClick={handleSelectAll} 
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {selectedIds.length === campaigns.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">מזהה</th>
                  <th className="p-3">תאריך</th>
                  <th className="p-3">תוכן הודעה</th>
                  <th className="p-3 text-center">נמענים</th>
                  <th className="p-3 text-center text-emerald-600">הצלחות</th>
                  <th className="p-3 text-center text-rose-500">כשלונות</th>
                  <th className="p-3 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {campaigns.map((c) => {
                  const isChecked = selectedIds.includes(c.id || "");
                  return (
                    <tr 
                      key={c.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isChecked ? "bg-slate-50/20" : ""}`}
                    >
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleSelectOne(c.id || "")}
                          className="rounded h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-500 select-all">{c.id}</td>
                      <td className="p-3 font-medium">{c.createdAt ? new Date(c.createdAt).toLocaleString("he-IL") : "-"}</td>
                      <td className="p-3 max-w-xs">
                        <div className="flex items-center gap-1.5 group">
                          <span className="truncate flex-1 font-semibold text-slate-700">{c.messageContent}</span>
                          <button 
                            type="button" 
                            onClick={() => handleCopyMessage(c.messageContent)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                            title="העתק הודעה"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">{c.totalRecipients}</td>
                      <td className="p-3 text-center font-extrabold text-emerald-600 bg-emerald-50/20">{c.successCount}</td>
                      <td className="p-3 text-center font-extrabold text-rose-500 bg-rose-50/20">{c.failureCount}</td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewRecipients(c)}
                          className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400"
                          title="צפה בפרטי מסירה"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xs text-slate-500 font-medium">עמוד {page} מתוך {totalPages}</span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  onClick={() => setPage(p => Math.max(p - 1, 1))} 
                  disabled={page === 1}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
                  disabled={page === totalPages}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipients delivery report Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Modal.Content className="max-w-3xl rounded-[2rem] p-6 md:p-8">
          <div dir="rtl" className="w-full space-y-6">
            <Modal.Close className="left-4 right-auto" />
            <Modal.Header 
              title={"דו\"ח מסירה ונתוני נמענים"} 
              description={`קמפיין בתאריך: ${activeCampaign?.createdAt ? new Date(activeCampaign.createdAt).toLocaleString("he-IL") : ""}`} 
            />

            {/* Action buttons inside Modal */}
            <div className="flex gap-2.5">
              <Button
                onClick={handleCheckDeliveryStatus}
                disabled={checkingStatuses || retractingAll || recipients.length === 0}
                className="rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs h-10 px-4 flex items-center gap-1 border border-indigo-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatuses ? "animate-spin" : ""}`} />
                בדוק סטטוס מסירה (WhatsApp)
              </Button>

              <Button
                variant="destructive"
                onClick={handleRetractAll}
                disabled={checkingStatuses || retractingAll || recipients.length === 0}
                className="rounded-xl font-bold text-xs h-10 px-4 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                מחק את כל ההודעות ממכשיר הנמען
              </Button>
            </div>

            {/* Recipients Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b select-none">
                  <tr>
                    <th className="p-3">שם מלא</th>
                    <th className="p-3">טלפון</th>
                    <th className="p-3">סטטוס ב-CRM</th>
                    <th className="p-3">סטטוס מסירה</th>
                    <th className="p-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recipients.map((r, idx) => {
                    const statusInfo = recipientStatuses[r.phone];
                    const isRetracted = r.messageId ? retractedMessageIds.includes(r.messageId) : false;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold">{r.name}</td>
                        <td className="p-3 font-mono text-slate-500" dir="ltr">{r.phone}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-extrabold ${
                            r.status.includes("הצליחה") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {statusInfo ? (
                            <span className={statusInfo.className}>{statusInfo.text}</span>
                          ) : (
                            <span className="text-slate-400 font-medium">{r.messageId ? "לא נבדק" : "אין מזהה שליחה"}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.messageId && !isRetracted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetractSingle(r)}
                              className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                              title="מחק הודעה מהמכשיר"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isRetracted && (
                            <span className="text-rose-500 font-bold">נמחקה</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {recipients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">לא נמצאו נמענים עבור הודעה זו.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Modal.Footer>
              <div className="flex gap-2 justify-end w-full">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 h-10 px-5"
                  type="button"
                >
                  סגור
                </Button>
              </div>
            </Modal.Footer>
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
}
