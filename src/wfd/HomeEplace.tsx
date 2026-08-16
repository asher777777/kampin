"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings2, 
  Image as ImageIcon, 
  Palette, 
  Globe, 
  Save, 
  LayoutTemplate,
  Monitor,
  Smartphone,
  Loader2,
  Eye,
  LayoutGrid,
  CreditCard,
  Rows,
  Columns,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  MonitorPlay,
  FileText,
  Maximize
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { savePageConfig, getPageConfig, getAllSitePages } from "@/features/home/actions";
import { WfdHero } from "@/wfd/components/WfdHero";

// Types based on the user's requirements for page settings
interface GlobalColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

interface PageData {
  slug: string;
  title: string;
  pageGoal?: string;
  description: string;
  globalColors: GlobalColors;
  seo: {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
  };
  hero: any;
}

const DEFAULT_PAGE_DATA: PageData = {
  slug: "",
  title: "",
  pageGoal: "",
  description: "",
  globalColors: {
    primary: "#3b82f6",
    secondary: "#10b981",
    background: "#ffffff",
    text: "#111827",
  },
  seo: {
    title: "",
    description: "",
    image: "",
  },
  hero: {
    title: "כותרת העמוד תופיע כאן",
    subtitle: "כותרת משנה",
    description: "תיאור העמוד יופיע כאן, תוכל לשנות אותו בהגדרות צד ימין.",
    imageSrc: "/placeholder.png",
    layout: "fz",
    buttonsVisible: true,
    primaryButton: { text: "Click Me", link: "/services" },
    secondaryButton: { text: "צור קשר", link: "/contact" },
  }
};

