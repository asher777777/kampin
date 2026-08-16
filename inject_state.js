const fs = require('fs');

const crmPath = 'src/features/crm/components/CRMFormBuilder.tsx';

let crm = fs.readFileSync(crmPath, 'utf8');

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
        addMessage("assistant", \`✅ הטופס מוכן! עברתי ללשונית "עריכה ידנית".\`);
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

crm = crm.replace('const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");', 'const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");\n' + stateCode);

fs.writeFileSync(crmPath, crm, 'utf8');
console.log("Refactor complete.");
