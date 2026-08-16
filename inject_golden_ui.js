const fs = require('fs');

const crmPath = 'src/features/crm/components/CRMFormBuilder.tsx';
let crm = fs.readFileSync(crmPath, 'utf8');

// 1. Add Icons and useRef
crm = crm.replace(
  'import { Button } from "@/components/ui/Button";',
  'import { Wand2, Eye, Send, Bot, User, CheckCircle2, ArrowLeft } from "lucide-react";\nimport { Button } from "@/components/ui/Button";\nimport { useRef } from "react";'
);

// 2. Add AI Types and Data Structures (above FormConfig)
const aiTypes = `
export type OnboardingStep = "audience" | "tone" | "age" | "goal" | "done";

export const STEP_ORDER = ["audience", "tone", "age", "goal"];

export const ONBOARDING: Record<string, { question: string, options?: string[] }> = {
  audience: {
    question: "מי קהל היעד העיקרי של הטופס הזה?",
    options: ["אימהות צעירות", "הורים לתאומים", "נשים בהריון", "תורמים פוטנציאליים", "צוות הוראה", "קהל כללי"]
  },
  tone: {
    question: "מהו סגנון הפנייה הרצוי בטופס?",
    options: ["רך ומכיל (מומלץ לאימהות)", "רשמי ומכובד", "קליל וידידותי", "שיווקי ומניע לפעולה"]
  },
  age: {
    question: "לאיזה טווח גילאים הטופס מכוון?",
    options: ["18-25", "25-35", "35-50", "50+", "כל הגילאים"]
  },
  goal: {
    question: "מה המטרה המרכזית של הטופס?",
    options: ["איסוף לידים", "הרשמה לאירוע/סדנא", "תרומה", "הצטרפות לקהילה", "השארת פרטים כללית"]
  }
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};
`;
crm = crm.replace('export interface FormConfig {', aiTypes + '\nexport interface FormConfig {');

// 3. Add AI state logic
const stateCode = `
  // Tabs
  const [mainTab, setMainTab] = useState<"michael" | "manual">("manual");
  
  // AI Onboarding State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("audience");
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: ONBOARDING["audience"].question,
    timestamp: new Date()
  }]);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [aiOpen, setAiOpen] = useState(true);
  
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, mainTab, aiOpen]);
  
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
      }, 400);
      return;
    }

    setOnboardingStep("done");
    setIsGenerating(true);

    const fullPrompt = \`קהל היעד: \${newCollected["audience"]}\\nטון דיבור: \${newCollected["tone"]}\\nשכבת גיל: \${newCollected["age"]}\\nמטרת הטופס: \${newCollected["goal"]}\`;

    try {
      const res = await fetch("/api/ai/form-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt })
      });
      const data = await res.json();
      if (data.success && data.formConfig) {
        onChange(data.formConfig);
        setMainTab("manual");
        addMessage("assistant", \`✅ הטופס מוכן וכל ההגדרות הוזנו בהצלחה! עברתי ללשונית "עריכה ידנית".\`);
      } else {
        addMessage("assistant", "❌ אירעה שגיאה ביצירת הטופס.");
      }
    } catch (e) {
      addMessage("assistant", "❌ אירעה שגיאה. נסו שוב.");
    } finally {
      setIsGenerating(false);
    }
  };
`;

crm = crm.replace(
  'const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");',
  'const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");\n' + stateCode
);

