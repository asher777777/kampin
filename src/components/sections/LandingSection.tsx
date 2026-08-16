"use client";

import { useState, useEffect } from "react";
import { 
  Settings2, Sparkles, Loader2, Wand2, 
  Image as ImageIcon 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { CRMFormBuilder, FormConfig } from "@/features/crm/components/CRMFormBuilder";
import { CRMFormRenderer } from "@/features/crm/components/CRMFormRenderer";
import { Modal } from "@/components/ui/Modal";
import { generateHeroImageWithAI } from "@/features/services/actions";
import { cn } from "@/lib/utils";

const themePresets: Record<string, { bg: string; text: string; accent: string; iconBg: string; iconText: string; btnColor: string; }> = {
  navy: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    accent: "text-secondary",
    iconBg: "bg-secondary/10",
    iconText: "text-secondary",
    btnColor: "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
  },
  emerald: {
    bg: "bg-emerald-950",
    text: "text-emerald-50",
    accent: "text-yellow-400",
    iconBg: "bg-yellow-400/10",
    iconText: "text-yellow-400",
    btnColor: "bg-yellow-400 hover:bg-yellow-500 text-emerald-950"
  },
  rose: {
    bg: "bg-rose-950",
    text: "text-rose-50",
    accent: "text-rose-300",
    iconBg: "bg-rose-300/10",
    iconText: "text-rose-300",
    btnColor: "bg-rose-450 hover:bg-rose-500 text-slate-950"
  },
  violet: {
    bg: "bg-violet-950",
    text: "text-violet-50",
    accent: "text-amber-300",
    iconBg: "bg-amber-300/10",
    iconText: "text-amber-300",
    btnColor: "bg-amber-400 hover:bg-amber-500 text-violet-950"
  },
  charcoal: {
    bg: "bg-zinc-950",
    text: "text-zinc-100",
    accent: "text-teal-400",
    iconBg: "bg-teal-400/10",
    iconText: "text-teal-400",
    btnColor: "bg-teal-450 hover:bg-teal-500 text-zinc-950"
  }
};

import { AITextHelper } from "@/components/ui/AITextHelper";

interface LandingSectionProps {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  form: FormConfig;
  isEditing: boolean;
  theme?: string;
  layout?: "split-left" | "split-right";
  formMode?: "visible" | "modal";
  buttonText?: string;
  embeddingPostId?: string;
  embeddingCollection?: string;
  onUpdate?: (field: string, value: any) => void;
}