export default function HomeEplace() {
  const [pageData, setPageData] = useState<PageData>(DEFAULT_PAGE_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "widgets">("settings");
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePageDataChange = (field: keyof PageData, value: any) => {
    setPageData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSeoChange = (field: keyof PageData["seo"], value: string) => {
    setPageData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value,
      },
    }));
  };

  const handleColorChange = (field: keyof GlobalColors, value: string) => {
    setPageData((prev) => ({
      ...prev,
      globalColors: {
        ...prev.globalColors,
        [field]: value,
      },
    }));
  };

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  useEffect(() => {
    if (!isDraggingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      // In RTL, sidebar is on the right.
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsDraggingSidebar(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSidebar]);

  const [existingPages, setExistingPages] = useState<any[]>([]);

  useEffect(() => {
    getAllSitePages().then(setExistingPages).catch(console.error);
  }, []);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow English letters, numbers, and dashes
    const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    handlePageDataChange("slug", val);
  };

  const handleSave = async () => {
    if (!pageData.slug) {
      alert("יש להזין נתיב (Slug) לעמוד באנגלית בלבד לפני השמירה");
      return;
    }
    setIsSaving(true);
    try {
      await savePageConfig("landing", pageData.slug, {
        builderVersion: "v2",
        seo: pageData.seo,
        hero: pageData.hero,
        pageSettings: {
          globalColors: pageData.globalColors,
          title: pageData.title,
          pageGoal: pageData.pageGoal,
          description: pageData.description
        }
      });
      alert("נשמר בהצלחה!");
    } catch (err: any) {
      alert("שגיאה בשמירה: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadPageData = async (slugToLoad: string) => {
    if (!slugToLoad) {
      alert("יש להזין נתיב (Slug) כדי לטעון עמוד");
      return;
    }
    setIsLoading(true);
    try {
      const data = await getPageConfig("landing", slugToLoad);
      if (data) {
        setPageData((prev) => ({
          ...prev,
          slug: slugToLoad,
          title: data.pageSettings?.title || data.hero?.title || "",
          pageGoal: data.pageSettings?.pageGoal || data.hero?.subtitle || "",
          description: data.pageSettings?.description || data.hero?.description || "",
          globalColors: data.pageSettings?.globalColors || prev.globalColors,
          seo: data.seo || { title: "", description: "", image: "" },
          hero: data.hero || prev.hero,
        }));
        // alert("העמוד נטען בהצלחה!");
      } else {
        alert("לא נמצא עמוד עם נתיב זה, נתונים נוכחיים יישמרו כעמוד חדש.");
      }
    } catch (err: any) {
      alert("שגיאה בטעינת העמוד: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (!pageData.slug) {
      alert("יש להזין נתיב (Slug) כדי לצפות בתצוגה המקדימה");
      return;
    }
    window.open(`/${pageData.slug}?preview=true&t=${Date.now()}`, "_blank");
  };

  return (
    <div dir="rtl" className="flex h-screen w-full bg-[#0e0e10] text-white overflow-hidden font-sans">
      
      {/* Sidebar - Settings & Widgets */}
      <aside 
        style={{ width: sidebarWidth }}
        className="bg-[#181818] border-e border-white/10 flex flex-col shrink-0 relative z-10 shadow-2xl"
      >
        {/* Resize Handle */}
        <div 
          className="absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-50 flex items-center justify-center transition-colors group/resizer"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSidebar(true);
          }}
        >
          <div className="w-0.5 h-8 bg-white/20 rounded-full group-hover/resizer:bg-white/80" />
        </div>
        
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111]">
          <h2 className="font-bold text-lg text-white">בונה עמודים</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePreview}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors flex items-center justify-center gap-2"
              title="תצוגה מקדימה"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg p-2 transition-colors flex items-center justify-center gap-2"
              title="שמירת עמוד"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              activeTab === "settings" ? "bg-white/5 text-white border-b-2 border-indigo-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings2 className="w-4 h-4" />
            הגדרות עמוד
          </button>
          <button
            onClick={() => setActiveTab("widgets")}
            className={cn(
              "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              activeTab === "widgets" ? "bg-white/5 text-white border-b-2 border-indigo-500" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <LayoutTemplate className="w-4 h-4" />
            ווידג'טים
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {activeTab === "settings" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  הגדרות כלליות
                </h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">טעינת עמוד קיים</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-[#202020] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                      onChange={(e) => {
                        if (e.target.value) {
                          loadPageData(e.target.value);
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>בחר עמוד לטעינה...</option>
                      {existingPages.filter(p => p.url.startsWith('/landing/')).map(p => (
                        <option key={p.id} value={p.id}>{p.title || p.id} ({p.id})</option>
                      ))}
                    </select>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin my-auto" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">נתיב העמוד (Slug) הנוכחי</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={pageData.slug}
                      onChange={handleSlugChange}
                      placeholder="my-new-page"
                      className="flex-1 w-full bg-[#202020] border border-white/10 rounded-lg p-2.5 text-sm text-left text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Global Colors */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-pink-400 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  צבעים גלובליים
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">צבע ראשי</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={pageData.globalColors.primary}
                        onChange={(e) => handleColorChange("primary", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span dir="ltr" className="text-xs text-gray-500 uppercase">{pageData.globalColors.primary}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">צבע משני</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={pageData.globalColors.secondary}
                        onChange={(e) => handleColorChange("secondary", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span dir="ltr" className="text-xs text-gray-500 uppercase">{pageData.globalColors.secondary}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">צבע רקע</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={pageData.globalColors.background}
                        onChange={(e) => handleColorChange("background", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span dir="ltr" className="text-xs text-gray-500 uppercase">{pageData.globalColors.background}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">צבע טקסט</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={pageData.globalColors.text}
                        onChange={(e) => handleColorChange("text", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span dir="ltr" className="text-xs text-gray-500 uppercase">{pageData.globalColors.text}</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-white/10" />

              {/* SEO Settings */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  הגדרות SEO
                </h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">כותרת מטא (Meta Title)</label>
                  <input
                    type="text"
                    value={pageData.seo.title}
                    onChange={(e) => handleSeoChange("title", e.target.value)}
                    placeholder="ברירת מחדל: כותרת העמוד"
                    className="w-full bg-[#202020] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">תיאור מטא (Meta Description)</label>
                  <textarea
                    value={pageData.seo.description}
                    onChange={(e) => handleSeoChange("description", e.target.value)}
                    placeholder="ברירת מחדל: תיאור העמוד"
                    rows={2}
                    className="w-full bg-[#202020] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block mb-2">תמונה ראשית (OG Image)</label>
                  <div className="bg-[#202020] rounded-xl p-2 border border-white/10">
                    <ImageUpload 
                      onSelect={(url) => handleSeoChange("image", url)} 
                      currentImage={pageData.seo.image} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "widgets" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {!activeWidget ? (
                <>
                  <h3 className="font-bold text-sm text-gray-400 mb-4 px-2">בחר ווידג'ט לעריכה</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setActiveWidget("hero")}
                      className="w-full flex items-center justify-between p-4 bg-[#202020] hover:bg-[#2a2a2a] border border-white/5 hover:border-indigo-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="text-sm font-bold text-white">Hero Section</h4>
                          <p className="text-xs text-gray-400">אזור עליון של העמוד</p>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </>
              ) : activeWidget === "hero" ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={() => setActiveWidget(null)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                  >
                    <ArrowRight className="w-4 h-4" />
                    חזרה לווידג'טים
                  </button>
                  
                  <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                    הגדרות Hero
                  </h3>
                  
                  {/* Hero Style Selection */}
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 block">סגנון ראשי (Hero Style)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "hero", icon: ImageIcon, label: "Hero" },
                        { id: "content", icon: FileText, label: "Content" },
                        { id: "landing", icon: MonitorPlay, label: "Landing" }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => handlePageDataChange("hero", { ...pageData.hero, heroStyle: style.id })}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                            pageData.hero?.heroStyle === style.id || (!pageData.hero?.heroStyle && style.id === "hero")
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                              : "bg-[#202020] border-white/10 text-gray-400 hover:bg-[#252525] hover:border-white/20"
                          )}
                          title={style.label}
                        >
                          <style.icon className="w-5 h-5 mb-1" />
                          <span className="text-[10px] uppercase tracking-wider">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Selection */}
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 block">פריסת תוכן (Layout)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: "fz", icon: Maximize, label: "FZ" },
                        { id: "modular", icon: LayoutGrid, label: "Modular" },
                        { id: "progressive", icon: Rows, label: "Progressive" },
                        { id: "spatial", icon: Columns, label: "Spatial" },
                        { id: "thumb", icon: CreditCard, label: "Thumb" }
                      ].map(layout => (
                        <button
                          key={layout.id}
                          onClick={() => handlePageDataChange("hero", { ...pageData.hero, layout: layout.id })}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                            pageData.hero?.layout === layout.id || (!pageData.hero?.layout && layout.id === "fz")
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                              : "bg-[#202020] border-white/10 text-gray-400 hover:bg-[#252525] hover:border-white/20"
                          )}
                          title={layout.label}
                        >
                          <layout.icon className="w-4 h-4 mb-1" />
                          <span className="text-[9px] uppercase tracking-wider truncate w-full text-center">{layout.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flex Direction */}
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 block">כיוון פריסה (Direction)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "row", icon: ArrowRight, label: "שורה" },
                        { id: "row-reverse", icon: ArrowLeft, label: "שורה הפוך" },
                        { id: "col", icon: ArrowDown, label: "עמודה" },
                        { id: "col-reverse", icon: ArrowUp, label: "עמודה הפוך" }
                      ].map(dir => (
                        <button
                          key={dir.id}
                          onClick={() => handlePageDataChange("hero", { ...pageData.hero, flexDirection: dir.id })}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                            pageData.hero?.flexDirection === dir.id || (!pageData.hero?.flexDirection && dir.id === "row")
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                              : "bg-[#202020] border-white/10 text-gray-400 hover:bg-[#252525] hover:border-white/20"
                          )}
                          title={dir.label}
                        >
                          <dir.icon className="w-4 h-4 mb-1" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block mb-2">רקע Hero (תמונה / וידאו מגוגל דרייב)</label>
                    <div className="bg-[#202020] rounded-xl p-2 border border-white/10 space-y-3">
                      <input
                        type="text"
                        dir="ltr"
                        value={pageData.hero?.imageSrc || ""}
                        onChange={(e) => handlePageDataChange("hero", { ...pageData.hero, imageSrc: e.target.value })}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full bg-[#181818] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                      />
                      <ImageUpload 
                        onSelect={(url) => handlePageDataChange("hero", { ...pageData.hero, imageSrc: url })} 
                        currentImage={pageData.hero?.imageSrc?.includes('drive.google.com') ? undefined : pageData.hero?.imageSrc} 
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 bg-[#0a0a0a] flex flex-col relative overflow-hidden">
        
        {/* Canvas Toolbar */}
        <div className="h-14 border-b border-white/10 bg-[#111] flex items-center justify-center gap-2 px-4 shadow-sm z-10 shrink-0">
          <div className="bg-[#181818] p-1 rounded-lg border border-white/5 flex gap-1">
            <button
              onClick={() => setIsMobilePreview(false)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                !isMobilePreview ? "bg-white/10 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
              title="תצוגת מחשב"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobilePreview(true)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isMobilePreview ? "bg-white/10 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
              title="תצוגת נייד"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center relative">
          <div 
            className={cn(
              "bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top overflow-hidden",
              isMobilePreview 
                ? "w-[375px] h-[812px] rounded-[3rem] border-[12px] border-[#181818]" 
                : "w-full h-full rounded-2xl border border-white/10"
            )}
            style={{ 
              backgroundColor: pageData.globalColors.background,
              color: pageData.globalColors.text 
            }}
          >
            {/* Minimal Preview Frame */}
            <div className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center justify-start relative group">
              <WfdHero 
                {...pageData.hero} 
                title={pageData.title || pageData.hero?.title || undefined}
                subtitle={pageData.pageGoal || pageData.hero?.subtitle || undefined}
                description={pageData.description || pageData.hero?.description || undefined}
                imageSrc={pageData.hero?.imageSrc || pageData.seo?.image || undefined}
                isEditing={true}
                pageContext={`כותרת: ${pageData.title || pageData.hero?.title}\nתיאור: ${pageData.description || pageData.hero?.description}`}
                onUpdateHero={(field, value) => {
                  const updates: any = {
                    hero: { ...pageData.hero, [field]: value }
                  };
                  if (field === "title") updates.title = value;
                  if (field === "description") updates.description = value;
                  if (field === "subtitle") updates.pageGoal = value;
                  setPageData(prev => ({ ...prev, ...updates }));
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
