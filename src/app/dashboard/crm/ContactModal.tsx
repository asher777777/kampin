"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Contact, ContactEvent } from "@/features/crm/types";
import { createContact, updateContact, getCustomFields, checkIsSuperAdmin, getContactUserSettings, saveContactUserSettings, getCustomTabs, addCustomTab, addCustomField, getSystemFieldLabels, updateCustomField } from "@/features/crm/actions";
import { getAllCampaigns } from "@/features/campaigns/actions";
import { syncContactMessages } from "@/features/whatsapp/actions";
import { uploadMediaFile } from "@/features/media/actions";
import { impersonateUser } from "@/features/users/impersonate";
import { ChevronUp, ChevronDown, Calendar, Tag, Building, Clock, CreditCard, User, Users, Plus, Trash2, MessageCircle, Phone, Mail, Edit, RefreshCw, Settings, Loader2, UploadCloud, Folder, Zap, Heart, Target, ExternalLink, Sparkles, CheckCircle, FileText } from "lucide-react";
import { InteractionsList } from "@/components/ui/InteractionsList";

const getInitials = (name: string, fm?: string) => {
  const first = name ? name.trim().charAt(0) : "";
  const last = fm ? fm.trim().charAt(0) : "";
  return `${first}${last}`.toUpperCase();
};

const getAvatarBg = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-pink-500",
    "bg-purple-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-sky-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-orange-500",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null; // null if creating a new contact
  communities?: any[];
  onSuccess: () => void;
}

type TabType = "details" | "camp" | "tags" | "company" | "events" | "timeline" | "payments" | "userDetails" | "aistats";

const EditableLabel = ({ label, fieldId, isCustom, onSave, canEdit = true }: { label: string, fieldId: string, isCustom: boolean, onSave: (id: string, newLabel: string, isCustom: boolean) => Promise<void>, canEdit?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(label);
  const [saving, setSaving] = useState(false);

  if (!canEdit) return <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-1">
        <Input autoFocus value={val} onChange={e => setVal(e.target.value)} className="h-7 text-xs" />
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={async () => {
          setSaving(true);
          await onSave(fieldId, val, isCustom);
          setSaving(false);
          setIsEditing(false);
        }}>שמור</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => { setVal(label); setIsEditing(false); }}>בטל</Button>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1 group">
      {label}
      <button type="button" onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit className="w-3 h-3" />
      </button>
    </label>
  );
};

