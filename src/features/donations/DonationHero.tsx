import Image from "next/image";

interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
}

interface DonationHeroProps {
  content: HeroContent;
  isEditing?: boolean;
  onChange?: (newContent: HeroContent) => void;
}

import { ImageUpload } from "@/components/ui/ImageUpload";

export function DonationHero({ content, isEditing, onChange }: DonationHeroProps) {
  const handleUpdate = (field: keyof HeroContent, value: string) => {
    if (onChange) {
      onChange({ ...content, [field]: value });
    }
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background with Blur */}
      <div className="absolute inset-0 z-0">
        <Image
          src={content.imageSrc}
          alt="Charity and Community"
          fill
          className="object-cover scale-110 blur-[2px] opacity-30 transition-all duration-700"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-black uppercase tracking-widest">
          קמפיין שותפות 2026
        </div>
        
        <div className="space-y-4">
          {isEditing ? (
            <div className="flex flex-col gap-4">
              <input
                value={content.title}
                onChange={(e) => handleUpdate("title", e.target.value)}
                className="text-4xl md:text-5xl font-black text-center bg-white/50 border-2 border-primary/20 rounded-2xl p-2 text-primary focus:outline-none focus:border-secondary transition-colors"
                placeholder="כותרת ראשית"
              />
              <input
                value={content.subtitle}
                onChange={(e) => handleUpdate("subtitle", e.target.value)}
                className="text-4xl md:text-5xl font-black text-center bg-white/50 border-2 border-secondary/20 rounded-2xl p-2 text-secondary focus:outline-none focus:border-primary transition-colors"
                placeholder="כותרת משנית"
              />
            </div>
          ) : (
            <h1 className="text-5xl md:text-7xl font-black text-primary tracking-tight leading-[1.1]">
              {content.title} <br />
              <span className="text-secondary">{content.subtitle}</span>
            </h1>
          )}
        </div>
        
        {isEditing ? (
          <textarea
            value={content.description}
            onChange={(e) => handleUpdate("description", e.target.value)}
            className="w-full text-xl md:text-2xl text-center bg-white/50 border-2 border-primary/10 rounded-2xl p-4 text-muted-foreground min-h-[120px] focus:outline-none focus:border-secondary transition-colors"
            placeholder="תיאור הקמפיין..."
          />
        ) : (
          <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            {content.description}
          </p>
        )}

        {isEditing && (
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-primary/5">
            <span className="text-sm font-black uppercase text-primary/40 tracking-widest">ניהול רקע (WebP Optimized)</span>
            <ImageUpload 
              currentImage={content.imageSrc}
              onSelect={(url) => handleUpdate("imageSrc", url)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
