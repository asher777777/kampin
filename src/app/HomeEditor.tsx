"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { CommunitySection } from "@/components/sections/CommunitySection";
import { LivePostsGrid } from "@/components/sections/LivePostsGrid";
import { LandingSection } from "@/components/sections/LandingSection";
import { RichContentSection } from "@/components/sections/RichContentSection";
import { TimerSection } from "@/components/sections/TimerSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { CourseBanner } from "@/components/sections/CourseBanner";
import { CourseBannerEditor } from "@/components/sections/CourseBannerEditor";
import { HeroEditor } from "@/components/sections/HeroEditor";
import { VideoGallery } from "@/components/sections/VideoGallery";
import { VideoGalleryEditor } from "@/components/sections/VideoGalleryEditor";
import { ImageListingSection } from "@/components/sections/ImageListingSection";
import { ImageListingEditor } from "@/components/sections/ImageListingEditor";
import { FaqSection } from "@/components/sections/FaqSection";
import { FaqSectionEditor } from "@/components/sections/FaqSectionEditor";
import { HomePageConfig, savePageConfig, getAllSitePages } from "@/features/home/actions";
import { GlobalSettings, saveGlobalSettings } from "@/features/settings/actions";
import { generateSeoTagsWithAI, generateSeoImageWithAI } from "@/features/ai/actions";
import { 
  Save, 
  X, 
  LayoutTemplate, 
  Settings2, 
  Image as ImageIcon, 
  Palette, 
  GripVertical,
  AlignRight,
  AlignCenter,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  Check,
  Layers,
  Phone,
  Smartphone,
  Search,
  Sparkles,
  Globe,
  Edit3,
  Eye,
  EyeOff,
  Monitor,
  Folder
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Reorder, useDragControls } from "framer-motion";
import { cn } from "@/lib/utils";

interface HomeEditorProps {
  initialConfig: HomePageConfig;
  initialGlobalSettings?: GlobalSettings;
  config: HomePageConfig;
  setConfig: React.Dispatch<React.SetStateAction<HomePageConfig>>;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  setIsEditing: (val: boolean) => void;
  pageId?: string;
  collectionName?: string;
}

const IframePreview = ({ children, isMobile }: { children: React.ReactNode, isMobile: boolean }) => {
  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);
  const mountNode = contentRef?.contentWindow?.document?.body;

  useEffect(() => {
    if (contentRef && contentRef.contentWindow) {
      const doc = contentRef.contentWindow.document;
      const existingStyles = doc.head.querySelectorAll('style, link[rel="stylesheet"]');
      existingStyles.forEach(s => s.remove());
      
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        doc.head.appendChild(style.cloneNode(true));
      });
      doc.documentElement.dir = "rtl";
      doc.documentElement.className = document.documentElement.className;
      doc.body.className = "bg-transparent m-0 p-0 overflow-x-hidden custom-scrollbar text-white";
    }
  }, [contentRef]);

  return (
    <iframe
      ref={setContentRef}
      className={cn(
        "transition-all duration-300 border-white/10 bg-[#0e0e10]",
        isMobile ? "w-[375px] border-x border-b shadow-2xl mx-auto h-[600px] rounded-b-3xl" : "w-full border-none h-[400px]"
      )}
      style={{ border: 'none' }}
      title="preview"
    >
      {mountNode && createPortal(
        <div className={cn("pointer-events-none origin-top", !isMobile ? "min-w-[800px]" : "w-full")}>
          {children}
        </div>, 
        mountNode
      )}
    </iframe>
  );
};

