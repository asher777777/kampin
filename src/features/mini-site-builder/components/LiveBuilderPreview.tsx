"use client";

import React, { useMemo } from "react";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { RichContentSection } from "@/components/sections/RichContentSection";
import { BuilderStateData } from "../actions/builderActions";
import { ServiceItem } from "@/features/home/actions";
import { Sparkles, Phone, Mail, MessageCircle, Globe, Share2 } from "lucide-react";

interface LiveBuilderPreviewProps {
  state: BuilderStateData;
  isMobile?: boolean;
}

export function LiveBuilderPreview({ state, isMobile }: LiveBuilderPreviewProps) {
  const {
    companyName = "",
    slogan = "",
    pitchProblem = "",
    companyVision = "",
    personas = [],
    servicePages = [],
    logoUrl = "",
    primaryColor = "#4f46e5",
    secondaryColor = "#0f172a",
    contactPhone = "",
    contactEmail = "",
    contactWhatsApp = "",
    contactFacebook = "",
    contactInstagram = "",
  } = state;

  const hasContactDetails = contactPhone || contactEmail || contactWhatsApp || contactFacebook || contactInstagram;

  // Transform servicePages to ServiceItem array
  const serviceItems: ServiceItem[] = useMemo(() => {
    return servicePages.map((s, idx) => ({
      id: s.id || `srv_${idx}`,
      title: s.title,
      description: s.description,
      url: "#",
      icon: "Sparkles",
      imageSrc: s.imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
      isVisible: true,
    }));
  }, [servicePages]);

  return (
    <div 
      className="w-full h-full bg-[#0a0f1d] text-white overflow-y-auto custom-scrollbar flex flex-col font-sans transition-all duration-300 rounded-3xl border border-white/10 shadow-2xl relative"
      dir="rtl"
    >
      {/* Dynamic Header / Navbar */}
      <header className="w-full bg-[#111827]/90 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded-lg" />
          ) : (
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner"
              style={{ backgroundColor: primaryColor }}
            >
              {companyName ? companyName.slice(0, 2).toUpperCase() : "CG"}
            </div>
          )}
          <span className="font-bold text-sm text-white">{companyName || "שם החברה"}</span>
        </div>

        {slogan && (
          <p className="text-xs text-slate-300 font-medium hidden sm:block truncate max-w-[250px]">
            {slogan}
          </p>
        )}

        {/* Floating "אנחנו כאן" Contact Button */}
        <div className="relative group">
          <button 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: primaryColor }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>אנחנו כאן</span>
          </button>

          {hasContactDetails && (
            <div className="absolute left-0 mt-2 bg-[#1f293d] border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center gap-2 z-50 animate-in fade-in">
              {contactWhatsApp && (
                <a href={`https://wa.me/${contactWhatsApp}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition">
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition">
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Render Actual Home Editor Sections */}
      <main className="flex-1 space-y-0">
        {/* 1. Hero Section from Home Editor */}
        <Hero 
          title={companyName || "ברוכים הבאים לעסק שלנו"}
          subtitle={slogan || "פתרון מנצח שמקדם אותך קדימה"}
          description={pitchProblem || "אנו פותרים את הכאבים המרכזיים של הלקוחות שלנו ומביאים ערך אמיתי ומתמשך."}
          imageSrc={logoUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"}
          layout="fz"
          buttonsVisible={true}
          primaryButton={{ text: "צור קשר עכשיו", link: "#contact" }}
          secondaryButton={{ text: "למידע נוסף", link: "#services" }}
        />

        {/* 2. Rich Content / Vision Section from Home Editor */}
        {companyVision && (
          <RichContentSection 
            heading="החזון והייחוד שלנו"
            body={companyVision}
            layout="center"
          />
        )}

        {/* 3. Customer Personas / Pain Points Section */}
        {personas.length > 0 && (
          <section className="p-6 sm:p-12 bg-[#0e1628] border-y border-white/5 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-xl sm:text-3xl font-black text-white">הפתרון הממוקד לנקודות הכאב שלך</h3>
              <p className="text-xs sm:text-sm text-slate-400">הגדרנו את האתגרים ויצרנו מענה מנצח:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {personas.map((persona) => (
                <div key={persona.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-right hover:border-indigo-500/40 transition">
                  <div className="flex items-center gap-3 text-indigo-300 font-bold text-sm">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span>{persona.title}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {persona.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Services Grid from Home Editor */}
        {serviceItems.length > 0 && (
          <ServicesGrid 
            title="השירותים והמוצרים שלנו"
            description="מגוון פתרונות המותאמים במיוחד עבורך"
            items={serviceItems}
            layout="grid"
            columns={3}
          />
        )}
      </main>

      {/* Footer from Home Editor */}
      <Footer />
    </div>
  );
}
