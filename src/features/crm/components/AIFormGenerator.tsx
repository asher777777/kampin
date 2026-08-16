"use client";

import { useState } from "react";
import { Wand2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AIFormGeneratorProps {
  onGenerate: (formConfig: any) => void;
  className?: string;
}

export function AIFormGenerator({ onGenerate, className = "" }: AIFormGeneratorProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return alert("נא לתאר את הטופס המבוקש");
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/ai/form-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.success && data.formConfig) {
        onGenerate(data.formConfig);
        setAiPrompt("");
        alert("הטופס נבנה בהצלחה!");
      } else {
        alert("שגיאה ביצירת הטופס: " + (data.error || ""));
      }
    } catch (e) {
      alert("שגיאה ביצירת הטופס");
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-5 ${className}`} dir="rtl">
      <h3 className="text-lg font-black text-white flex items-center gap-2 mb-3">
        <Wand2 className="w-5 h-5 text-indigo-400" />
        מחולל טפסים אוטומטי (AI)
      </h3>
      <p className="text-sm text-indigo-200 mb-4">
        תאר איזה טופס תרצה לייצר, והבינה המלאכותית שלנו תבנה אותו עבורך עם שדות מותאמים, מיפוי ל-CRM וקופי מניע לפעולה.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          disabled={isAiGenerating}
          placeholder='לדוגמה: "אני צריך טופס ליצירת קשר עם מספר תשלומים לבחירת המשתמש..."'
          className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
          rows={2}
        />
        <Button
          type="button"
          disabled={isAiGenerating || !aiPrompt.trim()}
          onClick={handleAiGenerate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-auto shrink-0"
        >
          {isAiGenerating ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> מייצר טופס...</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2" /> צור טופס</>
          )}
        </Button>
      </div>
    </div>
  );
}
