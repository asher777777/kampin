"use client";

import dynamic from "next/dynamic";

const Hero = dynamic(() => import("@/components/sections/Hero").then(m => m.Hero), { ssr: true });

export function V2PageClient({ pageData }: { pageData: any }) {
  const globalColors = pageData.pageSettings?.globalColors || { background: "#0a0a0a", text: "#ffffff" };
  const heroData = pageData.hero || {};
  const pageSettings = pageData.pageSettings || {};
  const seo = pageData.seo || {};

  return (
    <div 
      className="w-full min-h-screen overflow-x-hidden font-sans"
      style={{ 
        backgroundColor: globalColors.background,
        color: globalColors.text 
      }}
      dir="rtl"
    >
      <Hero 
        {...heroData} 
        title={pageSettings.title || heroData.title}
        subtitle={pageSettings.pageGoal || heroData.subtitle}
        description={pageSettings.description || heroData.description}
        imageSrc={seo.image || heroData.imageSrc}
        isEditing={false}
      />
    </div>
  );
}
