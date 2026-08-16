"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wand2, Settings, MessageSquarePlus, Sparkles, Layout, FileText, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ContactModal } from "./crm/ContactModal";
import { generatePageWithAI } from "@/features/services/actions";
import { suggestWizardFieldWithAI } from "@/features/ai/actions";

const PAGE_TYPES = [
  { 
    id: 'service' as const, 
    label: 'עמוד שירות', 
    desc: 'להצגת שירותים בארגון (מוצרים, ייעוץ וכד\')',
    icon: Layout,
    color: 'from-blue-500 to-indigo-600',
    bg: 'hover:border-blue-500/50 hover:bg-blue-50/20'
  },
  { 
    id: 'landing' as const, 
    label: 'דף נחיתה שיווקי', 
    desc: 'דף הרשמה לאירועים, חגים או קמפיינים',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    bg: 'hover:border-purple-500/50 hover:bg-purple-50/20'
  },
  { 
    id: 'post' as const, 
    label: 'פוסט / דף תוכן', 
    desc: 'מאמרים, דברי תורה או עדכוני קהילה',
    icon: FileText,
    color: 'from-amber-500 to-orange-600',
    bg: 'hover:border-amber-500/50 hover:bg-amber-50/20'
  }
];

export function DashboardQuickActions() {
  const router = useRouter();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  useEffect(() => {
    const handleOpenQuickActions = () => setIsQuickActionsOpen(true);
    window.addEventListener("open-quick-actions", handleOpenQuickActions);
    return () => window.removeEventListener("open-quick-actions", handleOpenQuickActions);
  }, []);
  const [serviceType, setServiceType] = useState<'service' | 'landing' | 'post'>("service");
  const [serviceSlug, setServiceSlug] = useState("");
  const [servicePrompt, setServicePrompt] = useState("");
  const [serviceTone, setServiceTone] = useState("חם, מקרב ומזמין");
  const [serviceAudience, setServiceAudience] = useState("כל הקהילה (חילונים ומסורתיים)");
  const [selectedSections, setSelectedSections] = useState<string[]>(['hero', 'services', 'contact']);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");

  // New states for custom values and questions
  const [servicePainPoint, setServicePainPoint] = useState("");
  const [serviceSolution, setServiceSolution] = useState("");
  const [customAudienceModalOpen, setCustomAudienceModalOpen] = useState(false);
  const [customAudienceInput, setCustomAudienceInput] = useState("");
  const [customAudiences, setCustomAudiences] = useState<string[]>([]);
  const [customToneModalOpen, setCustomToneModalOpen] = useState(false);
  const [customToneInput, setCustomToneInput] = useState("");
  const [customTones, setCustomTones] = useState<string[]>([]);

  const [suggesting, setSuggesting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [wizardStep, suggesting]);

  const handleAiSuggest = async (fieldName: 'painPoint' | 'solution' | 'prompt') => {
    setSuggesting(true);
    setServiceError("");
    try {
      const res = await suggestWizardFieldWithAI(fieldName, {
        type: serviceType,
        audience: serviceAudience,
        tone: serviceTone,
        painPoint: servicePainPoint,
        solution: serviceSolution
      });
      if (res.success && res.text) {
        if (fieldName === 'painPoint') setServicePainPoint(res.text);
        else if (fieldName === 'solution') setServiceSolution(res.text);
        else if (fieldName === 'prompt') setServicePrompt(res.text);
      } else {
        setServiceError(res.error || "שגיאה בקבלת הצעה מה-AI");
      }
    } catch (err: any) {
      setServiceError(err.message || "שגיאה בחיבור לשרת ה-AI");
    } finally {
      setSuggesting(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceSlug || !servicePrompt) {
      setServiceError("נא למלא את כל השדות");
      return;
    }

    setServiceLoading(true);
    setServiceError("");

    try {
      const result = await generatePageWithAI(servicePrompt, serviceSlug, serviceType, serviceTone, serviceAudience, selectedSections, servicePainPoint, serviceSolution);
      if (result.success) {
        setIsServiceOpen(false);
        setWizardStep(1);
        setServiceSlug("");
        setServicePrompt("");
        setServicePainPoint("");
        setServiceSolution("");
        setSelectedSections(['hero', 'services', 'contact']);
        
        // Redirect to new page
        if (serviceType === 'post') {
          router.push(`/post/${result.slug}`);
        } else if (serviceType === 'landing') {
          router.push(`/landing/${result.slug}`);
        } else {
          router.push(`/service/${result.slug}`);
        }
      } else {
        setServiceError(result.error || "שגיאה ביצירת העמוד. ודא שהגדרות Gemini מוגדרות.");
      }
    } catch (e: any) {
      setServiceError(e.message || "שגיאה לא ידועה");
    } finally {
      setServiceLoading(false);
    }
  };

  const handleQuickPostTrigger = () => {
    // 1. Dispatch tab switch event to shell
    window.dispatchEvent(new CustomEvent("switch-dashboard-tab", { detail: "activity" }));
    // 2. Dispatch focus event to AI writer
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("focus-ai-post-writer"));
    }, 200);
  };

  const selectedTypeObj = PAGE_TYPES.find(t => t.id === serviceType);
  const IconComponent = selectedTypeObj?.icon || Layout;

  return (
    <>
      <Modal isOpen={isQuickActionsOpen} onClose={() => setIsQuickActionsOpen(false)}>
        <Modal.Content className="max-w-md w-full rounded-[2rem] p-6 md:p-8">
          <div dir="rtl" className="w-full relative">
            <Modal.Close className="left-4 right-auto" />
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 text-center mt-2">פעולות מהירות</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 1. Add Contact */}
              <button onClick={() => { setIsQuickActionsOpen(false); setIsContactOpen(true); }} className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 bg-white border border-slate-100 hover:border-indigo-500 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">הוסף איש קשר</h3>
              </button>

              {/* 2. Create AI Page */}
              <button onClick={() => { setIsQuickActionsOpen(false); setIsServiceOpen(true); }} className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 bg-white border border-slate-100 hover:border-purple-500 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 flex items-center justify-center bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">צור דף ב-AI</h3>
              </button>

              {/* 3. System Settings */}
              <button onClick={() => { setIsQuickActionsOpen(false); router.push("/dashboard/settings"); }} className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 bg-white border border-slate-100 hover:border-slate-500 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">הגדרות מערכת</h3>
              </button>

              {/* 4. Quick AI Post */}
              <button onClick={() => { setIsQuickActionsOpen(false); router.push("/dashboard/services"); }} className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 bg-white border border-slate-100 hover:border-amber-500 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">פוסט מהיר ב-AI</h3>
              </button>
            </div>
          </div>
        </Modal.Content>
      </Modal>

      {/* CRM Contact Creation Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        contact={null}
        onSuccess={() => {
          setIsContactOpen(false);
          alert("איש הקשר התווסף בהצלחה!");
          router.refresh();
        }}
        communities={[]}
      />

      {/* Dynamic AI Page Creator Modal */}
      <Modal isOpen={isServiceOpen} onClose={() => setIsServiceOpen(false)}>
        <Modal.Content className="max-w-2xl rounded-[2rem] p-6 md:p-8">
          <div dir="rtl" className="w-full relative">
            <Modal.Close className="left-4 right-auto" />
            
            <div className="space-y-2 text-right mb-6" dir="rtl">
              <h3 className="text-xl md:text-2xl font-black flex items-center gap-2.5 text-slate-800">
                <div className={`p-2 rounded-2xl bg-gradient-to-br ${selectedTypeObj?.color} text-white shadow-md`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                מחולל עמודים ותכנים ב-AI
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                צור עמודי שירות, דפי נחיתה ופוסטים מותאמי SEO תוך שניות בעזרת בינה מלאכותית.
              </p>
            </div>

            <form onSubmit={handleCreateService} className="space-y-5 text-right" dir="rtl">
              {/* Chat Log Window */}
              <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/50 max-h-[300px] overflow-y-auto space-y-4 mb-4" dir="rtl">
                {/* Step 1 Bot message */}
                <div className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                  <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                    שלום! בוא נבנה ביחד עמוד תוכן חדש. מה סוג העמוד שתרצה ליצור?
                  </div>
                </div>

                {/* Step 1 User answer */}
                {wizardStep > 1 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {PAGE_TYPES.find(p => p.id === serviceType)?.label || serviceType}
                    </div>
                  </div>
                )}

                {/* Step 2 Bot message */}
                {wizardStep >= 2 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      מעולה. בחר כתובת אינטרנט (Slug) לעמוד שלך:
                    </div>
                  </div>
                )}

                {/* Step 2 User answer */}
                {wizardStep > 2 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm font-mono">
                      /{serviceType === 'post' ? 'post' : serviceType === 'landing' ? 'landing' : 'service'}/{serviceSlug}
                    </div>
                  </div>
                )}

                {/* Step 3 Bot message */}
                {wizardStep >= 3 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      מי קהל היעד המרכזי של העמוד?
                    </div>
                  </div>
                )}

                {/* Step 3 User answer */}
                {wizardStep > 3 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {serviceAudience}
                    </div>
                  </div>
                )}

                {/* Step 4 Bot message */}
                {wizardStep >= 4 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      מהי נקודת החולשה/הקושי שבה נוגעת הבעיה של הקהל?
                    </div>
                  </div>
                )}

                {/* Step 4 User answer */}
                {wizardStep > 4 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {servicePainPoint || "(דילגתי)"}
                    </div>
                  </div>
                )}

                {/* Step 5 Bot message */}
                {wizardStep >= 5 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      מהו הפתרון הגדול שנפתר?
                    </div>
                  </div>
                )}

                {/* Step 5 User answer */}
                {wizardStep > 5 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {serviceSolution || "(דילגתי)"}
                    </div>
                  </div>
                )}

                {/* Step 6 Bot message */}
                {wizardStep >= 6 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      באיזה סגנון וטון כתיבה נשתמש?
                    </div>
                  </div>
                )}

                {/* Step 6 User answer */}
                {wizardStep > 6 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {serviceTone}
                    </div>
                  </div>
                )}

                {/* Step 7 Bot message */}
                {wizardStep >= 7 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      אילו אזורים תרצה להציג בדף?
                    </div>
                  </div>
                )}

                {/* Step 7 User answer */}
                {wizardStep > 7 && (
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm">
                      {selectedSections.map(s => {
                        const labels: Record<string, string> = {
                          hero: 'פתיח', services: 'שירותים', contact: 'צור קשר',
                          richContent: 'תוכן טקסטואלי', mainContent: 'תוכן מרכזי',
                          community: 'קהילה', landingSection: 'הרשמה',
                          livePosts: 'עדכונים', pricing: 'מחירון', timer: 'ספירה לאחור'
                        };
                        return labels[s] || s;
                      }).join(', ')}
                    </div>
                  </div>
                )}

                {/* Step 8 Bot message */}
                {wizardStep >= 8 && (
                  <div className="flex gap-2.5 items-start animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">AI</div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 text-sm max-w-[85%] text-slate-800">
                      ולסיום - תאר בקצרה על מה העמוד, או השתמש בקסם כדי ליצור הנחיה ממוקדת עבור ה-AI על בסיס התשובות שענית עד כה:
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Input area representing the active wizardStep */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700">בחר את סוג העמוד:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {PAGE_TYPES.map((t) => {
                        const isSelected = serviceType === t.id;
                        const TIcon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setServiceType(t.id)}
                            className={`p-3 rounded-2xl border-2 text-right transition-all duration-300 flex flex-col gap-2 relative overflow-hidden ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-50/10 shadow-sm' 
                                : `border-slate-100 bg-white ${t.bg}`
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                              isSelected ? t.color : 'from-slate-100 to-slate-200 text-slate-500'
                            } text-white transition-all`}>
                              <TIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">{t.label}</h4>
                              <p className="text-[10px] text-slate-500 mt-1">{t.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700 font-sans">הגדר כתובת אינטרנט (Slug):</label>
                    <div className="flex items-center gap-2" dir="ltr">
                      <span className="text-slate-400 font-mono text-xs bg-slate-100 border px-3 py-2.5 rounded-xl select-none shrink-0">
                        /{serviceType === 'post' ? 'post' : serviceType === 'landing' ? 'landing' : 'service'}/
                      </span>
                      <input
                        type="text"
                        value={serviceSlug}
                        onChange={(e) => setServiceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="e.g. shabbat-dinner"
                        className="flex-1 p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                        dir="ltr"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">אותיות באנגלית קטנות, מספרים ומקפים בלבד (לדוגמה: shavuot-event).</p>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700">בחר קהל יעד מרכזי:</label>
                    <select
                      value={serviceAudience}
                      onChange={(e) => {
                        if (e.target.value === "other") {
                          setCustomAudienceModalOpen(true);
                        } else {
                          setServiceAudience(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs transition-all bg-white"
                    >
                      <option value="כל הקהילה (חילונים ומסורתיים)">כל הקהילה (חילונים ומסורתיים)</option>
                      <option value="סטודנטים וצעירים">סטודנטים וצעירים</option>
                      <option value="משפחות צעירות">משפחות צעירות</option>
                      <option value="קהל דתי/חרדי">קהל דתי/חרדי</option>
                      <option value="גיל הזהב">גיל הזהב</option>
                      {customAudiences.map(ca => (
                        <option key={ca} value={ca}>{ca}</option>
                      ))}
                      <option value="other">אחר...</option>
                    </select>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">מהי נקודת החולשה שבה נוגעת הבעיה?</label>
                      <button
                        type="button"
                        onClick={() => handleAiSuggest('painPoint')}
                        disabled={suggesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 animate-pulse"
                      >
                        {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        הצעת קסם ב-AI
                      </button>
                    </div>
                    <textarea
                      value={servicePainPoint}
                      onChange={(e) => setServicePainPoint(e.target.value)}
                      placeholder="תאר את נקודת התורפה או הקושי של קהל היעד..."
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all bg-white resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">מהו הפתרון הגדול שנפתר?</label>
                      <button
                        type="button"
                        onClick={() => handleAiSuggest('solution')}
                        disabled={suggesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 animate-pulse"
                      >
                        {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        הצעת קסם ב-AI
                      </button>
                    </div>
                    <textarea
                      value={serviceSolution}
                      onChange={(e) => setServiceSolution(e.target.value)}
                      placeholder="תאר את הפתרון שהדף/שירות מציע..."
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all bg-white resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {wizardStep === 6 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700">טון וסגנון כתיבה:</label>
                    <select
                      value={serviceTone}
                      onChange={(e) => {
                        if (e.target.value === "other") {
                          setCustomToneModalOpen(true);
                        } else {
                          setServiceTone(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs transition-all bg-white"
                    >
                      <option value="חם, מקרב ומזמין">חם, מקרב ומזמין (ברירת מחדל)</option>
                      <option value="מרגש ורוחני">מרגש ורוחני</option>
                      <option value="צעיר, קליל ודינמי">צעיר, קליל ודינמי</option>
                      <option value="רשמי, ענייני ומכובד">רשמי, ענייני ומכובד</option>
                      {customTones.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                      <option value="other">אחר...</option>
                    </select>
                  </div>
                )}

                {wizardStep === 7 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700">בחירת אזורים להצגה בדף:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'hero', label: 'פתיח (Hero)' },
                        { id: 'services', label: 'שירותים / פריטים' },
                        { id: 'contact', label: 'טופס יצירת קשר' },
                        { id: 'richContent', label: 'תוכן טקסטואלי' },
                        { id: 'mainContent', label: 'תוכן מרכזי (בנטו)' },
                        { id: 'community', label: 'המלצות וקהילה' },
                        { id: 'landingSection', label: 'טופס הרשמה' },
                        { id: 'livePosts', label: 'עדכונים מהשטח' },
                      ].map((sec) => {
                        const isChecked = selectedSections.includes(sec.id);
                        return (
                          <label key={sec.id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/50 border-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <input 
                              type="checkbox" 
                              className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSections([...selectedSections, sec.id]);
                                } else {
                                  setSelectedSections(selectedSections.filter(id => id !== sec.id));
                                }
                              }}
                            />
                            <span className={`text-[11px] font-medium ${isChecked ? 'text-indigo-700' : 'text-slate-600'}`}>{sec.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {wizardStep === 8 && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">על מה העמוד? (הנחיה ל-AI)</label>
                      <button
                        type="button"
                        onClick={() => handleAiSuggest('prompt')}
                        disabled={suggesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 animate-pulse"
                      >
                        {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        קסם סיכום הנחיה
                      </button>
                    </div>
                    <textarea
                      value={servicePrompt}
                      onChange={(e) => setServicePrompt(e.target.value)}
                      placeholder={
                        serviceType === 'service' 
                          ? "לדוגמה: עמוד שירות לבדיקת מזוזות ותפילין עם הדגשת השירות בבית הלקוח."
                          : serviceType === 'landing'
                          ? "לדוגמה: דף נחיתה למסיבת פורים קהילתית, כולל טופס רישום למשפחות."
                          : "לדוגמה: פוסט חיזוק קצר לפרשת השבוע על חשיבות השמחה."
                      }
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm min-h-[100px] transition-all resize-none"
                      required
                    />
                  </div>
                )}
              </div>

              {serviceError && (
                <p className="text-red-500 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">
                  {serviceError}
                </p>
              )}

              <Modal.Footer>
                <div className="flex gap-2.5 justify-between w-full">
                  <div>
                    {wizardStep > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setWizardStep(wizardStep - 1)}
                        className="rounded-xl px-4 h-10 text-xs font-bold"
                      >
                        חזור
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2.5">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setIsServiceOpen(false); setWizardStep(1); }}
                      className="rounded-xl px-4 h-10 text-xs font-bold"
                    >
                      ביטול
                    </Button>
                    
                    {wizardStep < 8 ? (
                      <Button 
                        type="button" 
                        onClick={() => {
                          if (wizardStep === 1 && !serviceType) {
                            setServiceError("נא לבחור סוג עמוד");
                            return;
                          }
                          if (wizardStep === 2 && !serviceSlug) {
                            setServiceError("נא למלא את כתובת ה-Slug");
                            return;
                          }
                          setServiceError("");
                          setWizardStep(wizardStep + 1);
                        }}
                        className={`gap-2 text-white font-bold bg-gradient-to-r ${selectedTypeObj?.color} rounded-xl px-5 h-10 text-xs shadow-md hover:shadow-lg transition-all`}
                      >
                        המשך לשאלה הבאה
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={serviceLoading} 
                        className={`gap-2 text-white font-bold bg-gradient-to-r ${selectedTypeObj?.color} rounded-xl px-5 h-10 text-xs shadow-md hover:shadow-lg transition-all`}
                      >
                        {serviceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                        {serviceLoading ? "מייצר תוכן ובונה דף..." : "חולל עמוד ב-AI"}
                      </Button>
                    )}
                  </div>
                </div>
              </Modal.Footer>
            </form>
          </div>
        </Modal.Content>
      </Modal>

      {/* Custom Audience Modal */}
      <Modal isOpen={customAudienceModalOpen} onClose={() => setCustomAudienceModalOpen(false)}>
        <Modal.Content className="p-6 bg-white rounded-[2rem] border shadow-2xl text-right max-w-md w-full">
          <div dir="rtl">
            <Modal.Close className="left-4 right-auto text-slate-400 hover:text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">קהל יעד מותאם אישית</h3>
            <p className="text-xs text-muted-foreground mb-4">הקלד את קהל היעד שתרצה למקד אליו את דף התוכן:</p>
            <input
              type="text"
              value={customAudienceInput}
              onChange={(e) => setCustomAudienceInput(e.target.value)}
              placeholder="לדוגמה: הורים לילדים בגיל הרך..."
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all bg-white mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomAudienceModalOpen(false)}
                className="rounded-xl px-4 text-xs font-semibold"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (customAudienceInput.trim()) {
                    setCustomAudiences(prev => [...prev, customAudienceInput.trim()]);
                    setServiceAudience(customAudienceInput.trim());
                    setCustomAudienceInput("");
                  }
                  setCustomAudienceModalOpen(false);
                }}
                className="rounded-xl px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                שמור קהל יעד
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>

      {/* Custom Tone Modal */}
      <Modal isOpen={customToneModalOpen} onClose={() => setCustomToneModalOpen(false)}>
        <Modal.Content className="p-6 bg-white rounded-[2rem] border shadow-2xl text-right max-w-md w-full">
          <div dir="rtl">
            <Modal.Close className="left-4 right-auto text-slate-400 hover:text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">סגנון כתיבה (טון) מותאם אישית</h3>
            <p className="text-xs text-muted-foreground mb-4">הקלד את סגנון או טון הכתיבה המועדף עליך:</p>
            <input
              type="text"
              value={customToneInput}
              onChange={(e) => setCustomToneInput(e.target.value)}
              placeholder="לדוגמה: הומוריסטי, ציני, שנון ומותח..."
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all bg-white mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomToneModalOpen(false)}
                className="rounded-xl px-4 text-xs font-semibold"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (customToneInput.trim()) {
                    setCustomTones(prev => [...prev, customToneInput.trim()]);
                    setServiceTone(customToneInput.trim());
                    setCustomToneInput("");
                  }
                  setCustomToneModalOpen(false);
                }}
                className="rounded-xl px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                שמור סגנון
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </>
  );
}
