"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Send, Bot, User, Loader2, Lightbulb, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { chatWithAssistant, loadChatHistory, clearChatHistory } from "@/features/assistant/actions";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AgentSidebarChat({ className }: { className?: string }) {
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
        }
      }
    }
    fetchHistory();
  }, [pathname]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load contextual suggestions based on pathname
  useEffect(() => {
    let routeSuggestions: string[] = [];

    if (pathname.includes("/dashboard/crm")) {
      routeSuggestions = ["איך להוסיף איש קשר?", "איך עובד סינון הקהילה?", "יצוא נתונים לאקסל"];
    } else if (pathname.includes("/dashboard/whatsapp")) {
      routeSuggestions = ["איך שולחים קמפיין?", "מה זה משתנים בהודעה?", "חיבור מספר וואטסאפ"];
    } else if (pathname.includes("/dashboard/services")) {
      routeSuggestions = ["איך ליצור עמוד נחיתה?", "עריכת עיצוב העמוד", "חיבור סליקה לעמוד"];
    } else if (pathname.includes("/dashboard/emails")) {
      routeSuggestions = ["שליחת ניוזלטר לקהילה", "איך לעצב את המייל?", "סטטיסטיקות פתיחה"];
    } else if (pathname.includes("/dashboard/automations")) {
      routeSuggestions = ["איך בונים אוטומציה?", "טריגרים נפוצים", "אוטומציית ברוכים הבאים"];
    } else if (pathname.includes("/dashboard/calendar")) {
      routeSuggestions = ["איך לסנכרן יומן גוגל?", "הגדרת שעות פעילות", "יצירת קישור לפגישה"];
    } else {
      routeSuggestions = ["איך להתחיל לעבוד?", "מה המצב של הקהילה שלי?"];
    }

    setSuggestions(routeSuggestions);
  }, [pathname]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || !sessionId) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    // Hide suggestions once chatting starts
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
    <aside className={cn("flex flex-col h-[100dvh] bg-white border-l border-slate-200/60 shadow-lg w-[320px] lg:w-[380px] shrink-0", className)} dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-800 tracking-tight">סוכן אישי</h2>
          <p className="text-xs text-slate-500 font-medium">המלווה שלך במערכת</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-8 px-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bot className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-bold text-slate-700">במה אוכל לעזור בעמוד זה?</h3>
            <p className="text-xs text-slate-500 mt-1">שאל שאלות טכניות, בקש ליצור תוכן או קבל הדרכה מותאמת אישית.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex items-start gap-2 max-w-[90%]",
              msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
            )}
          >
            {/* Bubble */}
            <div className={cn(
              "px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm",
              msg.role === "user" 
                ? "bg-indigo-50 text-indigo-900 rounded-tr-sm border border-indigo-100/50" 
                : "bg-white text-slate-700 rounded-tl-sm border border-slate-100"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-indigo max-w-none text-slate-700 prose-p:leading-relaxed prose-a:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 break-words">
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
                              <ExternalLink className="w-3 h-3" />
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
          <div className="flex items-start gap-2 max-w-[90%] ml-auto">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100">
        
        {/* Dynamic Suggested Prompts */}
        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[12px] rounded-full hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                {sug}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="הקלד כאן..."
            className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none p-2.5 outline-none text-slate-700 placeholder:text-slate-400 text-sm"
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
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors mr-1"
              title="ניקוי שיחה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
