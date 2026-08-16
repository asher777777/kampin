'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Database, Loader2, Cpu, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DBArchitectChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSeeded?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export default function DBArchitectChat({ isOpen, onClose, onDataSeeded }: DBArchitectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          text: 'שלום! אני ארכיטקט מסדי הנתונים שלך (AI Database Architect). 🧠\n\nאיזה סוג של מידע או קולקציה אתה רוצה לבנות היום? תאר לי בקצרה מה אתה מנסה לאחסן, ואציע לך מבנה JSON אופטימלי עם שדות שימושיים.'
        }
      ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', text: userText }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
      
      const res = await fetch('/api/db-architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: historyForApi })
      });

      const json = await res.json();
      
      if (json.success) {
        setMessages([
          ...newMessages,
          { id: (Date.now() + 1).toString(), role: 'ai', text: json.text || 'לא התקבלה תשובה' }
        ]);

        if (json.isSeeding && onDataSeeded) {
          onDataSeeded();
        }
      } else {
        setMessages([
          ...newMessages,
          { id: (Date.now() + 1).toString(), role: 'ai', text: `❌ שגיאה: ${json.error}` }
        ]);
      }
    } catch (e: any) {
      setMessages([
        ...newMessages,
        { id: (Date.now() + 1).toString(), role: 'ai', text: `❌ שגיאת רשת: ${e.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div 
        dir="rtl"
        className="bg-[#111115] border border-amber-500/40 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                ארכיטקט מסדי נתונים 
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">AI AI</span>
              </h2>
              <p className="text-xs text-slate-400">סיעור מוחות, בניית סכמות והזרקת Mock Data אוטומטית</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-[#111115] to-[#0c0c0e]">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${
                msg.role === 'user' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {msg.role === 'user' ? <Cpu className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-900/20 border border-emerald-500/20 text-emerald-100' 
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
              }`}>
                {msg.role === 'ai' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-slate-700">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-2 text-amber-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                חושב על מבנה נתונים...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800 bg-[#0c0c0e]">
          <div className="flex gap-2 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="תאר את הקולקציה שאתה צריך... (לדוגמה: 'אני רוצה קולקציית ניהול משימות')"
              className="flex-1 bg-[#141418] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 resize-none min-h-[60px]"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold transition flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:shadow-none"
            >
              <Send className={`w-5 h-5 ${document.dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-slate-500">
            * ארכיטקט הנתונים יכול להזרים Mock Data לקולקציות בלחיצת כפתור לאחר האישור שלך.
          </div>
        </div>
      </div>
    </div>
  );
}