export function LandingSection({
  id,
  title,
  subtitle,
  description,
  imageSrc,
  form,
  isEditing,
  theme = "navy",
  layout = "split-left",
  formMode = "visible",
  buttonText = "להקדשה ותרומה",
  embeddingPostId,
  embeddingCollection,
  onUpdate
}: LandingSectionProps) {
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [isUserFormModalOpen, setIsUserFormModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (title && !aiPrompt) {
      setAiPrompt(`Professional high quality photography of ${title}, warm community center vibe, inviting HDR image`);
    }
  }, [title]);

  const handleGenerateImage = async () => {
    if (!aiPrompt || !onUpdate) return;
    setGeneratingImage(true);
    setAiError("");
    try {
      const res = await generateHeroImageWithAI(aiPrompt);
      if (res.success && res.url) {
        onUpdate("imageSrc", res.url);
      } else {
        setAiError(res.error || "שגיאה ביצירת התמונה.");
      }
    } catch (e: any) {
      setAiError(e.message || "שגיאה בתקשורת עם השרת.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const activeTheme = themePresets[theme || "navy"] || themePresets.navy;

  return (
    <div id={id} className={`relative pt-24 pb-36 overflow-hidden ${activeTheme.bg} ${activeTheme.text} min-h-[65vh] flex items-center`}>
      <div className="absolute inset-0 z-0">
        {imageSrc && imageSrc !== "/placeholder.png" && (
          <>
            <img 
              src={imageSrc} 
              alt={title || "רקע"} 
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
              loading="eager"
              fetchPriority="high"
            />
            <div className={`absolute inset-0 ${activeTheme.bg}/85 mix-blend-multiply`} />
          </>
        )}
        <div className="absolute inset-0 bg-pattern opacity-10 bg-repeat bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-right" dir="rtl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Description Info */}
          <div className={cn(
            "lg:col-span-7 space-y-6",
            layout === "split-right" ? "lg:order-2" : "lg:order-1"
          )}>
            {isEditing && onUpdate ? (
              <div className="space-y-4 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-slate-100">
                <span className="text-xs uppercase tracking-wider font-bold text-white/50 block">כותרת משנה</span>
                <div className="relative w-full">
                  <input
                    value={subtitle}
                    onChange={(e) => onUpdate("subtitle", e.target.value)}
                    className={`w-full text-lg font-bold ${activeTheme.accent} bg-white/15 outline-none rounded-xl px-4 pl-24 py-2 border border-white/10`}
                    placeholder="כותרת משנה שיווקית"
                  />
                  <AITextHelper value={subtitle || ""} onChange={(val) => onUpdate("subtitle", val)} />
                </div>
                
                <span className="text-xs uppercase tracking-wider font-bold text-white/50 block">כותרת עמוד ראשית</span>
                <div className="relative w-full">
                  <input
                    value={title}
                    onChange={(e) => onUpdate("title", e.target.value)}
                    className="w-full text-3xl font-black bg-white/15 outline-none text-white rounded-xl px-4 pl-24 py-2 border border-white/10"
                    placeholder="כותרת הנעה לפעולה ממוקדת"
                  />
                  <AITextHelper value={title || ""} onChange={(val) => onUpdate("title", val)} />
                </div>
                
                <span className="text-xs uppercase tracking-wider font-bold text-white/50 block">תיאור קצר</span>
                <div className="relative w-full">
                  <textarea
                    value={description}
                    onChange={(e) => onUpdate("description", e.target.value)}
                    className="w-full text-sm text-white bg-white/15 outline-none rounded-xl p-4 pl-24 min-h-[100px] border border-white/10 focus:border-white/30"
                    placeholder="הסבר קצר על המטרה, האירוע או הקמפיין..."
                  />
                  <AITextHelper value={description || ""} onChange={(val) => onUpdate("description", val)} />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                {subtitle && (
                  <span className={`text-sm sm:text-base font-bold ${activeTheme.accent} tracking-wide border-r-4 border-current pr-3 block`}>
                    {subtitle}
                  </span>
                )}
                <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${activeTheme.text} drop-shadow-md`}>
                  {title}
                </h2>
                <p className={`text-base sm:text-lg lg:text-xl ${activeTheme.text} opacity-90 leading-relaxed max-w-3xl`}>
                  {description}
                </p>
              </div>
            )}
          </div>

          {/* Conversion Block (CRM Form Builder / Renderer) */}
          <div className={cn(
            "lg:col-span-5 flex justify-center relative group",
            layout === "split-right" ? "lg:order-1" : "lg:order-2"
          )}>
            {isEditing && onUpdate && (
              <>
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button onClick={() => setIsFormBuilderOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2 shadow-xl flex items-center gap-2 font-bold text-sm cursor-pointer">
                    <Settings2 className="w-4 h-4" />
                    ערוך הגדרות טופס
                  </Button>
                </div>
                <Modal isOpen={isFormBuilderOpen} onClose={() => setIsFormBuilderOpen(false)}>
                  <Modal.Content className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-4 text-slate-100 relative">
                      <Modal.Close className="top-4 right-4 text-slate-400 hover:text-white" />
                      <CRMFormBuilder
                        value={form}
                        onChange={(formConfig) => onUpdate("form", formConfig)}
                      />
                    </div>
                  </Modal.Content>
                </Modal>
              </>
            )}
            
            <div className={cn(
              "w-full flex justify-center transition-all",
              isEditing ? "opacity-90 blur-[1px] group-hover:blur-sm pointer-events-none" : ""
            )}>
              {formMode === "modal" ? (
                <div className="w-full flex justify-center">
                  <Button
                    onClick={() => setIsUserFormModalOpen(true)}
                    style={{
                      backgroundColor: form.submit_button_bg_color || "#25D366",
                      color: form.submit_button_text_color || "#ffffff"
                    }}
                    className="py-4 px-8 rounded-2xl text-sm font-bold shadow-lg transition-transform hover:scale-102 cursor-pointer w-full max-w-[420px] text-center"
                  >
                    {buttonText}
                  </Button>
                  
                  <Modal isOpen={isUserFormModalOpen} onClose={() => setIsUserFormModalOpen(false)}>
                    <Modal.Content className="max-w-[480px] p-0 bg-transparent border-0 shadow-none">
                      <div className="relative">
                        <Modal.Close className="z-50 top-6 left-6 !right-auto text-slate-400 hover:text-white bg-black/50 p-2 rounded-full" />
                        {form?.enabled ? (
                          <CRMFormRenderer
                            config={form}
                            formId={embeddingPostId || "home-landing-modal"}
                            formTitle={title || "home-landing"}
                            embeddingCollection={embeddingCollection}
                          />
                        ) : (
                          <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-[2.5rem] text-center text-white/50 text-sm w-full">
                            הטופס אינו פעיל בעמוד זה.
                          </div>
                        )}
                      </div>
                    </Modal.Content>
                  </Modal>
                </div>
              ) : (
                form?.enabled ? (
                  <CRMFormRenderer
                    config={form}
                    formId={embeddingPostId || "home-landing"}
                    formTitle={title || "home-landing"}
                    embeddingCollection={embeddingCollection}
                  />
                ) : (
                  <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-[2.5rem] text-center text-white/50 text-sm max-w-[420px] w-full">
                    הטופס אינו פעיל בעמוד זה.
                  </div>
                )
              )}
            </div>
          </div>

        </div>

        {/* Background image edit options & layout configurations */}
        {isEditing && onUpdate && (
          <div className="space-y-6 mt-12 w-full max-w-4xl mx-auto">
            {/* Layout Customizer Block */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-4 text-white">
              <h4 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-3">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                הגדרות פריסה ותצוגת טופס
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-800">
                <div>
                  <label className="block text-xs font-bold text-white/75 mb-1.5 text-right">סדר הצדדים (אזורים)</label>
                  <select
                    value={layout}
                    onChange={(e) => onUpdate("layout", e.target.value)}
                    className="w-full bg-white text-slate-800 border rounded-xl p-2.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="split-left">טקסט בימין, טופס בשמאל</option>
                    <option value="split-right">טופס בימין, טקסט בשמאל</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-white/75 mb-1.5 text-right">אופן תצוגת הטופס</label>
                  <select
                    value={formMode}
                    onChange={(e) => onUpdate("formMode", e.target.value)}
                    className="w-full bg-white text-slate-800 border rounded-xl p-2.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="visible">טופס גלוי בעמוד</option>
                    <option value="modal">כפתור שפותח טופס במודל (חלון קופץ)</option>
                  </select>
                </div>

                {formMode === "modal" && (
                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5 text-right">טקסט כפתור פתיחת הטופס</label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => onUpdate("buttonText", e.target.value)}
                      className="w-full bg-white text-slate-800 border rounded-xl p-2.5 outline-none font-bold"
                      placeholder="לדוגמה: תרמו עכשיו"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-white/75 mb-1.5 text-right">טקסט כפתור שליחת הטופס</label>
                  <input
                    type="text"
                    value={form.submit_button_text || ""}
                    onChange={(e) => onUpdate("form", { ...form, submit_button_text: e.target.value })}
                    className="w-full bg-white text-slate-800 border rounded-xl p-2.5 outline-none font-bold"
                    placeholder="לדוגמה: שלח פנייה"
                  />
                </div>
              </div>
            </div>

            {/* Background image config */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-6 text-right" dir="rtl">
              <h4 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <ImageIcon className="w-5 h-5 text-secondary" />
                תמונת הרקע של האזור
              </h4>
              
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center text-slate-800">
                <div className="flex flex-col items-center gap-2">
                  <ImageUpload 
                    currentImage={imageSrc}
                    onSelect={(url) => onUpdate("imageSrc", url)}
                  />
                </div>
                
                {/* Imagen Pro Image Generator */}
                <div className="flex-1 w-full border-t md:border-t-0 md:border-r border-white/10 pt-6 md:pt-0 md:pr-6 space-y-4 text-right text-white">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    מחולל תמונות Google AI (Imagen)
                  </h5>
                  <p className="text-xs text-primary-foreground/75 leading-relaxed">
                    צור תמונת רקע מותאמת אישית לאזור זה באמצעות בינה מלאכותית יוצרת.
                  </p>
                  
                  <div className="space-y-3">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="תאר את התמונה שברצונך ליצור..."
                      className="w-full text-sm bg-primary/30 border border-white/20 rounded-xl p-3 outline-none text-white focus:border-secondary min-h-[80px] resize-none"
                    />
                    
                    {aiError && (
                      <p className="text-xs font-medium text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
                        {aiError}
                      </p>
                    )}
                    
                    <Button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !aiPrompt}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl gap-2 font-bold text-sm shadow-lg shadow-purple-950/50 cursor-pointer"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          מייצר תמונה...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          ייצר תמונת רקע
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
