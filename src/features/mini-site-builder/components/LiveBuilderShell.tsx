"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Coins, 
  Sparkles, 
  Send, 
  Loader2, 
  Eye, 
  X, 
  CheckCircle2, 
  Plus, 
  Wand2, 
  Globe, 
  Phone, 
  Mail, 
  MessageCircle,
  HelpCircle,
  ExternalLink,
  Link as LinkIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CoinBalanceBadge } from "./CoinBalanceBadge";
import { LiveBuilderPreview } from "./LiveBuilderPreview";
import { 
  BuilderStateData, 
  saveBuilderProgress, 
  analyzeProblemAndFindCompetitorsWithAI,
  evaluateDifferentiatorAndGrantCoins,
  generateSlugOptionsWithAI,
  generateLogoWithAI, 
  createServicePageWithAI,
  generateRichVisionAndInsightsWithAI,
  PersonaCard,
  generateSingleLogoWithFeedback
} from "../actions/builderActions";
import { uploadMediaFile } from "@/features/media/actions";

interface Message {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: string;
  showPreviewBtn?: boolean;
  isNew?: boolean;
}

interface LiveBuilderShellProps {
  initialCoins: number;
  userName: string;
  initialState?: BuilderStateData;
}

// Live Typewriter Effect Component
const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    setIsTyping(true);

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    }, 15);

    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayedText}
      {isTyping && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />}
    </span>
  );
};

