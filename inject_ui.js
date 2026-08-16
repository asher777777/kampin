const fs = require('fs');
const crmPath = 'src/features/crm/components/CRMFormBuilder.tsx';
const aiPath = 'src/app/test-ai-form/page.tsx';

let crm = fs.readFileSync(crmPath, 'utf8');

const tabsAndAiUi = `
      <div className="flex bg-[#111] rounded-xl p-1 w-full sm:w-fit mb-4">
        <button
          type="button"
          onClick={() => setMainTab("manual")}
          className={\`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all \${mainTab === "manual" ? "bg-amber-500 text-black shadow-md" : "text-gray-400 hover:text-white"}\`}
        >
          עריכה ידנית
        </button>
        <button
          type="button"
          onClick={() => setMainTab("michael")}
          className={\`flex-1 sm:w-32 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 \${mainTab === "michael" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"}\`}
        >
          <Wand2 className="w-4 h-4" />
          מיכאל (AI)
        </button>
      </div>
      
      {value.enabled && mainTab === "michael" && (
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
                {onboardingStep === "done" ? "מוכן לפעולה ✨" : \`שלב \${STEP_ORDER.indexOf(onboardingStep) + 1} מתוך 4\`}
              </p>
            </div>
          </div>
          
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #f59e0b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            {messages.map((msg, i) => (
              <div key={i} className={\`flex gap-3 relative z-10 \${msg.role === "user" ? "flex-row-reverse" : "flex-row"}\`}>
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
                <div className={\`max-w-[85%] \${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-[#181818] border border-white/5 text-slate-200"} px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed\`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {onboardingStep !== "done" && ONBOARDING[onboardingStep].options && (
              <div className="pr-11 pl-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                {ONBOARDING[onboardingStep].options.map((opt, i) => (
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
              <div className="flex gap-3 relative z-10">
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

      {value.enabled && mainTab === "manual" && (
`;

crm = crm.replace('      {value.enabled && (', tabsAndAiUi);
fs.writeFileSync(crmPath, crm, 'utf8');
console.log("UI injection complete.");
