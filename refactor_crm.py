import re

with open('orig_crm.txt', 'r', encoding='utf-16le') as f:
    crm_code = f.read()

with open('test-ai.txt', 'r', encoding='utf-16le') as f:
    ai_code = f.read()

# Extract parts from AI code
onboarding_match = re.search(r'(type ChatMessage =.*?)function hasFormData', ai_code, re.DOTALL)
if onboarding_match:
    onboarding_code = onboarding_match.group(1)
else:
    onboarding_code = ""

imports_match = re.search(r'import \{[^}]*Wand2[^}]*\} from "lucide-react";', ai_code)
if imports_match:
    ai_imports = imports_match.group(0)
else:
    ai_imports = 'import { Wand2, Bot, User } from "lucide-react";'

# Now we need to modify CRMFormBuilder.tsx
# 1. Add new imports
crm_code = crm_code.replace('import { Button } from "@/components/ui/Button";', ai_imports + '\nimport { Button } from "@/components/ui/Button";\nimport { useRef } from "react";')

# 2. Add ONBOARDING constants outside component
crm_code = crm_code.replace('export interface FormConfig {', onboarding_code + '\nexport interface FormConfig {')

# 3. Add states inside CRMFormBuilder component
state_code = """
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
  
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, mainTab]);
  
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

    const fullPrompt = `קהל היעד: ${newCollected["audience"]}\\nטון דיבור: ${newCollected["tone"]}\\nשכבת גיל: ${newCollected["age"]}\\nמטרת הטופס: ${newCollected["goal"]}`;

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
        addMessage("assistant", `✅ הטופס מוכן! עברתי ללשונית "עריכה ידנית".`);
      } else {
        addMessage("assistant", "❌ אירעה שגיאה ביצירת הטופס.");
      }
    } catch (e) {
      addMessage("assistant", "❌ אירעה שגיאה. נסו שוב.");
    } finally {
      setIsGenerating(false);
    }
  };
"""

crm_code = crm_code.replace('const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "payment" | "settings">("fields");', 'const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "payment" | "settings">("fields");' + state_code)

# 4. Insert Tabs UI and AI Chat UI right after the "מחולל טפסים ומחבר CRM מובנה" header part
tabs_and_ai_ui = """
      <div className="flex bg-[#111] rounded-xl p-1 w-full sm:w-fit mb-4">
        <button
          type="button"
          onClick={() => setMainTab("manual")}
          className={`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all ${mainTab === "manual" ? "bg-amber-500 text-black shadow-md" : "text-gray-400 hover:text-white"}`}
        >
          עריכה ידנית
        </button>
        <button
          type="button"
          onClick={() => setMainTab("michael")}
          className={`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mainTab === "michael" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
        >
          <Wand2 className="w-4 h-4" />
          מיכאל (AI)
        </button>
      </div>
      
      {mainTab === "michael" && (
        <div className="border border-indigo-500/20 rounded-2xl flex flex-col bg-[#0a0a0c] overflow-hidden" style={{ height: "480px" }}>
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border-b border-indigo-500/10 flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                <Wand2 className="w-4 h-4 text-white drop-shadow-sm" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#181818]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-50">מיכאל המחלל</p>
              <p className="text-[10px] text-indigo-400/80 font-medium">
                {onboardingStep === "done" ? "מוכן לפעולה ✨" : `שלב ${STEP_ORDER.indexOf(onboardingStep) + 1} מתוך 4`}
              </p>
            </div>
          </div>
          
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="shrink-0">
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#181818] border border-indigo-500/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-100/50" />
                    </div>
                  )}
                </div>
                <div className={`max-w-[85%] ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-[#181818] border border-white/5 text-slate-200"} px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {onboardingStep !== "done" && ONBOARDING[onboardingStep].options && (
              <div className="pr-11 pl-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {ONBOARDING[onboardingStep].options!.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(opt)}
                    className="px-4 py-2 bg-indigo-950/30 hover:bg-indigo-900/50 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-200 rounded-full text-sm font-medium transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            
            {isGenerating && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Wand2 className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="bg-[#181818] border border-white/5 text-indigo-400 px-4 py-3 rounded-2xl text-sm italic animate-pulse">
                  חושב ובונה את הטופס...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-[#111] border-t border-white/5">
            <div className="flex items-end gap-2 bg-[#181818] border border-white/10 rounded-2xl p-2 focus-within:border-indigo-500/50 transition-colors">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={isGenerating || onboardingStep === "done"}
                placeholder={onboardingStep === "done" ? "הטופס נוצר!" : "הקלד תשובה..."}
                className="flex-1 bg-transparent text-white text-sm outline-none resize-none px-2 py-1 max-h-32 min-h-[40px]"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!aiPrompt.trim() || isGenerating || onboardingStep === "done"}
                className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
              >
                <Bot className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {mainTab === "manual" && (
        <div className="space-y-6">
"""

header_end = '</label>\n          </div>\n        </div>\n      </div>'
crm_code = crm_code.replace(header_end, header_end + '\n' + tabs_and_ai_ui)

# Need to close the <div> from mainTab === "manual" at the very end
crm_code = crm_code.replace('      {/* Add Custom Field Modal */}', '        </div>\n      )} {/* end manual tab */}\n\n      {/* Add Custom Field Modal */}')

with open('src/features/crm/components/CRMFormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(crm_code)
