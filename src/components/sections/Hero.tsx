"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SquishyButton } from "@/components/motion/SquishyButton";
import { Calendar, ShieldCheck, ArrowDown, LayoutGrid, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { Modal } from "@/components/ui/Modal";
import { CRMFormRenderer } from "@/features/crm/components/CRMFormRenderer";
import type { FormConfig } from "@/features/crm/components/CRMFormBuilder";

import { Sparkles } from "lucide-react";

const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor").then(m => m.RichTextEditor), { ssr: false });
const HeroEditor = dynamic(() => import("./HeroEditor").then(m => m.HeroEditor), { ssr: false });

const isVideoUrl = (url: string) => {
  if (!url) return false;
  return !!url.match(/\.(mp4|webm|mov|quicktime)($|\?)/i);
};

const MediaBackground = ({ src, className, priority, sizes }: any) => {
  if (!src || typeof src !== "string" || !src.trim() || src === "/" || src === "/placeholder.png") {
    return (
      <div className={cn("w-full h-full bg-slate-900/40 backdrop-blur-xs flex items-center justify-center", className)}>
        <Sparkles className="w-12 h-12 text-white/20" />
      </div>
    );
  }
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={cn("absolute inset-0 w-full h-full object-cover", className)}
      />
    );
  }
  return <Image src={src} alt="Background" fill className={className} priority={priority} sizes={sizes} />;
};

interface HeroProps {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  imageSrc?: string;
  layout?: "fz" | "bento" | "modular" | "progressive" | "spatial" | "thumb";
  buttonsVisible?: boolean;
  primaryButton?: { text: string; link: string; visible?: boolean };
  secondaryButton?: { text: string; link: string; visible?: boolean };
  isEditing?: boolean;
  availableAnchors?: { id: string, label: string }[];
  backgroundColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  heroStyle?: "hero" | "content" | "landing";
  flexDirection?: "row" | "row-reverse" | "col" | "col-reverse";
  form?: FormConfig;
  formMode?: "visible" | "modal";
  onUpdateHero?: (field: "title" | "subtitle" | "description" | "imageSrc" | "buttonsVisible" | "primaryButton" | "secondaryButton" | "heroStyle" | "flexDirection" | "form" | "formMode", value: any) => void;
  priority?: boolean;
  pageContext?: string;
}

import { AITextHelper } from "@/components/ui/AITextHelper";

