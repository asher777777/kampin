"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Contact, ContactEvent } from "@/features/crm/types";
import { createContact, updateContact, getCustomFields, checkIsSuperAdmin, getContactUserSettings, saveContactUserSettings, getCustomTabs, addCustomTab, addCustomField, getSystemFieldLabels, updateCustomField } from "@/features/crm/actions";
import { syncContactMessages } from "@/features/whatsapp/actions";
import { uploadMediaFile } from "@/features/media/actions";
import { impersonateUser } from "@/features/users/impersonate";
import { ChevronUp, ChevronDown, Calendar, Tag, Building, Clock, CreditCard, User, Users, Plus, Trash2, MessageCircle, Phone, Mail, Edit, RefreshCw, Settings, Loader2, UploadCloud, Folder } from "lucide-react";
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

type TabType = "details" | "camp" | "tags" | "company" | "events" | "timeline" | "payments" | "userDetails";

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
              <div key={f.id} className={`space-y-1.5 ${f.type === 'documents' ? 'col-span-1 md:col-span-2' : ''}`}>
                <EditableLabel label={f.label} fieldId={f.id} isCustom={true} onSave={handleSaveLabel} />
                
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
                  <div className="space-y-3 bg-[#1a1a1a] p-3 rounded-xl border border-amber-500/30">
                    {(customFieldsValues[f.id] || []).map((row: any, rIdx: number) => (
                      <div key={rIdx} className="flex gap-2 items-end bg-[#0a0a0a] p-2 rounded-lg border border-amber-500/30 relative group">
                        <button type="button" onClick={() => {
                          const newArr = [...(customFieldsValues[f.id] || [])];
                          newArr.splice(rIdx, 1);
                          setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
                        }} className="absolute -left-2 -top-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all border border-red-100 shadow-sm">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {f.subFields?.map((sf: any) => (
                            <div key={sf.id} className="flex-1 min-w-[120px]">
                              <label className="text-[10px] font-bold text-amber-500 block mb-1">{sf.label}</label>
                              <Input
                                type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                                value={row[sf.id] || ""}
                                onChange={(e) => {
                                  const newArr = [...(customFieldsValues[f.id] || [])];
                                  newArr[rIdx] = { ...newArr[rIdx], [sf.id]: e.target.value };
                                  setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
                                }}
                                className="h-8 text-xs bg-transparent border border-amber-500 text-white placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                                placeholder={sf.label}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={() => {
                      setCustomFieldsValues({ ...customFieldsValues, [f.id]: [...(customFieldsValues[f.id] || []), {}] });
                    }} variant="ghost" className="w-full h-8 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                      <Plus className="w-3.5 h-3.5 ml-1" /> הוסף פריט ל{f.label}
                    </Button>
                  </div>
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
                <h5 className="text-xs font-bold text-slate-700">פירוט עסקאות אחרונות</h5>
                {(contact?.order_count || 0) === 0 ? (
                  <div className="p-6 text-center border rounded-2xl text-slate-400 text-xs bg-slate-50/50">
                    לא נמצאה היסטוריית תשלומים עבור איש קשר זה.
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-white shadow-sm max-h-[200px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b font-bold text-amber-500">
                        <tr>
                          <th className="p-3">סכום</th>
                          <th className="p-3">תאריך</th>
                          <th className="p-3">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700">
                        {/* Simulating orders based on summary fields */}
                        {contact?.last_order_date && (
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">₪{(contact.total_spent || 0).toFixed(2)}</td>
                            <td className="p-3">{new Date(contact.last_order_date).toLocaleDateString("he-IL")}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-full font-bold">
                                הושלם
                              </span>
                            </td>
                          </tr>
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
                          <div key={f.id} className={`space-y-1.5 ${f.type === 'documents' ? 'col-span-1 md:col-span-2' : ''}`}>
                            <EditableLabel label={f.label} fieldId={f.id} isCustom={true} onSave={handleSaveLabel} />
                            
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
                              <div className="space-y-3 bg-[#1a1a1a] p-3 rounded-xl border border-amber-500/30">
                                {(customFieldsValues[f.id] || []).map((row: any, rIdx: number) => (
                                  <div key={rIdx} className="flex gap-2 items-end bg-[#0a0a0a] p-2 rounded-lg border border-amber-500/30 relative group">
                                    <button type="button" onClick={() => {
                                      const newArr = [...(customFieldsValues[f.id] || [])];
                                      newArr.splice(rIdx, 1);
                                      setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
                                    }} className="absolute -left-2 -top-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all border border-red-100 shadow-sm">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <div className="flex-1 flex flex-wrap gap-2">
                                      {f.subFields?.map((sf: any) => (
                                        <div key={sf.id} className="flex-1 min-w-[120px]">
                                          <label className="text-[10px] font-bold text-amber-500 block mb-1">{sf.label}</label>
                                          <Input
                                            type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                                            value={row[sf.id] || ""}
                                            onChange={(e) => {
                                              const newArr = [...(customFieldsValues[f.id] || [])];
                                              newArr[rIdx] = { ...newArr[rIdx], [sf.id]: e.target.value };
                                              setCustomFieldsValues({ ...customFieldsValues, [f.id]: newArr });
                                            }}
                                            className="h-8 text-xs bg-transparent border border-amber-500 text-white placeholder:text-white/30 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                                            placeholder={sf.label}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <Button type="button" onClick={() => {
                                  setCustomFieldsValues({ ...customFieldsValues, [f.id]: [...(customFieldsValues[f.id] || []), {}] });
                                }} variant="ghost" className="w-full h-8 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                                  <Plus className="w-3.5 h-3.5 ml-1" /> הוסף פריט ל{f.label}
                                </Button>
                              </div>
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
            <label className="text-xs font-bold text-slate-400 text-right block">תתי-שדות (מיני-טופס)</label>
            {subFields.map((sf, idx) => (
              <div key={sf.id} className="flex gap-2 items-center bg-white/5 p-2 rounded-xl">
                <select value={sf.type} onChange={e => handleSubFieldChange(idx, 'type', e.target.value)} className="w-1/3 bg-[#181818] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
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