export function LiveBuilderShell({ initialCoins, userName, initialState }: LiveBuilderShellProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [highlightCoins, setHighlightCoins] = useState(false);
  const [currentStep, setCurrentStep] = useState(initialState?.currentStep || 1);
  const [pitchSubStep, setPitchSubStep] = useState<"problem" | "differentiator" | "company_name" | "select_slug">((initialState?.pitchSubStep as any) || "problem");
  const [slugOptions, setSlugOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [siteSlug, setSiteSlug] = useState(initialState?.siteSlug || "");

  // New Logo Flow States
  const [logoFlowState, setLogoFlowState] = useState<"ask_has_logo" | "ask_generate" | "generating" | "review" | "done">("ask_has_logo");
  const [logoExplanation, setLogoExplanation] = useState<string>("");
  const [logoPrompt, setLogoPrompt] = useState<string>("");
  const [logoInteractionId, setLogoInteractionId] = useState<string>("");
  const [logoSeed, setLogoSeed] = useState<number | undefined>(undefined);
  const [logoRevisionsLeft, setLogoRevisionsLeft] = useState(3);
  const [logoRevisionFeedback, setLogoRevisionFeedback] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // State data
  const [state, setState] = useState<BuilderStateData>(initialState || {
    currentStep: 1,
    companyName: "",
    siteSlug: "",
    slogan: "",
    companyVision: "",
    shortVision: "",
    personas: [],
    servicePages: [],
    competitors: [],
  });

  // Cool, objective, professional initial messages (no hype)
  const defaultMessages: Message[] = [
    {
      id: "1",
      sender: "agent",
      text: `שלום ${userName}. אני מיכאל, אנליסט מותגים ויועץ דיגיטלי. נלווה אותך בבניית המיני-סייט והתשתיות של המיזם שלך.`,
      timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    },
    {
      id: "2",
      sender: "agent",
      text: `נפתח בשאלת היסוד: איזו בעיה מעשית המיזם שלך מגיע לפתור בשוק? אם הטיעון ענייני וחד – אעניק לך 100 מטבעות להתחלת העבודה.`,
      timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    }
  ];

  const [messages, setMessages] = useState<Message[]>(initialState?.messages || defaultMessages);

  // Auto-save messages and progress when messages change
  useEffect(() => {
    if (messages.length <= 2 && !initialState?.messages) return; // Don't save the initial defaults on first load
    
    const timeoutId = setTimeout(() => {
      saveBuilderProgress({
        currentStep,
        pitchSubStep,
        messages,
      }).catch(err => console.error("Auto-save failed", err));
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [messages, currentStep, pitchSubStep]);

  // Step inputs
  const [inputVal, setInputVal] = useState("");
  const [differentiatorInput, setDifferentiatorInput] = useState("");
  const [sloganInput, setSloganInput] = useState("");
  const [visionQ1, setVisionQ1] = useState("");
  const [newPersonaTitle, setNewPersonaTitle] = useState("");
  const [newPersonaDesc, setNewPersonaDesc] = useState("");
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isAgentTyping]);

  const addAgentMessageWithTyping = (text: string, showPreviewBtn = false, delayMs = 500) => {
    setIsAgentTyping(true);
    setTimeout(() => {
      setIsAgentTyping(false);
      const msg: Message = {
        id: "msg_" + Date.now() + Math.random(),
        sender: "agent",
        text,
        timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
        showPreviewBtn,
        isNew: true,
      };
      setMessages((prev) => [...prev, msg]);
    }, delayMs);
  };

  const addUserMessage = (text: string) => {
    const msg: Message = {
      id: "msg_" + Date.now() + Math.random(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  // Step 1 - Stage 1: Pitch Problem Submission & AI Competitor Analysis
  const handlePitchProblemSubmit = async () => {
    if (!inputVal.trim()) return;
    const userProblem = inputVal;
    addUserMessage(userProblem);
    setInputVal("");
    setLoading(true);

    try {
      const aiRes = await analyzeProblemAndFindCompetitorsWithAI(userProblem);
      setState((prev) => ({ 
        ...prev, 
        pitchProblem: userProblem, 
        competitors: aiRes.competitors || [] 
      }));
      
      addAgentMessageWithTyping(aiRes.agentResponse, false, 500);
      setPitchSubStep("differentiator");
    } finally {
      setLoading(false);
    }
  };

  // Step 1 - Stage 2: Pitch Differentiator Submission & AI Evaluation
  const handlePitchDifferentiatorSubmit = async () => {
    if (!differentiatorInput.trim()) return;
    const diff = differentiatorInput;
    addUserMessage(diff);
    setDifferentiatorInput("");
    setLoading(true);

    try {
      const res = await evaluateDifferentiatorAndGrantCoins(
        state.pitchProblem || "", 
        diff, 
        state.competitors
      );

      if (!res.isConvincing) {
        // Michael asks a follow-up probing question if pitch is too vague/weak!
        addAgentMessageWithTyping(res.agentResponse, false, 500);
        return;
      }

      if (res.success && res.isConvincing) {
        setCoins(res.coins);
        setHighlightCoins(true);
        setState((prev) => ({ ...prev, differentiator: diff, currentStep: 2 }));
        
        addAgentMessageWithTyping(`${res.agentResponse} כעת, מה שם החברה או העסק שלך?`, true, 500);
        setCurrentStep(2);
        setPitchSubStep("company_name");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2 - Stage 1: Company Name Submission & 3 Slug Options Generation
  const handleNameSubmit = async () => {
    if (!inputVal.trim()) return;
    const name = inputVal;
    addUserMessage(name);
    setInputVal("");
    setLoading(true);

    try {
      const slugRes = await generateSlugOptionsWithAI(name);
      setState((prev) => ({ ...prev, companyName: name }));

      if (slugRes.success && slugRes.slugOptions.length > 0) {
        setSlugOptions(slugRes.slugOptions);
        setPitchSubStep("select_slug");
        addAgentMessageWithTyping(`סביב השם "${name}", יצרתי 3 אפשרויות זמינות לנתיב האתר שלך. איזו סיומת הכי מתאימה לאתר שלך?`, true, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2 - Stage 2: Choosing one of the 3 Slug Options
  const handleSelectSlug = async (chosenSlug: string) => {
    addUserMessage(`בחרתי בסיומת: /${chosenSlug}`);
    setLoading(true);

    try {
      setSiteSlug(chosenSlug);
      const res = await saveBuilderProgress({ 
        companyName: state.companyName, 
        siteSlug: chosenSlug, 
        currentStep: 3 
      });

      if (res.success) {
        setState((prev) => ({ ...prev, siteSlug: chosenSlug }));
        addAgentMessageWithTyping(`הסיומת /${chosenSlug} אושרה ונרשמה 🌐. כעת, אנסח עבורכם חזון מותג מפורט של 200+ מילים. הזן את הסלוגן והתחום המרכזי:`, true, 500);
        setCurrentStep(3);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Master Copywriting 200+ Word Vision Generation
  const handleVisionSubmit = async () => {
    if (!visionQ1.trim()) return;
    addUserMessage(`סלוגן: ${sloganInput} | כיוון חזון: ${visionQ1}`);
    setLoading(true);

    try {
      const aiRes = await generateRichVisionAndInsightsWithAI(
        state.companyName || "החברה",
        sloganInput,
        state.pitchProblem || "",
        visionQ1,
        state.differentiator,
        state.competitors
      );

      if (aiRes.success) {
        setCoins(aiRes.newBalance);

        setState((prev) => ({ 
          ...prev, 
          slogan: sloganInput, 
          companyVision: aiRes.companyVision, 
          shortVision: aiRes.shortVision,
          personas: aiRes.personas.length > 0 ? aiRes.personas : prev.personas,
          servicePages: aiRes.servicePages.length > 0 ? aiRes.servicePages : prev.servicePages
        }));

        await saveBuilderProgress({
          slogan: sloganInput,
          companyVision: aiRes.companyVision,
          shortVision: aiRes.shortVision,
          personas: aiRes.personas,
          servicePages: aiRes.servicePages,
        });

        addAgentMessageWithTyping(`חזון מותג מורחב של כ-200 מילים גובש ונשמר. בנוסף, חולצו נקודות הכאב של הלקוחות ועמודי השירות. לחץ על העין 👁️ לצפייה במודל.`, true, 500);
        setCurrentStep(5);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Add Persona / Pain Point
  const handleAddPersona = () => {
    if (!newPersonaTitle.trim()) return;
    const newP: PersonaCard = {
      id: "persona_" + Date.now(),
      icon: "Sparkles",
      title: newPersonaTitle,
      description: newPersonaDesc || "פתרון ממוקד לנקודת הכאב",
    };
    const updated = [...(state.personas || []), newP];
    setState((prev) => ({ ...prev, personas: updated }));
    saveBuilderProgress({ personas: updated });

    addUserMessage(`נקודת כאב: ${newPersonaTitle} (${newPersonaDesc})`);
    addAgentMessageWithTyping(`כרטיס כאב נוסף ועודכן בלייב.`, true, 400);

    setNewPersonaTitle("");
    setNewPersonaDesc("");
  };

  // Step 5: Service Pages & Logo Generation
  const handleAddServicePage = async () => {
    if (!newServiceTitle.trim()) return;
    setLoading(true);
    try {
      const res = await createServicePageWithAI(newServiceTitle, state.pitchProblem || "");
      if (res.success && res.servicePage) {
        setCoins(res.newBalance);
        const updated = [...(state.servicePages || []), res.servicePage];
        setState((prev) => ({ ...prev, servicePages: updated }));
        saveBuilderProgress({ servicePages: updated });

        addUserMessage(`עמוד שירות: ${newServiceTitle}`);
        addAgentMessageWithTyping(`עמוד השירות "${newServiceTitle}" הוקם (נוכו 10 מטבעות).`, true, 400);
        setNewServiceTitle("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingleLogo = async (isRevision: boolean = false) => {
    if (isRevision && !logoRevisionFeedback.trim()) return;
    
    setLoading(true);
    setLogoFlowState("generating");
    try {
      if (isRevision) {
        addUserMessage(`אבקש לתקן את הסמל: ${logoRevisionFeedback}`);
      } else {
        addUserMessage("כן, אשמח מאוד לייצר סמל ב-10 מטבעות.");
      }

      const res = await generateSingleLogoWithFeedback(
        {
          companyName: state.companyName || "חברה",
          slogan: state.slogan,
          businessProblem: state.pitchProblem,
          companyVision: state.companyVision,
          services: state.servicePages?.map(s => s.title),
        },
        isRevision ? logoInteractionId : undefined,
        isRevision ? logoRevisionFeedback : undefined,
        isRevision ? logoSeed : undefined
      );

      if (res.success && res.logoUrl) {
        setCoins(res.newBalance);
        setState((prev) => ({ ...prev, logoUrl: res.logoUrl }));
        setLogoPrompt(res.prompt || "");
        setLogoExplanation(res.explanation || "");
        if (res.interactionId) setLogoInteractionId(res.interactionId);
        setLogoSeed(res.seed);
        setLogoFlowState("review");
        setLogoRevisionFeedback("");
        if (isRevision) {
          setLogoRevisionsLeft(prev => Math.max(0, prev - 1));
          addAgentMessageWithTyping(`ביצעתי את התיקונים שביקשת! הנה הסמל החדש (נשארו ${logoRevisionsLeft - 1} תיקונים)`, true, 500);
        } else {
          addAgentMessageWithTyping(`הסמל מוכן! הנה הסבר קצר על הבחירה העיצובית:`, true, 500);
        }
      } else {
        setLogoFlowState(isRevision ? "review" : "ask_generate");
        addUserMessage(`[שגיאה בחולל הלוגו: ${res.error || "תקלה לא ידועה"}]`);
        addAgentMessageWithTyping(`מצטער, הייתה בעיה ביצירת הסמל. נסה שוב.`, false, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaFile(formData);
      if (res.success && res.url) {
        setState(prev => ({ ...prev, logoUrl: res.url }));
        saveBuilderProgress({ logoUrl: res.url });
        addAgentMessageWithTyping("הלוגו הועלה בהצלחה!", true, 400);
        setLogoFlowState("done");
        setCurrentStep(6);
      } else {
        addUserMessage(`[שגיאת העלאה: ${res.error}]`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Contact Details & Finish
  const handleSaveContact = async () => {
    setLoading(true);
    try {
      const res = await saveBuilderProgress({
        contactPhone: phoneInput,
        contactEmail: emailInput,
        contactWhatsApp: whatsappInput,
      });
      if (res.success) {
        setState((prev) => ({
          ...prev,
          contactPhone: phoneInput,
          contactEmail: emailInput,
          contactWhatsApp: whatsappInput,
        }));

        addUserMessage("שמור פרטי התקשרות וסיים בנייה");
        addAgentMessageWithTyping(`תהליך הבנייה הושלם. הנתונים נשמרו ב-CRM. מעביר אותך לדשבורד...`, true, 500);

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-between p-4 sm:p-6" dir="rtl">
      
      {/* 1. TOP HEADER: Agent Identity, Live Status Indicator, Slug Link & Eye Preview Button */}
      <header className="w-full max-w-4xl bg-[#0f172a] border border-white/10 p-4 rounded-3xl shadow-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src="/wabagent.webp" 
              alt="Agent Michael" 
              className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500 shadow-md shrink-0" 
            />
            {/* Live Green Online Badge */}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full" title="מחובר בלייב" />
          </div>
          <div className="flex flex-col text-right">
            <h2 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
              <span>מיכאל</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">אנליסט מותגים & קופירייטר</span>
            </h2>
            {siteSlug ? (
              <span className="text-xs text-indigo-400 font-mono dir-ltr flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                /{siteSlug}
              </span>
            ) : (
              <span className="text-xs text-indigo-300 font-medium">ליווי אסטרטגי בלייב</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CoinBalanceBadge coins={coins} highlight={highlightCoins} />

          {/* Eye Modal Preview Button */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg backdrop-blur-md hover:scale-105"
            title="צפה בתצוגה מקדימה"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">תצוגה מקדימה</span>
          </button>
        </div>
      </header>

      {/* 2. AUTHENTIC CHAT AREA WITH LIVE TYPEWRITER ANIMATION */}
      <main className="w-full max-w-4xl flex-1 bg-[#0b1222] border border-white/10 rounded-3xl my-4 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-4 shadow-2xl relative">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.sender === "agent" ? (
                <img src="/wabagent.webp" alt="Agent" className="w-9 h-9 rounded-xl object-cover border border-indigo-500 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-lg">
                  אתה
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl space-y-2 text-sm leading-relaxed shadow-md ${
                msg.sender === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-[#162032] border border-white/10 text-slate-200 rounded-tl-none"
              }`}>
                {msg.sender === "agent" && msg.isNew ? (
                  <TypewriterText text={msg.text} />
                ) : (
                  <p>{msg.text}</p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>{msg.timestamp}</span>

                  {/* Eye Button inside Chat Message */}
                  {msg.showPreviewBtn && (
                    <button
                      onClick={() => setIsPreviewOpen(true)}
                      className="flex items-center gap-1.5 text-indigo-300 hover:text-white font-bold bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-1 rounded-xl border border-indigo-500/30 transition shadow"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>צפה בתצוגה מקדימה 👁️</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator Bubble ("מיכאל מקליד... 💬") */}
          {isAgentTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <img src="/wabagent.webp" alt="Agent Typing" className="w-9 h-9 rounded-xl object-cover border border-indigo-500 shrink-0" />
              <div className="bg-[#162032] border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-indigo-300 font-medium shadow-md">
                <span>מיכאל מקליד</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </main>

      {/* 3. STRICT SINGLE ACTIVE QUESTION STEP FOOTER */}
      <footer className="w-full max-w-4xl bg-[#0f172a] border border-white/10 p-4 rounded-3xl shadow-2xl z-20">
        
        {/* Step 1 - Stage 1: Problem Pitch Question */}
        {currentStep === 1 && pitchSubStep === "problem" && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePitchProblemSubmit()}
              placeholder="איזו בעיה מעשית המיזם מגיע לפתור?..."
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handlePitchProblemSubmit}
              disabled={loading || !inputVal.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl flex items-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>שלח לניתוח</span>
            </button>
          </div>
        )}

        {/* Step 1 - Stage 2: Competitive Differentiator Question */}
        {currentStep === 1 && pitchSubStep === "differentiator" && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={differentiatorInput}
              onChange={(e) => setDifferentiatorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePitchDifferentiatorSubmit()}
              placeholder="במה הפתרון שלכם ייחודי וטוב יותר מהגופים הללו?..."
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handlePitchDifferentiatorSubmit}
              disabled={loading || !differentiatorInput.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl flex items-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>הצג יתרון תחרותי</span>
            </button>
          </div>
        )}

        {/* Step 2 - Stage 1: Company Name Question */}
        {currentStep === 2 && pitchSubStep === "company_name" && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              placeholder="מה שם החברה / העסק שלך?..."
              className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handleNameSubmit}
              disabled={loading || !inputVal.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl flex items-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>שלח שם חברה</span>
            </button>
          </div>
        )}

        {/* Step 2 - Stage 2: Select 1 of 3 Slug Options (No getting stuck!) */}
        {currentStep === 2 && pitchSubStep === "select_slug" && (
          <div className="space-y-3">
            <p className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4" />
              <span>איזה סיומת כתובת אתר הכי מתאימה לעסק שלך?</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {slugOptions.map((slugOpt, idx) => (
                <button
                  key={slugOpt}
                  onClick={() => handleSelectSlug(slugOpt)}
                  disabled={loading}
                  className="p-3 bg-indigo-900/40 hover:bg-indigo-600 border border-indigo-500/40 hover:border-indigo-400 text-white font-mono text-xs rounded-xl flex items-center justify-between transition shadow-md hover:scale-[1.02] text-left"
                >
                  <span className="font-bold">/{slugOpt}</span>
                  <span className="text-[10px] text-indigo-300 bg-white/10 px-2 py-0.5 rounded-full">אופציה {idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Master Copywriting Vision Question (200+ Words) */}
        {currentStep === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={sloganInput}
                onChange={(e) => setSloganInput(e.target.value)}
                placeholder="סלוגן קצר שמלווה את העסק..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white"
              />
              <input
                type="text"
                value={visionQ1}
                onChange={(e) => setVisionQ1(e.target.value)}
                placeholder="מה התחושה/השינוי שהלקוח יחווה אצלכם?..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white"
              />
            </div>
            <button
              onClick={handleVisionSubmit}
              disabled={loading || !visionQ1.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>גבש חזון 200+ מילים ופרסונות (1 מטבע)</span>
            </button>
          </div>
        )}

        {/* Step 4: Target Personas Question */}
        {currentStep === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newPersonaTitle}
                onChange={(e) => setNewPersonaTitle(e.target.value)}
                placeholder="כותרת נקודת הכאב של הלקוח..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white"
              />
              <input
                type="text"
                value={newPersonaDesc}
                onChange={(e) => setNewPersonaDesc(e.target.value)}
                placeholder="תיאור הפתרון עבורו..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPersona}
                disabled={!newPersonaTitle.trim()}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף כרטיס כאב</span>
              </button>
              <button
                onClick={() => {
                  setCurrentStep(5);
                  addAgentMessageWithTyping(`${userName}, יש לך לוגו מוכן?`, true, 600);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-xl transition"
              >
                המשך לשלב הלוגו
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Logo Question & Service Pages */}
        {currentStep === 5 && (
          <div className="space-y-4">
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleLogoUpload} 
            />

            {/* State: ask_has_logo */}
            {logoFlowState === "ask_has_logo" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    addUserMessage("כן, יש לי לוגו משלי");
                    fileInputRef.current?.click();
                  }}
                  disabled={loading}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-sm transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "כן, יש לי לוגו"}
                </button>
                <button
                  onClick={() => {
                    addUserMessage("לא, אין לי סמל");
                    setLogoFlowState("ask_generate");
                    addAgentMessageWithTyping("התרצה שנייצר לך סמל לוגו מקצועי ב-AI (כולל הסבר שיווקי) במחיר של 10 מטבעות?", true, 500);
                  }}
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-900/60 hover:bg-indigo-800 text-white font-bold rounded-xl text-sm transition"
                >
                  לא, אין לי
                </button>
              </div>
            )}

            {/* State: ask_generate */}
            {logoFlowState === "ask_generate" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateSingleLogo(false)}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  <span>כן אשמח מאוד</span>
                </button>
                <button
                  onClick={() => {
                    addUserMessage("לא עכשיו");
                    setLogoFlowState("done");
                    setCurrentStep(6);
                  }}
                  disabled={loading}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition"
                >
                  לא עכשיו
                </button>
              </div>
            )}

            {/* State: generating */}
            {logoFlowState === "generating" && (
              <div className="py-6 text-center text-indigo-300">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-sm font-bold animate-pulse">ה-AI מגבש את החזון שלך לכדי סמל...</p>
              </div>
            )}

            {/* State: review */}
            {logoFlowState === "review" && (
              <div className="space-y-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-indigo-500/30 text-center">
                  <div className="relative aspect-square w-48 h-48 mx-auto rounded-xl overflow-hidden mb-4 shadow-lg border-2 border-indigo-500">
                    {state.logoUrl ? (
                      <img src={state.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 animate-pulse" />
                    )}
                  </div>
                  {logoExplanation && (
                    <div className="text-right bg-indigo-900/30 p-3 rounded-xl border border-indigo-500/20 mb-4">
                      <p className="text-xs text-indigo-200 leading-relaxed font-medium" dir="rtl">{logoExplanation}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      addUserMessage("אני מאשר את הסמל, בוא נמשיך.");
                      setLogoFlowState("done");
                      setCurrentStep(6);
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition shadow-lg mb-4"
                  >
                    אני מאשר את הסמל, המשך לשלב הבא
                  </button>
                </div>

                {logoRevisionsLeft > 0 ? (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <p className="text-xs text-indigo-300 text-right">
                      מעדיף כיוון אחר? כתוב מה תרצה לשנות (נותרו {logoRevisionsLeft} תיקונים):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={logoRevisionFeedback}
                        onChange={(e) => setLogoRevisionFeedback(e.target.value)}
                        placeholder="לדוגמה: הוסף אלמנט מעגלי, שנה לצבעים חמים..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                      />
                      <button
                        onClick={() => handleGenerateSingleLogo(true)}
                        disabled={loading || !logoRevisionFeedback.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shrink-0 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        עדכן
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-pink-400 text-center font-bold">
                    ניצלת את כל 3 סבבי התיקונים.
                  </p>
                )}
              </div>
            )}

            {/* State: done (shows Continue button and service page option) */}
            {logoFlowState === "done" && (
              <>
                <div className="flex gap-2 w-full mt-4">
                  <input
                    type="text"
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    placeholder="שם עמוד שירות נוסף (10 מטבעות)..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  />
                  <button
                    onClick={handleAddServicePage}
                    disabled={loading || !newServiceTitle.trim()}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl transition"
                >
                  המשך לפרטי התקשרות
                </button>
              </>
            )}

          </div>
        )}

        {/* Step 6: Contact Details Question */}
        {currentStep === 6 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="מספר טלפון..."
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="אימייל..."
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
              <input
                type="text"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="מספר ווצאפ..."
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <button
              onClick={handleSaveContact}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-2xl transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              <span>סיים בנייה ועבור לדשבורד</span>
            </button>
          </div>
        )}

      </footer>

      {/* 4. MODAL LIVE PREVIEW */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl h-[85vh] bg-[#0a0f1d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
            >
              {/* Modal Header */}
              <div className="p-4 bg-[#0f172a] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <span className="font-black text-sm sm:text-base text-white">תצוגה מקדימה חיה של המיני-סייט</span>
                  {siteSlug && <span className="text-xs text-slate-400">(/${siteSlug})</span>}
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden p-2">
                <LiveBuilderPreview state={state} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
