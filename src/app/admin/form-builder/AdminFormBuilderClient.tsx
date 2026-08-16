"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { CRMFormBuilder, FormConfig } from "@/features/crm/components/CRMFormBuilder";
import { CRMFormRenderer } from "@/features/crm/components/CRMFormRenderer";
import { Wand2, ChevronDown, Eye, Send, User, CheckCircle2, ArrowLeft } from "lucide-react";

const DEFAULT_FORM: FormConfig = {
  enabled: true,
  form_type: "standard",
  submit_button_text: "שלח",
  submit_button_bg_color: "#4f46e5",
  submit_button_text_color: "#ffffff",
  fields: [],
  save_to_crm: true,
  crm_owner_id: "",
  standard_success_message: "תודה רבה!",
  standard_redirect_url: "",
  standard_whatsapp_message: "",
  standard_whatsapp_image_url: "",
  payment_amount: 0,
  payment_amount_crm_map: "payment_amount",
  payment_pending_message: "",
  payment_pending_image_url: "",
  payment_success_message: "",
  payment_success_image_url: "",
  payment_group: "",
  payment_zeut_kupa: "",
  payment_receipt_type: "",
  payment_frequency: "one-time"
};

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp: Date };
type OnboardingStep = "audience" | "tone" | "age" | "goal" | "done";

const ONBOARDING: Record<OnboardingStep, { question: string; options?: string[] }> = {
  audience: {
    question: "ראשית, מי קהל היעד של הטופס?",
    options: ["הורים וילדים", "אנשי עסקים", "קהל כללי", "גיל שלישי", "צעירים 18-35", "אחר"]
  },
  tone: {
    question: "מה הטון שמתאים לקהל הזה?",
    options: ["מקצועי ורשמי", "חם ואישי", "צעיר ונמרץ", "דתי ומסורתי", "השראתי ומעורר"]
  },
  age: {
    question: "מה שכבת הגיל העיקרית?",
    options: ["ילדים (עד 12)", "נוער (13-18)", "צעירים (18-35)", "מבוגרים (35-60)", "גיל שלישי (60+)", "מגוון גילאים"]
  },
  goal: {
    question: "מצוין! עכשיו ספר לי — מה מטרת הטופס? תאר את הצורך שהטופס אמור לפתור.",
    options: undefined
  },
  done: { question: "" }
};

const STEP_ORDER: OnboardingStep[] = ["audience", "tone", "age", "goal"];

function hasFormData(cfg: FormConfig) { return cfg.fields.length > 0; }

