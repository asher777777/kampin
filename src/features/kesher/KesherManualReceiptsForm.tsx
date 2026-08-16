"use client";

import { useState, useEffect } from "react";
import { createManualInvoice } from "./actions";
import { getContacts } from "@/features/crm/actions";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle, FileText, Landmark, Plus, ChevronDown, ChevronUp, User, CreditCard as CreditCardIcon } from "lucide-react";
import { KesherCheckout } from "./KesherCheckout";
import { Contact } from "@/features/crm/types";
import { ContactModal } from "@/app/dashboard/crm/ContactModal";

export function KesherManualReceiptsForm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  useEffect(() => {
    getContacts({ per_page: 1000 }).then((res) => {
      if (res && res.contacts) {
        setContacts(res.contacts);
      }
    });
  }, []);

  const [formData, setFormData] = useState({
    clientName: "",
    amount: "",
    paymentType: "" as "" | "Cash" | "Check" | "BankTransfer" | "CreditCard",
    receiptType: "000",
    zeout: "",
    phone: "",
    email: "",
    details: "",
    date: new Date().toLocaleDateString("he-IL").replace(/\./g, '/'),
    
    checkNumber: "",
    bankName: "",
    branchNumber: "",
    accountNumber: "",
    transferRef: "",
  });

  const [existingContact, setExistingContact] = useState<Contact | null>(null);
  const [isContactChanged, setIsContactChanged] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  const [openTab, setOpenTab] = useState<"client" | "payment" | "action">("client");

  useEffect(() => {
    if (existingContact) {
      const p = existingContact.payment_details || {};
      const bankChanged = 
        (formData.checkNumber && formData.checkNumber !== p.checkNumber) ||
        (formData.bankName && formData.bankName !== p.bankName) ||
        (formData.branchNumber && formData.branchNumber !== p.branchNumber) ||
        (formData.accountNumber && formData.accountNumber !== p.accountNumber) ||
        (formData.transferRef && formData.transferRef !== p.transferRef);

      const changed = 
        (formData.phone && formData.phone !== existingContact.conta_phone) ||
        (formData.email && formData.email !== existingContact.email) ||
        (formData.zeout && formData.zeout !== existingContact.tg1) ||
        bankChanged;
      setIsContactChanged(!!changed);
    } else {
      setIsContactChanged(false);
    }
  }, [formData, existingContact]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.paymentType) {
      setError("נא לבחור אמצעי תשלום");
      return;
    }
    setLoading(true);
    setSuccess("");
    setError("");

    if (!formData.clientName || !formData.amount) {
      setError("נא למלא שם לקוח וסכום.");
      setLoading(false);
      return;
    }

    try {
      const res = await createManualInvoice({
        ...formData,
        amount: Number(formData.amount),
      });

      if (res.success) {
        // Save to local incomes collection
        let kesherUrl = "";
        if (res.kesherResult?.DocUrl || res.kesherResult?.Url) {
           kesherUrl = res.kesherResult.DocUrl || res.kesherResult.Url;
        } else if (res.kesherResult?.Message || typeof res.kesherResult === 'string') {
           kesherUrl = `שגיאה/הערה: ${res.kesherResult?.Message || res.kesherResult}`;
        } else {
           kesherUrl = "לא התקבל קישור או מידע מהשרת של קשר";
        }

        const { createIncome } = await import("@/features/incomes/actions");
        await createIncome({
          clientName: formData.clientName,
          amount: Number(formData.amount),
          paymentType: formData.paymentType,
          receiptType: formData.receiptType,
          date: formData.date,
          kesherUrl: kesherUrl
        });

        setSuccess(res.message || "הקבלה הופקה בהצלחה ונשמרה במערכת!");
        setFormData({
          clientName: "", amount: "", paymentType: "", receiptType: "000", zeout: "", phone: "", email: "", details: "", date: new Date().toLocaleDateString("he-IL").replace(/\./g, '/'), checkNumber: "", bankName: "", branchNumber: "", accountNumber: "", transferRef: "",
        });
        setExistingContact(null);
        setOpenTab("client");
      } else {
        setError(res.error || "שגיאה לא ידועה בהפקת הקבלה.");
      }
    } catch (err: any) {
      setError("שגיאת תקשורת: " + err.message);
    }
    setLoading(false);
  };

  const isClientComplete = formData.clientName.trim().length > 0;
  const isPaymentComplete = formData.paymentType !== "" && formData.amount !== "";

  return (
    <div className="w-full space-y-0 text-white pb-32" dir="rtl">
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 m-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3 m-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Accordion 1: Client Details */}
      <div className={`w-full bg-[#181818] border-y border-white/5 transition-all duration-300 ${openTab === "client" ? 'shadow-md relative z-10' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenTab(openTab === "client" ? "" as any : "client")}
          className="w-full p-4 sm:p-5 hover:bg-[#202020] flex items-center justify-between font-bold cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isClientComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-indigo-400'}`}>
              {isClientComplete ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm sm:text-base text-slate-200">פרטי לקוח</span>
              {isClientComplete && (
                <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  הושלם: {formData.clientName}
                </span>
              )}
            </div>
          </div>
          {openTab === "client" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {openTab === "client" && (
          <div className="p-4 sm:p-5 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4">
            <div>
              <input
                type="text"
                list="crm-contacts-list"
                value={formData.clientName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const contact = contacts.find(c => c.conta_name === selectedName);
                  if (contact) {
                    setExistingContact(contact);
                    setFormData({ ...formData, clientName: selectedName, phone: contact.conta_phone || formData.phone, email: contact.email || formData.email, zeout: contact.tg1 || formData.zeout, checkNumber: contact.payment_details?.checkNumber || formData.checkNumber, bankName: contact.payment_details?.bankName || formData.bankName, branchNumber: contact.payment_details?.branchNumber || formData.branchNumber, accountNumber: contact.payment_details?.accountNumber || formData.accountNumber, transferRef: contact.payment_details?.transferRef || formData.transferRef });
                  } else {
                    setExistingContact(null);
                    setFormData({ ...formData, clientName: selectedName });
                  }
                }}
                className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-500 font-semibold"
                placeholder="שם הלקוח / התורם *"
              />
              <datalist id="crm-contacts-list">
                {contacts.map((c) => <option key={c.id} value={c.conta_name}>{c.conta_phone ? `${c.conta_phone}` : ""}</option>)}
              </datalist>
              {formData.clientName.trim() !== "" && (
                <div className="mt-3">
                  <button type="button" onClick={() => setIsContactModalOpen(true)} className="text-xs font-medium flex items-center gap-1 transition-colors bg-white/5 hover:bg-white/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-white/10">
                    {!existingContact ? <><Plus className="w-3 h-3" /> שמור כאיש קשר חדש</> : isContactChanged ? "🔄 עדכן פרטי איש קשר" : "✅ איש קשר מזוהה במערכת"}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-500" placeholder="טלפון נייד" />
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-500" placeholder="דואר אלקטרוני" />
              <input type="text" value={formData.zeout} onChange={(e) => setFormData({ ...formData, zeout: e.target.value })} className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-500" placeholder="ת.ז / ח.פ" />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="button" onClick={() => setOpenTab("payment")} className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={!isClientComplete}>המשך לפרטי תשלום</Button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Payment Details */}
      <div className={`w-full bg-[#181818] border-b border-white/5 transition-all duration-300 ${openTab === "payment" ? 'shadow-md relative z-10' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenTab(openTab === "payment" ? "" as any : "payment")}
          className="w-full p-4 sm:p-5 hover:bg-[#202020] flex items-center justify-between font-bold cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isPaymentComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-blue-400'}`}>
              {isPaymentComplete ? <CheckCircle2 className="w-5 h-5" /> : <CreditCardIcon className="w-5 h-5" />}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm sm:text-base text-slate-200">פרטי תשלום</span>
              {isPaymentComplete && (
                <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  ₪{formData.amount} - {formData.paymentType}
                </span>
              )}
            </div>
          </div>
          {openTab === "payment" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {openTab === "payment" && (
          <div className="p-4 sm:p-5 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4">
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
              placeholder="סכום לתשלום (₪) *"
              min="1"
            />
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
              className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
            >
              <option value="" disabled>בחר אמצעי תשלום *</option>
              <option value="CreditCard">💳 כרטיס אשראי</option>
              <option value="Cash">💵 מזומן</option>
              <option value="Check">📝 צ'ק</option>
              <option value="BankTransfer">🏦 העברה בנקאית</option>
            </select>

            {formData.paymentType === "Check" && (
              <div className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={formData.checkNumber} onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר צ'ק *" />
                  <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר בנק *" />
                  <input type="text" value={formData.branchNumber} onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="סניף *" />
                  <input type="text" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר חשבון *" />
                </div>
              </div>
            )}

            {formData.paymentType === "BankTransfer" && (
              <div className="bg-[#181818] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={formData.transferRef} onChange={(e) => setFormData({ ...formData, transferRef: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר אסמכתא *" />
                  <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר בנק *" />
                  <input type="text" value={formData.branchNumber} onChange={(e) => setFormData({ ...formData, branchNumber: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="סניף מעביר *" />
                  <input type="text" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none placeholder:text-gray-500" placeholder="מספר חשבון מעביר *" />
                </div>
              </div>
            )}
            
            <div className="pt-2 flex justify-end">
              <Button type="button" onClick={() => setOpenTab("action")} className="bg-blue-600 hover:bg-blue-500 text-white" disabled={!isPaymentComplete}>המשך לביצוע</Button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Execution */}
      <div className={`w-full bg-[#181818] border-b border-white/5 transition-all duration-300 ${openTab === "action" ? 'shadow-md relative z-10' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenTab(openTab === "action" ? "" as any : "action")}
          className="w-full p-4 sm:p-5 hover:bg-[#202020] flex items-center justify-between font-bold cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl flex items-center justify-center shrink-0 bg-white/5 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm sm:text-base text-slate-200">ביצוע תשלום</span>
            </div>
          </div>
          {openTab === "action" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {openTab === "action" && (
          <div className="p-4 sm:p-5 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4 pb-12">
            {!isClientComplete || !isPaymentComplete ? (
              <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20 text-center">
                יש להשלים קודם את פרטי הלקוח ופרטי התשלום.
              </div>
            ) : formData.paymentType === "CreditCard" ? (
              <KesherCheckout 
                amount={Number(formData.amount)} 
                clientName={formData.clientName} 
                phone={formData.phone} 
                description={formData.details || `סליקה מלוח הבקרה עבור ${formData.clientName}`} 
                onSuccess={() => {
                  setSuccess("הסליקה בוצעה בהצלחה והפרטים נשמרו!");
                  setFormData({ clientName: "", amount: "", paymentType: "", receiptType: "000", zeout: "", phone: "", email: "", details: "", date: new Date().toLocaleDateString("he-IL").replace(/\./g, '/'), checkNumber: "", bankName: "", branchNumber: "", accountNumber: "", transferRef: "" });
                  setOpenTab("client");
                }}
              />
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="w-full h-14 font-bold text-lg bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all">
                {loading ? "מפיק מסמך..." : "הפק מסמך ושלח למערכת"}
              </Button>
            )}
          </div>
        )}
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contact={existingContact ? {
          ...existingContact,
          conta_phone: formData.phone || existingContact.conta_phone,
          email: formData.email || existingContact.email,
          tg1: formData.zeout || existingContact.tg1,
          payment_details: {
            ...(existingContact.payment_details || {}),
            checkNumber: formData.checkNumber || existingContact.payment_details?.checkNumber || "",
            bankName: formData.bankName || existingContact.payment_details?.bankName || "",
            branchNumber: formData.branchNumber || existingContact.payment_details?.branchNumber || "",
            accountNumber: formData.accountNumber || existingContact.payment_details?.accountNumber || "",
            transferRef: formData.transferRef || existingContact.payment_details?.transferRef || "",
          }
        } : {
          id: "",
          ownerId: "",
          conta_name: formData.clientName,
          conta_phone: formData.phone,
          email: formData.email,
          tg1: formData.zeout,
          payment_details: {
            checkNumber: formData.checkNumber,
            bankName: formData.bankName,
            branchNumber: formData.branchNumber,
            accountNumber: formData.accountNumber,
            transferRef: formData.transferRef,
          }
        } as any}
        onSuccess={() => {
          setIsContactModalOpen(false);
          getContacts({ per_page: 1000 }).then((res) => {
            if (res && res.contacts) {
              setContacts(res.contacts);
              const updated = res.contacts.find((c: any) => c.conta_name === formData.clientName);
              if (updated) {
                setExistingContact(updated);
              }
            }
          });
        }}
        communities={[]}
      />
    </div>
  );
}