const SortableSectionItem = ({ 
  sectionId, 
  isMobileHidden, 
  isVisible,
  sectionLabel, 
  isOpen, 
  isSectionChanged,
  onToggleMobile,
  onToggleVisibility,
  onToggleOpen,
  onSaveLocal,
  onCancelLocal,
  previewNode,
  contentNode,
  designNode,
  isSaving,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: any) => {
  const [openTab, setOpenTab] = useState<"preview" | "content" | "design" | null>("content");
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  // Keep header sticky when open
  const scrollToTop = (e: React.MouseEvent) => {
    const currentTarget = e.currentTarget as HTMLElement;
    setTimeout(() => {
      const target = currentTarget.parentElement;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  return (
    <Reorder.Item 
      value={sectionId} 
      id={`wrapper-${sectionId}`}
      dragListener={false}
      className={cn(
        "border border-slate-800 bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500",
        isOpen ? "ring-1 ring-indigo-500/50 scroll-mt-24" : ""
      )}
    >
      <div className="flex items-center justify-between p-4 bg-[#1e293b] border-b border-slate-800 select-none sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 items-center justify-center p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onMoveUp) onMoveUp(); }}
              disabled={isFirst}
              className={cn("p-1 rounded text-slate-400 transition-colors", isFirst ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white cursor-pointer")}
              title="הזז למעלה"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onMoveDown) onMoveDown(); }}
              disabled={isLast}
              className={cn("p-1 rounded text-slate-400 transition-colors", isLast ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white cursor-pointer")}
              title="הזז למטה"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              onToggleOpen();
              if (!isOpen) scrollToTop(e);
            }}
            className="text-right flex items-center gap-2 font-black text-white hover:text-blue-300 transition-colors text-sm sm:text-base"
          >
            <ChevronDown className={cn("w-4.5 h-4.5 transition-transform duration-300 text-white", isOpen ? "rotate-180 text-blue-300" : "")} />
            <span>{sectionLabel || sectionId}</span>
            {isSectionChanged && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" title="יש שינויים לא שמורים" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isSectionChanged && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onSaveLocal) onSaveLocal(); }}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all border cursor-pointer bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-400"
              title="שמור שינויים באזור זה"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-xl transition-all border cursor-pointer",
              !isVisible 
                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                : "bg-green-500/10 text-green-400 border-green-500/20"
            )}
            title={isVisible ? "מוצג באתר" : "מוסתר באתר"}
          >
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleMobile(); }}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-xl transition-all border cursor-pointer",
              isMobileHidden 
                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                : "bg-green-500/10 text-green-400 border-green-500/20"
            )}
            title={isMobileHidden ? "מוסתר בנייד" : "מוצג בנייד"}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bg-[#0e0e10] flex flex-col animate-in slide-in-from-top-2 duration-300">
          
          {/* Inner Accordions */}
          <div className="w-full flex flex-col">
            
            {/* Preview Accordion */}
            <div className="w-full border-b border-white/5 bg-[#181818] transition-all">
              <div className="w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenTab(openTab === "preview" ? null : "preview")}
                  className="flex items-center gap-3 cursor-pointer flex-1 text-right"
                >
                  <LayoutTemplate className="w-4 h-4 text-indigo-400" /> תצוגה מקדימה
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsMobilePreview(!isMobilePreview); }}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg transition-all border cursor-pointer",
                      isMobilePreview 
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                        : "bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700"
                    )}
                    title={isMobilePreview ? "תצוגת מחשב" : "תצוגת נייד"}
                  >
                    {isMobilePreview ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => setOpenTab(openTab === "preview" ? null : "preview")}>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openTab === "preview" ? "rotate-180 text-white" : "text-gray-400")} />
                  </button>
                </div>
              </div>
              {openTab === "preview" && (
                <div className="bg-[#0a0a0a] border-t border-white/5 relative w-full flex justify-center overflow-x-auto custom-scrollbar transition-all duration-300">
                  <IframePreview isMobile={isMobilePreview}>
                    {previewNode}
                  </IframePreview>
                </div>
              )}
            </div>

            {/* Content Accordion */}
            <div className="w-full border-b border-white/5 bg-[#181818] transition-all">
              <button
                type="button"
                onClick={() => setOpenTab(openTab === "content" ? null : "content")}
                className="w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Edit3 className="w-4 h-4 text-emerald-400" /> הגדרות תוכן
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", openTab === "content" ? "rotate-180 text-white" : "text-gray-400")} />
              </button>
              {openTab === "content" && (
                <div className="p-4 bg-[#111] border-t border-white/5 flex flex-col gap-4">
                  {contentNode}
                </div>
              )}
            </div>

            {/* Design Accordion */}
            {designNode && (
              <div className="w-full border-b border-white/5 bg-[#181818] transition-all">
                <button
                  type="button"
                  onClick={() => setOpenTab(openTab === "design" ? null : "design")}
                  className="w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Palette className="w-4 h-4 text-pink-400" /> הגדרות עיצוב
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", openTab === "design" ? "rotate-180 text-white" : "text-gray-400")} />
                </button>
                {openTab === "design" && (
                  <div className="p-4 bg-[#111] border-t border-white/5 flex flex-col gap-4">
                    {designNode}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Reorder.Item>
  );
};

export function HomeEditor({
  initialConfig,
  initialGlobalSettings,
  config,
  setConfig,
  globalSettings,
  setGlobalSettings,
  setIsEditing,
  pageId,
  collectionName
}: HomeEditorProps) {
  const [saving, setSaving] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"edit" | "preview" | "reorder">("edit");
  
  // SEO Panel State
  const [isSeoPanelOpen, setIsSeoPanelOpen] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [isGeneratingSeoImage, setIsGeneratingSeoImage] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  
  // Side Drawer & Dyn Loading States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sitePages, setSitePages] = useState<any[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const allAvailableSections = ["hero", "mainContent", "services", "community", "livePosts", "landingSection", "pricing", "timer", "richContent", "videoGallery", "imageListing", "faq"];
  const currentSectionOrder = Array.from(new Set([...(config.sectionOrder || []), ...allAvailableSections]));

  const availableAnchors = [
    { id: config.hero?.anchorId || "hero", label: "אזור ראשי" },
    { id: config.mainContent?.anchorId || "mainContent", label: "אזור תוכן מרכזי" },
    { id: config.services?.anchorId || "services", label: "שירותים" },
    { id: config.community?.anchorId || "community", label: "קהילה" },
    { id: config.livePosts?.anchorId || "livePosts", label: "עדכונים ואירועים" },
    ...(config.richContent ? [{ id: config.richContent.anchorId || "richContent", label: "תוכן מעוצב" }] : []),
    ...(config.timer ? [{ id: config.timer.anchorId || "timer", label: "אזור טיימר" }] : []),
    ...(config.landingSection ? [{ id: config.landingSection.anchorId || "landingSection", label: "דף נחיתה" }] : []),
    ...(config.videoGallery ? [{ id: config.videoGallery.anchorId || "videoGallery", label: "גלריית וידאו" }] : []),
    ...(config.faq ? [{ id: config.faq.anchorId || "faq", label: "שאלות ותשובות" }] : [])
  ];

  useEffect(() => {
    if (!config.faq) {
      setConfig(prev => ({
        ...prev,
        faq: {
          visible: true,
          title: "שאלות ותשובות נפוצות",
          subtitle: "תשובות לכל השאלות שרציתם לשאול על השירותים והפלטפורמה שלנו",
          anchorId: "faq",
          backgroundColor: "transparent",
          items: [
            {
              id: "1",
              question: "איך מתחילים לעבוד עם המערכת?",
              answer: "נרשמים בקלות, בוחרים תבנית עיצוב או מתחילים מאפס, ומעצבים את העמוד בעזרת עורך הבית הוויזואלי הנוח."
            },
            {
              id: "2",
              question: "האם ניתן לחבר דומיין מותאם אישית?",
              answer: "בהחלט! המערכת תומכת בחיבור דומיין פרטי לכל עמוד, קמפיין או דף נחיתה שתקימו."
            },
            {
              id: "3",
              question: "איך עובד הסנכרון עם מערכת ה-CRM?",
              answer: "כל פנייה דרך הטפסים בעמוד נשמרת ומוזרמת באופן אוטומטי לכרטיסיות הלידים במערכת ה-CRM."
            }
          ]
        }
      }));
    }
  }, [config.faq]);

  // Load site pages and restore scroll on mount
  useEffect(() => {
    async function loadPages() {
      setIsLoadingPages(true);
      try {
        const pages = await getAllSitePages();
        const fixedPages = [
          { id: "home", title: 'עמוד הבית', url: '/' },
          { id: "lessons", title: 'שיעורי תורה', url: '/lessons' },
          { id: "services", title: 'שירותי דת', url: '/services' },
          { id: "community", title: 'עמוד קהילה', url: '/community' },
          { id: "contact", title: 'צור קשר', url: '/contact' },
        ];
        const combined = [...fixedPages];
        if (pages) {
          pages.forEach((p: any) => {
            if (!combined.some(existing => existing.url === p.url)) {
              combined.push(p);
            }
          });
        }
        setSitePages(combined);
      } catch (e) {
        console.warn("Failed to load site pages", e);
      } finally {
        setIsLoadingPages(false);
      }
    }
    loadPages();

    // Restore scroll position
    const savedScroll = sessionStorage.getItem("home_editor_scroll");
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
      sessionStorage.removeItem("home_editor_scroll");
    }
  }, []);

  const [lastSavedConfigStr, setLastSavedConfigStr] = useState<string>(() => JSON.stringify(initialConfig));

  const hasGlobalChanges = useMemo(() => {
    // Strip purely local UI state like activeEditSection or mobileHiddenSections if they exist on config
    const cleanConfig = { ...config };
    delete (cleanConfig as any).activeEditSection;
    delete (cleanConfig as any).lastSavedSectionData;
    return JSON.stringify(cleanConfig) !== lastSavedConfigStr;
  }, [config, lastSavedConfigStr]);

  const handleSave = async (exitEditor = true) => {
    setSaving(true);
    try {
      const cleanConfig = JSON.parse(JSON.stringify(config));
      delete cleanConfig.activeEditSection;
      delete cleanConfig.lastSavedSectionData;
      
      const isSystemPage = !collectionName || (collectionName === "pages" && (pageId === "home" || pageId === "services-landing"));

      if (!isSystemPage) {
        cleanConfig.pageSettings = globalSettings;
        await savePageConfig(collectionName!, pageId!, cleanConfig);
      } else {
        if (collectionName && pageId) {
          await savePageConfig(collectionName, pageId, cleanConfig);
        } else {
          await savePageConfig("pages", "home", cleanConfig);
        }
        await saveGlobalSettings(globalSettings);
      }
      sessionStorage.setItem("home_editor_scroll", window.scrollY.toString());
      setLastSavedConfigStr(JSON.stringify(cleanConfig));
      if (exitEditor) {
        setIsEditing(false);
      }
    } catch (e) {
      console.error("Failed to save home page config", e);
      alert("שגיאה בשמירה ל-Firebase.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
    setActiveAccordion(null);
  };

  const handleGenerateSeo = async () => {
    setIsGeneratingSeo(true);
    try {
      const contentParts = [
        config.hero?.title, config.hero?.subtitle, config.hero?.description,
        config.mainContent?.title, config.mainContent?.description,
        config.services?.title, config.services?.description,
        config.community?.title, config.community?.description
      ].filter(Boolean).join(" | ");

      const result = await generateSeoTagsWithAI(contentParts);
      if (result.success) {
        setConfig((prev) => ({
          ...prev,
          seo: {
            ...prev.seo,
            title: result.title || prev.seo?.title || "",
            description: result.description || prev.seo?.description || "",
            keywords: result.keywords || prev.seo?.keywords || ""
          }
        }));
      } else {
        alert("שגיאה בייצור תוכן: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה בייצור תגיות SEO");
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleOpenPromptModal = () => {
    setCustomImagePrompt(`A highly engaging, professional, and visually striking cover image representing a community organization. 
Keywords: ${config.seo?.keywords || "community, organization, warmth, welcoming, events"}. 
It should be photorealistic, high quality, optimistic, and welcoming. Do not write text/letters inside the image.`);
    setIsPromptModalOpen(true);
  };

  const handleGenerateSeoImage = async () => {
    if (!customImagePrompt.trim()) return;
    setIsGeneratingSeoImage(true);
    setIsPromptModalOpen(false);
    try {
      const result = await generateSeoImageWithAI(customImagePrompt);
      if (result.success && result.imageUrl) {
        setConfig((prev) => ({
          ...prev,
          seo: {
            ...prev.seo,
            title: prev.seo?.title || "",
            description: prev.seo?.description || "",
            image: result.imageUrl
          }
        }));
      } else {
        alert("שגיאה בייצור תמונה: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה בייצור תמונת SEO");
    } finally {
      setIsGeneratingSeoImage(false);
    }
  };

  const updateHero = (field: keyof HomePageConfig["hero"], value: string) => {
    setConfig({ ...config, hero: { ...config.hero, [field]: value } });
  };

  const updateMainContent = (field: keyof HomePageConfig["mainContent"], value: any) => {
    setConfig({ ...config, mainContent: { ...config.mainContent, [field]: value } });
  };

  const updateSectionVisibility = (section: keyof Omit<HomePageConfig, "hero" | "sectionOrder">, visible: boolean) => {
    setConfig({ ...config, [section]: { ...config[section as keyof HomePageConfig] as any, visible } });
  };

  // Nav Links manipulations
  const handleAddLink = () => {
    const newLinks = [...(globalSettings.navLinks || []), { name: "קישור חדש", href: "/" }];
    setGlobalSettings({ ...globalSettings, navLinks: newLinks });
  };

  const handleUpdateLinkName = (index: number, val: string) => {
    const newLinks = [...(globalSettings.navLinks || [])];
    newLinks[index] = { ...newLinks[index], name: val };
    setGlobalSettings({ ...globalSettings, navLinks: newLinks });
  };

  const handleUpdateLinkHref = (index: number, val: string) => {
    const newLinks = [...(globalSettings.navLinks || [])];
    newLinks[index] = { ...newLinks[index], href: val };
    setGlobalSettings({ ...globalSettings, navLinks: newLinks });
  };

  const handleDeleteLink = (index: number) => {
    const newLinks = (globalSettings.navLinks || []).filter((_, i) => i !== index);
    setGlobalSettings({ ...globalSettings, navLinks: newLinks });
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    const links = [...(globalSettings.navLinks || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const temp = links[index];
    links[index] = links[targetIndex];
    links[targetIndex] = temp;
    setGlobalSettings({ ...globalSettings, navLinks: links });
  };

  const SectionToggle = ({ 
    label, 
    sectionKey 
  }: { 
    label: string, 
    sectionKey: keyof Omit<HomePageConfig, "hero" | "sectionOrder" | "seo" | "mobileHiddenSections"> 
  }) => {
    return (
      <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-md px-6 py-2 rounded-2xl border shadow-lg flex items-center gap-4">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        
        <div className="flex items-center gap-2 border-r pr-4 mr-2">
          <label className="text-[10px] text-slate-500 font-medium">מזהה עוגן (ID)</label>
          <input 
            type="text" 
            value={(config[sectionKey as keyof typeof config] as any)?.anchorId || ""}
            onChange={(e) => setConfig({ ...config, [sectionKey]: { ...(config[sectionKey as keyof typeof config] as any), anchorId: e.target.value }})}
            className="w-24 text-xs border rounded p-1"
            placeholder={sectionKey}
            dir="ltr"
          />
        </div>

        <div className="flex items-center gap-2 border-r pr-4 mr-2">
          <label className="text-[10px] text-slate-500 font-medium">צבע רקע</label>
          <input 
            type="color" 
            value={(config[sectionKey as keyof typeof config] as any)?.backgroundColor || "#ffffff"}
            onChange={(e) => setConfig({ ...config, [sectionKey]: { ...(config[sectionKey as keyof typeof config] as any), backgroundColor: e.target.value }})}
            className="w-8 h-6 p-0 border-0 cursor-pointer"
          />
        </div>
        
        <div className="flex items-center gap-2 border-r pr-4 mr-2">
          <label className="text-[10px] text-slate-500 font-medium">צבע הובר</label>
          <input 
            type="color" 
            value={(config[sectionKey as keyof typeof config] as any)?.hoverColor || "#f8fafc"}
            onChange={(e) => setConfig({ ...config, [sectionKey]: { ...(config[sectionKey as keyof typeof config] as any), hoverColor: e.target.value }})}
            className="w-8 h-6 p-0 border-0 cursor-pointer"
          />
        </div>
      </div>
    );
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        if (!config.hero) return null;
        
        const heroDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.hero.anchorId || ""}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="hero"
                dir="ltr"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4 border-b border-white/10 pb-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע רקע</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.hero.backgroundColor || "#ffffff"}
                    onChange={(e) => setConfig({ ...config, hero: { ...config.hero, backgroundColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-300" dir="ltr">{config.hero.backgroundColor || "#ffffff"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע הובר</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.hero.hoverColor || "#f8fafc"}
                    onChange={(e) => setConfig({ ...config, hero: { ...config.hero, hoverColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-300" dir="ltr">{config.hero.hoverColor || "#f8fafc"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע כותרת</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.hero.titleColor || "#ffffff"}
                    onChange={(e) => setConfig({ ...config, hero: { ...config.hero, titleColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300" dir="ltr">{config.hero.titleColor || ""}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע תיאור</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.hero.descriptionColor || "#ffffff"}
                    onChange={(e) => setConfig({ ...config, hero: { ...config.hero, descriptionColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300" dir="ltr">{config.hero.descriptionColor || ""}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">מבנה תצוגה (Layout)</label>
              <select 
                value={config.hero.layout || "fz"}
                onChange={(e) => updateHero("layout", e.target.value)}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="fz">המסלול הטבעי (F/Z)</option>
                <option value="spatial">הגלריה היוקרתית (Spatial)</option>
              </select>
            </div>
          </div>
        );

        const heroContentNode = (
          <HeroEditor 
            title={config.hero.title}
            subtitle={config.hero.subtitle}
            description={config.hero.description}
            imageSrc={config.hero.imageSrc}
            buttonsVisible={config.hero.buttonsVisible}
            primaryButton={config.hero.primaryButton}
            secondaryButton={config.hero.secondaryButton}
            availableAnchors={availableAnchors}
            heroStyle={config.hero.heroStyle}
            flexDirection={config.hero.flexDirection}
            form={config.hero.form}
            formMode={config.hero.formMode}
            priority={true}
            onUpdateHero={updateHero}
          />
        );

        const heroPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <Hero 
              id={config.hero.anchorId || "hero"}
              title={config.hero.title}
              subtitle={config.hero.subtitle}
              description={config.hero.description}
              imageSrc={config.hero.imageSrc}
              layout={config.hero.layout}
              buttonsVisible={config.hero.buttonsVisible}
              primaryButton={config.hero.primaryButton}
              secondaryButton={config.hero.secondaryButton}
              availableAnchors={availableAnchors}
              backgroundColor={config.hero.backgroundColor}
              titleColor={config.hero.titleColor}
              descriptionColor={config.hero.descriptionColor}
              heroStyle={config.hero.heroStyle}
              flexDirection={config.hero.flexDirection}
              formMode={config.hero.formMode}
              isEditing={false}
              onUpdateHero={updateHero}
              priority={true}
            />
          </div>
        );

        return { previewNode: heroPreviewNode, contentNode: heroContentNode, designNode: heroDesignNode };

      case "mainContent":
        if (!config.mainContent) return null;
        
        const mainDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.mainContent.anchorId || ""}
                onChange={(e) => setConfig({ ...config, mainContent: { ...config.mainContent, anchorId: e.target.value } as any})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="mainContent"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">צבע רקע</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={config.mainContent.backgroundColor || globalSettings.backgroundColor || "#ffffff"}
                  onChange={(e) => setConfig({ ...config, mainContent: { ...config.mainContent, backgroundColor: e.target.value } as any})}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">צבע פס תחתון</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={config.mainContent.bottomStripeColor || globalSettings.secondaryColor || "#ffffff"}
                  onChange={(e) => setConfig({ ...config, mainContent: { ...config.mainContent, bottomStripeColor: e.target.value } as any})}
                  className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">מבנה</label>
              <span className="p-2 border border-slate-700 rounded-lg bg-[#1e293b] text-sm text-slate-400">באנר קורס (Course Banner)</span>
            </div>
          </div>
        );

        const mainContentNode = (
          <CourseBannerEditor 
            config={config.mainContent}
            onUpdate={(field, val) => updateMainContent(field as keyof HomePageConfig["mainContent"], val)}
            onUpdateFeature={(features) => updateMainContent("features", features)}
          />
        );

        const mainPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <CourseBanner 
              id={config.mainContent.anchorId || "mainContent"}
              title={config.mainContent.title}
              subtitle={config.mainContent.subtitle}
              imageSrc={config.mainContent.imageSrc}
              features={config.mainContent.features}
              buttonsVisible={config.mainContent.buttonsVisible}
              primaryButton={config.mainContent.primaryButton}
              backgroundColor={config.mainContent.backgroundColor || globalSettings.backgroundColor}
              bottomStripeColor={config.mainContent.bottomStripeColor || globalSettings.secondaryColor}
            />
          </div>
        );

        return { previewNode: mainPreviewNode, contentNode: mainContentNode, designNode: mainDesignNode };
      case "services":
        if (!config.services) return null;

        const servicesDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.services.anchorId || ""}
                onChange={(e) => setConfig({ ...config, services: { ...config.services, anchorId: e.target.value } as any})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="services"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.services.layout || "grid"}
                onChange={(e) => setConfig({ ...config, services: { ...config.services, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="grid">גריד רגיל (Grid)</option>
                <option value="carousel">קרוסלה (Carousel)</option>
                <option value="image-card">תמונה, כותרת ותיאור</option>
                <option value="hover-card">הובר להצגת תיאור</option>
              </select>
            </div>

            {config.services.layout !== "carousel" && (
              <>
                <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                  <label className="text-xs text-slate-400 font-medium">עמודות (במחשב)</label>
                  <select 
                    value={config.services.columns || 4}
                    onChange={(e) => setConfig({ ...config, services: { ...config.services, columns: Number(e.target.value) }})}
                    className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                  >
                    <option value={2}>2 עמודות</option>
                    <option value={3}>3 עמודות</option>
                    <option value={4}>4 עמודות</option>
                    <option value={5}>5 עמודות</option>
                    <option value={6}>6 עמודות</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                  <label className="text-xs text-slate-400 font-medium">עמודות (בנייד)</label>
                  <select 
                    value={config.services.columnsMobile || 1}
                    onChange={(e) => setConfig({ ...config, services: { ...config.services, columnsMobile: Number(e.target.value) }})}
                    className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                  >
                    <option value={1}>1 עמודה</option>
                    <option value={2}>2 עמודות</option>
                    <option value={3}>3 עמודות</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">אפקט אנימציה</label>
              <select 
                value={config.services.effect || "none"}
                onChange={(e) => setConfig({ ...config, services: { ...config.services, effect: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="none">ללא אפקט</option>
                <option value="zoom">זום (Zoom In)</option>
                <option value="lift">הרמה (Lift Up)</option>
                <option value="glow">זוהר (Glow)</option>
              </select>
            </div>
          </div>
        );

        const servicesContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            {/* We still use ServicesGrid for editing items, but we disable its header editing and add text inputs here */}
            <div className="w-full space-y-4 border-b border-white/10 pb-6">
              <h5 className="text-sm font-bold text-white">הגדרות כותרת וטקסט</h5>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת</label>
                <input 
                  type="text" 
                  value={config.services.title || ""} 
                  onChange={(e) => setConfig({ ...config, services: { ...config.services, title: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תיאור (אופציונלי)</label>
                <textarea 
                  value={config.services.description || ""} 
                  onChange={(e) => setConfig({ ...config, services: { ...config.services, description: e.target.value } as any })} 
                  rows={2} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 resize-none" 
                  placeholder="הזן תיאור קצר..." 
                />
              </div>
            </div>

            <div className="w-full pt-2">
              <h5 className="text-sm font-bold text-white mb-4">ניהול שירותים (פריטים)</h5>
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <ServicesGrid 
                  id={config.services.anchorId || "services"}
                  title=""
                  description=""
                  layout={config.services.layout} 
                  columns={config.services.columns}
                  columnsMobile={config.services.columnsMobile}
                  effect={config.services.effect}
                  items={config.services.items} 
                  isEditing={true} 
                  onUpdate={(items) => setConfig({ ...config, services: { ...config.services, items } as any })}
                  onHeaderUpdate={() => {}}
                />
              </div>
            </div>
          </div>
        );

        const servicesPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <ServicesGrid 
              id={config.services.anchorId || "services"}
              title={config.services.title}
              description={config.services.description}
              layout={config.services.layout} 
              columns={config.services.columns}
              columnsMobile={config.services.columnsMobile}
              effect={config.services.effect}
              items={config.services.items} 
              isEditing={false} 
              onUpdate={() => {}}
              onHeaderUpdate={() => {}}
            />
          </div>
        );

        return { previewNode: servicesPreviewNode, contentNode: servicesContentNode, designNode: servicesDesignNode };
      case "community":
        if (!config.community) return null;
        const resolvedWhatsApp = !config.community.whatsappNumber || config.community.whatsappNumber === "972545947701"
          ? (globalSettings.contactWhatsApp || globalSettings.contactPhone || "972545947701")
          : config.community.whatsappNumber;

        const communityDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.community.anchorId || ""}
                onChange={(e) => setConfig({ ...config, community: { ...config.community, anchorId: e.target.value } as any})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="community"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.community.layout || "split-left"}
                onChange={(e) => setConfig({ ...config, community: { ...config.community, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="split-left">תמונה משמאל (Split Left)</option>
                <option value="split-right">תמונה מימין (Split Right)</option>
                <option value="centered">ממורכז (Centered)</option>
              </select>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-white">
                <input 
                  type="checkbox" 
                  checked={config.community.badgeVisible ?? true}
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, badgeVisible: e.target.checked }})}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                />
                הצג תווית על התמונה
              </label>
              <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-white">
                <input 
                  type="checkbox" 
                  checked={config.community.buttonVisible ?? true}
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, buttonVisible: e.target.checked }})}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                />
                הצג כפתור וואטסאפ
              </label>
            </div>
          </div>
        );

        const communityContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full space-y-4 border-b border-white/10 pb-6">
              <h5 className="text-sm font-bold text-white">הגדרות טקסט</h5>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת קטנה (מעל הכותרת הראשית)</label>
                <input 
                  type="text" 
                  value={config.community.subtitle || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, subtitle: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן תת כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת ראשית</label>
                <input 
                  type="text" 
                  value={config.community.title || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, title: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תיאור ראשי</label>
                <textarea 
                  value={config.community.description || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, description: e.target.value } as any })} 
                  rows={3} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 resize-none" 
                  placeholder="הזן תיאור מורחב..." 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">ציטוט / משפט מפתח</label>
                <textarea 
                  value={config.community.quote || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, quote: e.target.value } as any })} 
                  rows={2} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 resize-none" 
                  placeholder="הזן ציטוט..." 
                />
              </div>
            </div>

            <div className="w-full space-y-4 border-b border-white/10 pb-6">
              <h5 className="text-sm font-bold text-white">תווית על התמונה</h5>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת התווית</label>
                <input 
                  type="text" 
                  value={config.community.badgeTitle || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, badgeTitle: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תת כותרת התווית</label>
                <input 
                  type="text" 
                  value={config.community.badgeSubtitle || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, badgeSubtitle: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                />
              </div>
            </div>

            <div className="w-full space-y-4">
              <h5 className="text-sm font-bold text-white">הגדרות כפתור ותמונה</h5>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">טקסט כפתור וואטסאפ</label>
                <input 
                  type="text" 
                  value={config.community.buttonText || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, buttonText: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">מספר וואטסאפ לקישור</label>
                <input 
                  type="text" 
                  value={config.community.whatsappNumber || ""} 
                  onChange={(e) => setConfig({ ...config, community: { ...config.community, whatsappNumber: e.target.value } as any })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 mt-4">
                <label className="text-xs font-semibold text-slate-300">קישור לתמונה</label>
                <ImageUpload 
                  currentImage={config.community.imageSrc}
                  onSelect={(url) => setConfig({ ...config, community: { ...config.community, imageSrc: url } as any })}
                />
              </div>
            </div>
          </div>
        );

        const communityPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <CommunitySection
              id={config.community.anchorId || "community"}
              title={config.community.title}
              subtitle={config.community.subtitle}
              description={config.community.description}
              quote={config.community.quote}
              imageSrc={config.community.imageSrc}
              badgeTitle={config.community.badgeTitle}
              badgeSubtitle={config.community.badgeSubtitle}
              buttonText={config.community.buttonText}
              whatsappNumber={resolvedWhatsApp}
              layout={config.community.layout}
              badgeVisible={config.community.badgeVisible}
              buttonVisible={config.community.buttonVisible}
              isEditing={false}
              onUpdate={() => {}}
            />
          </div>
        );

        return { previewNode: communityPreviewNode, contentNode: communityContentNode, designNode: communityDesignNode };

      case "livePosts":
        if (!config.livePosts) return null;

        const livePostsDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.livePosts.anchorId || ""}
                onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, anchorId: e.target.value } as any})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="livePosts"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.livePosts.layout || "grid"}
                onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="grid">גריד (Grid)</option>
                <option value="list">רשימה (List)</option>
                <option value="masonry">תצוגת רשת א-סימטרית (Masonry)</option>
                <option value="carousel">קרוסלה (Carousel)</option>
              </select>
            </div>
          </div>
        );

        const livePostsContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="bg-[#181818] rounded-xl border border-white/10 p-5 space-y-5">
              <h5 className="text-sm font-bold text-white flex items-center justify-between">כותרת ותיאור</h5>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-xs font-medium">טקסט כותרת</label>
                    <input
                      type="text"
                      value={config.livePosts.title || ""}
                      onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, title: e.target.value } as any })}
                      placeholder="הכנס כותרת (אופציונלי)"
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-300 text-xs font-medium">צבע כותרת</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.livePosts.titleColor || "#1e293b"}
                        onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, titleColor: e.target.value } as any })}
                        className="w-8 h-8 rounded cursor-pointer border border-white/10"
                      />
                      <input
                        type="text"
                        value={config.livePosts.titleColor || "#1e293b"}
                        onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, titleColor: e.target.value } as any })}
                        className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-300 text-xs font-medium">טקסט תיאור</label>
                    <textarea
                      value={config.livePosts.description || ""}
                      onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, description: e.target.value } as any })}
                      placeholder="הכנס תיאור (אופציונלי)"
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500/50 text-sm h-20 resize-none custom-scrollbar"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-300 text-xs font-medium">צבע תיאור</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.livePosts.descriptionColor || "#475569"}
                        onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, descriptionColor: e.target.value } as any })}
                        className="w-8 h-8 rounded cursor-pointer border border-white/10"
                      />
                      <input
                        type="text"
                        value={config.livePosts.descriptionColor || "#475569"}
                        onChange={(e) => setConfig({ ...config, livePosts: { ...config.livePosts, descriptionColor: e.target.value } as any })}
                        className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-4">
              <h5 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                בחירת דפים מותאמים אישית לליסטינג
                <Button
                  onClick={() => {
                    const defaultUrl = sitePages[0]?.url || "/";
                    const currentCustom = config.livePosts.customPages || [];
                    setConfig({
                      ...config,
                      livePosts: {
                        ...config.livePosts,
                        customPages: [...currentCustom, defaultUrl]
                      } as any
                    });
                  }}
                  variant="outline"
                  className="py-1 px-3 border-secondary/20 hover:border-secondary/50 text-secondary text-xs font-bold rounded-lg cursor-pointer"
                >
                  הוסף דף +
                </Button>
              </h5>

              {config.livePosts.customPages && config.livePosts.customPages.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {config.livePosts.customPages.map((selectedUrl, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#1e293b] p-3 rounded-xl border border-slate-700">
                      <select
                        value={selectedUrl}
                        onChange={(e) => {
                          const updated = [...(config.livePosts.customPages || [])];
                          updated[idx] = e.target.value;
                          setConfig({
                            ...config,
                            livePosts: { ...config.livePosts, customPages: updated } as any
                          });
                        }}
                        className="flex-grow text-xs p-2 border border-slate-600 rounded bg-[#0f172a] text-white cursor-pointer font-medium"
                      >
                        {sitePages.map((page, idx) => (
                          <option key={`${page.id}-${idx}`} value={page.url}>{page.title}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const updated = (config.livePosts.customPages || []).filter((_, i) => i !== idx);
                          setConfig({
                            ...config,
                            livePosts: { ...config.livePosts, customPages: updated } as any
                          });
                        }}
                        className="p-2 rounded text-red-400 hover:bg-red-900/30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl text-slate-300 text-xs text-center">
                  <p className="font-medium">כעת מוצגים 3 הפוסטים האחרונים באופן אוטומטי.</p>
                  <p className="mt-2 text-slate-400">ניתן להוסיף דפים מותאמים אישית כדי להציג אותם במקום הפוסטים האחרונים.</p>
                </div>
              )}
            </div>
          </div>
        );

        const livePostsPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <LivePostsGrid 
              id={config.livePosts.anchorId || "livePosts"} 
              layout={config.livePosts.layout} 
              customPages={config.livePosts.customPages} 
              title={config.livePosts.title}
              titleColor={config.livePosts.titleColor}
              description={config.livePosts.description}
              descriptionColor={config.livePosts.descriptionColor}
            />
          </div>
        );

        return { previewNode: livePostsPreviewNode, contentNode: livePostsContentNode, designNode: livePostsDesignNode };
      case "timer":
        if (!config.timer) return null;
        const timerDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.timer.anchorId || ""}
                onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="timer"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.timer.layout || "modern"}
                onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="modern">מודרני (Modern)</option>
                <option value="classic">קלאסי (Classic)</option>
                <option value="compact">קומפקטי (Compact)</option>
              </select>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs text-slate-400 font-medium">צבעים</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">רקע כללי</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.backgroundColor && config.timer.backgroundColor !== "transparent" ? config.timer.backgroundColor : "#ffffff"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, backgroundColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, backgroundColor: "transparent" }})}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">כותרת</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.titleColor || "#000000"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, titleColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, titleColor: "" }})}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">תת כותרת</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.subtitleColor || "#000000"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, subtitleColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, subtitleColor: "" }})}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">רקע הריבועים</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.boxBackgroundColor || "#ffffff"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, boxBackgroundColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, boxBackgroundColor: "" }})}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">מספרים</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.numberColor || "#000000"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, numberColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, numberColor: "" }})}>נקה</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500">תוויות זמן</span>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent" value={config.timer.labelColor || "#000000"} onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, labelColor: e.target.value }})} />
                    <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, timer: { ...config.timer!, labelColor: "" }})}>נקה</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        const timerContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full space-y-4">
              <h5 className="text-sm font-bold text-white mb-4">הגדרות טקסט וטיימר</h5>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת (אופציונלי)</label>
                <input 
                  type="text" 
                  value={config.timer.title || ""} 
                  onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, title: e.target.value } })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תת כותרת (אופציונלי)</label>
                <input 
                  type="text" 
                  value={config.timer.subtitle || ""} 
                  onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, subtitle: e.target.value } })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן תת כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תאריך יעד</label>
                <input 
                  type="datetime-local" 
                  value={config.timer.targetDate || ""} 
                  onChange={(e) => setConfig({ ...config, timer: { ...config.timer!, targetDate: e.target.value } })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        );

        const timerPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <TimerSection
              id={config.timer.anchorId || "timer"}
              title={config.timer.title}
              subtitle={config.timer.subtitle}
              targetDate={config.timer.targetDate}
              layout={config.timer.layout}
              backgroundColor={config.timer.backgroundColor}
              titleColor={config.timer.titleColor}
              subtitleColor={config.timer.subtitleColor}
              boxBackgroundColor={config.timer.boxBackgroundColor}
              numberColor={config.timer.numberColor}
              labelColor={config.timer.labelColor}
              isEditing={false}
              onUpdate={() => {}}
            />
          </div>
        );

        return { previewNode: timerPreviewNode, contentNode: timerContentNode, designNode: timerDesignNode };

      case "pricing":
        if (!config.pricing) return null;
        const pricingDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.pricing.anchorId || ""}
                onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing!, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="pricing"
                dir="ltr"
              />
            </div>
          </div>
        );

        const pricingContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full space-y-4 border-b border-white/10 pb-6">
              <h5 className="text-sm font-bold text-white mb-4">הגדרות טקסט</h5>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת קטנה (מעל הכותרת)</label>
                <input 
                  type="text" 
                  value={config.pricing.subtitle || ""} 
                  onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing!, subtitle: e.target.value } })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן תת כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">כותרת ראשית</label>
                <input 
                  type="text" 
                  value={config.pricing.title || ""} 
                  onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing!, title: e.target.value } })} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
                  placeholder="הזן כותרת..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">תיאור</label>
                <textarea 
                  value={config.pricing.description || ""} 
                  onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing!, description: e.target.value } })} 
                  rows={2} 
                  className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 resize-none" 
                  placeholder="הזן תיאור..." 
                />
              </div>
            </div>

            <div className="w-full pt-2">
              <h5 className="text-sm font-bold text-white mb-4">ניהול חבילות</h5>
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <PricingSection
                  id={config.pricing.anchorId || "pricing"}
                  title=""
                  subtitle=""
                  description=""
                  packages={config.pricing.packages}
                  isEditing={true}
                  onUpdate={(field, val) => {
                    setConfig({ ...config, pricing: { ...config.pricing!, [field]: val } });
                  }}
                />
              </div>
            </div>
          </div>
        );

        const pricingPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <PricingSection
              id={config.pricing.anchorId || "pricing"}
              title={config.pricing.title}
              subtitle={config.pricing.subtitle}
              description={config.pricing.description}
              packages={config.pricing.packages}
              isEditing={false}
              onUpdate={() => {}}
            />
          </div>
        );

        return { previewNode: pricingPreviewNode, contentNode: pricingContentNode, designNode: pricingDesignNode };
      case "richContent":
        if (!config.richContent) return null;
        const richContentDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.richContent.anchorId || ""}
                onChange={(e) => setConfig({ ...config, richContent: { ...config.richContent!, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="richContent"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.richContent.layout || "standard"}
                onChange={(e) => setConfig({ ...config, richContent: { ...config.richContent!, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="standard">רגיל (Standard)</option>
                <option value="wide">רחב (Wide)</option>
                <option value="split">מפוצל (Split)</option>
              </select>
            </div>
          </div>
        );

        const richContentContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full pt-2">
              <h5 className="text-sm font-bold text-white mb-4">ניהול תוכן (Rich Content)</h5>
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <RichContentSection 
                  id={config.richContent.anchorId || "richContent"}
                  heading={config.richContent.heading}
                  body={config.richContent.body}
                  layout={config.richContent.layout}
                  isEditing={true}
                  onUpdate={(field, val) => {
                    setConfig({ ...config, richContent: { ...config.richContent!, [field]: val } });
                  }}
                />
              </div>
            </div>
          </div>
        );

        const richContentPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <RichContentSection 
              id={config.richContent.anchorId || "richContent"}
              heading={config.richContent.heading}
              body={config.richContent.body}
              layout={config.richContent.layout}
              isEditing={false}
              onUpdate={() => {}}
            />
          </div>
        );

        return { previewNode: richContentPreviewNode, contentNode: richContentContentNode, designNode: richContentDesignNode };

      case "landingSection":
        if (!config.landingSection) return null;

        const landingDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.landingSection.anchorId || ""}
                onChange={(e) => setConfig({ ...config, landingSection: { ...config.landingSection!, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="landingSection"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">פריסה</label>
              <select 
                value={config.landingSection.layout || "split-right"}
                onChange={(e) => setConfig({ ...config, landingSection: { ...config.landingSection!, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="split-right">טופס מימין (Split Right)</option>
                <option value="split-left">טופס משמאל (Split Left)</option>
                <option value="centered">ממורכז (Centered)</option>
              </select>
            </div>
          </div>
        );

        const landingContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full pt-2">
              <h5 className="text-sm font-bold text-white mb-4">ניהול טופס דף נחיתה</h5>
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <Suspense fallback={null}>
                  <LandingSection
                    id={config.landingSection.anchorId || "landingSection"}
                    title={config.landingSection.title}
                    subtitle={config.landingSection.subtitle}
                    description={config.landingSection.description}
                    imageSrc={config.landingSection.imageSrc}
                    form={config.landingSection.form}
                    theme={globalSettings.theme}
                    layout={config.landingSection.layout}
                    formMode={config.landingSection.formMode}
                    buttonText={config.landingSection.buttonText}
                    isEditing={true}
                    onUpdate={(field, val) => {
                      setConfig({ ...config, landingSection: { ...config.landingSection!, [field]: val } });
                    }}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        );

        const landingPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <Suspense fallback={null}>
              <LandingSection
                id={config.landingSection.anchorId || "landingSection"}
                title={config.landingSection.title}
                subtitle={config.landingSection.subtitle}
                description={config.landingSection.description}
                imageSrc={config.landingSection.imageSrc}
                form={config.landingSection.form}
                theme={globalSettings.theme}
                layout={config.landingSection.layout}
                formMode={config.landingSection.formMode}
                buttonText={config.landingSection.buttonText}
                isEditing={false}
                onUpdate={() => {}}
              />
            </Suspense>
          </div>
        );

        return { previewNode: landingPreviewNode, contentNode: landingContentNode, designNode: landingDesignNode };

      case "videoGallery":
        const vGalleryConf = config.videoGallery || {
          visible: true,
          images: [],
          videoUrl: "",
          videoType: "auto",
          effect: "fade",
          anchorId: "videoGallery",
          backgroundColor: "#0f172a"
        };

        const videoGalleryDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={vGalleryConf.anchorId || ""}
                onChange={(e) => setConfig({ ...config, videoGallery: { ...vGalleryConf, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="videoGallery"
                dir="ltr"
              />
            </div>
          </div>
        );

        const videoGalleryContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full pt-2">
              <h5 className="text-sm font-bold text-white mb-4">ניהול גלריית וידאו</h5>
              <div className="bg-white rounded-xl overflow-hidden p-4">
                <VideoGalleryEditor
                  config={vGalleryConf}
                  onChange={(newConf) => setConfig({ ...config, videoGallery: newConf })}
                />
              </div>
            </div>
          </div>
        );

        const videoGalleryPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <VideoGallery
              id={vGalleryConf.anchorId || "videoGallery"}
              images={vGalleryConf.images}
              videoUrl={vGalleryConf.videoUrl}
              videoType={vGalleryConf.videoType}
              effect={vGalleryConf.effect}
              backgroundColor={vGalleryConf.backgroundColor || globalSettings.backgroundColor}
            />
          </div>
        );

        return { previewNode: videoGalleryPreviewNode, contentNode: videoGalleryContentNode, designNode: videoGalleryDesignNode };

      case "imageListing":
        const imgListingConf = config.imageListing || {
          visible: true,
          images: [],
          imagesPerRow: 4,
          imagesPerRowMobile: 1,
          form: { enabled: false, fields: [], title: "" } as any,
          anchorId: "imageListing",
          backgroundColor: "#ffffff"
        };

        const imgListingDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={imgListingConf.anchorId || ""}
                onChange={(e) => setConfig({ ...config, imageListing: { ...imgListingConf, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="imageListing"
                dir="ltr"
              />
            </div>
          </div>
        );

        const imgListingContentNode = (
          <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-0 pb-8 mt-4 text-right" dir="rtl">
            <div className="w-full pt-2">
              <ImageListingEditor
                config={imgListingConf}
                onChange={(newConf) => setConfig({ ...config, imageListing: newConf })}
              />
            </div>
          </div>
        );

        const imgListingPreviewNode = (
          <div className="pointer-events-none opacity-80">
            <ImageListingSection
              id={imgListingConf.anchorId || "imageListing"}
              images={imgListingConf.images}
              imagesPerRow={imgListingConf.imagesPerRow}
              imagesPerRowMobile={imgListingConf.imagesPerRowMobile}
              form={imgListingConf.form as any}
              backgroundColor={imgListingConf.backgroundColor || globalSettings.backgroundColor}
              isEditing={true}
            />
          </div>
        );

        return { previewNode: imgListingPreviewNode, contentNode: imgListingContentNode, designNode: imgListingDesignNode };

      case "faq":
        if (!config.faq) return null;

        const faqDesignNode = (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">מזהה עוגן (ID)</label>
              <input 
                type="text" 
                value={config.faq.anchorId || ""}
                onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, anchorId: e.target.value }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
                placeholder="faq"
                dir="ltr"
              />
            </div>
            
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
              <label className="text-xs text-slate-400 font-medium">פריסה עיצובית</label>
              <select 
                value={config.faq.layout || "classic"}
                onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, layout: e.target.value as any }})}
                className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-2"
              >
                <option value="classic">קלאסי (Classic)</option>
                <option value="modern">מודרני - אפקט ריחוף (Modern)</option>
                <option value="grid">גריד - 2 עמודות (Grid)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע רקע</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.faq.backgroundColor && config.faq.backgroundColor !== "transparent" ? config.faq.backgroundColor : (globalSettings.backgroundColor || "#0e0e10")}
                    onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, backgroundColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                  />
                  <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, faq: { ...config.faq!, backgroundColor: "transparent" }})}>נקה</button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע כותרת</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.faq.titleColor || globalSettings.textColorH2 || globalSettings.textColor || "#ffffff"}
                    onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, titleColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, faq: { ...config.faq!, titleColor: "" }})}>נקה</button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">צבע תיאור</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.faq.subtitleColor || globalSettings.textColor || "#94a3b8"}
                    onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, subtitleColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, faq: { ...config.faq!, subtitleColor: "" }})}>נקה</button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-medium">טקסט שאלות</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.faq.itemTextColor || globalSettings.textColor || "#ffffff"}
                    onChange={(e) => setConfig({ ...config, faq: { ...config.faq!, itemTextColor: e.target.value }})}
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <button className="text-[10px] text-slate-400 hover:text-red-400" onClick={() => setConfig({ ...config, faq: { ...config.faq!, itemTextColor: "" }})}>נקה</button>
                </div>
              </div>
            </div>
          </div>
        );

        const faqContentNode = (
          <FaqSectionEditor
            config={config.faq}
            onUpdate={(field, val) => setConfig({ ...config, faq: { ...config.faq!, [field]: val } })}
            onUpdateItems={(items) => setConfig({ ...config, faq: { ...config.faq!, items } })}
            globalSettings={globalSettings}
          />
        );

        const faqPreviewNode = (
          <div className="pointer-events-none opacity-90">
            <FaqSection
              id={config.faq.anchorId || "faq"}
              title={config.faq.title}
              subtitle={config.faq.subtitle}
              items={config.faq.items}
              backgroundColor={config.faq.backgroundColor}
              titleColor={config.faq.titleColor}
              subtitleColor={config.faq.subtitleColor}
              itemTextColor={config.faq.itemTextColor}
              layout={config.faq.layout}
              questionTextColor={config.faq.questionTextColor}
              answerTextColor={config.faq.answerTextColor}
              activeTabBgColor={config.faq.activeTabBgColor}
              inactiveTabBgColor={config.faq.inactiveTabBgColor}
              tabBorderColor={config.faq.tabBorderColor}
              effect={config.faq.effect}
              globalSettings={globalSettings}
              isEditing={false}
            />
          </div>
        );

        return { previewNode: faqPreviewNode, contentNode: faqContentNode, designNode: faqDesignNode };

      default:
        return null;
    }
  };

  const renderSectionPreview = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        if (!config.hero || config.hero.visible === false || String(config.hero.visible) === "false") return null;
        return (
          <Hero 
            id={config.hero.anchorId || "hero"}
            title={config.hero.title}
            subtitle={config.hero.subtitle}
            description={config.hero.description}
            imageSrc={config.hero.imageSrc}
            layout={config.hero.layout}
            buttonsVisible={config.hero.buttonsVisible}
            primaryButton={config.hero.primaryButton}
            secondaryButton={config.hero.secondaryButton}
            backgroundColor={config.hero.backgroundColor || globalSettings.backgroundColor}
            titleColor={config.hero.titleColor}
            descriptionColor={config.hero.descriptionColor}
            isEditing={false}
            priority={true}
          />
        );
      case "mainContent":
        if (!config.mainContent || config.mainContent.visible === false || String(config.mainContent.visible) === "false") return null;
        return (
          <CourseBanner 
            id={config.mainContent.anchorId || "mainContent"}
            title={config.mainContent.title}
            subtitle={config.mainContent.subtitle}
            imageSrc={config.mainContent.imageSrc}
            features={config.mainContent.features}
            buttonsVisible={config.mainContent.buttonsVisible}
            primaryButton={config.mainContent.primaryButton}
            backgroundColor={config.mainContent.backgroundColor || globalSettings.backgroundColor}
            bottomStripeColor={config.mainContent.bottomStripeColor || globalSettings.secondaryColor}
          />
        );
      case "services":
        if (!config.services || config.services.visible === false || String(config.services.visible) === "false") return null;
        return (
          <ServicesGrid 
            id={config.services.anchorId || "services"}
            title={config.services.title}
            description={config.services.description}
            layout={config.services.layout} 
            columns={config.services.columns}
            columnsMobile={config.services.columnsMobile}
            effect={config.services.effect}
            items={config.services.items} 
            isEditing={false}
          />
        );
      case "community":
        if (!config.community || config.community.visible === false || String(config.community.visible) === "false") return null;
        const resolvedWhatsApp = !config.community.whatsappNumber || config.community.whatsappNumber === "972545947701"
          ? (globalSettings.contactWhatsApp || globalSettings.contactPhone || "972545947701")
          : config.community.whatsappNumber;
        return (
          <CommunitySection 
            id={config.community.anchorId || "community"}
            title={config.community.title}
            subtitle={config.community.subtitle}
            description={config.community.description}
            quote={config.community.quote}
            imageSrc={config.community.imageSrc}
            badgeTitle={config.community.badgeTitle}
            badgeSubtitle={config.community.badgeSubtitle}
            buttonText={config.community.buttonText}
            whatsappNumber={resolvedWhatsApp}
            layout={config.community.layout}
            badgeVisible={config.community.badgeVisible}
            buttonVisible={config.community.buttonVisible}
            isEditing={false}
          />
        );
      case "livePosts":
        if (!config.livePosts || config.livePosts.visible === false || String(config.livePosts.visible) === "false") return null;
        return <LivePostsGrid id={config.livePosts.anchorId || "livePosts"} layout={config.livePosts.layout} customPages={config.livePosts.customPages} title={config.livePosts.title} titleColor={config.livePosts.titleColor} description={config.livePosts.description} descriptionColor={config.livePosts.descriptionColor} />;
      case "timer":
        if (!config.timer || config.timer.visible === false || String(config.timer.visible) === "false") return null;
        return (
          <TimerSection
            id={config.timer.anchorId || "timer"}
            title={config.timer.title}
            subtitle={config.timer.subtitle}
            targetDate={config.timer.targetDate}
            layout={config.timer.layout}
            backgroundColor={config.timer.backgroundColor}
            titleColor={config.timer.titleColor}
            subtitleColor={config.timer.subtitleColor}
            boxBackgroundColor={config.timer.boxBackgroundColor}
            numberColor={config.timer.numberColor}
            labelColor={config.timer.labelColor}
            isEditing={false}
          />
        );
      case "pricing":
        if (!config.pricing || config.pricing.visible === false || String(config.pricing.visible) === "false") return null;
        return (
          <PricingSection
            id={config.pricing.anchorId || "pricing"}
            title={config.pricing.title}
            subtitle={config.pricing.subtitle}
            description={config.pricing.description}
            isEditing={false}
          />
        );
      case "richContent":
        if (!config.richContent || config.richContent.visible === false || String(config.richContent.visible) === "false") return null;
        return (
          <RichContentSection 
            id={config.richContent.anchorId || "richContent"}
            heading={config.richContent.heading}
            body={config.richContent.body}
            layout={config.richContent.layout}
            isEditing={false}
          />
        );
      case "landingSection":
        if (!config.landingSection || config.landingSection.visible === false || String(config.landingSection.visible) === "false") return null;
        return (
          <Suspense fallback={null}>
            <LandingSection
              id={config.landingSection.anchorId || "landingSection"}
              title={config.landingSection.title}
              subtitle={config.landingSection.subtitle}
              description={config.landingSection.description}
              imageSrc={config.landingSection.imageSrc}
              form={config.landingSection.form}
              theme={globalSettings.theme}
              layout={config.landingSection.layout}
              formMode={config.landingSection.formMode}
              buttonText={config.landingSection.buttonText}
              isEditing={false}
            />
          </Suspense>
        );
      case "videoGallery":
        const vGalleryPrevConf = config.videoGallery || {
          visible: true,
          images: [],
          videoUrl: "",
          videoType: "auto",
          effect: "fade",
          anchorId: "videoGallery",
          backgroundColor: "#0f172a"
        };
        if (!vGalleryPrevConf.visible) return null;
        return (
          <VideoGallery
            id={vGalleryPrevConf.anchorId || "videoGallery"}
            images={vGalleryPrevConf.images}
            videoUrl={vGalleryPrevConf.videoUrl}
            videoType={vGalleryPrevConf.videoType}
            effect={vGalleryPrevConf.effect}
            backgroundColor={vGalleryPrevConf.backgroundColor || globalSettings.backgroundColor}
          />
        );
      case "imageListing":
        if (!config.imageListing || config.imageListing.visible === false || String(config.imageListing.visible) === "false") return null;
        return (
          <ImageListingSection
            id={config.imageListing.anchorId || "imageListing"}
            images={config.imageListing.images}
            imagesPerRow={config.imageListing.imagesPerRow}
            form={config.imageListing.form}
            backgroundColor={config.imageListing.backgroundColor || globalSettings.backgroundColor}
            isEditing={false}
          />
        );
      case "faq":
        if (!config.faq || config.faq.visible === false || String(config.faq.visible) === "false") return null;
        return (
          <FaqSection
            id={config.faq.anchorId || "faq"}
            title={config.faq.title}
            subtitle={config.faq.subtitle}
            items={config.faq.items}
            backgroundColor={config.faq.backgroundColor}
            titleColor={config.faq.titleColor}
            subtitleColor={config.faq.subtitleColor}
            itemTextColor={config.faq.itemTextColor}
            layout={config.faq.layout}
            questionTextColor={config.faq.questionTextColor}
            answerTextColor={config.faq.answerTextColor}
            activeTabBgColor={config.faq.activeTabBgColor}
            inactiveTabBgColor={config.faq.inactiveTabBgColor}
            tabBorderColor={config.faq.tabBorderColor}
            effect={config.faq.effect}
            globalSettings={globalSettings}
            isEditing={false}
          />
        );
      default:
        return null;
    }
  };

  const colorThemes = [
    { value: "navy", label: "כחול נייבי", class: "bg-[#0f172a]" },
    { value: "emerald", label: "ירוק ברקת", class: "bg-[#047857]" },
    { value: "rose", label: "אדום ורד", class: "bg-[#be123c]" },
    { value: "violet", label: "סגול מלכותי", class: "bg-[#6d28d9]" },
    { value: "charcoal", label: "פחם אלגנטי", class: "bg-[#374151]" },
  ];

  const customStyle = {
    ...(globalSettings.primaryColor ? { '--primary': globalSettings.primaryColor } : {}),
    ...(globalSettings.secondaryColor ? { '--secondary': globalSettings.secondaryColor } : {}),
    ...(globalSettings.backgroundColor ? { '--background': globalSettings.backgroundColor } : {}),
    ...(globalSettings.textColor ? { '--foreground': globalSettings.textColor } : {}),
    ...(globalSettings.textColorH1 ? { '--heading-1': globalSettings.textColorH1 } : {}),
    ...(globalSettings.textColorH2 ? { '--heading-2': globalSettings.textColorH2 } : {}),
    ...(globalSettings.textColorH3 ? { '--heading-3': globalSettings.textColorH3 } : {}),
    ...(globalSettings.buttonBgColor ? { '--button-bg': globalSettings.buttonBgColor } : {}),
    ...(globalSettings.buttonTextColor ? { '--button-text': globalSettings.buttonTextColor } : {}),
  } as React.CSSProperties;

  const resetStyle = { 
    '--primary': '', 
    '--secondary': '', 
    '--background': '', 
    '--foreground': '',
    '--heading-1': '',
    '--heading-2': '',
    '--heading-3': '',
    '--button-bg': '',
    '--button-text': '' 
  } as React.CSSProperties;

  return (
    <div className={cn("flex flex-col min-h-screen", globalSettings.theme ? `theme-${globalSettings.theme}` : "theme-navy")} style={customStyle}>
      {((config as any).isHeaderVisible ?? true) && (
        <Navbar 
          layout={globalSettings.headerLayout} 
          logoUrl={globalSettings.siteLogoUrl} 
          navLinks={globalSettings.navLinks}
          companyName={globalSettings.companyName}
          slogan={globalSettings.slogan}
        />
      )}
      
      {/* SEO Editor Panel at Top */}
      {isSeoPanelOpen && (
        <div className="bg-slate-50 border-b shadow-inner p-6 animate-in slide-in-from-top-4 duration-300 relative z-[200]" dir="rtl" style={resetStyle}>
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Search className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">הגדרות קידום אתרים (SEO)</h2>
                  <p className="text-xs text-slate-500">עריכת התגיות שמופיעות בגוגל וברשתות חברתיות</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleGenerateSeo} 
                  disabled={isGeneratingSeo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 cursor-pointer"
                >
                  {isGeneratingSeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  צור בעזרת AI
                </Button>
                <button 
                  onClick={() => setIsSeoPanelOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Fields Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">כותרת מטא (Title)</label>
                  <input
                    type="text"
                    value={config.seo?.title || ""}
                    onChange={(e) => setConfig({ ...config, seo: { ...config.seo, description: config.seo?.description || "", title: e.target.value } })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder='לדוגמה: מחולל הקהילות | המקום שלך באהבה'
                  />
                  <p className="text-[10px] text-slate-400">מומלץ עד 60 תווים</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">תיאור מטא (Description)</label>
                  <textarea
                    value={config.seo?.description || ""}
                    onChange={(e) => setConfig({ ...config, seo: { ...config.seo, title: config.seo?.title || "", description: e.target.value } })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder="תיאור קצר ומושך שיופיע מתחת לכותרת בתוצאות החיפוש..."
                  />
                  <p className="text-[10px] text-slate-400">מומלץ 150-160 תווים</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">מילות מפתח (Keywords)</label>
                  <input
                    type="text"
                    value={config.seo?.keywords || ""}
                    onChange={(e) => setConfig({ ...config, seo: { ...config.seo, title: config.seo?.title || "", description: config.seo?.description || "", keywords: e.target.value } })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder='הפרד בפסיקים (למשל: קהילה, ייעוץ, פעילות חברתית)'
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">תמונת שיתוף (Open Graph Image)</label>
                  <p className="text-xs text-slate-500 mb-2">תמונה זו תופיע בשיתוף העמוד בווצאפ וברשתות החברתיות</p>
                  <div className="p-2 border rounded-xl bg-white">
                    <ImageUpload 
                      currentImage={config.seo?.image || ""}
                      onSelect={(url) => setConfig({ ...config, seo: { ...config.seo, title: config.seo?.title || "", description: config.seo?.description || "", image: url } })}
                      preserveFormat={true}
                    />
                    <Button 
                      onClick={handleOpenPromptModal} 
                      disabled={isGeneratingSeoImage}
                      variant="outline"
                      className="w-full mt-2 flex items-center justify-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      {isGeneratingSeoImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      צור תמונת שיתוף בעזרת בינה מלאכותית
                    </Button>
                  </div>
                </div>
              </div>

              {/* SERP Preview */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-2">תצוגה מקדימה בגוגל (SERP)</h3>
                <div className="max-w-[600px] text-right" dir="rtl">
                  <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border">
                      {globalSettings.siteLogoUrl ? (
                        <img src={globalSettings.siteLogoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <span className="block text-xs leading-none">yoursite.com</span>
                      <span className="text-[10px] text-slate-500">https://www.yoursite.com</span>
                    </div>
                  </div>
                  <h4 className="text-xl text-[#1a0dab] hover:underline cursor-pointer font-medium leading-tight truncate">
                    {config.seo?.title || "כותרת העמוד תופיע כאן"}
                  </h4>
                  <p className="text-sm text-[#4d5156] mt-1 line-clamp-2">
                    {config.seo?.description || "תיאור העמוד יופיע כאן. תיאור זה חשוב כדי לשכנע גולשים להיכנס לאתר שלך מתוך תוצאות החיפוש."}
                  </p>
                </div>
                
                {config.seo?.image && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="text-xs font-bold text-slate-500 mb-2">תצוגה מקדימה לשיתוף בוואטסאפ:</h3>
                    <div className="max-w-[300px] border rounded-xl overflow-hidden bg-[#f0f2f5]">
                      <img src={config.seo.image} className="w-full h-32 object-cover" />
                      <div className="p-3 bg-white">
                        <h4 className="text-sm font-bold truncate">{config.seo?.title || "כותרת"}</h4>
                        <p className="text-xs text-slate-500 truncate mt-1">{config.seo?.description || "תיאור"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Admin Floating Control Dashboard */}
      <div className="fixed bottom-24 md:bottom-6 left-6 z-[100] flex flex-col gap-2.5" dir="ltr">
        <Button 
          variant="primary" 
          size="lg" 
          className={cn(
            "rounded-full shadow-2xl h-14 w-14 p-0 text-white flex items-center justify-center transition-all duration-300 cursor-pointer relative group",
            hasGlobalChanges 
              ? "bg-indigo-600 hover:bg-indigo-700 scale-110 shadow-[0_10px_40px_rgba(79,70,229,0.5)] border border-indigo-400/30" 
              : "bg-green-600 hover:bg-green-700 scale-100"
          )}
          onClick={() => handleSave(true)}
          disabled={saving}
          title={hasGlobalChanges ? "שמור שינויים" : "הכל שמור"}
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Save className="w-6 h-6" />
              {hasGlobalChanges && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
              )}
            </>
          )}
        </Button>

        <Button 
          variant="outline" 
          size="lg" 
          className="hidden md:flex rounded-full shadow-2xl bg-white hover:bg-slate-100 text-slate-700 h-14 w-14 p-0 border flex items-center justify-center transition-all duration-300 cursor-pointer"
          onClick={handleOpenDrawer}
          title="הגדרות"
        >
          <Settings2 className="w-6 h-6" />
        </Button>

        <Button 
          variant="outline" 
          size="lg" 
          className="hidden md:flex rounded-full shadow-2xl bg-white hover:bg-slate-100 text-slate-700 h-14 w-14 p-0 border flex items-center justify-center transition-all duration-300 cursor-pointer"
          onClick={() => setActiveMobileTab(activeMobileTab === "preview" ? "edit" : "preview")}
          title={activeMobileTab === "preview" ? "חזור לעריכה" : "תצוגה מקדימה"}
        >
          {activeMobileTab === "preview" ? <Edit3 className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full shadow-2xl bg-white hover:bg-slate-100 text-slate-700 h-14 w-14 p-0 border flex items-center justify-center transition-all duration-300 cursor-pointer"
          onClick={() => {
            sessionStorage.setItem("home_editor_scroll", window.scrollY.toString());
            setConfig(initialConfig);
            if (initialGlobalSettings) setGlobalSettings(initialGlobalSettings);
            setIsEditing(false);
          }}
          title="ביטול שינויים"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Side Settings Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[240] bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} style={resetStyle} />
      )}
      
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-[250] w-full max-w-lg bg-white border-r shadow-2xl transition-transform duration-300 transform flex flex-col text-right",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        dir="rtl"
        style={resetStyle}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">עריכת עיצוב ותפריטים</h3>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(false)} 
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4">
          
          {/* Accordion Group 1: Logo & Alignment */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveAccordion(activeAccordion === "logo" ? null : "logo")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-700 text-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                לוגו ומיקום הלוגו (הדר)
              </span>
              {activeAccordion === "logo" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeAccordion === "logo" && (
              <div className="p-5 bg-white space-y-5 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">קובץ לוגו האתר</label>
                  {/* Container ensures enough spacing for ImageUpload popup and displays fully */}
                  <div className="p-2 border border-slate-100 rounded-xl bg-slate-50/30">
                    <ImageUpload 
                      currentImage={globalSettings.siteLogoUrl}
                      onSelect={(url) => setGlobalSettings({ ...globalSettings, siteLogoUrl: url })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">מיקום הלוגו בתפריט העליון</label>
                  {/* Toggle button icons right, center, left */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGlobalSettings({ ...globalSettings, headerLayout: "classic" })}
                      className={cn(
                        "flex-1 py-3 px-3 border rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                        globalSettings.headerLayout === "classic" 
                          ? "border-secondary bg-secondary/5 text-secondary shadow-sm" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <AlignRight className="h-5 w-5" />
                      <span>ימין (קלאסי)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setGlobalSettings({ ...globalSettings, headerLayout: "center" })}
                      className={cn(
                        "flex-1 py-3 px-3 border rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                        globalSettings.headerLayout === "center" 
                          ? "border-secondary bg-secondary/5 text-secondary shadow-sm" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <AlignCenter className="h-5 w-5" />
                      <span>מרכז</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalSettings({ ...globalSettings, headerLayout: "left" })}
                      className={cn(
                        "flex-1 py-3 px-3 border rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                        globalSettings.headerLayout === "left" 
                          ? "border-secondary bg-secondary/5 text-secondary shadow-sm" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <AlignLeft className="h-5 w-5" />
                      <span>שמאל</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accordion Group 2: Color Palette */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveAccordion(activeAccordion === "theme" ? null : "theme")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-700 text-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-600" />
                צבעי עיצוב (פלטה)
              </span>
              {activeAccordion === "theme" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeAccordion === "theme" && (
              <div className="p-5 bg-white space-y-3 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-slate-600 block">בחר פלטת צבעים גלובלית</label>
                <div className="flex flex-col gap-2">
                  {colorThemes.map((t) => {
                    const isSelected = globalSettings.theme === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setGlobalSettings({ 
                          ...globalSettings, 
                          theme: t.value as any,
                          primaryColor: "",
                          secondaryColor: "",
                          backgroundColor: "",
                          textColor: "",
                          textColorH1: "",
                          textColorH2: "",
                          textColorH3: "",
                          buttonBgColor: "",
                          buttonTextColor: ""
                        })}
                        className={cn(
                          "w-full p-3 rounded-xl border flex items-center justify-between text-sm font-semibold transition-all cursor-pointer",
                          isSelected 
                            ? "border-secondary bg-secondary/5 text-secondary shadow-sm" 
                            : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className={cn("h-4 w-4 rounded-full shadow-inner", t.class)} />
                          {t.label}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-secondary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Accordion Group 2.5: Custom Global Colors */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveAccordion(activeAccordion === "globalColors" ? null : "globalColors")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-700 text-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-600" />
                צבעים גלובליים מותאמים
              </span>
              {activeAccordion === "globalColors" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeAccordion === "globalColors" && (
              <div className="p-5 bg-white space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">צבע ראשי (Primary)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 p-1 border rounded cursor-pointer" 
                        value={globalSettings.primaryColor || "#d8435d"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, primaryColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 border rounded-lg p-2 text-left uppercase text-sm" dir="ltr"
                        value={globalSettings.primaryColor || "#d8435d"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, primaryColor: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">צבע משני (Secondary)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 p-1 border rounded cursor-pointer" 
                        value={globalSettings.secondaryColor || "#10354b"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, secondaryColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 border rounded-lg p-2 text-left uppercase text-sm" dir="ltr"
                        value={globalSettings.secondaryColor || "#10354b"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, secondaryColor: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">צבע רקע (Background)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 p-1 border rounded cursor-pointer" 
                        value={globalSettings.backgroundColor || "#f8f9fa"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, backgroundColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 border rounded-lg p-2 text-left uppercase text-sm" dir="ltr"
                        value={globalSettings.backgroundColor || "#f8f9fa"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, backgroundColor: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">צבע טקסט (Text)</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 p-1 border rounded cursor-pointer" 
                        value={globalSettings.textColor || "#1f2937"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, textColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 border rounded-lg p-2 text-left uppercase text-sm" dir="ltr"
                        value={globalSettings.textColor || "#1f2937"} 
                        onChange={(e) => setGlobalSettings({ ...globalSettings, textColor: e.target.value })} 
                      />
                    </div>
                  </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (initialGlobalSettings) {
                          setGlobalSettings({ ...initialGlobalSettings });
                        } else {
                          setGlobalSettings({ siteLogoUrl: "", headerLayout: "classic", theme: "navy", navLinks: [] } as any);
                        }
                      }}
                      className="w-full bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    >
                      אפס צבעי עמוד לפי הגדרות משתמש
                    </Button>
                  </div>
                </div>
            )}
          </div>

          {/* Accordion Group 3: Main Menu Editor */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveAccordion(activeAccordion === "navigation" ? null : "navigation")}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-700 text-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-indigo-600" />
                עורך תפריט ניווט ראשי
              </span>
              {activeAccordion === "navigation" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeAccordion === "navigation" && (
              <div className="p-5 bg-white space-y-4 animate-in fade-in duration-200">
                {isLoadingPages ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    <p className="text-xs font-bold text-slate-400">טוען את עמודי האתר לעריכה...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">פריטי תפריט ({globalSettings.navLinks?.length || 0})</span>
                      <Button
                        type="button"
                        onClick={handleAddLink}
                        variant="outline"
                        className="py-1 px-3 border border-secondary/20 hover:border-secondary/50 text-secondary rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        הוסף קישור
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(globalSettings.navLinks || []).map((link, idx) => (
                        <div key={idx} className="p-3 border rounded-xl bg-slate-50/50 space-y-2 relative group/link">
                          {/* Arrange controls */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-indigo-600">פריט #{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveLink(idx, 'up')}
                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 cursor-pointer"
                                title="הזז למעלה"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === (globalSettings.navLinks || []).length - 1}
                                onClick={() => handleMoveLink(idx, 'down')}
                                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 cursor-pointer"
                                title="הזז למטה"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(idx)}
                                className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                                title="מחק קישור"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Form fields */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">כותרת הקישור</label>
                              <input
                                type="text"
                                value={link.name}
                                onChange={(e) => handleUpdateLinkName(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary"
                                placeholder="לדוגמה: שיעורים"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500">עמוד יעד</label>
                              <select
                                value={link.href}
                                onChange={(e) => handleUpdateLinkHref(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary font-medium cursor-pointer"
                              >
                                <optgroup label="עמודים">
                                  <option value="/">עמוד הבית (בית)</option>
                                  {sitePages.map((page: any) => (
                                    <option key={page.id} value={page.url}>
                                      {page.title} ({page.url})
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="עוגנים בעמוד הבית">
                                  {availableAnchors.map(anchor => (
                                    <option key={anchor.id} value={`/#${anchor.id}`}>
                                      {anchor.label} (/#{anchor.id})
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="אחר">
                                  {/* Allow typing custom link path by matching option value */}
                                  {!sitePages.some(p => p.url === link.href) && !availableAnchors.some(a => `/#${a.id}` === link.href) && link.href !== "/" && (
                                    <option value={link.href}>קישור מותאם: {link.href}</option>
                                  )}
                                  <option value="/custom">-- הגדר קישור ידנית --</option>
                                </optgroup>
                              </select>
                            </div>
                          </div>

                          {/* Fallback to text input if manually entering custom path */}
                          {(link.href === "/custom" || (!sitePages.some(p => p.url === link.href) && !availableAnchors.some(a => `/#${a.id}` === link.href) && link.href !== "/")) && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                              <label className="text-[10px] font-bold text-slate-500">נתיב קישור ידני (URL/Path)</label>
                              <input
                                type="text"
                                value={link.href === "/custom" ? "" : link.href}
                                onChange={(e) => handleUpdateLinkHref(idx, e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-secondary/50"
                                placeholder="לדוגמה: /custom-path או http://..."
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {(globalSettings.navLinks || []).length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400 font-medium">אין קישורים בתפריט. הוסף קישור חדש!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Accordion Group 4: Contact Widget Editor */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveAccordion(activeAccordion === "contactWidget" ? null : "contactWidget")}
              className="w-full p-4 bg-slate-55 hover:bg-slate-100/80 flex items-center justify-between font-bold text-slate-700 text-sm cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-indigo-650" />
                פרטי קשר של כפתור 'אנחנו כאן'
              </span>
              {activeAccordion === "contactWidget" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {activeAccordion === "contactWidget" && (
              <div className="p-5 bg-white space-y-4 animate-in fade-in duration-200 text-right">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">מספר טלפון לקשר / וואטסאפ</label>
                  <input
                    type="text"
                    value={globalSettings.contactPhone || ""}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                    placeholder="למשל: 0545947701"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">כתובת אימייל</label>
                  <input
                    type="email"
                    value={globalSettings.contactEmail || ""}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                    placeholder="למשל: email@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">קישור לפייסבוק</label>
                  <input
                    type="text"
                    value={globalSettings.contactFacebook || ""}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, contactFacebook: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                    placeholder="קישור מלא לפרופיל / דף פייסבוק"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">כתובת פיזית (עבור וויז)</label>
                  <input
                    type="text"
                    value={globalSettings.contactAddress || ""}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, contactAddress: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                    placeholder="למשל: יצחק שדה 2, אזור"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Accordion Group 5: SEO Button */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setIsSeoPanelOpen(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-between font-bold text-indigo-700 text-sm cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                הגדרות קידום אתרים (SEO)
              </span>
            </button>
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t bg-slate-50 flex gap-2">
          <Button
            onClick={() => setIsDrawerOpen(false)}
            variant="primary"
            className="flex-grow py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Check className="h-5 w-5" />
            אישור וסגירה
          </Button>
        </div>
      </div>

      <main className="flex-grow pt-24 pb-20 md:pb-0">
        {/* 1. Preview Tab (Desktop & Mobile) */}
        {activeMobileTab === "preview" && (
          <div className="flex flex-col w-full">
            {currentSectionOrder.map((sectionId) => {
              const isMobileHidden = config.mobileHiddenSections?.includes(sectionId) || false;
              // On desktop we might want to still show it or apply the desktop visibility logic if any
              if (isMobileHidden) return null;
              return (
                <div key={sectionId}>
                  {renderSectionPreview(sectionId)}
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Mobile Reorder Tab (Removed/Merged with edit) */}

        {/* 3. Accordion-Style Single Active Section Editor Group (Visible on Desktop, or when edit tab is active on Mobile) */}
        <div className={cn("w-full flex-col", activeMobileTab === "edit" ? "flex" : "hidden")}>
          <div className="max-w-5xl mx-auto w-full p-4 space-y-4" dir="rtl">
            <div className="bg-slate-900/40 backdrop-blur border border-white/5 rounded-3xl p-4 flex items-center justify-between text-right mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">ממשק עריכת אזורי עמוד הבית</h3>
                <p className="text-[11px] text-slate-400">בחר אזור לעריכה. רק אזור אחד פתוח בכל פעם למניעת עומס ולחוויית משתמש מושלמת.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenDrawer}
                  className="flex items-center gap-2 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/30 px-3 py-1.5 rounded-xl transition-all text-xs font-bold"
                  title="הגדרות אתר וצבעים גלובליים"
                >
                  <Settings2 className="h-4 w-4" />
                  הגדרות כלליות
                </button>
                <div className="flex items-center gap-2 bg-black/30 border border-white/5 px-3 py-1.5 rounded-xl hidden sm:flex">
                  <span className="text-xs font-semibold text-slate-350">הצג תפריט עליון:</span>
                  <input
                    type="checkbox"
                    checked={globalSettings.headerLayout !== "classic" ? true : (config as any).isHeaderVisible ?? true}
                    onChange={(e) => {
                      setConfig(prev => ({ ...prev, isHeaderVisible: e.target.checked } as any));
                    }}
                    className="rounded border-white/10 text-purple-500 bg-slate-950/50 cursor-pointer h-4 w-4"
                  />
                </div>
              </div>
            </div>

            <Reorder.Group 
              axis="y" 
              values={currentSectionOrder} 
              onReorder={(newOrder) => setConfig({ ...config, sectionOrder: newOrder })}
              className="space-y-4"
            >
              {currentSectionOrder.map((sectionId, index) => {
                const isFirst = index === 0;
                const isLast = index === currentSectionOrder.length - 1;
                const isMobileHidden = config.mobileHiddenSections?.includes(sectionId) || false;
                const sectionLabels: Record<string, string> = {
                  hero: "אזור ראשי (Hero)",
                  mainContent: "תוכן מרכזי",
                  services: "שירותים",
                  community: "קהילה",
                  livePosts: "עדכונים ופוסטים",
                  timer: "טיימר",
                  richContent: "אודות / תוכן מעוצב",
                  landingSection: "קמפיין נחיתה / טופס",
                  pricing: "חבילות ומחירונים",
                  faq: "שאלות ותשובות (FAQ)"
                };
                
                const isOpen = (config as any).activeEditSection === sectionId;
                const isSectionChanged = (config as any).lastSavedSectionData?.[sectionId] !== JSON.stringify(config[sectionId as keyof HomePageConfig]);

                return (
                  <SortableSectionItem
                    key={sectionId}
                    sectionId={sectionId}
                    isMobileHidden={isMobileHidden}
                    isVisible={(config[sectionId as keyof typeof config] as any)?.visible ?? true}
                    sectionLabel={sectionLabels[sectionId]}
                    isOpen={isOpen}
                    isSectionChanged={isSectionChanged}
                    onToggleMobile={() => {
                      const current = config.mobileHiddenSections || [];
                      const updated = current.includes(sectionId)
                        ? current.filter(id => id !== sectionId)
                        : [...current, sectionId];
                      setConfig({ ...config, mobileHiddenSections: updated });
                    }}
                    onToggleVisibility={() => {
                      const currentVisible = (config[sectionId as keyof typeof config] as any)?.visible ?? true;
                      updateSectionVisibility(sectionId as any, !currentVisible);
                    }}
                    onToggleOpen={() => {
                      const activeSection = (config as any).activeEditSection;
                      if (activeSection && activeSection !== sectionId) {
                        const activeChanged = (config as any).lastSavedSectionData?.[activeSection] !== JSON.stringify(config[activeSection as keyof HomePageConfig]);
                        if (activeChanged) {
                          if (!confirm("ישנם שינויים שלא נשמרו באזור הנוכחי. האם ברצונך לעבור בכל זאת ולאבד אותם?")) {
                            return;
                          }
                        }
                      }
                      
                      const nextSection = isOpen ? null : sectionId;
                      setConfig(prev => ({
                        ...prev,
                        activeEditSection: nextSection,
                        lastSavedSectionData: {
                          ...(prev as any).lastSavedSectionData,
                          [sectionId]: JSON.stringify(prev[sectionId as keyof HomePageConfig])
                        }
                      } as any));

                      if (nextSection) {
                        document.body.classList.add("overflow-hidden");
                      } else {
                        document.body.classList.remove("overflow-hidden");
                      }
                    }}
                    onSaveLocal={async () => {
                      await handleSave(false);
                      // Update the lastSavedSectionData for this specific section immediately
                      // so the "save" icon disappears and the orange dot disappears
                      setConfig(prev => ({
                        ...prev,
                        lastSavedSectionData: {
                          ...(prev as any).lastSavedSectionData,
                          [sectionId]: JSON.stringify(prev[sectionId as keyof HomePageConfig])
                        }
                      } as any));
                      // Optional visual feedback instead of an annoying alert
                      const btn = document.activeElement as HTMLElement;
                      if (btn) {
                        const originalColor = btn.style.backgroundColor;
                        btn.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'; // green
                        btn.style.color = '#4ade80';
                        setTimeout(() => {
                          btn.style.backgroundColor = originalColor;
                          btn.style.color = '';
                        }, 1000);
                      }
                    }}
                    onCancelLocal={() => {
                      setConfig(prev => ({ ...prev, activeEditSection: null }));
                    }}
                    onMoveUp={() => {
                      if (isFirst) return;
                      const newOrder = [...currentSectionOrder];
                      const temp = newOrder[index - 1];
                      newOrder[index - 1] = newOrder[index];
                      newOrder[index] = temp;
                      setConfig({ ...config, sectionOrder: newOrder });
                    }}
                    onMoveDown={() => {
                      if (isLast) return;
                      const newOrder = [...currentSectionOrder];
                      const temp = newOrder[index + 1];
                      newOrder[index + 1] = newOrder[index];
                      newOrder[index] = temp;
                      setConfig({ ...config, sectionOrder: newOrder });
                    }}
                    isFirst={isFirst}
                    isLast={isLast}
                    isSaving={saving}
                    previewNode={renderSection(sectionId)?.previewNode}
                    contentNode={renderSection(sectionId)?.contentNode}
                    designNode={renderSection(sectionId)?.designNode}
                  />
                );
              })}
            </Reorder.Group>
          </div>
        </div>
      </main>

      <Footer />

      {/* Mobile-Only Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-[#0c0c0e]/95 border-t border-white/5 h-16 flex items-center justify-around z-[999] shadow-2xl backdrop-blur-md" dir="rtl">
        <button
          onClick={() => setActiveMobileTab("edit")}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
            activeMobileTab === "edit" ? "text-purple-400" : "text-slate-400"
          )}
        >
          <Edit3 className="w-4.5 h-4.5" />
          <span>עריכת רכיבים</span>
        </button>
        
        <button
          onClick={() => setActiveMobileTab("preview")}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
            activeMobileTab === "preview" ? "text-purple-400" : "text-slate-400"
          )}
        >
          <Globe className="w-4.5 h-4.5" />
          <span>תצוגה מקדימה</span>
        </button>
        
        <button
          onClick={handleOpenDrawer}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
            isDrawerOpen ? "text-purple-400" : "text-slate-400"
          )}
        >
          <Settings2 className="w-4.5 h-4.5" />
          <span>הגדרות</span>
        </button>
      </div>

      {/* Image Prompt Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" dir="rtl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ערוך פרומפט ליצירת תמונה</h3>
            <p className="text-sm text-slate-500 mb-4">
              ערוך את הטקסט כדי לתאר במדויק את התמונה שתרצה לקבל.
            </p>
            <textarea
              value={customImagePrompt}
              onChange={(e) => setCustomImagePrompt(e.target.value)}
              className="w-full h-32 px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              dir="ltr"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsPromptModalOpen(false)}>ביטול</Button>
              <Button onClick={handleGenerateSeoImage} disabled={isGeneratingSeoImage}>
                {isGeneratingSeoImage ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Sparkles className="w-4 h-4 ml-2" />}
                צור תמונה
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