export function AdminFormBuilderClient() {
  const [config, setConfig] = useState<FormConfig>(DEFAULT_FORM);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const user = useAuthStore(state => state.user);
  
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("audience");
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `מה שלומך ${user?.name || 'יקירי'}?\nבשביל טופס מדויק אני רוצה להבין\n\n${ONBOARDING["audience"].question}`,
        timestamp: new Date()
      }]);
    }
  }, [user?.name, messages.length]);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (hasFormData(config)) setPreviewOpen(true);
  }, [config.fields.length]);

  useEffect(() => {
    if (aiOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, aiOpen]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || aiPrompt).trim();
    if (!text || isGenerating) return;
    setAiPrompt("");

    addMessage("user", text);

    const currentStep = onboardingStep;
    const nextStepIndex = STEP_ORDER.indexOf(currentStep) + 1;
    const nextStep = STEP_ORDER[nextStepIndex] as OnboardingStep | undefined;

    const newCollected = { ...collected, [currentStep]: text };
    setCollected(newCollected);

    if (currentStep !== "goal") {
      setOnboardingStep(nextStep!);
      setTimeout(() => {
        addMessage("assistant", ONBOARDING[nextStep!].question);
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 400);
      return;
    }

    setOnboardingStep("done");
    setIsGenerating(true);

    const fullPrompt = `
קהל היעד: ${newCollected["audience"]}
טון דיבור: ${newCollected["tone"]}
שכבת גיל: ${newCollected["age"]}
מטרת הטופס: ${newCollected["goal"]}
    `.trim();

    try {
      const res = await fetch("/api/ai/form-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt })
      });
      const data = await res.json();
      if (data.success && data.formConfig) {
        setConfig(data.formConfig);
        setPreviewOpen(true);
        setAiOpen(false);
        addMessage("assistant",
          `✅ הטופס מוכן!\n\nבניתי טופס עם **${data.formConfig.fields?.length || 0} שדות** מותאמים לקהל שלך (${newCollected["audience"]}) בטון ${newCollected["tone"]}.\nתוכל לראות את התצוגה המקדימה למטה ולערוך בעורך הטפסים.`
        );
      } else {
        addMessage("assistant", "❌ לא הצלחתי ליצור את הטופס. " + (data.error || "נסה שוב."));
      }
    } catch {
      addMessage("assistant", "❌ שגיאת רשת. בדוק חיבור ונסה שוב.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const currentOptions = onboardingStep !== "done" ? ONBOARDING[onboardingStep]?.options : undefined;

  return (
    <div className="w-full text-white" dir="rtl">
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute rounded-full bg-yellow-300"
              style={{
                width: Math.random() * 4 + 1 + "px",
                height: Math.random() * 4 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                animation: `twinkle ${Math.random() * 3 + 1}s infinite ${Math.random() * 2}s`
              }}
            />
          ))}
          
          <div className="relative flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full border-2 border-yellow-500/20 animate-ping" />
            <div className="absolute w-28 h-28 rounded-full border-2 border-amber-500/30 animate-pulse" />
            <div className="absolute w-20 h-20 rounded-full border-2 border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.3)]" style={{ animation: "spin 4s linear infinite" }} />
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)] z-10">
              <Wand2 className="w-8 h-8 text-white animate-pulse drop-shadow-md" />
            </div>
          </div>
          <div className="w-72 space-y-3 z-10 relative">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden shadow-[0_0_10px_rgba(250,204,21,0.2)]">
              <div className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 rounded-full" style={{ animation: "indeterminate 1.8s ease-in-out infinite" }} />
            </div>
            <p className="text-center text-yellow-400 font-bold drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] text-lg">מיכאל מחלל את טופס ההרשמה</p>
            <p className="text-center text-amber-200/60 text-xs">כמה דקות והיצירה מוכנה</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes indeterminate { 0%{margin-left:-40%;width:40%} 50%{margin-left:30%;width:60%} 100%{margin-left:110%;width:40%} }
        @keyframes bounceDot { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-8px);opacity:1} }
        @keyframes twinkle { 0%,100%{opacity:0.2; transform:scale(0.8)} 50%{opacity:1; transform:scale(1.2); box-shadow:0 0 10px rgba(250,204,21,0.8)} }
        .msg-in { animation: msgIn .25s ease-out; }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="w-full bg-[#181818] border border-amber-500/10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <Wand2 className="w-4 h-4 text-white drop-shadow-sm" />
              </div>
              <span className="text-amber-50 text-base">
                מיכאל המחלל
                {onboardingStep === "audience" && " - אני כאן לעזור לך ליצור טופס מושלם"}
              </span>
              {messages.length > 1 && (
                <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {messages.length} הודעות
                </span>
              )}
            </span>
            <ChevronDown className={`w-5 h-5 transition-transform text-amber-500/50 ${aiOpen ? "rotate-180 text-amber-400" : ""}`} />
          </button>

          {aiOpen && (
            <div className="border-t border-amber-500/10 flex flex-col" style={{ height: "480px" }}>
              <div className="px-4 py-3 bg-gradient-to-r from-yellow-950/40 to-amber-950/40 border-b border-amber-500/10 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                    <Wand2 className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#181818] shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-50">מיכאל המחלל</p>
                  <p className="text-[10px] text-amber-400/80 font-medium">
                    {onboardingStep === "done" ? "מוכן לפעולה ✨" : `שלב ${STEP_ORDER.indexOf(onboardingStep) + 1} מתוך 4`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {STEP_ORDER.map((s, i) => (
                    <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                      onboardingStep === "done" || STEP_ORDER.indexOf(onboardingStep) > i
                        ? "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]" 
                        : onboardingStep === s ? "bg-yellow-200 scale-125 shadow-[0_0_8px_rgba(253,230,138,0.8)]" : "bg-white/10"
                    }`} />
                  ))}
                </div>
              </div>

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0a0a0c] relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #f59e0b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                {messages.map((msg, i) => (
                  <div key={i} className={`msg-in flex gap-3 relative z-10 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="shrink-0">
                      {msg.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                          <Wand2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#181818] border border-amber-500/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-100/50" />
                        </div>
                      )}
                    </div>
                    <div className={`max-w-[82%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl rounded-tl-sm shadow-[0_4px_15px_rgba(217,119,6,0.2)]"
                          : "bg-[#151518] border border-amber-500/10 text-white rounded-2xl rounded-tr-sm shadow-md"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-amber-500/40 px-1 font-medium">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="msg-in flex gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.3)] shrink-0">
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-[#151518] border border-amber-500/10 rounded-2xl rounded-tr-sm px-4 py-3.5 flex items-center gap-1.5 shadow-md">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" style={{ animation: `bounceDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {currentOptions && !isGenerating && (
                <div className="px-4 py-3 bg-[#111113] border-t border-amber-500/10 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2">
                  {currentOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleOptionClick(opt)}
                      className="text-xs px-4 py-2 rounded-full border border-amber-500/30 bg-amber-950/30 text-white hover:bg-gradient-to-r hover:from-amber-600 hover:to-orange-600 hover:border-transparent transition-all flex items-center gap-1.5 font-medium shrink-0 shadow-sm hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    >
                      {opt}
                      <ArrowLeft className="w-3 h-3 opacity-70" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-3 bg-[#131315] border-t border-amber-500/10">
                {onboardingStep !== "done" ? (
                  <div className="flex gap-2 items-end bg-[#0a0a0c] border border-amber-500/20 rounded-2xl p-2 focus-within:border-amber-500/50 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all">
                    <textarea
                      ref={textareaRef}
                      value={aiPrompt}
                      onChange={(e) => {
                        setAiPrompt(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                      }}
                      disabled={isGenerating}
                      placeholder={onboardingStep === "goal" ? "תאר את מטרת הטופס..." : "או הקלד תשובה חופשית..."}
                      className="flex-1 bg-transparent text-sm text-white resize-none outline-none placeholder-white/30 min-h-[34px] max-h-[100px] py-1.5 px-3"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    >
                      <Send className="w-4 h-4 text-white ml-0.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs text-amber-500/50 py-2 font-medium">הטופס נוצר והקסם פועל ✨ — ניתן לערוך בעורך למטה</div>
                )}
                {onboardingStep !== "done" && (
                  <p className="text-[10px] text-amber-500/30 text-center mt-2">Enter לשליחה · Shift+Enter לשורה חדשה</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <CRMFormBuilder value={config} onChange={setConfig} />
        </div>

        <div className="w-full bg-[#181818] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <button
            type="button"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="w-full p-4 flex justify-between items-center hover:bg-[#202020] text-white font-bold text-sm cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-base">תצוגה מקדימה</span>
              {hasFormData(config) && (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  {config.fields.length} שדות
                </span>
              )}
            </span>
            <ChevronDown className={`w-5 h-5 transition-transform text-gray-400 ${previewOpen ? "rotate-180 text-white" : ""}`} />
          </button>

          {previewOpen && (
            <div className="p-6 bg-[#111] border-t border-white/5">
              <div className="bg-black/40 rounded-[2rem] overflow-hidden flex items-center justify-center p-8 min-h-[300px] border border-amber-500/20 shadow-inner">
                <div className="w-full max-w-md bg-[#111111] rounded-[2rem] p-6 shadow-[0_0_40px_rgba(245,158,11,0.1)] border border-amber-500/20">
                  <CRMFormRenderer config={config} formId="test-form" formTitle="תצוגה מקדימה" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
