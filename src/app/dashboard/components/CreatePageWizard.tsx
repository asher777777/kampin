"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Layout, FileText, Calendar, Loader2, ChevronLeft, ChevronRight, Wand2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { generatePageWithAI } from "@/features/services/actions";
import { suggestWizardFieldWithAI } from "@/features/ai/actions";

const PAGE_TYPES = [
  {
    id: 'landing' as const,
    label: 'עמוד נחיתה',
    icon: Sparkles
  },
  {
    id: 'service' as const,
    label: 'עמוד שרות',
    icon: Layout
  },
  {
    id: 'event' as const,
    label: 'עמוד אירוע',
    icon: Calendar
  },
  {
    id: 'post' as const,
    label: 'עמוד תוכן',
    icon: FileText
  }
];

const TONES = ["חם, מקרב ומזמין", "מקצועי ורשמי", "צעיר ודינמי", "מרגש ומעורר השראה"];

interface CreatePageWizardProps {
  isOpen: boolean;
  onClose: () => void;
  audiences?: string[];
  services?: any[];
}

export function CreatePageWizard({ isOpen, onClose, audiences = [], services = [] }: CreatePageWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'service' | 'landing' | 'post' | 'event' | null>(null);
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [customTone, setCustomTone] = useState("");
  const [audience, setAudience] = useState("כולם");
  const [customAudience, setCustomAudience] = useState("");
  const [slug, setSlug] = useState("");
  const [generateImages, setGenerateImages] = useState(true);

  const [suggesting, setSuggesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fetchedAudiences, setFetchedAudiences] = useState<string[]>(audiences);
  const [fetchedServices, setFetchedServices] = useState<any[]>(services);

  useEffect(() => {
    async function fetchData() {
      try {
        const { getCompanyServices, getAudiences } = await import("@/features/company-services/actions");
        const [servicesData, audiencesData] = await Promise.all([
          getCompanyServices(),
          getAudiences()
        ]);

        setFetchedServices(servicesData);

        // Extract unique audiences from both services and the audiences collection
        const serviceAudiences = servicesData.flatMap((s: any) => s.targetAudiences || []);
        const collectionAudiences = audiencesData.map((a: any) => a.name);

        const uniqueAudiences = Array.from(new Set([...serviceAudiences, ...collectionAudiences]));
        if (uniqueAudiences.length > 0) {
          setFetchedAudiences(uniqueAudiences as string[]);
        }
      } catch (err) {
        console.warn("Failed to fetch services for wizard", err);
      }
    }

    if (isOpen && fetchedAudiences.length === 0) {
      fetchData();
    }
  }, [isOpen]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setType(null);
      setGoal("");
      setTone(TONES[0]);
      setAudience("כולם");
      setSlug("");
      setGenerateImages(true);
      setError("");
    }
  }, [isOpen]);

  const handleAiSuggest = async (field: 'painPoint' | 'solution' | 'prompt') => {
    setSuggesting(true);
    setError("");
    try {
      const res = await suggestWizardFieldWithAI(field, {
        type: type === 'event' ? 'landing' : type || 'service',
        audience: audience === 'other' ? customAudience : audience,
        tone: tone === 'other' ? customTone : tone,
        painPoint: field === 'prompt' ? goal : "",
        solution: ""
      });
      if (res.success && res.text) {
        if (field === 'prompt') setGoal(res.text);
      } else {
        setError(res.error || "שגיאה בקבלת הצעה מה-AI");
      }
    } catch (err: any) {
      setError(err.message || "שגיאה בחיבור לשרת");
    } finally {
      setSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!slug || !goal || !type) {
      setError("נא למלא את כל שדות החובה");
      return;
    }

    setLoading(true);
    setError("");

    const backendType = type === 'event' ? 'landing' : type;
    const finalAudience = audience === "other" ? customAudience : audience;
    const finalTone = tone === "other" ? customTone : tone;
    const finalPrompt = type === 'event' ? `עמוד אירוע שמטרתו: ${goal}` : goal;

    try {
      if (audience === "other" && customAudience) {
        const { addAudience } = await import("@/features/company-services/actions");
        await addAudience(customAudience).catch((err: any) => console.warn("Failed to save custom audience", err));
      }

      const result = await generatePageWithAI(
        finalPrompt,
        slug,
        backendType,
        finalTone,
        finalAudience,
        ['hero', 'services', 'contact', 'richContent', 'community'], // Default recommended sections
        "",
        ""
      );

      if (result.success) {
        onClose();
        if (backendType === 'post') {
          router.push(`/post/${result.slug}`);
        } else if (backendType === 'landing') {
          router.push(`/landing/${result.slug}`);
        } else {
          router.push(`/service/${result.slug}`);
        }
      } else {
        setError(result.error || "שגיאה ביצירת העמוד");
      }
    } catch (e: any) {
      setError(e.message || "שגיאה לא ידועה");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-black border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative p-6 text-center border-b border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-6 left-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 p-1 mb-4 shadow-lg shadow-amber-500/20 relative">
            <div className="w-full h-full bg-black rounded-full overflow-hidden flex items-center justify-center border-2 border-black">
              {/* Placeholder for Avatar */}
              <div className="w-full h-full bg-amber-500/20 flex items-end justify-center pt-2">
                <div className="w-10 h-12 bg-amber-200/40 rounded-t-full"></div>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              ד
            </div>
          </div>

          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
            {step === 1 ? "בחר את העמוד שלך" :
              step === 2 ? "מה מטרת העמוד?" :
                step === 3 ? "איך תרצה להישמע?" :
                  step === 4 ? "למי העמוד מיועד?" :
                    "הגדרות אחרונות"}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto" dir="rtl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Type Selection */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-md mx-auto">
              {PAGE_TYPES.map(t => {
                const isSelected = type === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setType(t.id); setTimeout(() => setStep(2), 300); }}
                    className={`relative aspect-square flex flex-col items-center justify-center gap-3 transition-all duration-300 group ${isSelected ? 'scale-95' : 'hover:scale-105'}`}
                  >
                    {/* Octagon Shape using clip-path */}
                    <div
                      className={`absolute inset-0 transition-colors duration-300 ${isSelected ? 'bg-amber-500' : 'bg-transparent group-hover:bg-amber-500/10'}`}
                      style={{
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                        border: '2px solid transparent' // Placeholder for border since clip-path cuts borders
                      }}
                    />
                    {/* Simulated Double Border */}
                    <div
                      className="absolute inset-1 border border-amber-500/50 group-hover:border-amber-400 transition-colors"
                      style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                    />
                    <div
                      className="absolute inset-2 border-2 border-amber-500/30 group-hover:border-amber-500 transition-colors"
                      style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}
                    />

                    <div className="relative z-10 text-amber-500 flex flex-col items-center gap-2">
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-black' : 'text-amber-500'}`} />
                      <span className={`font-bold text-lg leading-tight ${isSelected ? 'text-black' : 'text-amber-500'}`}>
                        {t.label.split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Goal & Description */}
          {step === 2 && (
            <div className="space-y-6 max-w-lg mx-auto animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <label className="text-amber-200/70 text-sm">הסבר במילים שלך על מה העמוד, מה השירות או מה האירוע</label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="לדוגמה: עמוד שירות לייעוץ זוגי שמתמקד בפתרון משברים ומציע פגישת היכרות..."
                  className="w-full h-32 bg-black/50 border border-amber-500/30 rounded-2xl p-4 text-amber-100 placeholder:text-amber-500/30 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none transition-all"
                />
              </div>

              <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Wand2 className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-amber-400 font-bold mb-1">צריך עזרה בניסוח?</h4>
                  <p className="text-amber-200/60 text-sm mb-3">תן לבינה המלאכותית שלנו לנסח עבורך מטרה מדויקת ומושכת שמבוססת על השירותים שלך.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiSuggest('prompt')}
                    disabled={suggesting}
                    className="bg-transparent border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  >
                    {suggesting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Sparkles className="w-4 h-4 ml-2" />}
                    נסח עבורי עם AI
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tone */}
          {step === 3 && (
            <div className="space-y-6 max-w-lg mx-auto animate-in slide-in-from-left-4 duration-300">
              <div className="grid grid-cols-2 gap-3">
                {TONES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`p-4 rounded-2xl border transition-all duration-200 text-right ${tone === t
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-black/50 border-amber-500/20 text-amber-100/70 hover:border-amber-500/50'
                      }`}
                  >
                    <div className="font-bold">{t}</div>
                  </button>
                ))}
                <button
                  onClick={() => setTone("other")}
                  className={`p-4 rounded-2xl border transition-all duration-200 text-right ${tone === "other"
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-black/50 border-amber-500/20 text-amber-100/70 hover:border-amber-500/50'
                    }`}
                >
                  <div className="font-bold">מותאם אישית...</div>
                </button>
              </div>

              {tone === "other" && (
                <input
                  type="text"
                  value={customTone}
                  onChange={e => setCustomTone(e.target.value)}
                  placeholder="הקלד סגנון חופשי..."
                  className="w-full bg-black/50 border border-amber-500/30 rounded-xl p-3 text-amber-100 focus:border-amber-500 outline-none transition-all"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* STEP 4: Audience */}
          {step === 4 && (
            <div className="space-y-6 max-w-lg mx-auto animate-in slide-in-from-left-4 duration-300">
              <label className="text-amber-200/70 text-sm block mb-3">למי מיועד העמוד הזה?</label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setAudience("כולם")}
                  className={`p-4 rounded-2xl border transition-all duration-200 text-right ${audience === "כולם"
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-black/50 border-amber-500/20 text-amber-100/70 hover:border-amber-500/50'
                    }`}
                >
                  <div className="font-bold">לכולם (קהל רחב)</div>
                </button>

                {fetchedAudiences.map(a => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`p-4 rounded-2xl border transition-all duration-200 text-right ${audience === a
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-black/50 border-amber-500/20 text-amber-100/70 hover:border-amber-500/50'
                      }`}
                  >
                    <div className="font-bold">{a}</div>
                  </button>
                ))}

                <button
                  onClick={() => setAudience("other")}
                  className={`p-4 rounded-2xl border transition-all duration-200 text-right ${audience === "other"
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-black/50 border-amber-500/20 text-amber-100/70 hover:border-amber-500/50'
                    }`}
                >
                  <div className="font-bold">הגדר קהל יעד אחר...</div>
                </button>
              </div>

              {audience === "other" && (
                <input
                  type="text"
                  value={customAudience}
                  onChange={e => setCustomAudience(e.target.value)}
                  placeholder="הגדר קהל יעד..."
                  className="w-full bg-black/50 border border-amber-500/30 rounded-xl p-3 text-amber-100 focus:border-amber-500 outline-none transition-all"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* STEP 5: Finalize */}
          {step === 5 && (
            <div className="space-y-6 max-w-lg mx-auto animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <label className="text-amber-200/70 text-sm">קישור לעמוד (Slug באנגלית/מספרים)</label>
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="text-amber-500/50 font-mono text-sm shrink-0">
                    /{type === 'post' ? 'post' : type === 'event' ? 'landing' : type}/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g. shabbat-dinner"
                    className="flex-1 bg-black/50 border border-amber-500/30 rounded-xl p-3 text-amber-100 placeholder:text-amber-500/30 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono text-sm transition-all"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-amber-500/20">
                <label className="flex flex-row items-center justify-between cursor-pointer group">
                  <div className="space-y-1">
                    <span className="text-amber-200 font-bold block">ייצר תמונות אוטומטית ב-AI</span>
                    <span className="text-amber-200/50 text-sm block">אם כבוי, נשתמש בתמונת ברירת מחדל שתוכל להחליף בעורך.</span>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${generateImages ? 'bg-amber-500' : 'bg-slate-700'}`}>
                    <span className="sr-only">Enable AI Images</span>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${generateImages ? '-translate-x-6' : '-translate-x-1'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setGenerateImages(!generateImages);
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-amber-500/20 bg-black/50 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || loading}
            className={`text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            חזור
          </Button>

          <div className="flex gap-1.5" dir="ltr">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-amber-500' : s < step ? 'w-2 bg-amber-500/50' : 'w-2 bg-amber-500/20'}`} />
            ))}
          </div>

          <Button
            onClick={() => {
              if (step < 5) setStep(step + 1);
              else handleGenerate();
            }}
            disabled={loading || (step === 1 && !type) || (step === 2 && !goal) || (step === 5 && !slug)}
            className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-6"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> מייצר קסם...</>
            ) : step < 5 ? (
              <>המשך <ChevronLeft className="w-5 h-5 mr-2" /></>
            ) : (
              <><Sparkles className="w-4 h-4 ml-2" /> צור עמוד</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
