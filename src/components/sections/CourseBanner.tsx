"use client";

import Image from "next/image";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

const getIcon = (iconName: string) => {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Check;
};

export interface CourseFeature {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface CourseBannerProps {
  id?: string;
  title?: string;
  subtitle?: string;
  imageSrc?: string;
  features?: CourseFeature[];
  buttonsVisible?: boolean;
  primaryButton?: { text: string; link: string; backgroundColor?: string; textColor?: string; };
  backgroundColor?: string;
  bottomStripeColor?: string;
  featuresTextColor?: string;
}

export function CourseBanner({
  id = "course-banner",
  title = "",
  subtitle = "",
  imageSrc = "",
  features = [],
  buttonsVisible = true,
  primaryButton,
  backgroundColor = "var(--background)",
  bottomStripeColor = "var(--secondary)",
  featuresTextColor = "var(--foreground)"
}: CourseBannerProps) {
  return (
    <section 
      id={id} 
      className="relative w-full overflow-hidden"
      style={{ backgroundColor }}
      dir="rtl"
    >
      <div className="w-full h-full flex flex-col md:flex-row relative z-10">
        
        {/* Right side: Content */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12 md:py-24 order-1 md:order-1">
          <div className="max-w-xl text-right md:pr-10 mx-auto w-full">
            {title && (
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight" style={{ color: bottomStripeColor }}>
                {title}
              </h2>
            )}
            
            {subtitle && (
              <p className="text-xl md:text-2xl font-medium mb-12" style={{ color: featuresTextColor, opacity: 0.8 }}>
                {subtitle}
              </p>
            )}

            {/* Features Row */}
            {features && features.length > 0 && (
              <div className="flex flex-wrap md:flex-nowrap items-stretch justify-start mb-10 bg-white/40 backdrop-blur-sm px-2 py-4 rounded-3xl border border-white/50">
                {features.map((feature, idx) => {
                  const IconComponent = getIcon(feature.icon);
                  return (
                    <div 
                      key={feature.id} 
                      className={cn(
                        "flex flex-col items-center justify-start text-center px-2 py-1 flex-1 min-w-[100px]",
                        idx !== features.length - 1 ? "border-b md:border-b-0 md:border-l border-slate-400/30" : ""
                      )}
                    >
                      <div className="mb-3" style={{ color: featuresTextColor, opacity: 0.8 }}>
                        <IconComponent className="w-8 h-8" strokeWidth={1.5} />
                      </div>
                      <h4 className="font-bold text-base mb-1" style={{ color: featuresTextColor }}>{feature.title}</h4>
                      <p className="text-sm font-medium leading-tight" style={{ color: featuresTextColor }}>{feature.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Button */}
            {buttonsVisible && primaryButton && primaryButton.text && (
              <div className="flex justify-center md:justify-start mt-4 mb-16 md:mb-0">
                <Link 
                  href={primaryButton.link || "#"}
                  className="font-bold text-xl py-3 px-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 inline-block"
                  style={{ 
                    backgroundColor: primaryButton.backgroundColor || "var(--primary)",
                    color: primaryButton.textColor || "var(--primary-foreground)"
                  }}
                >
                  {primaryButton.text}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Left side: Image */}
        <div className="w-full md:w-1/2 min-h-[300px] md:min-h-full relative order-2 md:order-2">
          {/* On mobile, this will be below. On desktop, this spans full height. */}
          <div className="absolute inset-0 pb-16 md:pb-0 pl-0 md:pl-0 pr-0 md:pr-4 pt-0 md:pt-10 z-10">
            <div className="w-full h-full relative overflow-hidden rounded-t-[50px] md:rounded-tr-[250px] rounded-br-[0] md:rounded-bl-none shadow-2xl border-t-8 border-r-8 md:border-b-0 border-white">
              {imageSrc ? (
                <Image 
                  src={imageSrc} 
                  alt={title || "Image"} 
                  fill 
                  className="object-cover"
                  priority={true}
                />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                  <LucideIcons.Image className="w-16 h-16 text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stripe */}
      <div 
        className="w-full h-16 md:h-12 absolute bottom-0 left-0 z-0" 
        style={{ backgroundColor: bottomStripeColor }}
      />
    </section>
  );
}
