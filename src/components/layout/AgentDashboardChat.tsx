"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Send, Bot, User, Loader2, Lightbulb, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { chatWithAssistant, getAssistantContext, loadChatHistory, clearChatHistory } from "@/features/assistant/actions";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentDashboardChatProps {
  initialGreeting?: string;
  onExit: () => void;
}

export function AgentDashboardChat({ initialGreeting, onExit }: AgentDashboardChatProps) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load History
  useEffect(() => {
    async function fetchHistory() {
      const res = await loadChatHistory(pathname);
      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        if (res.messages && res.messages.length > 0) {
          setMessages(res.messages.map((m: any) => ({
            role: m.role,
            content: m.content
          })));
        } else if (initialGreeting) {
          setMessages([{ role: "assistant", content: initialGreeting }]);
        } else {
          setMessages([{ role: "assistant", content: "שלום! אני סוכן ה-AI שלך. במה אוכל לעזור לך היום?" }]);
        }
      }
    }
    fetchHistory();
  }, [pathname, initialGreeting]);

  // Initialize contextual suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      const res = await getAssistantContext();
      if (res.success && res.context) {
        const stats = res.context.stats;
        const newSuggestions: string[] = [];
        
        if (stats.totalContacts === 0) {
          newSuggestions.push("איך מעלים אנשי קשר מקובץ אקסל?");
        }
        if (stats.totalServices === 0) {
          newSuggestions.push("אני רוצה ליצור את דף הנחיתה הראשון שלי");
        }
        if (stats.activeAutomations === 0) {
          newSuggestions.push("איך אפשר לבנות אוטומציה לשליחת הודעות?");
        }
        if (stats.whatsappCampaigns === 0 && stats.totalContacts > 0) {
          newSuggestions.push("איך לשלוח קמפיין וואטסאפ לקהילה שלי?");
        }
        if (newSuggestions.length < 3) {
          newSuggestions.push("איך לחבר את יומן הפגישות שלי למערכת?");
        }
        if (newSuggestions.length < 4 && stats.totalContacts > 0) {
          newSuggestions.push("אני רוצה לשלוח ניוזלטר במייל");
        }

        setSuggestions(newSuggestions.slice(0, 4));
      }
    };
    loadSuggestions();
  }, [initialGreeting, messages.length]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || !sessionId) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    // Hide suggestions once the user starts chatting
    setSuggestions([]);
    setIsLoading(true);

    const res = await chatWithAssistant(sessionId, text, pathname);
    
    if (res.success && res.text) {
      setMessages([...updatedMessages, { role: "assistant", content: res.text }]);
    } else {
      setMessages([...updatedMessages, { role: "assistant", content: "אירעה שגיאה. " + (res.error || "") }]);
    }
    
    setIsLoading(false);
  };

  const handleClear = async () => {
    if (!sessionId) return;
    setMessages([]);
    await clearChatHistory(sessionId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden relative" dir="rtl">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex items-start gap-4 max-w-[85%]",
              msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
              msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
            )}>
              {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
              msg.role === "user" 
                ? "bg-indigo-50 text-indigo-900 rounded-tr-sm border border-indigo-100/50" 
                : "bg-white text-slate-700 rounded-tl-sm border border-slate-100"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm md:prose-base prose-indigo max-w-none text-slate-700 prose-p:leading-relaxed prose-a:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-500">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => {
                        // Check if it's a modal link
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
                                  if (pathname !== targetPath) {
                                    window.location.href = `${targetPath}?modal=${modalId}`;
                                  } else {
                                    window.dispatchEvent(new CustomEvent("open-ai-modal", { detail: modalId }));
                                  }
                                } else {
                                  handleSend(`אנא הדפס לי את הנתונים המבוקשים ישירות לכאן לתוך הצ'אט, אין לי מסך ייעודי להציג את זה.`);
                                }
                              }}
                              className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                              {props.children}
                            </button>
                          );
                        }
                        return <Link href={props.href || "#"} {...props} className="text-indigo-600 underline hover:text-indigo-800 transition-colors" />
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-4 max-w-[85%] ml-auto">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200/60">
        
        {/* Dynamic Suggested Prompts */}
        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-4xl mx-auto">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-[13px] rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm"
              >
                <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                {sug}
              </button>
            ))}
          </div>
        )}

        <div className="relative max-w-4xl mx-auto flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="איך אוכל לעזור לך היום?"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none p-3 outline-none text-slate-700 placeholder:text-slate-400"
            rows={1}
            dir="auto"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
          </button>
          {messages.length > 1 && (
            <button
              onClick={handleClear}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors mr-1"
              title="ניקוי שיחה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center mt-2">
          <span className="text-[11px] text-slate-400 font-medium">מופעל על ידי Gemini 3.1 Pro AI. המלצות הסוכן עשויות להשתנות.</span>
        </div>
      </div>
    </div>
  );
}