// 4. Inject Golden Flute AI UI
const goldenAiUi = `
      <div className="flex bg-[#000] border border-amber-500/20 rounded-xl p-1 w-full sm:w-fit mb-6 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
        <button
          type="button"
          onClick={() => setMainTab("manual")}
          className={\`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all \${mainTab === "manual" ? "bg-amber-500 text-black shadow-md" : "text-gray-400 hover:text-amber-500"}\`}
        >
          עריכה ידנית
        </button>
        <button
          type="button"
          onClick={() => setMainTab("michael")}
          className={\`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 \${mainTab === "michael" ? "bg-amber-500 text-black shadow-md" : "text-gray-400 hover:text-amber-500"}\`}
        >
          <Wand2 className="w-4 h-4" />
          מיכאל (AI)
        </button>
      </div>
      
      {value.enabled && mainTab === "michael" && (
        <div className="border border-amber-500/30 rounded-2xl flex flex-col bg-[#0a0a0c] overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.05)]" style={{ height: "550px" }}>
          <div className="px-5 py-4 bg-gradient-to-r from-amber-950/40 to-black border-b border-amber-500/20 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Wand2 className="w-6 h-6 text-black drop-shadow-sm" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-[#181818]" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-amber-50">מיכאל המחלל</p>
              <p className="text-xs text-amber-400/80 font-medium">
                {onboardingStep === "done" ? "הקסם פועל ✨" : \`שלב \${STEP_ORDER.indexOf(onboardingStep) + 1} מתוך 4\`}
              </p>
            </div>
          </div>
          
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 relative">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #f59e0b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* Intro text from Michael */}
            {messages.length === 1 && (
               <div className="flex gap-3 relative z-10">
                 <div className="shrink-0 w-8 h-8" />
                 <div className="max-w-[85%] text-amber-200/70 text-xs px-2 italic">
                   שלום, אני מיכאל. בעזרת החליל שלי אני אייצר עבורך את הטופס המושלם שידבר בדיוק אל הלב של קהל היעד שלך. נתחיל?
                 </div>
               </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={\`flex gap-3 relative z-10 \${msg.role === "user" ? "flex-row-reverse" : "flex-row"}\`}>
                <div className="shrink-0 mt-1">
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                      <Wand2 className="w-4 h-4 text-black" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#111] border border-amber-500/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-100/50" />
                    </div>
                  )}
                </div>
                <div className={\`max-w-[85%] \${msg.role === "user" ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-[#111] border border-amber-500/20 text-white"} px-5 py-3.5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed\`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {onboardingStep !== "done" && ONBOARDING[onboardingStep].options && (
              <div className="pr-11 pl-4 flex flex-wrap gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500 relative z-10">
                {ONBOARDING[onboardingStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(opt)}
                    className="px-5 py-2.5 bg-[#111] hover:bg-amber-950/30 border border-amber-500/30 hover:border-amber-500 text-amber-200 hover:text-amber-100 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            
            {isGenerating && (
              <div className="flex gap-3 relative z-10">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                  <Wand2 className="w-4 h-4 text-black animate-pulse" />
                </div>
                <div className="bg-[#111] border border-amber-500/20 text-amber-400 px-5 py-3.5 rounded-2xl text-sm italic animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> מחלל את המנגינה של הטופס שלך...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-[#050505] border-t border-amber-500/10">
            <div className="flex items-end gap-3 bg-[#111] border border-amber-500/20 rounded-2xl p-2.5 focus-within:border-amber-500/60 focus-within:shadow-[0_0_10px_rgba(245,158,11,0.1)] transition-all">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isGenerating || onboardingStep === "done"}
                placeholder={onboardingStep === "done" ? "הטופס נוצר והמנגינה הושלמה!" : "הקלד תשובה או לחץ על אפשרות..."}
                className="flex-1 bg-transparent text-white text-sm outline-none resize-none px-3 py-2 max-h-32 min-h-[44px] placeholder:text-gray-600"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!aiPrompt.trim() || isGenerating || onboardingStep === "done"}
                className="w-11 h-11 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 flex items-center justify-center text-black transition-colors shadow-md"
              >
                <Send className="w-5 h-5 rtl:-scale-x-100" />
              </button>
            </div>
          </div>
        </div>
      )}

      {value.enabled && mainTab === "manual" && (
`;

crm = crm.replace('      {value.enabled && (', goldenAiUi);

// 5. Replace `indigo` and `purple` across the document
// I will just use regex to replace all color-related classes so it matches Golden Flute.
crm = crm.replace(/indigo-600/g, 'amber-500');
crm = crm.replace(/text-indigo-600/g, 'text-amber-500');
crm = crm.replace(/bg-indigo-600/g, 'bg-amber-500');
crm = crm.replace(/indigo-500/g, 'amber-500');
crm = crm.replace(/text-indigo-500/g, 'text-amber-500');
crm = crm.replace(/border-indigo-500/g, 'border-amber-500');
crm = crm.replace(/ring-indigo-500/g, 'ring-amber-500');
crm = crm.replace(/indigo-400/g, 'amber-400');
crm = crm.replace(/indigo-300/g, 'amber-300');
crm = crm.replace(/indigo-200/g, 'amber-200');
crm = crm.replace(/indigo-100/g, 'amber-100');
crm = crm.replace(/indigo-50/g, 'amber-50');
crm = crm.replace(/indigo-900/g, 'amber-900');
crm = crm.replace(/indigo-950/g, 'amber-950');
crm = crm.replace(/purple-600/g, 'amber-600');
crm = crm.replace(/purple-950/g, 'black');

fs.writeFileSync(crmPath, crm, 'utf8');
console.log("Golden Flute AI UI injection complete.");
