"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { generatePageWithAI } from "@/features/services/actions";
import { Loader2, Wand2, Plus, Layout, Sparkles, Search, Calendar, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { GeneratingLoader } from "@/components/ui/GeneratingLoader";
import { Modal } from "@/components/ui/Modal";

const PAGE_TYPES = [
  { 
    id: 'landing', 
    backendType: 'landing' as const, 
    label: 'עמוד נחיתה', 
    desc: 'דף המרה לאיסוף לידים, קמפיינים או הצעות מכר',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    border: 'hover:border-purple-500',
    bgIcon: 'bg-purple-50 text-purple-600'
  },
  { 
    id: 'service', 
    backendType: 'service' as const, 
    label: 'עמוד שרות', 
    desc: 'הצגת שירות ספציפי, פיצ׳ר או מוצר למכירה',
    icon: Layout,
    color: 'from-blue-500 to-indigo-600',
    border: 'hover:border-blue-500',
    bgIcon: 'bg-blue-50 text-blue-600'
  },
  { 
    id: 'event', 
    backendType: 'landing' as const, 
    label: 'עמוד אירוע', 
    desc: 'דף הרשמה לכנס, סדנא, חג או מפגש קהילה',
    icon: Calendar,
    color: 'from-rose-500 to-red-600',
    border: 'hover:border-rose-500',
    bgIcon: 'bg-rose-50 text-rose-600'
  },
  { 
    id: 'seo', 
    backendType: 'post' as const, 
    label: 'עמוד תוכן עבור SEO', 
    desc: 'מאמר מקצועי לקידום אורגני במנועי חיפוש',
    icon: Search,
    color: 'from-emerald-500 to-teal-600',
    border: 'hover:border-emerald-500',
    bgIcon: 'bg-emerald-50 text-emerald-600'
  }
];

export function ServiceForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [typeId, setTypeId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("חם, מקרב ומזמין");
  const [audience, setAudience] = useState("תורמים ושותפים");
  const [selectedSections, setSelectedSections] = useState<string[]>(['hero', 'services', 'contact']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Custom inputs for "other" options
  const [customAudience, setCustomAudience] = useState("");
  const [customTone, setCustomTone] = useState("");

  // Listen for global open modal events or URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("modal") === "create-service") {
      setIsOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const handleOpenModal = (e: any) => {
      if (e.detail === "create-service") {
        setIsOpen(true);
      }
    };
    window.addEventListener("open-ai-modal", handleOpenModal);
    return () => window.removeEventListener("open-ai-modal", handleOpenModal);
  }, []);

  const handleGenerate = async () => {
    if (!prompt) {
      setError("נא לתאר את נושא העמוד");
      return;
    }

    setLoading(true);
    setError("");

    const selectedType = PAGE_TYPES.find(t => t.id === typeId);
    if (!selectedType) return;

    let finalPrompt = prompt;
    if (typeId === 'event') {
      finalPrompt = `מדובר בעמוד אירוע. ${finalPrompt}`;
    } else if (typeId === 'seo') {
      finalPrompt = `מדובר בעמוד תוכן שנועד לקידום SEO. שלב מילות מפתח בחוכמה. ${finalPrompt}`;
    }

    const finalAudience = audience === "other" ? customAudience : audience;
    const finalTone = tone === "other" ? customTone : tone;

    try {
      const result = await generatePageWithAI(
        finalPrompt, 
        "", 
        selectedType.backendType, 
        finalTone, 
        finalAudience, 
        selectedSections, 
        "", 
        ""
      );
      
      if (result.success) {
        setIsOpen(false);
        setWizardStep(1);
        setPrompt("");
        setSelectedSections(['hero', 'services', 'contact']);
        
        if (selectedType.backendType === 'post') {
          router.push(`/post/${result.slug}`);
        } else if (selectedType.backendType === 'landing') {
          router.push(`/landing/${result.slug}`);
        } else {
          router.push(`/service/${result.slug}`);
        }
      } else {
        setError(result.error || "שגיאה ביצירת העמוד.");
      }
    } catch (e: any) {
      setError(e.message || "שגיאה לא ידועה");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setIsOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
          <Plus className="w-5 h-5" /> צור עמוד חדש ב-AI
        </Button>
      </div>
    );
  }

  const selectedTypeObj = PAGE_TYPES.find(t => t.id === typeId);

  return (
    <>
      <GeneratingLoader isOpen={loading} />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Modal.Content className="max-w-xl w-full p-0 overflow-hidden bg-white rounded-[2.5rem] border shadow-2xl">
          {/* Header */}
          <div className="relative bg-slate-50 border-b border-slate-100 p-6 text-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 left-6 p-1.5 rounded-full bg-white border shadow-sm hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-2xl bg-indigo-100 text-indigo-600">
                <Wand2 className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800">מחולל העמודים</h2>
            <div className="flex items-center justify-center gap-1.5 mt-4" dir="rtl">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    wizardStep >= step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200"
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 min-h-[350px] flex flex-col justify-center" dir="rtl">
            {error && (
              <p className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-xl border border-red-100 mb-6 text-center">
                {error}
              </p>
            )}

            {/* Step 1: Type Selection */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-6">איזה עמוד ניצור היום?</h3>
                <div className="flex flex-col gap-3">
                  {PAGE_TYPES.map((t) => {
                    const TIcon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTypeId(t.id);
                          setWizardStep(2);
                        }}
                        className={`group flex items-center text-right gap-4 p-4 rounded-2xl border-2 transition-all bg-white hover:bg-slate-50 ${t.border}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t.bgIcon}`}>
                          <TIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{t.label}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-slate-300 mr-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Audience */}
            {wizardStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-6">מי קהל היעד המרכזי של העמוד?</h3>
                <div className="space-y-4 max-w-md mx-auto w-full">
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base font-medium transition-all bg-white cursor-pointer"
                  >
                    <option value="תורמים ושותפים">תורמים ושותפים</option>
                    <option value="מתנדבים ופעילים">מתנדבים ופעילים</option>
                    <option value="לקוחות (B2B / B2C)">לקוחות (B2B / B2C)</option>
                    <option value="משפחות וקהילה מקומית">משפחות וקהילה מקומית</option>
                    <option value="כולם">כולם (קהל רחב)</option>
                    <option value="other">אחר (הזנה חופשית)</option>
                  </select>

                  {audience === "other" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">פרט את קהל היעד:</label>
                      <input
                        type="text"
                        value={customAudience}
                        onChange={(e) => setCustomAudience(e.target.value)}
                        placeholder="לדוגמה: הורים לילדים בגיל הרך..."
                        className="w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all bg-white"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Prompt */}
            {wizardStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-6">על מה העמוד? (פרט כמה שניתן)</h3>
                <div className="max-w-md mx-auto w-full">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="תאר במילים שלך מה העמוד צריך להציג, אילו יתרונות יש לו, מה הפתרון שהוא מציע, ומה מטרתו..."
                    className="w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base min-h-[160px] transition-all resize-none bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 4: Tone */}
            {wizardStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-6">באיזה סגנון נכתוב את זה?</h3>
                <div className="space-y-4 max-w-md mx-auto w-full">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base font-medium transition-all bg-white cursor-pointer"
                  >
                    <option value="חם, מקרב ומזמין">חם, מקרב ומזמין</option>
                    <option value="מרגש ורוחני">מרגש ורוחני</option>
                    <option value="צעיר, קליל ודינמי">צעיר, קליל ודינמי</option>
                    <option value="רשמי, ענייני ומכובד">רשמי, ענייני ומכובד</option>
                    <option value="שיווקי, משכנע ומוכר">שיווקי, משכנע ומוכר</option>
                    <option value="other">אחר (הזנה חופשית)</option>
                  </select>

                  {tone === "other" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">פרט את סגנון הכתיבה:</label>
                      <input
                        type="text"
                        value={customTone}
                        onChange={(e) => setCustomTone(e.target.value)}
                        placeholder="לדוגמה: הומוריסטי, ציני, שנון..."
                        className="w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all bg-white"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Sections */}
            {wizardStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 text-center mb-6">אילו אזורים נציג בעמוד?</h3>
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
                  {[
                    { id: 'hero', label: 'פתיח (Hero)' },
                    { id: 'services', label: 'שירותים / פריטים' },
                    { id: 'contact', label: 'טופס קשר' },
                    { id: 'richContent', label: 'תוכן טקסטואלי' },
                    { id: 'mainContent', label: 'תוכן מרכזי' },
                    { id: 'community', label: 'המלצות' },
                    { id: 'landingSection', label: 'טופס הרשמה' },
                    { id: 'livePosts', label: 'עדכונים מהשטח' },
                    { id: 'pricing', label: 'מחירון / תרומות' },
                    { id: 'timer', label: 'ספירה לאחור' },
                  ].map((sec) => {
                    const isChecked = selectedSections.includes(sec.id);
                    return (
                      <label key={sec.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/50 border-indigo-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox" 
                          className="rounded text-indigo-600 w-5 h-5 focus:ring-indigo-500"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSections([...selectedSections, sec.id]);
                            } else {
                              setSelectedSections(selectedSections.filter(id => id !== sec.id));
                            }
                          }}
                        />
                        <span className={`text-sm font-bold ${isChecked ? 'text-indigo-700' : 'text-slate-600'}`}>{sec.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer (Navigation) */}
          {wizardStep > 1 && (
            <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center" dir="rtl">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setWizardStep(wizardStep - 1)}
                className="rounded-2xl px-6 h-12 bg-white font-bold"
              >
                <ArrowRight className="w-4 h-4 ml-2" /> חזור
              </Button>

              {wizardStep < 5 ? (
                <Button 
                  type="button" 
                  onClick={() => {
                    if (wizardStep === 2 && audience === "other" && !customAudience.trim()) {
                      setError("נא להזין קהל יעד");
                      return;
                    }
                    if (wizardStep === 3 && !prompt.trim()) {
                      setError("נא לתאר את תוכן העמוד");
                      return;
                    }
                    if (wizardStep === 4 && tone === "other" && !customTone.trim()) {
                      setError("נא להזין סגנון כתיבה");
                      return;
                    }
                    setError("");
                    setWizardStep(wizardStep + 1);
                  }}
                  className="rounded-2xl px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  המשך <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleGenerate} 
                  disabled={loading} 
                  className={`rounded-2xl px-8 h-12 font-bold shadow-md text-white bg-gradient-to-r ${selectedTypeObj?.color}`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Wand2 className="w-5 h-5 ml-2" />}
                  {loading ? "מייצר..." : "חולל עמוד"}
                </Button>
              )}
            </div>
          )}
        </Modal.Content>
      </Modal>
    </>
  );
}
