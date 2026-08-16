"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AITextHelper } from "@/components/ui/AITextHelper";

const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor").then((m) => m.RichTextEditor),
  { 
    ssr: false, 
    loading: () => <div className="h-40 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">טוען עורך תוכן...</div> 
  }
);

interface RichContentSectionProps {
  id?: string;
  heading?: string;
  body?: string;
  layout?: "center" | "two-column" | "grid";
  isEditing?: boolean;
  onUpdate?: (field: string, value: any) => void;
}

export const RichContentSection = ({
  id,
  heading = "אירוע שכולו שמחה, קדושה ומשפחתיות",
  body = "",
  layout = "center",
  isEditing = false,
  onUpdate
}: RichContentSectionProps) => {

  const handleLayoutChange = (newLayout: "center" | "two-column" | "grid") => {
    onUpdate?.("layout", newLayout);
  };

  const handleFieldChange = (field: string, value: string) => {
    onUpdate?.(field, value);
  };

  return (
    <section id={id} className="py-24 bg-white relative z-20" dir="rtl">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Design Layout Options Panel inside the Section in edit mode (similar to service page) */}
        {isEditing && (
          <div className="mb-8 p-6 bg-slate-55 border border-dashed rounded-3xl text-right max-w-3xl mx-auto space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              מבנה אזור התוכן (Content Layout)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "center", label: "קלאסי ממורכז" },
                { id: "two-column", label: "כתבה עיתונאית" },
                { id: "grid", label: "כרטיסיות מודרניות" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleLayoutChange(opt.id as any)}
                  className={cn(
                    "p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    layout === opt.id
                      ? "bg-secondary border-secondary text-white shadow-lg"
                      : "bg-slate-100/50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {layout === "center" && (
            <div className="space-y-6 text-center">
              {isEditing ? (
                <div className="max-w-3xl mx-auto space-y-4">
                  <label className="block text-sm font-bold text-slate-700 text-right">כותרת התוכן (קלאסי ממורכז)</label>
                  <div className="relative w-full">
                    <input
                      value={heading}
                      onChange={(e) => handleFieldChange("heading", e.target.value)}
                      className="w-full text-center text-2xl font-bold text-primary bg-muted/30 outline-none rounded-xl p-3 pl-24 border focus:border-primary"
                      placeholder="כותרת תוכן"
                    />
                    <AITextHelper value={heading || ""} onChange={(val) => handleFieldChange("heading", val)} />
                  </div>
                  <label className="block text-sm font-bold text-slate-700 text-right">גוף התוכן</label>
                  <div className="relative w-full">
                    <AITextHelper value={body || ""} onChange={(val) => handleFieldChange("body", val)} className="left-2 top-2 z-[90]" />
                    <RichTextEditor
                      value={body}
                      onChange={(val) => handleFieldChange("body", val)}
                      className="text-center"
                      placeholder="תוכן מרכזי..."
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl md:text-4xl font-black text-primary leading-tight">
                    {heading}
                  </h2>
                  <div 
                    className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto rich-content"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                </>
              )}
            </div>
          )}

          {layout === "two-column" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-right items-start">
              <div className="lg:col-span-4 border-r-4 border-secondary pr-6 flex flex-col justify-center py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">כותרת התוכן (טור ימני)</label>
                    <div className="relative w-full">
                      <input
                        value={heading}
                        onChange={(e) => handleFieldChange("heading", e.target.value)}
                        className="w-full text-2xl md:text-3xl font-black text-primary bg-muted/30 outline-none rounded-xl p-3 pl-24 border focus:border-primary"
                        placeholder="כותרת תוכן"
                      />
                      <AITextHelper value={heading || ""} onChange={(val) => handleFieldChange("heading", val)} />
                    </div>
                  </div>
                ) : (
                  <h3 className="text-2xl md:text-3xl font-black text-primary leading-tight">
                    {heading}
                  </h3>
                )}
                <div className="w-12 h-1 bg-secondary mt-4" />
              </div>
              <div className="lg:col-span-8">
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">גוף התוכן (טור שמאלי)</label>
                    <div className="relative w-full">
                      <AITextHelper value={body || ""} onChange={(val) => handleFieldChange("body", val)} className="left-2 top-2 z-[90]" />
                      <RichTextEditor
                        value={body}
                        onChange={(val) => handleFieldChange("body", val)}
                        placeholder="תוכן מרכזי..."
                      />
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-lg text-muted-foreground leading-relaxed rich-content"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                )}
              </div>
            </div>
          )}

          {layout === "grid" && (
            <div className="space-y-12">
              {isEditing ? (
                <div className="max-w-3xl mx-auto space-y-2">
                  <label className="block text-sm font-bold text-slate-700 text-center">כותרת התוכן (כרטיסיות)</label>
                  <div className="relative w-full">
                    <input
                      value={heading}
                      onChange={(e) => handleFieldChange("heading", e.target.value)}
                      className="w-full text-center text-3xl md:text-4xl font-black text-primary bg-muted/30 outline-none rounded-xl p-3 pl-24 border focus:border-primary"
                      placeholder="כותרת תוכן"
                    />
                    <AITextHelper value={heading || ""} onChange={(val) => handleFieldChange("heading", val)} />
                  </div>
                </div>
              ) : (
                <h2 className="text-3xl md:text-4xl font-black text-primary text-center">
                  {heading}
                </h2>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isEditing ? (
                  <>
                    {(body.split(/\n\n+/))
                      .map((paragraph: string, idx: number, arr: string[]) => (
                        <div 
                          key={idx} 
                          className="bg-muted/20 p-8 rounded-[2rem] border border-primary/5 shadow-sm space-y-4 text-right animate-in fade-in duration-300 relative"
                        >
                          <div className="flex justify-between items-center">
                            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-sm">
                              {idx + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newParagraphs = arr.filter((_, i) => i !== idx);
                                handleFieldChange("body", newParagraphs.join("\n\n"));
                              }}
                              className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                            >
                              מחק כרטיס
                            </button>
                          </div>
                          <div className="relative w-full">
                            <AITextHelper 
                              value={paragraph} 
                              onChange={(val) => {
                                const newParagraphs = [...arr];
                                newParagraphs[idx] = val;
                                handleFieldChange("body", newParagraphs.join("\n\n"));
                              }} 
                              className="left-2 top-2 z-[90]" 
                            />
                            <RichTextEditor
                              value={paragraph}
                              onChange={(val) => {
                                const newParagraphs = [...arr];
                                newParagraphs[idx] = val;
                                handleFieldChange("body", newParagraphs.join("\n\n"));
                              }}
                              className="min-h-[140px]"
                              placeholder="תוכן הכרטיס..."
                            />
                          </div>
                        </div>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        const paragraphs = body.split(/\n\n+/);
                        const newParagraphs = [...paragraphs.filter((p: string) => p.trim().length > 0), ""];
                        handleFieldChange("body", newParagraphs.join("\n\n"));
                      }}
                      className="border-2 border-dashed border-slate-300 hover:border-primary rounded-[2rem] p-8 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-primary transition-colors min-h-[200px] cursor-pointer"
                    >
                      <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
                      <span className="font-bold text-sm">הוסף כרטיס חדש</span>
                    </button>
                  </>
                ) : (
                  body
                    .split(/\n\n+/)
                    .filter((p: string) => p.trim().length > 0)
                    .map((paragraph: string, idx: number) => (
                      <div 
                        key={idx} 
                        className="bg-muted/20 hover:bg-muted/40 p-8 rounded-[2rem] border border-primary/5 hover:border-secondary/20 shadow-sm hover:shadow-md transition-all duration-300 text-right space-y-4"
                      >
                        <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-black text-sm">
                          {idx + 1}
                        </div>
                        <div 
                          className="text-base text-muted-foreground leading-relaxed rich-content"
                          dangerouslySetInnerHTML={{ __html: paragraph }}
                        />
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </section>
  );
};
