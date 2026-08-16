"use client";

import Image from "next/image";
import { SquishyButton } from "@/components/motion/SquishyButton";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ImageUpload } from "@/components/ui/ImageUpload";

const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor").then(m => m.RichTextEditor), { ssr: false });

import { AITextHelper } from "@/components/ui/AITextHelper";

// Helper component for inline editing
const EditableText = ({ 
  tag: Tag, 
  value, 
  onChange, 
  isEditing, 
  className,
  richText = false
}: any) => {
  if (!isEditing) {
    return <Tag className={className} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  
  if (richText) {
    return (
      <div className={cn(className, "relative")}>
        <AITextHelper value={value} onChange={onChange} className="left-2 top-2 z-[90]" />
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
          className={cn(className, "bg-black/10 border border-black/20 rounded-lg p-2 pl-24 outline-none focus:bg-white transition-colors w-full resize-none")}
          rows={3}
        />
        <AITextHelper value={value} onChange={onChange} />
      </div>
    );
  }
  
  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(className, "bg-black/10 border border-black/20 rounded-lg p-2 pl-24 outline-none focus:bg-white transition-colors w-full")}
      />
      <AITextHelper value={value} onChange={onChange} />
    </div>
  );
};

export interface CommunitySectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  quote?: string;
  imageSrc?: string;
  badgeTitle?: string;
  badgeSubtitle?: string;
  buttonText?: string;
  whatsappNumber?: string;
  layout?: "split-left" | "split-right" | "centered";
  badgeVisible?: boolean;
  buttonVisible?: boolean;
  isEditing?: boolean;
  onUpdate?: (field: string, value: any) => void;
}

export const CommunitySection = ({
  id,
  title = "קהילה שהיא <span class=\"text-secondary\">משפחה</span>",
  subtitle = "",
  description = "אנחנו כאן כדי להיות הבית שלכם באזור. המטרה שלנו היא ליצור מרחב בטוח, חם ומקבל לכל תושב ותושבת.",
  quote = "\"כל אדם הוא עולם ומלואו, ובקהילה שלנו כל אחד מרגיש שייך.\"",
  imageSrc = "/images/shaliach-family.png",
  badgeTitle = "הרב מענדי ומושקא",
  badgeSubtitle = "השליחים שלכם בקמפוס",
  buttonText = "דברו איתנו ב-WhatsApp",
  whatsappNumber = "972545947701",
  layout = "split-left",
  badgeVisible = true,
  buttonVisible = true,
  isEditing = false,
  onUpdate,
}: CommunitySectionProps) => {

  const handleUpdate = (field: string, value: any) => {
    if (isEditing && onUpdate) {
      onUpdate(field, value);
    }
  };

  const renderImage = () => (
    <div className="relative group w-full h-full">
      <div className="absolute -inset-4 bg-secondary/20 rounded-[3rem] blur-2xl group-hover:bg-secondary/30 transition-all duration-700" />
      <div className="relative aspect-[4/5] md:aspect-square rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl">
        {isEditing ? (
          <div className="w-full h-full relative flex items-center justify-center bg-slate-100">
            {imageSrc && (
              imageSrc.match(/\.(mp4|webm|mov)($|\?)/i) ? (
                <video
                  src={imageSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt="Community"
                  fill
                  className="object-cover opacity-60"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              )
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-white/20 max-w-[280px] w-full">
                <span className="text-sm font-bold text-slate-800">העלאת תמונה/וידאו</span>
                <ImageUpload
                  currentImage={imageSrc}
                  onSelect={(url) => handleUpdate("imageSrc", url)}
                />
              </div>
            </div>
          </div>
        ) : (
          imageSrc?.match(/\.(mp4|webm|mov)($|\?)/i) ? (
            <video
              src={imageSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <Image
              src={imageSrc}
              alt="Community"
              fill
              className="object-cover transform group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          )
        )}
      </div>
      
      {/* Floating Badge */}
      {badgeVisible && (
        <div className="absolute -bottom-6 -right-6 md:right-0 bg-white p-6 rounded-3xl shadow-xl border max-w-[200px] hidden md:block">
          <EditableText tag="p" value={badgeTitle} onChange={(v: string) => handleUpdate("badgeTitle", v)} isEditing={isEditing} className="text-primary font-bold text-lg leading-tight" />
          <EditableText tag="p" value={badgeSubtitle} onChange={(v: string) => handleUpdate("badgeSubtitle", v)} isEditing={isEditing} className="text-muted-foreground text-sm mt-1" />
        </div>
      )}
    </div>
  );

  const renderText = () => (
    <div className={cn("space-y-8", layout === "centered" ? "text-center" : "text-right")}>
      <div className="space-y-4">
        {isEditing || subtitle ? (
          <EditableText tag="h3" value={subtitle} onChange={(v: string) => handleUpdate("subtitle", v)} isEditing={isEditing} className="text-secondary font-bold tracking-widest uppercase mb-2 text-sm" />
        ) : null}
        
        <EditableText tag="h2" value={title} onChange={(v: string) => handleUpdate("title", v)} isEditing={isEditing} className="text-4xl md:text-5xl font-bold text-primary leading-tight" />
        
        <div className={cn("w-20 h-1.5 bg-secondary rounded-full", layout === "centered" ? "mx-auto" : "")} />
      </div>
      
      <EditableText tag="p" value={description} onChange={(v: string) => handleUpdate("description", v)} isEditing={isEditing} className="text-lg md:text-xl text-muted-foreground leading-relaxed" />
      
      <EditableText tag="p" value={quote} onChange={(v: string) => handleUpdate("quote", v)} isEditing={isEditing} className="text-lg md:text-xl text-muted-foreground leading-relaxed italic" />

      {buttonVisible && (
        <div className={cn("pt-6", layout === "centered" ? "flex justify-center" : "")}>
          {isEditing ? (
            <div className="space-y-2 border p-4 rounded-xl bg-slate-50">
              <label className="text-xs font-bold text-slate-500">טקסט כפתור:</label>
              <input type="text" value={buttonText} onChange={(e) => handleUpdate("buttonText", e.target.value)} className="w-full p-2 border rounded" />
              <label className="text-xs font-bold text-slate-500">מספר WhatsApp (כולל קידומת 972):</label>
              <input type="text" value={whatsappNumber} onChange={(e) => handleUpdate("whatsappNumber", e.target.value)} className="w-full p-2 border rounded" dir="ltr" />
            </div>
          ) : (
            <SquishyButton 
              className="bg-primary text-primary-foreground group"
              onClick={() => window.open(`https://wa.me/${whatsappNumber}`, "_blank")}
            >
              <MessageCircle className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              {buttonText}
            </SquishyButton>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section id={id} className={cn("py-24 px-6 bg-card/30 overflow-hidden relative", isEditing && "ring-4 ring-primary/20")}>
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-7xl mx-auto"
      >
        {layout === "split-left" && (
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">{renderImage()}</div>
            <div className="w-full lg:w-1/2">{renderText()}</div>
          </div>
        )}

        {layout === "split-right" && (
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="w-full lg:w-1/2">{renderImage()}</div>
            <div className="w-full lg:w-1/2">{renderText()}</div>
          </div>
        )}

        {layout === "centered" && (
          <div className="flex flex-col items-center gap-16 max-w-4xl mx-auto">
            <div className="w-full max-w-2xl mx-auto">{renderImage()}</div>
            <div className="w-full">{renderText()}</div>
          </div>
        )}
      </motion.div>
    </section>
  );
};
