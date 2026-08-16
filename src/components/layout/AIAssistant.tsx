"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronUp, Bot, Send, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { 
  getAssistantContext, 
  saveUserAiPreferences, 
  generateAssistantSuggestions 
} from "@/features/assistant/actions";

interface Suggestion {
  title: string;
  description: string;
  href: string;
}

interface AssistantData {
  greeting: string;
  suggestions: Suggestion[];
}

export function AIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [preferredTone, setPreferredTone] = useState("מקצועי אך מסביר פנים");

  // Chat/Suggestions state
  const [aiData, setAiData] = useState<AssistantData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      const res = await getAssistantContext();
      if (!isMounted) return;
      
      if (res.success && res.context) {
        if (!res.context.preferences.hasCompletedOnboarding) {
          setNeedsOnboarding(true);
          setIsMinimized(false);
          setIsOpen(true); // Auto open for new users
        } else {
          setNeedsOnboarding(false);
          fetchSuggestions();
        }
      }
      setIsLoading(false);
    }
    init();

    return () => { isMounted = false; };
  }, []);

  // Fetch new suggestions when pathname changes (if not onboarding)
  useEffect(() => {
    if (!needsOnboarding && !isLoading && isOpen) {
      fetchSuggestions();
    }
  }, [pathname, isOpen]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    const res = await generateAssistantSuggestions(pathname);
    if (res.success && res.data) {
      setAiData(res.data);
    }
    setIsLoading(false);
  };

  const handleSaveOnboarding = async () => {
    setIsLoading(true);
    await saveUserAiPreferences({
      organizationName: orgName,
      targetAudience: targetAudience,
      preferredTone: preferredTone
    });
    setNeedsOnboarding(false);
    await fetchSuggestions();
  };

  if (!isOpen && isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="fixed bottom-6 left-6 z-[100] p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-shadow flex items-center justify-center group"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-6 z-[100] w-[340px] max-w-[calc(100vw-3rem)] bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">העוזר החכם שלך</h3>
                <p className="text-xs text-indigo-100 opacity-90">מופעל ע״י Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronUp className="w-4 h-4 translate-y-0.5" />
              </button>
              <button 
                onClick={() => { setIsMinimized(true); setIsOpen(false); }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 flex-1 max-h-[60vh] overflow-y-auto">
            
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative flex h-10 w-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-500 items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium animate-pulse">ה-AI חושב...</p>
              </div>
            )}

            {!isLoading && needsOnboarding && (
              <div className="space-y-4">
                <div className="bg-indigo-50 text-indigo-900 p-3 rounded-xl text-sm leading-relaxed">
                  היי! אני העוזר האישי שלך. כדי שאוכל לעזור לך בצורה המדויקת ביותר, אשמח להכיר אותך קצת.
                </div>
                
                {onboardingStep === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">מה שם הארגון או הקהילה שלך?</label>
                    <input 
                      type="text" 
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder="לדוגמה: עמותת חסד, קהילת מתכנתים..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Button 
                      className="w-full mt-2" 
                      onClick={() => setOnboardingStep(1)}
                      disabled={!orgName.trim()}
                    >
                      המשך <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </motion.div>
                )}

                {onboardingStep === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">מי קהל היעד העיקרי שלך?</label>
                    <input 
                      type="text" 
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      placeholder="לדוגמה: תורמים, בני נוער, לקוחות..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" onClick={() => setOnboardingStep(0)} className="px-3">חזור</Button>
                      <Button 
                        className="flex-1" 
                        onClick={() => setOnboardingStep(2)}
                        disabled={!targetAudience.trim()}
                      >
                        המשך
                      </Button>
                    </div>
                  </motion.div>
                )}

                {onboardingStep === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">איך תרצה שאתנסח?</label>
                    <div className="grid grid-cols-1 gap-2">
                      {["מקצועי ורשמי", "חם וקהילתי", "צעיר וקליל", "שיווקי ומניע לפעולה"].map(tone => (
                        <button
                          key={tone}
                          onClick={() => setPreferredTone(tone)}
                          className={cn(
                            "p-2.5 text-sm rounded-lg border text-right transition-all",
                            preferredTone === tone 
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" onClick={() => setOnboardingStep(1)} className="px-3">חזור</Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleSaveOnboarding}
                      >
                        סיום והתחלה <Send className="w-4 h-4 mr-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {!isLoading && !needsOnboarding && aiData && (
              <div className="space-y-5">
                <div className="bg-slate-100 text-slate-800 p-3.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
                  {aiData.greeting}
                </div>

                {aiData.suggestions.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">הצעות מותאמות אישית:</h4>
                    {aiData.suggestions.map((sug, idx) => (
                      <Link
                        key={idx}
                        href={sug.href}
                        onClick={() => setIsMinimized(true)}
                        className="block p-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-xl transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-indigo-700 text-sm group-hover:text-indigo-800">{sug.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{sug.description}</p>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