// Helper component for inline editing
const EditableText = ({ 
  tag: Tag, 
  value, 
  onChange, 
  isEditing, 
  className,
  style,
  richText = false,
  context
}: any) => {
  const mergedStyle = style?.color ? {
    ...style,
    '--heading-1': style.color,
    '--heading-2': style.color,
    '--heading-3': style.color,
    '--heading-4': style.color
  } : style;

  if (!isEditing) {
    return <Tag className={className} style={mergedStyle} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  
  if (richText) {
    return (
      <div className={cn(className, "relative")} style={mergedStyle}>
        <AITextHelper value={value} onChange={onChange} context={context} isRichText={true} className="left-2 top-2 z-[90]" />
        <RichTextEditor value={value} onChange={onChange} />
      </div>
    );
  }

  if (Tag === "textarea" || Tag === "p") {
    return (
      <div className="relative w-full">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(className, "bg-black/20 border border-white/30 rounded-lg p-2 pl-24 outline-none focus:bg-black/40 transition-colors w-full resize-none")}
          style={mergedStyle}
          rows={3}
        />
        <AITextHelper value={value} onChange={onChange} context={context} className="absolute left-2 top-2 z-[90]" />
      </div>
    );
  }
  
  return (
    <div className="relative inline-block w-full group">
      <AITextHelper value={value} onChange={onChange} context={context} className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Tag className={className} style={mergedStyle} dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
};

export const Hero = ({ 
  id,
  title = "מוזמנים ומוזמנות <br /><span class=\"text-secondary\">להרגיש בבית</span>", 
  subtitle = "ברוכים הבאים לבית שלנו", 
  description = "הקהילה שלנו היא הלב הפועם של האזור. מקום של חסד, לימוד וחיבור.",
  imageSrc = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop",
  layout = "fz",
  buttonsVisible = true,
  primaryButton = { text: "בדיקת תפילין ומזוזות", link: "/services" },
  secondaryButton = { text: "למידע נוסף", link: "/about", visible: false },
  isEditing = false,
  availableAnchors = [],
  backgroundColor,
  titleColor,
  descriptionColor,
  heroStyle = "hero",
  flexDirection = "row",
  formMode = "visible",
  form,
  onUpdateHero,
  priority,
  pageContext
}: HeroProps) => {

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleUpdate = (field: "title" | "subtitle" | "description" | "imageSrc" | "buttonsVisible" | "primaryButton" | "secondaryButton" | "heroStyle" | "flexDirection" | "form" | "formMode", val: any) => {
    if (onUpdateHero) onUpdateHero(field, val);
  };

  const bgImage = imageSrc !== "/placeholder.png" && imageSrc ? imageSrc : "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop";

  const HeroActions = ({ className }: { className?: string }) => {
    return (
      <div className={cn("flex flex-wrap gap-4", className)}>
        {(primaryButton?.link?.trim() && primaryButton?.visible !== false) ? (
          (primaryButton.link?.trim().toLowerCase() === "#register" || primaryButton.text?.includes("צור קהילה") || primaryButton.text?.includes("הרשמה")) ? (
            <SquishyButton onClick={() => setIsRegisterModalOpen(true)} className={cn("bg-white text-primary hover:bg-white/90 shadow-xl w-full sm:w-auto", buttonsVisible === false && "opacity-50 grayscale")}>
              <ShieldCheck className="ml-2 h-5 w-5" />
              {primaryButton.text}
            </SquishyButton>
          ) : (
            <Link href={primaryButton.link}>
              <SquishyButton className={cn("bg-white text-primary hover:bg-white/90 shadow-xl w-full sm:w-auto", buttonsVisible === false && "opacity-50 grayscale")}>
                <ShieldCheck className="ml-2 h-5 w-5" />
                {primaryButton.text}
              </SquishyButton>
            </Link>
          )
        ) : null}
        {(secondaryButton?.link?.trim() && secondaryButton?.visible !== false) ? (
          (secondaryButton.link?.trim().toLowerCase() === "#register" || secondaryButton.text?.includes("צור קהילה") || secondaryButton.text?.includes("הרשמה")) ? (
            <SquishyButton onClick={() => setIsRegisterModalOpen(true)} className={cn("bg-primary/50 backdrop-blur-md border border-white/20 text-white hover:bg-primary/70 shadow-xl w-full sm:w-auto", buttonsVisible === false && "opacity-50 grayscale")}>
              <Calendar className="ml-2 h-5 w-5" />
              {secondaryButton.text}
            </SquishyButton>
          ) : (
            <Link href={secondaryButton.link}>
              <SquishyButton className={cn("bg-primary/50 backdrop-blur-md border border-white/20 text-white hover:bg-primary/70 shadow-xl w-full sm:w-auto", buttonsVisible === false && "opacity-50 grayscale")}>
                <Calendar className="ml-2 h-5 w-5" />
                {secondaryButton.text}
              </SquishyButton>
            </Link>
          )
        ) : null}
      </div>
    );
  };

  const ImageEditorOverlay = isEditing ? (
    <HeroEditor
      imageSrc={imageSrc}
      buttonsVisible={buttonsVisible}
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
      availableAnchors={availableAnchors}
      onUpdateHero={handleUpdate}
    />
  ) : null;

  const renderLayout = () => {
    if (heroStyle === "content") {
      return (
        <section className="relative w-full overflow-hidden min-h-screen flex items-center" style={{ backgroundColor: backgroundColor || "var(--background)" }} dir="rtl">
          <div className={cn("w-full h-full flex relative z-10 gap-8 lg:gap-12", flexDirection === "col" ? "flex-col" : flexDirection === "col-reverse" ? "flex-col-reverse" : flexDirection === "row-reverse" ? "flex-col md:flex-row-reverse" : "flex-col md:flex-row")}>
            {/* Content side */}
            <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12 md:py-24 z-20">
              <div className="max-w-xl text-right mx-auto w-full">
                <EditableText tag="h2" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight text-foreground" style={titleColor ? { color: titleColor } : undefined} />
                <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-xl md:text-2xl font-medium mb-8 text-foreground" style={{ opacity: 0.8 }} />
                <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-lg text-foreground mb-12" style={{ opacity: 0.8, ...(descriptionColor ? { color: descriptionColor } : {}) }} />
                <div className="hidden md:block">
                  <HeroActions />
                </div>
              </div>
            </div>
            {/* Image side */}
            <div className="w-full md:w-1/2 min-h-[400px] md:min-h-full relative z-10">
              <div className="absolute inset-0 pb-0 pl-0 md:pl-0 pr-0 md:pr-4 pt-0 md:pt-10 z-10">
                <div className={cn("w-full h-full relative overflow-hidden shadow-2xl border-t-8 border-white", flexDirection === "row-reverse" ? "rounded-t-[50px] md:rounded-tl-[250px] md:border-l-8 md:border-r-0" : "rounded-t-[50px] md:rounded-tr-[250px] border-r-8 md:border-b-0")}>
                  <MediaBackground src={bgImage} priority={priority} className="object-cover" />
                </div>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="md:hidden w-full px-8 pb-20 pt-4 z-20 flex justify-center relative">
              <HeroActions className="w-full justify-center" />
            </div>
          </div>
          <div className="w-full h-16 md:h-12 absolute bottom-0 left-0 z-0" style={{ backgroundColor: "var(--primary)" }} />
        </section>
      );
    }

    if (heroStyle === "landing") {
      const activeTheme = { bg: "bg-background", text: "text-foreground", accent: "text-secondary", iconBg: "bg-secondary/10", iconText: "text-secondary", btnColor: "bg-primary hover:bg-primary/90 text-primary-foreground" };
      return (
        <section className={`relative pt-24 pb-36 overflow-hidden ${activeTheme.bg} ${activeTheme.text} min-h-[65vh] flex items-center`}>
          <div className="absolute inset-0 z-0">
            {Boolean(bgImage && typeof bgImage === "string" && bgImage.trim().length > 0 && bgImage !== "/" && bgImage !== "/placeholder.png") && (
              <Image src={bgImage} alt="Background" fill className="absolute inset-0 w-full h-full object-cover animate-fade-in" priority={priority} />
            )}
            <div className={`absolute inset-0 ${activeTheme.bg}/85 mix-blend-multiply`} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-right" dir="rtl">
            <div className={cn("flex flex-col lg:flex-row gap-12 items-center", flexDirection === "row-reverse" ? "lg:flex-row-reverse" : flexDirection === "col" ? "flex-col lg:flex-col" : flexDirection === "col-reverse" ? "flex-col-reverse lg:flex-col-reverse" : "")}>
              
              {/* Text Description Info */}
              <div className="w-full lg:w-7/12 space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className={`text-sm font-medium ${activeTheme.accent}`} />
                </div>
                <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white" style={titleColor ? { color: titleColor } : undefined} />
                <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl" style={descriptionColor ? { color: descriptionColor } : undefined} />
                <HeroActions />
                {formMode === "modal" && form && (
                  <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)}>
                    <Modal.Content className="max-w-xl p-0 bg-[#111111] overflow-hidden border border-white/10 rounded-[2rem] shadow-2xl">
                      <Modal.Close className="text-white hover:text-amber-500 z-50 absolute top-4 left-4" />
                      <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar relative">
                        <CRMFormRenderer config={form} formId={id || "hero"} formTitle={title} />
                      </div>
                    </Modal.Content>
                  </Modal>
                )}
              </div>

              {/* Form / Actions */}
              <div className="w-full lg:w-5/12">
                <div className="relative group perspective-1000">
                  <div className={`absolute inset-0 bg-gradient-to-tr from-${activeTheme.btnColor.split(" ")[0].replace("bg-", "")}/20 to-transparent blur-2xl rounded-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
                  <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    {formMode === "visible" && form ? (
                      <CRMFormRenderer config={form} formId={id || "hero"} formTitle={title} />
                    ) : (
                      <div className="text-center py-8">
                        <div className={`w-16 h-16 rounded-full ${activeTheme.iconBg} flex items-center justify-center mx-auto mb-6`}>
                          <Sparkles className={`w-8 h-8 ${activeTheme.iconText}`} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">מוכנים להתחיל?</h3>
                        <p className="text-slate-300 mb-8">הצטרפו אלינו והתחילו את המסע שלכם</p>
                        <HeroActions className="justify-center" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (layout === "fz") {
      return (
        <section className="relative min-h-screen w-full flex items-center pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <MediaBackground src={bgImage} priority={priority} className="object-cover" sizes="100vw" />
            {backgroundColor ? (
              <div 
                className="absolute inset-0" 
                style={{ background: `linear-gradient(to left, ${backgroundColor}cc, ${backgroundColor}80, transparent)` }} 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-l from-primary/80 via-primary/50 to-transparent" />
            )}
          </div>
          <div className="relative z-10 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-1000">
              <div className="space-y-4">
                <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-secondary font-bold tracking-widest uppercase text-sm md:text-base" />
                <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight" style={titleColor ? { color: titleColor } : undefined} />
                <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-xl text-white/90 leading-relaxed max-w-lg" style={descriptionColor ? { color: descriptionColor } : undefined} />
              </div>
              <HeroActions />
            </div>
          </div>
        </section>
      );
    }

    if (layout === "bento") {
      return (
        <section className="relative min-h-screen w-full flex items-center justify-center pt-24 pb-12 px-4 md:px-8 bg-slate-950">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[250px]">
            {/* Main Title Box (Span 2 cols, 2 rows) */}
            <div className="md:col-span-2 md:row-span-2 relative rounded-[2rem] overflow-hidden group">
              <MediaBackground src={bgImage} priority={priority} className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" />
              <div 
                className={cn("absolute inset-0 p-8 md:p-12 flex flex-col justify-end", !backgroundColor && "bg-primary/60")}
                style={backgroundColor ? { backgroundColor: `${backgroundColor}99` } : undefined}
              >
                <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-secondary font-bold tracking-widest uppercase mb-2" />
                <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-4xl md:text-6xl font-extrabold text-white leading-tight" style={titleColor ? { color: titleColor } : undefined} />
              </div>
            </div>
            
            <div className="bg-white rounded-[2rem] p-8 md:p-10 flex items-center">
              <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-lg text-slate-700 leading-relaxed w-full" style={descriptionColor ? { color: descriptionColor } : undefined} />
            </div>

            {/* Action Boxes */}
            {(!buttonsVisible && !isEditing) ? null : (
              <>
                {(primaryButton?.link?.trim() && primaryButton?.visible !== false) ? (
                  <Link href={primaryButton.link} className={cn("bg-secondary rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group hover:bg-secondary/90 transition-colors", !buttonsVisible && "opacity-50 grayscale")}>
                    <ShieldCheck className="h-12 w-12 text-secondary-foreground mb-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-secondary-foreground text-xl">{primaryButton.text}</span>
                  </Link>
                ) : null}

                {(secondaryButton?.link?.trim() && secondaryButton?.visible !== false) ? (
                  <Link href={secondaryButton.link} className={cn("bg-primary rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group hover:bg-primary/90 transition-colors", !buttonsVisible && "opacity-50 grayscale")}>
                    <Calendar className="h-12 w-12 text-white mb-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-white text-xl">{secondaryButton.text}</span>
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </section>
      );
    }

    if (layout === "modular") {
      return (
        <section className="relative min-h-screen w-full bg-slate-100 pt-32 pb-12 px-6">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-8">
              <LayoutGrid className="w-4 h-4" />
              <span>סביבת עבודה מותאמת אישית</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-move relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="text-slate-400" />
                </div>
                <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4" />
                <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-4xl md:text-5xl font-black text-slate-900 mb-6" style={titleColor ? { color: titleColor } : undefined} />
                <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-slate-600 text-lg leading-relaxed prose prose-lg max-w-none" style={descriptionColor ? { color: descriptionColor } : undefined} />
              </div>
              
              <div className="lg:col-span-4 bg-slate-900 rounded-2xl shadow-xl overflow-hidden relative min-h-[300px] cursor-move">
                <MediaBackground src={bgImage} priority={priority} className="object-cover opacity-80 mix-blend-overlay" sizes="(max-width: 1024px) 100vw, 33vw" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                   <HeroActions className="flex-col" />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (layout === "progressive") {
      return (
        <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-slate-50 border-l border-slate-100" />
          <div className="relative z-10 px-6 max-w-5xl mx-auto w-full text-center space-y-12">
            <div className="space-y-6">
              <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-5xl md:text-7xl font-extralight text-slate-900 tracking-tight" style={titleColor ? { color: titleColor } : undefined} />
              <div className="w-12 h-1 bg-slate-900 mx-auto" />
            </div>
            
            <div className="group relative mx-auto inline-block">
               <button className="text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors pb-2 border-b border-transparent hover:border-slate-900">
                  <span className="font-medium">גלה עוד</span>
                  <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
               </button>
               <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 md:w-[600px] bg-white shadow-2xl rounded-2xl p-6 border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                 <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-slate-600 text-sm md:text-base leading-relaxed text-right prose max-w-none" style={descriptionColor ? { color: descriptionColor } : undefined} />
                 <div className="mt-6">
                   <HeroActions />
                 </div>
               </div>
            </div>
          </div>
        </section>
      );
    }

    if (layout === "spatial") {
      return (
        <section className="relative min-h-screen w-full flex flex-col px-6 pt-32 pb-12 bg-[#0a0a0a] text-white">
          <div className="max-w-[1400px] mx-auto w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
            <div className="lg:col-span-5 space-y-12">
              <div className="space-y-6">
                <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-white/40 tracking-[0.3em] uppercase text-sm" />
                <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-6xl lg:text-8xl font-light tracking-tighter" style={titleColor ? { color: titleColor } : undefined} />
              </div>
              <div className="w-full h-[1px] bg-gradient-to-r from-white/20 to-transparent" />
              <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-xl text-white/60 font-light leading-relaxed prose prose-invert max-w-none" style={descriptionColor ? { color: descriptionColor } : undefined} />
              <div className="hidden lg:block">
                <HeroActions />
              </div>
            </div>
            <div className="lg:col-span-7 h-[60vh] lg:h-[80vh] relative rounded-3xl overflow-hidden transform perspective-1000 rotate-y-[-5deg] hover:rotate-y-0 transition-transform duration-1000 shadow-[0_0_100px_rgba(255,255,255,0.05)]">
              <MediaBackground src={bgImage} priority={priority} className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
            </div>
            <div className="lg:hidden w-full flex justify-center pb-8 z-20">
              <HeroActions className="w-full justify-center" />
            </div>
          </div>
        </section>
      );
    }

    if (layout === "thumb") {
      return (
        <section className="relative h-screen w-full flex flex-col bg-background overflow-hidden">
          <div className="relative h-[55vh] md:h-[65vh] w-full shrink-0 rounded-b-[3rem] overflow-hidden shadow-2xl">
            <MediaBackground src={bgImage} priority={priority} className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            {backgroundColor ? (
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${backgroundColor}e6, ${backgroundColor}66, transparent)` }} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
            )}
            <div className="absolute bottom-8 right-6 left-6 text-right">
              <EditableText tag="p" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} context={pageContext} className="text-secondary font-bold tracking-widest uppercase mb-2 text-sm" />
              <EditableText tag="h1" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} context={pageContext} className="text-4xl md:text-6xl font-extrabold text-white leading-tight" style={titleColor ? { color: titleColor } : undefined} />
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center px-6 max-w-4xl mx-auto w-full gap-6">
            <EditableText tag="div" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} context={pageContext} richText={true} className="text-foreground/80 text-lg leading-relaxed text-center prose max-w-none" style={descriptionColor ? { color: descriptionColor } : undefined} />
            <HeroActions className="justify-center w-full" />
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div id={id} className="relative w-full">
      {renderLayout()}
      {ImageEditorOverlay}
      <RegisterModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} />
    </div>
  );
};