const RepeaterFieldAccordion = ({ f, customFieldsValues, setCustomFieldsValues, handleSaveLabel }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const rows = customFieldsValues[f.id] || [];

  return (
    <div className="border border-white/5 rounded-xl bg-zinc-950/50 overflow-hidden transition-all duration-200 mt-2">
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
        className="w-full p-3 flex justify-between items-center bg-zinc-900 hover:bg-zinc-800/80 transition-colors border-b border-transparent cursor-pointer"
        style={{ borderColor: isOpen ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}
      >
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <EditableLabel label={f.label} fieldId={f.id} isCustom={true} onSave={handleSaveLabel} />
          <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{rows.length} פריטים</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
      </div>
      {isOpen && (
        <div className="p-3 space-y-3 bg-zinc-950/50">
          {rows.map((row: any, rIdx: number) => (
            <div key={rIdx} className="flex gap-3 items-end bg-zinc-900 p-3 rounded-lg border border-white/5 relative group transition-all hover:border-amber-500/30">
              <button type="button" onClick={() => {
                const newArr = [...rows];
                newArr.splice(rIdx, 1);
                setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
              }} className="absolute -left-2 -top-2 bg-zinc-800 text-red-400 hover:bg-red-500 hover:text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-sm">
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="flex-1 flex flex-wrap gap-2">
                {f.subFields?.map((sf: any) => (
                  <div key={sf.id} className="flex-1 min-w-[120px] group/field">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 group-focus-within/field:text-amber-400 transition-colors">{sf.label}</label>
                    <Input
                      type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                      value={row[sf.id] || ""}
                      onChange={(e) => {
                        const newArr = [...rows];
                        newArr[rIdx] = { ...newArr[rIdx], [sf.id]: e.target.value };
                        setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
                      }}
                      className="bg-zinc-950 border border-white/10 text-white h-9 rounded-lg text-xs px-3 placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all"
                      placeholder={sf.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button type="button" onClick={() => {
            setCustomFieldsValues({ ...customFieldsValues, [f.id]: [...rows, {}] });
          }} variant="ghost" className="w-full border border-dashed border-white/10 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 text-xs h-9 rounded-lg transition-all font-bold">
            <Plus className="w-3.5 h-3.5 ml-1" /> הוסף פריט ל{f.label}
          </Button>
        </div>
      )}
    </div>
  );
};

export function ContactModal({ isOpen, onClose, contact, onSuccess }: ContactModalProps) {
  const isEdit = !!contact;
  const [activeTab, setActiveTab] = useState<TabType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [systemLabels, setSystemLabels] = useState<Record<string, string>>({});

  const handleSaveLabel = async (fieldId: string, newLabel: string, isCustom: boolean) => {
    if (isCustom) {
      const res = await updateCustomField(fieldId, { label: newLabel });
      if (res.success) {
        setCustomFieldsConfig(prev => prev.map(f => f.id === fieldId ? { ...f, label: newLabel } : f));
      } else {
        alert("שגיאה בשמירת שם השדה: " + res.error);
      }
    } else {
      alert("שגיאה: עריכת שדות מערכת מותרת רק ממסך ההגדרות למנהל העל.");
    }
  };


  const handleSyncWhatsApp = async () => {
    if (!contact?.id || !contaPhone) return;
    setSyncing(true);
    try {
      const res = await syncContactMessages(contact.id, contaPhone);
      if (res.success) {
        alert(`סנכרון וואטסאפ הושלם! סונכרנו ${res.syncedCount} הודעות חדשות.`);
        onSuccess();
        onClose();
      } else {
        alert("שגיאה בסנכרון הודעות וואטסאפ.");
      }
    } catch (err: any) {
      alert("שגיאה בסנכרון: " + (err.message || err));
    } finally {
      setSyncing(false);
    }
  };

  // Form fields state

  const [contaName, setContaName] = useState("");
  const [fM, setFM] = useState("");
  const [contaPhone, setContaPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  
  const [tg1, setTg1] = useState("");
  const [tg2, setTg2] = useState("");
  const [tg3, setTg3] = useState("");
  const [notes, setNotes] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [lastFormName, setLastFormName] = useState("");

  const [workPhone, setWorkPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Campaign Fields State
  const [campaignId, setCampaignId] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignRole, setCampaignRole] = useState("donor");
  const [campaignDonationMode, setCampaignDonationMode] = useState<"recurring" | "one_time">("recurring");
  const [campaignAmount, setCampaignAmount] = useState<number | "">("");
  const [campaignMonthlyAmount, setCampaignMonthlyAmount] = useState<number | "">("");
  const [campaignRecurringMonths, setCampaignRecurringMonths] = useState<number | "">(12);
  const [campaignTier, setCampaignTier] = useState("");
  const [campaignIsAnonymous, setCampaignIsAnonymous] = useState(false);
  const [campaignDedication, setCampaignDedication] = useState("");
  const [campaignAmbassadorName, setCampaignAmbassadorName] = useState("");
  const [campaignPaymentStatus, setCampaignPaymentStatus] = useState<"pending" | "completed" | "failed">("completed");
  const [campaignPaymentMethod, setCampaignPaymentMethod] = useState("kesher_credit_card");
  const [campaignTransactionId, setCampaignTransactionId] = useState("");
  const [campaignReceiptUrl, setCampaignReceiptUrl] = useState("");
  const [campaignTargetGoal, setCampaignTargetGoal] = useState<number | "">("");
  const [campaignTotalRaised, setCampaignTotalRaised] = useState<number | "">("");
  const [campaignDonationsHistory, setCampaignDonationsHistory] = useState<any[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);

  // Repeater states
  const [events, setEvents] = useState<ContactEvent[]>([]);
  const [eventSubTab, setEventSubTab] = useState<"events" | "timeline">("events");
  const [customFieldsConfig, setCustomFieldsConfig] = useState<any[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, any>>({});

  // Custom Tabs State
  const [customTabsConfig, setCustomTabsConfig] = useState<any[]>([]);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("Folder");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);

  // Super Admin / User Details States
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userDetailsData, setUserDetailsData] = useState<any>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsSubTab, setUserDetailsSubTab] = useState<"dashboard" | "settings">("dashboard");
  const [userSaving, setUserSaving] = useState(false);

  useEffect(() => {
    getCustomFields().then(setCustomFieldsConfig);
    checkIsSuperAdmin().then(setIsSuperAdmin).catch(() => setIsSuperAdmin(false));
    getSystemFieldLabels().then(setSystemLabels);
    
    // Fetch all system pages and campaigns via GET API
    fetch("/api/campaigns")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.items)) {
          setAvailableCampaigns(data.items);
        } else {
          getAllCampaigns().then(camps => {
            if (Array.isArray(camps)) setAvailableCampaigns(camps);
          });
        }
      })
      .catch(err => {
        console.warn("GET /api/campaigns error:", err);
        getAllCampaigns().then(camps => {
          if (Array.isArray(camps)) setAvailableCampaigns(camps);
        });
      });
  }, []);


  const loadCustomTabs = async () => {
    const tabsRes = await getCustomTabs();
    if (Array.isArray(tabsRes)) {
       setCustomTabsConfig(tabsRes);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomTabs();
    }
  }, [isOpen]);

  // Initialize fields on open/contact change
  useEffect(() => {
    if (isOpen) {
      setError("");
      setActiveTab("" as any);
      setUserDetailsSubTab("dashboard");
      if (contact) {
        // Fetch User Details if Super Admin
        if (isSuperAdmin && (contact.email || contact.conta_phone)) {
          setUserDetailsLoading(true);
          getContactUserSettings(contact.email || "", contact.conta_phone || "")
            .then(res => {
              if (res.found) {
                setUserDetailsData(res);
              } else {
                setUserDetailsData(null);
              }
            })
            .catch(() => setUserDetailsData(null))
            .finally(() => setUserDetailsLoading(false));
        }
        
        setContaName(contact.conta_name || "");
        setFM(contact.f_m || "");
        setContaPhone(contact.conta_phone || "");
        setEmail(contact.email || "");
        setGender(contact.gender || "");
        setBirthDate(contact.birth_date || "");
        setCity(contact.mh_crm_city || "");
        setStreet(contact.mh_crm_street || "");
        setTg1(contact.tg1 || "");
        setTg2(contact.tg2 || "");
        setTg3(contact.tg3 || "");
        setNotes(contact.notes || "");
        setCompanyName(contact.company_name || "");
        setJobTitle(contact.job_title || "");
        setLeadSource(contact.lead_source || "");
        setLastFormName(contact.last_form_name || "");
        setWorkPhone(contact.work_phone || "");
        setWebsite(contact.website || "");

        // Initialize Campaign Fields
        setCampaignId(contact.campaign_id || "");
        setCampaignTitle(contact.campaign_title || "");
        setCampaignRole(contact.campaign_role || "donor");
        setCampaignDonationMode((contact.campaign_donation_mode as any) || (contact.is_standing_order ? "recurring" : "one_time"));
        setCampaignAmount(contact.campaign_amount ?? contact.total_donated ?? "");
        setCampaignMonthlyAmount(contact.campaign_monthly_amount ?? contact.monthly_amount ?? "");
        setCampaignRecurringMonths(contact.campaign_recurring_months ?? 12);
        setCampaignTier(contact.campaign_tier || "");
        setCampaignIsAnonymous(Boolean(contact.campaign_is_anonymous || contact.is_anonymous));
        setCampaignDedication(contact.campaign_dedication || contact.dedication || "");
        setCampaignAmbassadorName(contact.campaign_ambassador_name || contact.referred_by_ambassador || "");
        setCampaignPaymentStatus((contact.campaign_payment_status as any) || (contact.payment_status as any) || "completed");
        setCampaignPaymentMethod(contact.campaign_payment_method || "kesher_credit_card");
        setCampaignTransactionId(contact.campaign_transaction_id || "");
        setCampaignReceiptUrl(contact.campaign_receipt_url || "");
        setCampaignTargetGoal(contact.campaign_target_goal ?? "");
        setCampaignTotalRaised(contact.campaign_total_raised ?? "");
        setCampaignDonationsHistory(contact.campaign_donations_history || []);

        setEvents(contact.events || []);

        const dynamicValues: Record<string, any> = {};
        Object.keys(contact).forEach(k => {
          if (k.startsWith("custom_")) dynamicValues[k] = contact[k];
        });
        setCustomFieldsValues(dynamicValues);
      } else {
        
        // Reset fields for new contact
        setContaName("");
        setFM("");
        setContaPhone("");
        setEmail("");
        setGender("");
        setBirthDate("");
        setCity("");
        setStreet("");
        setTg1("");
        setTg2("");
        setTg3("");
        setNotes("");
        setCompanyName("");
        setJobTitle("");
        setLeadSource("");
        setLastFormName("");
        setWorkPhone("");
        setWebsite("");

        // Reset Campaign Fields
        setCampaignId("");
        setCampaignTitle("");
        setCampaignRole("donor");
        setCampaignDonationMode("recurring");
        setCampaignAmount("");
        setCampaignMonthlyAmount("");
        setCampaignRecurringMonths(12);
        setCampaignTier("");
        setCampaignIsAnonymous(false);
        setCampaignDedication("");
        setCampaignAmbassadorName("");
        setCampaignPaymentStatus("completed");
        setCampaignPaymentMethod("kesher_credit_card");
        setCampaignTransactionId("");
        setCampaignReceiptUrl("");
        setCampaignTargetGoal("");
        setCampaignTotalRaised("");
        setCampaignDonationsHistory([]);

        setEvents([]);
        setCustomFieldsValues({});
      }
    }
  }, [isOpen, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaName || !contaPhone) {
      setError("שם פרטי וטלפון הם שדות חובה");
      return;
    }

    setLoading(true);
    setError("");

    const data: Partial<Contact> = {
      conta_name: contaName,
      f_m: fM,
      conta_phone: contaPhone,
      email,
      gender,
      birth_date: birthDate,
      mh_crm_city: city,
      mh_crm_street: street,
      tg1,
      tg2,
      tg3,
      notes,
      company_name: companyName,
      job_title: jobTitle,
      lead_source: leadSource,
      last_form_name: lastFormName,
      work_phone: workPhone,
      website: website,
      events,
      // Campaign Fields
      campaign_id: campaignId || undefined,
      campaign_title: campaignTitle || (availableCampaigns.find(c => c.id === campaignId)?.title || undefined),
      campaign_role: campaignRole,
      campaign_donation_mode: campaignDonationMode,
      campaign_amount: campaignAmount !== "" ? Number(campaignAmount) : undefined,
      campaign_monthly_amount: campaignMonthlyAmount !== "" ? Number(campaignMonthlyAmount) : undefined,
      campaign_recurring_months: campaignRecurringMonths !== "" ? Number(campaignRecurringMonths) : undefined,
      campaign_tier: campaignTier || undefined,
      campaign_is_anonymous: Boolean(campaignIsAnonymous),
      campaign_dedication: campaignDedication,
      campaign_ambassador_name: campaignAmbassadorName || undefined,
      campaign_payment_status: campaignPaymentStatus,
      campaign_payment_method: campaignPaymentMethod,
      campaign_transaction_id: campaignTransactionId,
      campaign_receipt_url: campaignReceiptUrl,
      campaign_target_goal: campaignTargetGoal !== "" ? Number(campaignTargetGoal) : undefined,
      campaign_total_raised: campaignTotalRaised !== "" ? Number(campaignTotalRaised) : undefined,
      campaign_donations_history: campaignDonationsHistory,
      ...customFieldsValues,
    };


    try {
      if (isEdit && contact?.id) {
        await updateContact(contact.id, data);
      } else {
        await createContact(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "שגיאה בשמירת איש הקשר");
    } finally {
      setLoading(false);
    }
  };

  // Event handlers for Events Repeater
  const handleAddEvent = () => {
    const newEvent: ContactEvent = {
      time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
      title: "",
      text: "",
    };
    setEvents([...events, newEvent]);
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleUpdateEvent = (index: number, field: keyof ContactEvent, value: string) => {
    const updatedEvents = [...events];
    updatedEvents[index] = { ...updatedEvents[index], [field]: value };
    setEvents(updatedEvents);
  };

  const renderCustomFields = (category: string) => {
    const fields = customFieldsConfig.filter(f => f.category === category);
    
    return (
      <div className="mt-6 pt-6 border-t border-white/5 col-span-full">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider">שדות מותאמים אישית</h4>
          <Button type="button" onClick={() => setShowAddFieldModal(true)} className="bg-transparent border border-amber-500/50 hover:bg-amber-500/10 text-amber-500 rounded-xl text-xs py-1.5 px-3 flex items-center gap-2 transition-colors">
            <Plus className="w-3.5 h-3.5" /> הוסף שדה ללשונית זו
          </Button>
        </div>
        {fields.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-white/10 rounded-2xl text-amber-500/50 text-sm">
            אין עדיין שדות מותאמים אישית בלשונית זו.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f: any) => (
              <div key={f.id} className={`space-y-1.5 ${f.type === 'documents' || f.type === 'repeater' ? 'col-span-1 md:col-span-2' : ''}`}>
                {f.type !== 'repeater' && <EditableLabel label={f.label} fieldId={f.id} isCustom={true} onSave={handleSaveLabel} />}
                
                {f.type === 'documents' ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(customFieldsValues[f.id] || []).map((doc: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 bg-[#0a0a0a] text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs">
                          <a href={typeof doc === 'string' ? doc : doc.url} target="_blank" className="hover:underline max-w-[200px] truncate font-semibold">
                            {typeof doc === 'string' ? 'מסמך ' + (i+1) : doc.name}
                          </a>
                          <button type="button" onClick={() => {
                            const newDocs = [...(customFieldsValues[f.id] || [])];
                            newDocs.splice(i, 1);
                            setCustomFieldsValues({ ...customFieldsValues, [f.id]: newDocs });
                          }} className="text-amber-500/70 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <Input
                        type="file"
                        multiple
                        disabled={uploadingFieldId === f.id}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          setUploadingFieldId(f.id);
                          const newDocs = [...(customFieldsValues[f.id] || [])];
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await uploadMediaFile(formData);
                              if (res.success && res.url) {
                                newDocs.push({ name: file.name, url: res.url });
                              }
                            } catch (err) {
                              console.error("Upload failed", err);
                            }
                          }
                          setCustomFieldsValues({ ...customFieldsValues, [f.id]: newDocs });
                          setUploadingFieldId(null);
                          e.target.value = "";
                        }}
                        className="bg-transparent border border-amber-500 text-white rounded-xl text-xs py-2 h-auto focus-visible:ring-amber-500 focus-visible:border-amber-500"
                      />
                      {uploadingFieldId === f.id && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-md">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> מעלה...
                        </div>
                      )}
                    </div>
                  </div>
                ) : f.type === 'repeater' ? (
                  <RepeaterFieldAccordion f={f} customFieldsValues={customFieldsValues} setCustomFieldsValues={setCustomFieldsValues} handleSaveLabel={handleSaveLabel} />
                ) : f.type === "textarea" ? (
                  <textarea
                    value={customFieldsValues[f.id] || ""}
                    onChange={(e) => setCustomFieldsValues(prev => ({...prev, [f.id]: e.target.value}))}
                    rows={3}
                    className="flex w-full rounded-2xl bg-transparent border border-amber-500 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 placeholder:text-white/30"
                  />
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={customFieldsValues[f.id] || ""}
                    onChange={(e) => setCustomFieldsValues(prev => ({...prev, [f.id]: e.target.value}))}
                    className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleTabClick = (tabName: TabType | string) => {
    if (activeTab === tabName) {
      setActiveTab("" as any);
    } else {
      setActiveTab(tabName as any);
      setTimeout(() => {
        const el = document.getElementById(`tab-${tabName}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className="w-11/12 max-w-[450px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-6 sm:p-8 bg-[#0a0a0a] border border-white/10 [&::-webkit-scrollbar]:hidden">
        <div dir="rtl" className="w-full relative">
          <Modal.Close className="left-4 top-4 right-auto text-white bg-white/10 hover:bg-white/20 p-2 rounded-full z-50 w-8 h-8 flex items-center justify-center transition-all" />
          {isEdit ? (
            <div className="flex flex-col items-center text-center space-y-6 border-b border-white/5 pb-8 mb-6 mt-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white ring-4 ring-white/10 bg-[#1a1a1a]">
                {getInitials(contaName, fM)}
              </div>
              
              <div className="flex items-center justify-center gap-6 w-full max-w-sm">
                {contaPhone ? (
                  <button 
                    type="button"
                    className="w-14 h-14 rounded-full border-2 flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
                    style={{ borderColor: "#2b2756", color: "#818cf8", backgroundColor: "transparent" }}
                    onClick={() => window.location.href = `tel:${contaPhone}`}
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                ) : <div className="w-14 h-14 shrink-0" />}
                
                <div 
                  className="text-3xl font-black text-white truncate max-w-[200px] drop-shadow-md"
                  style={{ color: "#ffffff" }}
                >
                  {contaName} {fM}
                </div>
                
                {contaPhone ? (
                  <button 
                    type="button"
                    className="w-14 h-14 rounded-full border-2 flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
                    style={{ borderColor: "#123b24", color: "#25d366", backgroundColor: "transparent" }}
                    onClick={() => window.open(`https://wa.me/${contaPhone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                ) : <div className="w-14 h-14 shrink-0" />}

                {isSuperAdmin && contact?.isUser && contact?.systemUserId && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await impersonateUser(contact.systemUserId!);
                        window.location.href = "/dashboard";
                      } catch (err: any) {
                        alert("שגיאה בהתחברות כמשתמש: " + (err.message || err));
                      }
                    }}
                    className="w-14 h-14 rounded-full border-2 border-amber-500/30 text-amber-500 flex items-center justify-center hover:bg-amber-500/10 transition-colors shrink-0 tooltip-trigger"
                    title="התחבר ולנהל משתמש זה"
                  >
                    <Settings className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center mb-8 mt-4">
              <h2 className="text-2xl font-black text-white mb-2">הוספת איש קשר חדש</h2>
              <p className="text-sm text-gray-400 font-medium">מלא את שדות החובה להוספת איש קשר חדש למערכת</p>
            </div>
          )}

        {error && (
          <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold border border-red-100 animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Content: Details */}
          <div className="w-full flex flex-col mb-3">
            <button
              type="button"
              id="tab-details"
              onClick={() => handleTabClick("details")}
              className={`w-full h-[68px] px-4 hover:bg-[#1a1a1a] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-all rounded-2xl border border-white/5 bg-[#141414] ${activeTab === "details" ? "ring-1 ring-indigo-500/50" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <span>פרטים כלליים</span>
              </div>
              {activeTab === "details" ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            {activeTab === "details" && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">מידע בסיסי</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_name'] || "שם פרטי *"}</label>
                    <Input
                      value={contaName}
                      onChange={(e) => setContaName(e.target.value)}
                      required
                      placeholder="הקלד שם פרטי..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_last_name'] || "שם משפחה"}</label>
                    <Input
                      value={fM}
                      onChange={(e) => setFM(e.target.value)}
                      placeholder="הקלד שם משפחה..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_gender'] || "מגדר"}</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      <option value="">בחר מגדר...</option>
                      <option value="זכר">זכר</option>
                      <option value="נקבה">נקבה</option>
                      <option value="אחר">אחר</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_birthdate'] || "תאריך לידה"}</label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">פרטי יצירת קשר וכתובת</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_phone'] || "טלפון נייד *"}</label>
                    <Input
                      value={contaPhone}
                      onChange={(e) => setContaPhone(e.target.value)}
                      required
                      placeholder="05x-xxxxxxx"
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_email'] || "דואר אלקטרוני"}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_city'] || "עיר"}</label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="אזור מגורים..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_street'] || "רחוב"}</label>
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="רחוב ומספר..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                </div>
              </div>
              {renderCustomFields("details")}
            </div>
              </div>
          )}
          </div>

          {isSuperAdmin && isEdit && (
            <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
              <button
                type="button"
                id="tab-userDetails"
                onClick={() => handleTabClick("userDetails")}
                className={`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${activeTab === "userDetails" ? "ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] z-10 relative" : "border-b border-white/5"}`}
              >
                <span className="flex items-center gap-3 text-white">
                  <Settings className="w-4 h-4 text-emerald-500" />
                  פרטי משתמש (הגדרות)
                </span>
                {activeTab === "userDetails" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              {activeTab === "userDetails" && (
                <div className="p-6 bg-[#111] animate-in fade-in duration-200">
                  <div className="space-y-6 animate-in fade-in">
                    {userDetailsLoading ? (
                      <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
                    ) : !userDetailsData ? (
                      <div className="text-center text-slate-400 p-8">לא נמצא משתמש רשום עם מספר הטלפון או האימייל של איש קשר זה.</div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex gap-4 border-b border-white/10 pb-2">
                          <button
                            type="button"
                            onClick={() => setUserDetailsSubTab("dashboard")}
                            className={`text-sm font-bold pb-2 border-b-2 ${userDetailsSubTab === "dashboard" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400"}`}
                          >
                            מלוח ראשי
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserDetailsSubTab("settings")}
                            className={`text-sm font-bold pb-2 border-b-2 ${userDetailsSubTab === "settings" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400"}`}
                          >
                            מלוח הגדרות (מפתחות)
                          </button>
                        </div>

                        {userDetailsSubTab === "dashboard" && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">נתוני משתמש</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm text-white">
                              <div className="bg-[#181818] p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs mb-1">מזהה משתמש</div>
                                <div className="font-mono text-xs">{userDetailsData.userId}</div>
                              </div>
                              <div className="bg-[#181818] p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs mb-1">סוג הרשאה</div>
                                <div className="font-bold">{userDetailsData.userData.role}</div>
                              </div>
                              <div className="bg-[#181818] p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs mb-1">תאריך הרשמה</div>
                                <div>{new Date(userDetailsData.userData.createdAt).toLocaleDateString("he-IL")}</div>
                              </div>
                              {userDetailsData.userData.role === "TRIAL" && (
                                <div className="bg-[#181818] p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
                                  <div className="text-emerald-500/70 text-xs mb-1">תפוגת ניסיון</div>
                                  <div className="font-bold">{userDetailsData.userData.trialExpiresAt ? new Date(userDetailsData.userData.trialExpiresAt).toLocaleDateString("he-IL") : "-"}</div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-white mt-4">
                              <div className="bg-[#181818] p-3 rounded-xl border border-white/5 col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-slate-400 block mb-1">שם משתמש (התחברות)</label>
                                <Input
                                  value={userDetailsData.userData.username || ""}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, userData: {...userDetailsData.userData, username: e.target.value}})}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                  dir="ltr"
                                />
                              </div>
                              <div className="bg-[#181818] p-3 rounded-xl border border-white/5 col-span-2 md:col-span-1">
                                <label className="text-xs font-bold text-slate-400 block mb-1">סיסמה</label>
                                <Input
                                  value={userDetailsData.userData.password || ""}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, userData: {...userDetailsData.userData, password: e.target.value}})}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                  dir="ltr"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {userDetailsSubTab === "settings" && (
                          <div className="space-y-6">
                            {/* Google AI */}
                            <div className="space-y-2">
                              <h5 className="text-xs font-bold text-emerald-500">Google AI (Gemini)</h5>
                              <div className="flex items-center gap-2 mb-2">
                                <input 
                                  type="checkbox" 
                                  id="aiUseAdminKey"
                                  checked={userDetailsData.settings.ai?.useAdminKey || false}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, ai: {...userDetailsData.settings.ai, useAdminKey: e.target.checked}}})}
                                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 cursor-pointer accent-emerald-500"
                                />
                                <label htmlFor="aiUseAdminKey" className="text-xs text-slate-300 cursor-pointer">השתמש במפתחות מנהל (Admin)</label>
                              </div>
                              {!userDetailsData.settings.ai?.useAdminKey && (
                                <Input
                                  value={userDetailsData.settings.ai?.googleAiKey || ""}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, ai: {...userDetailsData.settings.ai, googleAiKey: e.target.value}}})}
                                  placeholder="מפתח API..."
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                                  dir="ltr"
                                />
                              )}
                            </div>
                            
                            {/* WhatsApp */}
                            <div className="space-y-2 border-t border-white/5 pt-4">
                              <h5 className="text-xs font-bold text-emerald-500">WhatsApp (Green API)</h5>
                              <div className="flex items-center gap-2 mb-2">
                                <input 
                                  type="checkbox" 
                                  id="waUseAdminKey"
                                  checked={userDetailsData.settings.whatsapp?.useAdminKey || false}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, whatsapp: {...userDetailsData.settings.whatsapp, useAdminKey: e.target.checked}}})}
                                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 cursor-pointer accent-emerald-500"
                                />
                                <label htmlFor="waUseAdminKey" className="text-xs text-slate-300 cursor-pointer">השתמש במפתחות מנהל (Admin)</label>
                              </div>
                              {!userDetailsData.settings.whatsapp?.useAdminKey && (
                                <div className="flex gap-2">
                                  <Input
                                    value={userDetailsData.settings.whatsapp?.idInstance || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, whatsapp: {...userDetailsData.settings.whatsapp, idInstance: e.target.value}}})}
                                    placeholder="ID Instance"
                                    className="w-1/3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                                    dir="ltr"
                                  />
                                  <Input
                                    value={userDetailsData.settings.whatsapp?.apiToken || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, whatsapp: {...userDetailsData.settings.whatsapp, apiToken: e.target.value}}})}
                                    placeholder="API Token"
                                    className="w-2/3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                                    dir="ltr"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Kesher / EasyCount */}
                            <div className="space-y-2 border-t border-white/5 pt-4">
                              <h5 className="text-xs font-bold text-emerald-500">קשר ואיזיקאונט (סליקה וחשבוניות)</h5>
                              <div className="flex items-center gap-2 mb-2">
                                <input 
                                  type="checkbox" 
                                  id="ksUseAdminKey"
                                  checked={userDetailsData.settings.kesher?.useAdminKey || false}
                                  onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, kesher: {...userDetailsData.settings.kesher, useAdminKey: e.target.checked}}})}
                                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 cursor-pointer accent-emerald-500"
                                />
                                <label htmlFor="ksUseAdminKey" className="text-xs text-slate-300 cursor-pointer">השתמש במפתחות מנהל (Admin)</label>
                              </div>
                              {!userDetailsData.settings.kesher?.useAdminKey && (
                                <>
                                  <Input
                                    value={userDetailsData.settings.kesher?.userName || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, kesher: {...userDetailsData.settings.kesher, userName: e.target.value}}})}
                                    placeholder="Kesher Username"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white mb-2"
                                    dir="ltr"
                                  />
                                  <Input
                                    value={userDetailsData.settings.kesher?.apiKey || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, kesher: {...userDetailsData.settings.kesher, apiKey: e.target.value}}})}
                                    placeholder="Kesher API Key / Password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white mb-2"
                                    dir="ltr"
                                  />
                                  <Input
                                    value={userDetailsData.settings.kesher?.paymentPageId || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, kesher: {...userDetailsData.settings.kesher, paymentPageId: e.target.value}}})}
                                    placeholder="Kesher Payment Page ID"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white mb-2"
                                    dir="ltr"
                                  />
                                  <Input
                                    value={userDetailsData.settings.kesher?.ezCountToken || ""}
                                    onChange={(e) => setUserDetailsData({...userDetailsData, settings: {...userDetailsData.settings, kesher: {...userDetailsData.settings.kesher, ezCountToken: e.target.value}}})}
                                    placeholder="EasyCount Token"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                                    dir="ltr"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <Button
                          type="button"
                          disabled={userSaving}
                          onClick={async () => {
                            setUserSaving(true);
                            const res = await saveContactUserSettings(userDetailsData.userId, userDetailsData.settings, userDetailsData.userData);
                            setUserSaving(false);
                            if (res.success) alert("פרטי המשתמש והגדרותיו נשמרו בהצלחה!");
                            else alert("שגיאה: " + res.error);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl mt-4"
                        >
                          {userSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "שמור הגדרות ופרטי משתמש"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Tags & Notes */}
          <div className="w-full flex flex-col mb-3">
            <button
              type="button"
              id="tab-tags"
              onClick={() => handleTabClick("tags")}
              className={`w-full h-[68px] px-4 hover:bg-[#1a1a1a] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-all rounded-2xl border border-white/5 bg-[#141414] ${activeTab === "tags" ? "ring-1 ring-indigo-500/50" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-gray-400" />
                </div>
                <span>תיוגים והערות</span>
              </div>
              {activeTab === "tags" ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            {activeTab === "tags" && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">תוויות ותיוג</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_tag1'] || "תג 1"}</label>
                    <Input
                      value={tg1}
                      onChange={(e) => setTg1(e.target.value)}
                      placeholder="הקלד תגית 1..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_tag2'] || "תג 2"}</label>
                    <Input
                      value={tg2}
                      onChange={(e) => setTg2(e.target.value)}
                      placeholder="הקלד תגית 2..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_tag3'] || "תג 3"}</label>
                    <Input
                      value={tg3}
                      onChange={(e) => setTg3(e.target.value)}
                      placeholder="הקלד תגית 3..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-500">הערות כלליות</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  placeholder="רשום הערות, תזכורות או מידע חשוב על איש הקשר..."
                  className="flex w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              {renderCustomFields("tags")}
            </div>
              </div>
          )}
          </div>

          {/* Tab Content: Company & Lead Source */}
          <div className="w-full flex flex-col mb-3">
            <button
              type="button"
              id="tab-company"
              onClick={() => handleTabClick("company")}
              className={`w-full h-[68px] px-4 hover:bg-[#1a1a1a] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-all rounded-2xl border border-white/5 bg-[#141414] ${activeTab === "company" ? "ring-1 ring-indigo-500/50" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <Building className="w-4 h-4 text-gray-400" />
                </div>
                <span>חברה ומקור</span>
              </div>
              {activeTab === "company" ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            {activeTab === "company" && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">מידע על החברה</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_company'] || "שם החברה / ארגון"}</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="שם העסק..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_title'] || "תפקיד"}</label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="תפקיד בארגון..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_work_phone'] || "טלפון עבודה"}</label>
                    <Input
                      value={workPhone}
                      onChange={(e) => setWorkPhone(e.target.value)}
                      placeholder="טלפון משרדי..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_website'] || "אתר אינטרנט"}</label>
                    <Input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">מקור לידים ומעקב</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">{systemLabels['conta_lead_source'] || "מקור הליד"}</label>
                    <select
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value)}
                      className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                    >
                      <option value="">בחר מקור...</option>
                      <option value="טופס מהאתר">טופס מהאתר</option>
                      <option value="פייסבוק">פייסבוק</option>
                      <option value="גוגל">גוגל</option>
                      <option value="המלצה">המלצה</option>
                      <option value="כנס">כנס</option>
                      <option value="אחר">אחר</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-500">טופס אחרון שהוגש</label>
                    <Input
                      value={lastFormName}
                      onChange={(e) => setLastFormName(e.target.value)}
                      placeholder="שם הטופס..."
                      className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                      disabled
                    />
                  </div>
                </div>
              </div>
              {renderCustomFields("company")}
            </div>
              </div>
          )}
          </div>

          {/* Tab Content: Events Repeater */}
          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
            <button
              type="button"
              id="tab-events"
              onClick={() => handleTabClick("events")}
              className={`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${activeTab === "events" ? "ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] z-10 relative" : "border-b border-white/5"}`}
            >
              <span className="flex items-center gap-3 text-white">
                <Calendar className="w-4 h-4" />
                אירועים ומפגשים
              </span>
              {activeTab === "events" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {activeTab === "events" && isEdit && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
                <InteractionsList contactId={contact?.id || ""} contactName={contact?.conta_name || ""} />
                {renderCustomFields("events")}
              </div>
            )}
          </div>

          {/* Tab Content: Campaigns */}
          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
            <button
              type="button"
              id="tab-camp"
              onClick={() => handleTabClick("camp")}
              className={`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${activeTab === "camp" ? "ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] z-10 relative" : "border-b border-white/5"}`}
            >
              <div className="flex items-center gap-3 text-white">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <span className="font-bold">קמפיינים ותרומות</span>
                {campaignAmount !== "" && (
                  <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    ₪{Number(campaignAmount).toLocaleString()} • {campaignPaymentStatus === "pending" ? "ממתין לתשלום" : campaignPaymentStatus === "completed" ? "הושלם" : "נכשל"}
                  </span>
                )}
              </div>
              {activeTab === "camp" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {activeTab === "camp" && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* Campaign Association & Role */}
                  <div>
                    <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">שיוך וסטטוס קמפיין</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">קמפיין מקושר</label>
                        <select
                          value={campaignId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCampaignId(val);
                            const selectedCamp = availableCampaigns.find(c => c.id === val);
                            if (selectedCamp) setCampaignTitle(selectedCamp.title);
                          }}
                          className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 font-medium"
                        >
                          <option value="">בחר עמוד / קמפיין מקושר...</option>
                          {Object.entries(
                            availableCampaigns.reduce((acc: Record<string, any[]>, item: any) => {
                              const cat = item.category || "קמפיינים";
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(item);
                              return acc;
                            }, {})
                          ).map(([category, items]) => (
                            <optgroup key={category} label={category} className="bg-[#181818] text-amber-400 font-bold">
                              {(items as any[]).map((c: any) => (
                                <option key={c.id} value={c.id} className="bg-[#0a0a0a] text-white font-normal">
                                  {c.title} {c.id !== "home" ? `(${c.id})` : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">תפקיד בקמפיין</label>
                        <select
                          value={campaignRole}
                          onChange={(e) => setCampaignRole(e.target.value)}
                          className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                        >
                          <option value="donor">תורם</option>
                          <option value="ambassador">שגריר / מוביל יעד</option>
                          <option value="leader">ראש צוות / קבוצה</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">סטטוס תשלום</label>
                        <select
                          value={campaignPaymentStatus}
                          onChange={(e) => setCampaignPaymentStatus(e.target.value as any)}
                          className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 font-bold"
                        >
                          <option value="completed">הושלם (Completed)</option>
                          <option value="pending">ממתין לתשלום (Pending)</option>
                          <option value="failed">נכשל / בוטל (Failed)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">שגריר מיוחס / מפנה</label>
                        <Input
                          value={campaignAmbassadorName}
                          onChange={(e) => setCampaignAmbassadorName(e.target.value)}
                          placeholder="שם השגריר שהביא את התרומה..."
                          className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Donation Amounts & Details */}
                  <div>
                    <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">סכום ומסלול תרומה</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">סוג תרומה</label>
                        <select
                          value={campaignDonationMode}
                          onChange={(e) => setCampaignDonationMode(e.target.value as any)}
                          className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                        >
                          <option value="recurring">הוראת קבע חודשית</option>
                          <option value="one_time">תרומה חד פעמית</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">סכום כולל (₪)</label>
                        <Input
                          type="number"
                          value={campaignAmount}
                          onChange={(e) => setCampaignAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="למשל: 360"
                          className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 font-bold"
                        />
                      </div>

                      {campaignDonationMode === "recurring" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-amber-500">סכום חודשי (₪)</label>
                            <Input
                              type="number"
                              value={campaignMonthlyAmount}
                              onChange={(e) => setCampaignMonthlyAmount(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="למשל: 180"
                              className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-amber-500">מספר חודשים</label>
                            <Input
                              type="number"
                              value={campaignRecurringMonths}
                              onChange={(e) => setCampaignRecurringMonths(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="12"
                              className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">מדרגת תרומה</label>
                        <Input
                          value={campaignTier}
                          onChange={(e) => setCampaignTier(e.target.value)}
                          placeholder="למשל: שותף, תומך, ידיד..."
                          className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dedication & Anonymity */}
                  <div>
                    <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">הקדשה ונראות פומבית</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="crmCampaignIsAnonymous"
                          checked={campaignIsAnonymous}
                          onChange={(e) => setCampaignIsAnonymous(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-500/50 bg-[#0a0a0a] text-amber-500 cursor-pointer accent-amber-500"
                        />
                        <label htmlFor="crmCampaignIsAnonymous" className="text-xs text-slate-300 font-semibold cursor-pointer">
                          תרומה אנונימית (השם לא יוצג ברשימת התורמים הפומבית)
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">הקדשה / ברכה (מוצג בלוח התורמים)</label>
                        <textarea
                          value={campaignDedication}
                          onChange={(e) => setCampaignDedication(e.target.value)}
                          rows={3}
                          placeholder="לזכות, לרפואת, לעילוי נשמת או ברכה מכל הלב..."
                          className="flex w-full rounded-2xl bg-transparent border border-amber-500 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 placeholder:text-white/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment & Receipt Information */}
                  <div>
                    <h4 className="text-sm font-black text-slate-400 mb-3 uppercase tracking-wider">פרטי סליקה, אסמכתא וקבלה</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">אמצעי תשלום</label>
                        <select
                          value={campaignPaymentMethod}
                          onChange={(e) => setCampaignPaymentMethod(e.target.value)}
                          className="flex h-10 w-full bg-[#0a0a0a] border border-amber-500 text-white rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                        >
                          <option value="kesher_credit_card">כרטיס אשראי (Kesher API)</option>
                          <option value="kesher_standing_order">הוראת קבע אשראי (Kesher API)</option>
                          <option value="bank_transfer">העברה בנקאית</option>
                          <option value="bit">ביט / PayBox</option>
                          <option value="cash">מזומן</option>
                          <option value="check">צ'ק</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">מספר אישור עסקה / אסמכתא</label>
                        <Input
                          value={campaignTransactionId}
                          onChange={(e) => setCampaignTransactionId(e.target.value)}
                          placeholder="Transaction ID / Ref..."
                          className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 font-mono text-xs"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-amber-500">קישור לקבלה (PDF)</label>
                        <div className="flex gap-2">
                          <Input
                            value={campaignReceiptUrl}
                            onChange={(e) => setCampaignReceiptUrl(e.target.value)}
                            placeholder="https://..."
                            className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-xs"
                            dir="ltr"
                          />
                          {campaignReceiptUrl && (
                            <a
                              href={campaignReceiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
                              title="פתח קבלה"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ambassador Specific Target Info (if role is ambassador) */}
                  {campaignRole === "ambassador" && (
                    <div>
                      <h4 className="text-sm font-black text-amber-500 mb-3 uppercase tracking-wider">יעדי שגריר אישיים</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-amber-500">יעד אישי לשגריר (₪)</label>
                          <Input
                            type="number"
                            value={campaignTargetGoal}
                            onChange={(e) => setCampaignTargetGoal(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="למשל: 10000"
                            className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 font-bold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-amber-500">סך שגויס בפועל (₪)</label>
                          <Input
                            type="number"
                            value={campaignTotalRaised}
                            onChange={(e) => setCampaignTotalRaised(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="0"
                            className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign Donations History List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">היסטוריית תרומות בקמפיין</h4>
                      <Button
                        type="button"
                        onClick={() => {
                          const newRecord = {
                            id: `man_${Date.now()}`,
                            campaignId: campaignId || "default-campaign",
                            campaignTitle: campaignTitle || "קמפיין ראשי",
                            amount: 180,
                            paymentStatus: "completed",
                            paymentMethod: "kesher_credit_card",
                            date: new Date().toISOString(),
                          };
                          setCampaignDonationsHistory([...campaignDonationsHistory, newRecord]);
                        }}
                        className="bg-transparent border border-amber-500/50 hover:bg-amber-500/10 text-amber-500 rounded-xl text-xs py-1 px-2.5 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> הוסף תרומה לרשימה
                      </Button>
                    </div>

                    {campaignDonationsHistory.length === 0 ? (
                      <div className="p-6 text-center border border-white/5 rounded-2xl text-slate-500 text-xs bg-[#141414]">
                        טרם נרשמו תרומות קמפיין נוספות לאיש קשר זה.
                      </div>
                    ) : (
                      <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#141414] max-h-[220px] overflow-y-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-[#1c1c1c] border-b border-white/5 font-bold text-amber-500 sticky top-0">
                            <tr>
                              <th className="p-3">סכום</th>
                              <th className="p-3">קמפיין</th>
                              <th className="p-3">תאריך</th>
                              <th className="p-3">סטטוס</th>
                              <th className="p-3">קבלה / חשבונית</th>
                              <th className="p-3 text-left">פעולות</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {campaignDonationsHistory.map((item, idx) => (
                              <tr key={idx} className="hover:bg-[#181818] transition-colors">
                                <td className="p-3 font-bold text-white">₪{Number(item.amount || 0).toLocaleString()}</td>
                                <td className="p-3 truncate max-w-[120px]">{item.campaignTitle || item.campaignId || "-"}</td>
                                <td className="p-3">{item.date ? new Date(item.date).toLocaleDateString("he-IL") : "-"}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.paymentStatus === "completed"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : item.paymentStatus === "pending"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  }`}>
                                    {item.paymentStatus === "completed" ? "הושלם" : item.paymentStatus === "pending" ? "ממתין לתשלום" : "נכשל"}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {item.receiptUrl || item.receiptLink ? (
                                    <a
                                      href={item.receiptUrl || item.receiptLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                      title="פתח קבלה / חשבונית בטאב חדש"
                                    >
                                      <FileText className="w-3 h-3 text-amber-400" />
                                      <span>קבלה</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCampaignDonationsHistory(campaignDonationsHistory.filter((_, i) => i !== idx));
                                    }}
                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                    title="מחק רשומה"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Tab Content: Payments */}
          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
            <button
              type="button"
              id="tab-payments"
              onClick={() => handleTabClick("payments")}
              className={`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${activeTab === "payments" ? "ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] z-10 relative" : "border-b border-white/5"}`}
            >

              <span className="flex items-center gap-3 text-white">
                <CreditCard className="w-4 h-4" />
                תשלומים
              </span>
              {activeTab === "payments" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {activeTab === "payments" && isEdit && (
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
            <div className="space-y-6 animate-in fade-in">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">סיכום רכישות והיסטוריית הזמנות</h4>

              {/* Stats Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-emerald-600">סה"כ תרומות ותשלומים</span>
                  <span className="text-xl font-black text-emerald-800 mt-1">₪{(contact?.total_spent || 0).toFixed(2)}</span>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-indigo-600">מספר עסקאות</span>
                  <span className="text-xl font-black text-indigo-800 mt-1">{contact?.order_count || 0}</span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-amber-600">עסקה אחרונה</span>
                  <span className="text-xs font-black text-amber-800 mt-2 truncate">
                    {contact?.last_order_date ? new Date(contact.last_order_date).toLocaleDateString("he-IL") : "אין עדיין"}
                  </span>
                </div>
              </div>

              {/* Order List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400">פירוט עסקאות ותשלומים</h5>
                {(!contact?.payments || contact.payments.length === 0) && (!campaignDonationsHistory || campaignDonationsHistory.length === 0) ? (
                  <div className="p-6 text-center border border-white/5 rounded-2xl text-slate-500 text-xs bg-[#141414]">
                    לא נמצאה היסטוריית תשלומים עבור איש קשר זה.
                  </div>
                ) : (
                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#141414] shadow-sm max-h-[300px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#1c1c1c] border-b border-white/5 font-bold text-amber-500 sticky top-0">
                        <tr>
                          <th className="p-3">סכום</th>
                          <th className="p-3">אמצעי תשלום / קמפיין</th>
                          <th className="p-3">תאריך</th>
                          <th className="p-3">סטטוס</th>
                          <th className="p-3">מספר עסקה</th>
                          <th className="p-3">קבלה / חשבונית</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {/* Display payments if exist */}
                        {contact?.payments && contact.payments.length > 0 ? (
                          contact.payments.map((p: any, idx: number) => {
                            const receipt = p.receiptLink || p.receiptUrl;
                            return (
                              <tr key={`p_${idx}`} className="hover:bg-[#181818] transition-colors">
                                <td className="p-3 font-bold text-white">₪{Number(p.amount || 0).toLocaleString()}</td>
                                <td className="p-3 text-slate-400">{p.method || "אשראי / קשר"}</td>
                                <td className="p-3">{p.date ? new Date(p.date).toLocaleDateString("he-IL") : "-"}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.status === "success" || p.status === "completed"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : p.status === "pending"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  }`}>
                                    {p.status === "success" || p.status === "completed" ? "הושלם" : p.status === "pending" ? "ממתין לתשלום" : "נכשל"}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-slate-400">{p.transactionId || "-"}</td>
                                <td className="p-3">
                                  {receipt ? (
                                    <a
                                      href={receipt}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                      title="צפה בקבלה באיזיקאונט"
                                    >
                                      <FileText className="w-3 h-3 text-amber-400" />
                                      <span>קבלה {p.docNumber ? `#${p.docNumber}` : ""}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          campaignDonationsHistory.map((d: any, idx: number) => {
                            const receipt = d.receiptUrl || d.receiptLink;
                            return (
                              <tr key={`d_${idx}`} className="hover:bg-[#181818] transition-colors">
                                <td className="p-3 font-bold text-white">₪{Number(d.amount || 0).toLocaleString()}</td>
                                <td className="p-3 text-slate-400">{d.campaignTitle || d.paymentMethod || "קמפיין"}</td>
                                <td className="p-3">{d.date ? new Date(d.date).toLocaleDateString("he-IL") : "-"}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    d.paymentStatus === "completed"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : d.paymentStatus === "pending"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  }`}>
                                    {d.paymentStatus === "completed" ? "הושלם" : d.paymentStatus === "pending" ? "ממתין לתשלום" : "נכשל"}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-slate-400">{d.transactionId || "-"}</td>
                                <td className="p-3">
                                  {receipt ? (
                                    <a
                                      href={receipt}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                      title="צפה בקבלה"
                                    >
                                      <FileText className="w-3 h-3 text-amber-400" />
                                      <span>קבלה</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
              </div>
          )}
          </div>

          {/* Tab Content: AI Stats */}
          {contact?.isUser && contact?.systemUserId && (
            <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
              <button
                type="button"
                id="tab-aistats"
                onClick={() => handleTabClick("aistats")}
                className={`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${activeTab === "aistats" ? "ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] z-10 relative" : "border-b border-white/5"}`}
              >
                <span className="flex items-center gap-3 text-white">
                  <Zap className="w-4 h-4 text-amber-500" />
                  שימוש בבינה מלאכותית
                </span>
                {activeTab === "aistats" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              {activeTab === "aistats" && isEdit && (
                <AiStatsView 
                  contact={contact} 
                  systemUserId={contact.systemUserId} 
                  onCoinsUpdate={() => onSuccess()} 
                />
              )}
            </div>
          )}

          {/* Custom Tabs */}
          {customTabsConfig.map(tab => {
             let IconCmp = Plus;
             if (tab.icon === "Star") IconCmp = require("lucide-react").Star;
             else if (tab.icon === "Heart") IconCmp = require("lucide-react").Heart;
             else if (tab.icon === "Briefcase") IconCmp = require("lucide-react").Briefcase;
             else if (tab.icon === "Zap") IconCmp = require("lucide-react").Zap;
             else if (tab.icon === "Globe") IconCmp = require("lucide-react").Globe;
             else IconCmp = require("lucide-react").Folder;

             return (
              <div key={tab.id} className="w-full flex flex-col mb-3">
                <button
                  type="button"
                  id={`tab-${tab.id}`}
                  onClick={() => handleTabClick(tab.id as any)}
                  className={`w-full h-[68px] px-4 hover:bg-[#1a1a1a] flex items-center justify-between font-bold text-emerald-400 text-sm cursor-pointer transition-all rounded-2xl border border-white/5 bg-[#141414] ${activeTab === tab.id ? "ring-1 ring-emerald-500/50" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <IconCmp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span>{tab.title}</span>
                  </div>
                  {activeTab === tab.id ? <ChevronUp className="h-5 w-5 text-emerald-500" /> : <ChevronDown className="h-5 w-5 text-emerald-500" />}
                </button>
                {activeTab === tab.id && (
                  <div className="p-6 bg-[#111] animate-in fade-in duration-200">
                    <div className="flex justify-end mb-4">
                      <Button type="button" onClick={() => setShowAddFieldModal(true)} className="bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs py-1.5 px-3 flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> הוסף שדה ללשונית זו
                      </Button>
                    </div>
                    {customFieldsConfig.filter(f => f.category === tab.id).length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-slate-500 text-sm">
                        אין עדיין שדות בלשונית זו.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customFieldsConfig.filter(f => f.category === tab.id).map((f: any) => (
                          <div key={f.id} className={`space-y-1.5 ${f.type === 'documents' || f.type === 'repeater' ? 'col-span-1 md:col-span-2' : ''}`}>
                            {f.type !== 'repeater' && <EditableLabel label={f.label} fieldId={f.id} isCustom={true} onSave={handleSaveLabel} />}
                            
                            {f.type === 'documents' ? (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {(customFieldsValues[f.id] || []).map((doc: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs">
                                      <a href={typeof doc === 'string' ? doc : doc.url} target="_blank" className="hover:underline max-w-[200px] truncate font-semibold">
                                        {typeof doc === 'string' ? 'מסמך ' + (i+1) : doc.name}
                                      </a>
                                      <button type="button" onClick={() => {
                                        const newDocs = [...(customFieldsValues[f.id] || [])];
                                        newDocs.splice(i, 1);
                                        setCustomFieldsValues({ ...customFieldsValues, [f.id]: newDocs });
                                      }} className="text-indigo-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 relative">
                                  <Input
                                    type="file"
                                    multiple
                                    disabled={uploadingFieldId === f.id}
                                    onChange={async (e) => {
                                      const files = e.target.files;
                                      if (!files || files.length === 0) return;
                                      setUploadingFieldId(f.id);
                                      const newDocs = [...(customFieldsValues[f.id] || [])];
                                      for (let i = 0; i < files.length; i++) {
                                        const file = files[i];
                                        const formData = new FormData();
                                        formData.append("file", file);
                                        try {
                                          const res = await uploadMediaFile(formData);
                                          if (res.success && res.url) {
                                            newDocs.push({ name: file.name, url: res.url });
                                          }
                                        } catch (err) {
                                          console.error("Upload failed", err);
                                        }
                                      }
                                      setCustomFieldsValues({ ...customFieldsValues, [f.id]: newDocs });
                                      setUploadingFieldId(null);
                                      e.target.value = "";
                                    }}
                                    className="bg-transparent border border-amber-500 text-white rounded-xl text-xs py-2 h-auto focus-visible:ring-amber-500 focus-visible:border-amber-500"
                                  />
                                  {uploadingFieldId === f.id && (
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-md">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> מעלה...
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : f.type === 'repeater' ? (
                              <RepeaterFieldAccordion f={f} customFieldsValues={customFieldsValues} setCustomFieldsValues={setCustomFieldsValues} handleSaveLabel={handleSaveLabel} />
                            ) : (
                              <Input
                                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                value={customFieldsValues[f.id] || ""}
                                onChange={(e) => setCustomFieldsValues({ ...customFieldsValues, [f.id]: e.target.value })}
                                placeholder={f.label}
                                className="bg-transparent border border-amber-500 text-white rounded-xl placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
             )
          })}

          <div className="flex justify-center mb-6 mt-4">
             <button type="button" onClick={() => setShowAddTabModal(true)} className="flex items-center gap-2 px-6 py-3 border border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-bold text-sm w-full justify-center">
               <Plus className="w-4 h-4" /> הוסף לשונית מותאמת אישית
             </button>
          </div>

          {/* Footer buttons */}
          <Modal.Footer className="bg-transparent border-t-0 p-0 mt-8 flex justify-end">
            <Button
              type="submit"
              variant="ghost"
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#1a1a1a] hover:bg-[#222] border border-white/5 transition-all group"
              disabled={loading}
              title={isEdit ? "שמור שינויים" : "צור איש קשר"}
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              ) : (
                <Folder className="w-8 h-8 text-white group-hover:text-amber-500 transition-colors" />
              )}
            </Button>
          </Modal.Footer>
        </form>
        </div>
      </Modal.Content>
      <AddTabModal 
        isOpen={showAddTabModal} 
        onClose={() => setShowAddTabModal(false)} 
        isAdding={isAddingTab}
        onSave={async (data: any) => {
          setIsAddingTab(true);
          const res = await addCustomTab({ title: data.title, icon: data.icon });
          if (res.success && res.tab) {
            setCustomTabsConfig([...customTabsConfig, { id: res.tab.id, title: data.title, icon: data.icon }]);
            setShowAddTabModal(false);
          }
          setIsAddingTab(false);
        }}
      />
      <AddFieldModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        isAdding={isAddingField}
        onSave={async (data: any) => {
          if (!activeTab) return;
          setIsAddingField(true);
          const res = await addCustomField({ category: activeTab as string, label: data.label, type: data.type, subFields: data.subFields });
          if (res.success && res.field) {
            const newField = { id: res.field.id, category: activeTab as string, label: data.label, type: data.type, subFields: data.subFields };
            setCustomFieldsConfig([...customFieldsConfig, newField]);
            setShowAddFieldModal(false);
          }
          setIsAddingField(false);
        }}
      />
    </Modal>
  );
}

function AddTabModal({ isOpen, onClose, onSave, isAdding }: any) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Folder");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl">
        <h3 className="text-xl font-black text-white text-right">הוספת לשונית חדשה</h3>
        <div className="space-y-1.5 text-right">
          <label className="text-xs font-bold text-slate-400">כותרת הלשונית</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: פרטי רכב" className="bg-[#181818] border-white/10 text-white placeholder:text-slate-500 rounded-xl" />
        </div>
        <div className="space-y-1.5 text-right">
          <label className="text-xs font-bold text-slate-400">אייקון</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="Folder">תיקייה</option>
            <option value="Star">כוכב</option>
            <option value="Heart">לב</option>
            <option value="Briefcase">תיק עבודות</option>
            <option value="Zap">ברק</option>
            <option value="Globe">כדור הארץ</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button type="button" onClick={onClose} className="flex-1 bg-white/10 text-white rounded-xl">ביטול</Button>
          <Button type="button" onClick={() => onSave({ title, icon })} disabled={isAdding || !title} className="flex-1 bg-emerald-600 text-white rounded-xl">שמור</Button>
        </div>
      </div>
    </div>
  )
}

function AddFieldModal({ isOpen, onClose, onSave, isAdding }: any) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [subFields, setSubFields] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleAddSubField = () => {
    setSubFields([...subFields, { id: `sub_${Date.now()}`, label: "", type: "text" }]);
  };

  const handleSubFieldChange = (index: number, key: string, value: string) => {
    const updated = [...subFields];
    updated[index][key] = value;
    setSubFields(updated);
  };

  const handleRemoveSubField = (index: number) => {
    setSubFields(subFields.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-black text-white text-right">הוספת שדה ללשונית</h3>
        <div className="space-y-1.5 text-right">
          <label className="text-xs font-bold text-slate-400">שם השדה / רשימה</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="לדוגמה: סוג רכב / רכבים" className="bg-[#181818] border-white/10 text-white placeholder:text-slate-500 rounded-xl" />
        </div>
        <div className="space-y-1.5 text-right">
          <label className="text-xs font-bold text-slate-400">סוג נתונים</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[#181818] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="text">טקסט (Text)</option>
            <option value="number">מספר (Number)</option>
            <option value="date">תאריך (Date)</option>
            <option value="documents">מסמכים (קובץ/תמונה מרובים)</option>
            <option value="repeater">שדה חוזר (רשימה)</option>
          </select>
        </div>

        {type === "repeater" && (
          <div className="space-y-3 border-t border-white/10 pt-4 mt-4">
            <label className="text-xs font-bold text-slate-400 text-right block">תתי-שדות (תצורת מערך)</label>
            {subFields.map((sf, idx) => (
              <div key={sf.id} className="flex gap-2 items-center bg-zinc-900 border border-white/5 p-2 rounded-lg transition-all hover:border-amber-500/30">
                <select value={sf.type} onChange={e => handleSubFieldChange(idx, 'type', e.target.value)} className="w-1/3 bg-zinc-950 border border-white/10 focus:border-amber-500/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition-all">
                  <option value="text">טקסט</option>
                  <option value="number">מספר</option>
                  <option value="date">תאריך</option>
                  <option value="url">URL</option>
                </select>
                <Input value={sf.label} onChange={e => handleSubFieldChange(idx, 'label', e.target.value)} placeholder="שם תת-שדה" className="w-1/2 h-8 text-xs bg-[#181818] border-white/10 text-white placeholder:text-slate-500" />
                <button type="button" onClick={() => handleRemoveSubField(idx)} className="text-red-400 hover:text-red-500 w-1/6 flex justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button type="button" onClick={handleAddSubField} variant="ghost" className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 text-xs h-8">
              <Plus className="w-3.5 h-3.5 ml-1" /> הוסף תת-שדה
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" onClick={onClose} className="flex-1 bg-white/10 text-white rounded-xl">ביטול</Button>
          <Button type="button" onClick={() => onSave({ label, type, subFields: type === 'repeater' ? subFields : undefined })} disabled={isAdding || !label || (type === 'repeater' && subFields.length === 0)} className="flex-1 bg-emerald-600 text-white rounded-xl">שמור</Button>
        </div>
      </div>
    </div>
  )
}

function AiStatsView({ contact }: { contact: Contact, systemUserId?: string, onCoinsUpdate?: () => void }) {
  const interactions = contact.ai_interactions || [];

  return (
    <div className="p-6 bg-[#111] animate-in fade-in duration-200 text-right" dir="rtl">
      <div className="space-y-6">
        {/* Stats Panel */}
        <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">סיכום שימוש ב-API</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#181818] border border-white/5 rounded-2xl flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-400">סך טוקני קלט (שאלות)</span>
            <span className="text-xl font-black text-indigo-400 mt-1">{contact.ai_total_input_tokens?.toLocaleString() || 0}</span>
          </div>
          <div className="p-4 bg-[#181818] border border-white/5 rounded-2xl flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-400">סך טוקני פלט (תשובות)</span>
            <span className="text-xl font-black text-emerald-400 mt-1">{contact.ai_total_output_tokens?.toLocaleString() || 0}</span>
          </div>
          <div className="p-4 bg-[#181818] border border-amber-500/20 rounded-2xl flex flex-col justify-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            <span className="text-[11px] font-bold text-amber-500">עלות מצטברת (USD)</span>
            <span className="text-2xl font-black text-amber-500 mt-1">${(contact.ai_total_cost || 0).toFixed(4)}</span>
            <span className="text-[9px] text-amber-500/60 mt-1">לפי מחירון Gemini 3.6 Flash</span>
          </div>
        </div>

        {/* Interactions List */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h5 className="text-xs font-bold text-slate-300">היסטוריית אינטראקציות אחרונות</h5>
          {interactions.length === 0 ? (
            <div className="p-6 text-center border border-white/5 rounded-2xl text-slate-500 text-xs bg-[#181818]">
              לא נמצאו שיחות או בקשות AI עבור איש קשר זה.
            </div>
          ) : (
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#181818] max-h-[300px] overflow-y-auto no-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#222] border-b border-white/5 font-bold text-amber-500 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">תאריך</th>
                    <th className="p-3">פעולה</th>
                    <th className="p-3 text-center">טוקנים (קלט / פלט)</th>
                    <th className="p-3 text-left">עלות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {interactions.map((interaction, idx) => (
                    <tr key={idx} className="hover:bg-[#222] transition-colors">
                      <td className="p-3 whitespace-nowrap">{new Date(interaction.date).toLocaleString("he-IL")}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {interaction.imageUrl && (
                            <img src={interaction.imageUrl} alt="AI Result" className="w-8 h-8 rounded-md object-cover border border-white/10 shrink-0" />
                          )}
                          <span className="line-clamp-2" title={interaction.summary}>{interaction.summary}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-[10px] font-mono">
                        <span className="text-indigo-400">{interaction.inputTokens}</span> / <span className="text-emerald-400">{interaction.outputTokens}</span>
                      </td>
                      <td className="p-3 text-left font-bold text-amber-500">${interaction.cost.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
