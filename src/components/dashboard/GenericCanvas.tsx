"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { chatWithAssistant, loadChatHistory, clearChatHistory } from "@/features/assistant/actions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GenericCanvasProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  initialOptions: { label: string; actionText: string; icon: React.ReactNode }[];
  context: string;
}

export function GenericCanvas({ title, subtitle, icon, initialOptions, context }: GenericCanvasProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialPrompt, setShowInitialPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load History
  useEffect(() => {
    async function fetchHistory() {
      const res = await loadChatHistory(`/${context}`);
      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        if (res.messages && res.messages.length > 0) {
          setMessages(res.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          })));
        }
      }
    }
    fetchHistory();
  }, [context]);

  // Initial Logic
  useEffect(() => {
    if (messages.length === 0) {
      setShowInitialPrompt(true);
    } else {
      setShowInitialPrompt(false);
    }
  }, [messages.length]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || !sessionId) return;

    setShowInitialPrompt(false);

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const res = await chatWithAssistant(sessionId, text, `/${context}`);
    
    if (res.success && res.text) {
      setMessages([...updatedMessages, { role: "assistant", content: res.text }]);
    } else {
      setMessages([...updatedMessages, { role: "assistant", content: "אירעה שגיאה בחיבור לסוכן. " + (res.error || "") }]);
    }
    
    setIsLoading(false);
  };

  const handleClear = async () => {
    if (!sessionId) return;
    setMessages([]);
    setShowInitialPrompt(true);
    await clearChatHistory(sessionId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 w-full relative" dir="rtl">
      
      {/* Messages Area (This is the only scrollable area) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6">
        
        {/* Initial Prompt */}
        {showInitialPrompt && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-2xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-[#0f172a] rounded-full flex items-center justify-center shadow-lg border border-white/10">
              <div className="text-indigo-400 w-10 h-10 [&>svg]:w-full [&>svg]:h-full">
                {icon}
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
              <p className="text-slate-600 text-lg">{subtitle}</p>
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(initialOptions.length, 3)} gap-4 w-full mt-8 max-w-xl`}>
              {initialOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(opt.actionText)}
                  className="flex flex-col items-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/30 transition-all gap-3 group"
                >
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </div>
                  <span className="font-bold text-slate-800">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Regular Messages */}
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm border border-white/10",
                  msg.role === "user" 
                    ? "bg-[#0f172a] text-white" 
                    : "bg-[#0f172a] text-indigo-400"
                )}
              >
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div
                className={cn(
                  "px-5 py-3.5 rounded-2xl max-w-[85%] text-sm md:text-base leading-relaxed border",
                  msg.role === "user"
                    ? "bg-[#0f172a] text-white rounded-tl-sm shadow-md border-white/10"
                    : "bg-white border-slate-200/60 text-slate-700 rounded-tr-sm shadow-sm"
                )}
              >
                <div className="prose prose-sm md:prose-base prose-slate rtl text-right max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                  <ReactMarkdown 
                    components={{
                      p: ({ node, ...props }) => <p className="m-0" {...props} />,
                      a: ({ node, ...props }) => {
                        if (props.href?.startsWith("#modal:")) {
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const modalId = props.href?.replace("#modal:", "");
                                let targetPath = "";
                                
                                if (modalId === "create-service") targetPath = "/dashboard/services";
                                else if (modalId === "create-contact") targetPath = "/dashboard/crm";
                                else if (modalId === "issue-invoice") targetPath = "/dashboard/receipts";
                                else if (modalId === "create-campaign") targetPath = "/dashboard/emails";
                                else if (modalId === "create-automation") targetPath = "/dashboard/automations";
                                
                                if (targetPath) {
                                  window.location.href = `${targetPath}?modal=${modalId}`;
                                } else {
                                  handleSend(`אנא הדפס לי את הנתונים המבוקשים ישירות לכאן לתוך הצ'אט, אין לי מסך ייעודי להציג את זה.`);
                                }
                              }}
                              className="inline-flex items-center gap-1 bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 hover:bg-indigo-500/30 transition-colors font-medium border border-indigo-500/30"
                            >
                              {props.children}
                            </button>
                          );
                        }
                        return <a href={props.href} className="text-indigo-400 underline hover:text-indigo-300 transition-colors font-medium" target="_blank" rel="noopener noreferrer">{props.children}</a>;
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 w-full flex-row animate-in fade-in slide-in-from-bottom-2">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#0f172a] text-indigo-400 flex items-center justify-center shadow-sm border border-white/10">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-5 py-3.5 rounded-2xl bg-white border border-slate-200/60 text-slate-700 rounded-tr-sm shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">הסוכן מקליד...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 md:p-6 pb-2 md:pb-4 w-full bg-transparent">
        <div className="max-w-3xl mx-auto relative flex items-center gap-3 bg-[#0f172a] rounded-full border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.15)] focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-white/40 transition-all p-2 pl-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="איך אפשר לעזור לך היום?"
            className="w-full bg-transparent border-0 focus:ring-0 resize-none py-3.5 px-4 text-sm md:text-base outline-none text-white placeholder:text-slate-400 placeholder:font-medium text-right"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white/10 transition-all shadow-md"
          >
            <Send className="w-5 h-5 rtl:-scale-x-100" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors mr-1"
              title="ניקוי שיחה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center mt-3">
            <span className="text-[11px] text-slate-400 font-medium">ה-AI עלול לעשות טעויות. מומלץ לבדוק את התוצרים.</span>
        </div>
      </div>
    </div>
  );
}
