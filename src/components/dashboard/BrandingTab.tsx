"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Wand2, Loader2, Copy, Building2, Check, Phone, Globe, Palette, X, Trash2, Image as ImageIcon } from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getGlobalSettings, saveGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { rephraseTextWithAI } from "@/features/ai/actions";
import { getCompanyServices } from "@/features/company-services/actions";
import { generateMiniSiteWithAI } from "@/features/services/actions";
import { CompanyMediaSection } from "./CompanyMediaSection";
import { uploadMediaFile, fetchImageAsBase64 } from "@/features/media/actions";
import { useRouter } from "next/navigation";
import { extractColors } from "extract-colors";

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

export function BrandingTab({ 
  onSave, 
  activeStep = 8, 
  settings: propSettings,
  isOpen,
  onToggle,
  isCompleted
}: { 
  onSave?: () => void; 
  activeStep?: number; 
  settings?: GlobalSettings; 
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [settings, setSettings] = useState<GlobalSettings | null>(propSettings || null);
  const [loading, setLoading] = useState(!propSettings);
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  const [isColorsOpen, setIsColorsOpen] = useState(false);
  const [isLogoOpen, setIsLogoOpen] = useState(false);
  const [isBaseColorsOpen, setIsBaseColorsOpen] = useState(true);
  const [isTextColorsOpen, setIsTextColorsOpen] = useState(false);
  const [isButtonColorsOpen, setIsButtonColorsOpen] = useState(false);
  
  const [companyName, setCompanyName] = useState("");
  const [organizationType, setOrganizationType] = useState<"חברה" | "עמותה" | "שותפות" | "עוסק מורשה" | "עוסק פטור">("חברה");
  const [organizationPurpose, setOrganizationPurpose] = useState("");
  const [slogan, setSlogan] = useState("");
  const [companyVision, setCompanyVision] = useState("");
  const [shortVision, setShortVision] = useState("");
  const [savingVision, setSavingVision] = useState(false);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const [savingGeneral, setSavingGeneral] = useState(false);

  const [savingName, setSavingName] = useState(false);

  const [servicesCount, setServicesCount] = useState(0);
  const [companyServices, setCompanyServices] = useState<any[]>([]);
  const router = useRouter();

  // Mini-site Generation states
  const [isMiniSiteModalOpen, setIsMiniSiteModalOpen] = useState(false);
  const [slugName, setSlugName] = useState("");
  const [generatingMiniSite, setGeneratingMiniSite] = useState(false);

  const updateField = (field: keyof GlobalSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSaveGeneral = async () => {
    if (!settings) return;
    setSavingGeneral(true);
    await saveGlobalSettings(settings);
    setSavingGeneral(false);
    setEditingSection(null);
    onSave?.();
  };

  // AI Modal states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync state with props
  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
      setCompanyName(propSettings.companyName || "");
      if (propSettings.organizationType) setOrganizationType(propSettings.organizationType as any);
      setOrganizationPurpose(propSettings.organizationPurpose || "");
      setSlogan(propSettings.slogan || "");
      setCompanyVision(propSettings.companyVision || "");
      setShortVision(propSettings.shortVision || "");
    }
  }, [propSettings]);

  const getFirstTwoWords = (text: string | undefined | null): string => {
    if (!text) return "";
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(" ");
    return words.slice(0, 2).join(" ");
  };

  const getActiveInnerSection = () => {
    if (!organizationPurpose) return "purpose";
    if (!companyName.trim()) return "name";
    if (!settings?.memberCount) return "memberCount";
    if (!slogan.trim()) return "slogan";
    if (!companyVision.trim()) return "vision";
    return "none";
  };

  const activeInnerSection = getActiveInnerSection();

  const isPurposeOpen = editingSection === "purpose" || (editingSection === null && activeInnerSection === "purpose");
  const isNameOpen = editingSection === "name" || (editingSection === null && activeInnerSection === "name");
  const isMemberCountOpen = editingSection === "memberCount" || (editingSection === null && activeInnerSection === "memberCount");
  const isSloganOpen = editingSection === "slogan" || (editingSection === null && activeInnerSection === "slogan");
  const isVisionOpen = editingSection === "vision" || (editingSection === null && activeInnerSection === "vision");

  useEffect(() => {
    async function load() {
      if (!propSettings) {
        const data = await getGlobalSettings();
        setSettings(data);
        setCompanyName(data.companyName || "");
        if (data.organizationType) setOrganizationType(data.organizationType as any);
        setOrganizationPurpose(data.organizationPurpose || "");
        setSlogan(data.slogan || "");
        setCompanyVision(data.companyVision || "");
        if (data.shortVision) setShortVision(data.shortVision);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      }
      const svcs = await getCompanyServices();
      setCompanyServices(svcs);
      setServicesCount(svcs.length);
      setLoading(false);
    }
    load();
  }, [propSettings]);

  const handleSaveName = async () => {
    setSavingName(true);
    await saveGlobalSettings({ 
      companyName, 
      organizationType: organizationType || undefined,
      organizationPurpose,
      slogan
    });
    setEditingSection(null);
    setSavingName(false);
    onSave?.();
  };

  const getEntityNameLabel = () => {
    switch (organizationType) {
      case "עמותה": return "שם העמותה";
      case "שותפות": return "שם השותפות";
      case "עוסק מורשה": return "שם העסק";
      case "עוסק פטור": return "שם העסק";
      case "חברה":
      default: return "שם החברה";
    }
  };

  const handleSaveVision = async () => {
    setSavingVision(true);
    await saveGlobalSettings({ companyVision, shortVision });
    setSavingVision(false);
    onSave?.();
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadMediaFile(formData);
      if (res.success && res.url) {
        setLogoUrl(res.url);
        await saveGlobalSettings({ logoUrl: res.url });
        onSave?.();
      } else {
        alert("שגיאה בהעלאת הלוגו: " + (res.error || ""));
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה בהעלאת הלוגו");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("האם למחוק את הלוגו?")) return;
    setLogoUrl("");
    await saveGlobalSettings({ logoUrl: "" });
    onSave?.();
  };

  const handleApplyLogoColors = async () => {
    if (!logoUrl) return;
    try {
      const imgRes = await fetchImageAsBase64(logoUrl);
      if (imgRes.error || !imgRes.base64) {
        alert("שגיאה בחילוץ התמונה (CORS/Network)");
        return;
      }
      const dataUrl = `data:${imgRes.contentType};base64,${imgRes.base64}`;
      const colors = await extractColors(dataUrl);
      const topColors = colors.sort((a, b) => b.area - a.area).map(c => c.hex);
      if (topColors.length >= 1) {
        updateField("primaryColor", topColors[0]);
        if (topColors.length >= 2) {
          updateField("secondaryColor", topColors[1]);
        }
      }
    } catch (e) {
      console.error("Color extraction failed:", e);
      alert("שגיאה בחילוץ צבעים מהלוגו");
    }
  };

  const handleImproveWithAI = async () => {
    setAiLoading(true);
    try {
      const result = await rephraseTextWithAI(companyVision, undefined, customInstruction, true);
      if (result.success && result.text) {
        setCompanyVision(result.text);
      } else {
        alert(result.error || "שגיאה בשיפור הטקסט");
      }
    } catch (err: any) {
      alert(err.message || "שגיאה בשיפור הטקסט");
    } finally {
      setAiLoading(false);
    }
  };

  const handleShortenVisionAI = async () => {
    if (!companyVision.trim()) {
      alert("אנא הזן תחילה חזון מפורט");
      return;
    }
    setAiLoading(true);
    try {
      const result = await rephraseTextWithAI(companyVision, undefined, "תמצת את החזון הזה למשפט קצר וקולע של עד 15 מילים. החזר טקסט נקי בלבד ללא שום תגיות HTML או קוד.", true);
      if (result.success && result.text) {
        const cleanText = result.text.replace(/<[^>]*>?/gm, '').trim();
        setShortVision(cleanText);
      } else {
        alert(result.error || "שגיאה בתמצות הטקסט");
      }
    } catch (err: any) {
      alert(err.message || "שגיאה בתמצות הטקסט");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiResult = async () => {
    if (aiResult) {
      try {
        const blobHtml = new Blob([aiResult], { type: "text/html" });
        const textOnly = new DOMParser().parseFromString(aiResult, 'text/html').body.textContent || "";
        const blobText = new Blob([textOnly], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        await navigator.clipboard.writeText(aiResult);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleReplaceVision = () => {
    setCompanyVision(aiResult);
    setIsAiModalOpen(false);
    setAiResult("");
    setCustomInstruction("");
  };

  if (loading) return (
    <div className="w-full p-12 flex justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
    </div>
  );

  const hasName = companyName.trim().length > 0;
  const hasVision = companyVision.trim().length > 0;
  const hasSlogan = slogan.trim().length > 0;
  const hasContact = !!(settings?.contactPhone && settings?.contactEmail);
  const hasServices = servicesCount > 0;
  const canGenerateSite = hasName && hasVision && hasSlogan && hasContact && hasServices;
  const hasMiniSiteSlug = !!settings?.miniSiteSlug;

  const handleGenerateMiniSite = async () => {
    if (!slugName.trim()) return;
    setGeneratingMiniSite(true);
    
    const finalSlug = slugName.toLowerCase().replace(/[^a-z0-9-]/g, "");
    
    const res = await generateMiniSiteWithAI(
      finalSlug,
      companyName,
      companyVision,
      companyServices,
      settings
    );

    if (res.success && res.slug) {
      await saveGlobalSettings({ miniSiteSlug: res.slug });
      router.push(`/${res.slug}`);
    } else {
      alert("שגיאה ביצירת האתר: " + (res.error || "לא ידוע"));
      setGeneratingMiniSite(false);
    }
  };

  return (
    <div className="w-full space-y-0">
      {/* 1. Global Settings / Company Details Wrapper */}
      <div className={`w-full bg-[#181818] border-y border-white/5 transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md' : ''}`} dir="rtl">
      {/* Outer Tab Header */}
      <button
        onClick={(e) => {
          onToggle();
          if (!isOpen) scrollToTop(e);
        }}
        className="w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-indigo-400'}`}>
            {isCompleted ? <Check className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sm sm:text-base">מיתוג</span>
            {isCompleted && companyName && (
              <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                הושלם: {companyName}
              </span>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white" />}
      </button>

      {/* Outer Tab Content */}
      {isOpen && (
        <div className="w-full bg-[#111] border-t border-white/5 animate-in fade-in duration-200">
          <div className="w-full flex flex-col">
            
            {/* 1. המטרה */}
            {!isPurposeOpen && organizationPurpose ? (
              <div 
                onClick={() => setEditingSection("purpose")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400">המטרה</span>
                    <span className="text-xs font-bold text-white mt-0.5">{getFirstTwoWords(organizationPurpose)}</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">ערוך</span>
              </div>
            ) : (
              <div className="w-full border-b border-white/5 bg-[#181818] p-4 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-200 block">המטרה</label>
                  {organizationPurpose && (
                    <button 
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      סגור
                    </button>
                  )}
                </div>
                {organizationPurpose ? (
                  <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl">
                    <span className="text-slate-300 text-sm font-semibold">{organizationPurpose}</span>
                    <button 
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setOrganizationPurpose("");
                        await saveGlobalSettings({ organizationPurpose: "" });
                        setEditingSection("purpose");
                        onSave?.();
                      }}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-white/5 rounded-xl transition shrink-0"
                      title="מחק מטרה"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {[
                      "כספית - מכירה - נתינת שירותים",
                      "ציבורית - מתן שירות תחת משרדי ממשלה או עיירה",
                      "אידאולוגית/חברתית- קידום אגנדות או שירותי דת",
                      "אחר - מטרה אישית, מקצועית או שונה"
                    ].map((purpose) => (
                      <button
                        key={purpose}
                        type="button"
                        onClick={async () => {
                          setOrganizationPurpose(purpose);
                          await saveGlobalSettings({ organizationPurpose: purpose });
                          setEditingSection(null);
                          onSave?.();
                        }}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-[#111] hover:bg-[#202020] text-right text-slate-300 hover:text-white transition w-full"
                      >
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold">{purpose}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. שם החברה (שדה טקסט בודד, שמירה בצידו) */}
            {!isNameOpen && companyName.trim() ? (
              <div 
                onClick={() => setEditingSection("name")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400">שם החברה</span>
                    <span className="text-xs font-bold text-white mt-0.5">{getFirstTwoWords(companyName)}</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">ערוך</span>
              </div>
            ) : (
              (activeStep >= 2 || companyName.trim()) && (
                <div className="w-full border-b border-white/5 bg-[#181818] p-4 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200 block">שם החברה</label>
                    {companyName.trim() && (
                      <button 
                        type="button"
                        onClick={() => setEditingSection(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        סגור
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
                      placeholder="הזן את שם החברה..."
                    />
                    <button 
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition disabled:opacity-50 shrink-0 flex items-center justify-center"
                      title="שמור שם"
                    >
                      {savingName ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* 3. מספר עובדים/חברים/מתנדבים */}
            {!isMemberCountOpen && settings?.memberCount ? (
              <div 
                onClick={() => setEditingSection("memberCount")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400">מספר עובדים/חברים/מתנדבים</span>
                    <span className="text-xs font-bold text-white mt-0.5">{getFirstTwoWords(settings.memberCount)}</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">ערוך</span>
              </div>
            ) : (
              (activeStep >= 3 || settings?.memberCount) && (
                <div className="w-full border-b border-white/5 bg-[#181818] p-4 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200 block">מספר עובדים/חברים/מתנדבים</label>
                    {settings?.memberCount && (
                      <button 
                        type="button"
                        onClick={() => setEditingSection(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        סגור
                      </button>
                    )}
                  </div>
                  {settings?.memberCount ? (
                    <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl">
                      <span className="text-slate-300 text-sm font-semibold">{settings.memberCount}</span>
                      <button 
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await saveGlobalSettings({ memberCount: "" });
                          setEditingSection("memberCount");
                          onSave?.();
                        }}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-white/5 rounded-xl transition shrink-0"
                        title="מחק בחירה"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {["אני לבד לבנתיים", "עד 10", "עד 50", "יותר מ 50"].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={async () => {
                            await saveGlobalSettings({ memberCount: count });
                            setEditingSection(null);
                            onSave?.();
                          }}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-[#111] hover:bg-[#202020] text-right text-slate-300 hover:text-white transition w-full"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {/* 4. סלוגן */}
            {!isSloganOpen && slogan.trim() ? (
              <div 
                onClick={() => setEditingSection("slogan")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400">סלוגן</span>
                    <span className="text-xs font-bold text-white mt-0.5">{getFirstTwoWords(slogan)}</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">ערוך</span>
              </div>
            ) : (
              (activeStep >= 4 || slogan.trim()) && (
                <div className="w-full border-b border-white/5 bg-[#181818] p-4 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200 block">סלוגן</label>
                    {slogan.trim() && (
                      <button 
                        type="button"
                        onClick={() => setEditingSection(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        סגור
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
                      placeholder="המשפט שמלווה את העסק..."
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        setSavingGeneral(true);
                        await saveGlobalSettings({ slogan });
                        setSavingGeneral(false);
                        setEditingSection(null);
                        onSave?.();
                      }}
                      disabled={savingGeneral}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition disabled:opacity-50 shrink-0 flex items-center justify-center"
                      title="שמור סלוגן"
                    >
                      {savingGeneral ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Company Vision Inner Accordion */}
            {!isVisionOpen && companyVision.trim() ? (
              <div 
                onClick={() => setEditingSection("vision")}
                className="w-full border-b border-white/5 bg-[#181818] p-4 flex items-center justify-between cursor-pointer hover:bg-[#202020] transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400">חזון החברה</span>
                    <span className="text-xs font-bold text-white mt-0.5">{getFirstTwoWords(companyVision)}</span>
                  </div>
                </div>
                <span className="text-xs text-indigo-400 font-semibold">ערוך</span>
              </div>
            ) : (
              (activeStep >= 5 || companyVision.trim()) && (
                <div className={`w-full border-b border-white/5 bg-[#181818] transition-all scroll-mt-24 duration-500 ${isVisionOpen ? 'ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] z-10 relative' : ''}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (isVisionOpen) setEditingSection(null);
                      else setEditingSection("vision");
                      scrollToTop(e);
                    }}
                    className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      חזון החברה
                    </span>
                    {isVisionOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </button>
                  
                  {isVisionOpen && (
                    <div className="p-4 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4">
                      <div className="border border-white/10 overflow-hidden shadow-sm bg-[#181818]">
                        <RichTextEditor
                          value={companyVision}
                          onChange={setCompanyVision}
                          placeholder="הזן כאן את חזון החברה בפירוט..."
                        />
                      </div>
                      
                      {/* Short Vision AI */}
                      <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm font-bold">תמצית החזון</label>
                          <button 
                            type="button"
                            onClick={handleShortenVisionAI}
                            disabled={aiLoading}
                            className="text-xs flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                          >
                            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            ייצר תמצית בעזרת AI
                          </button>
                        </div>
                        <textarea
                          value={shortVision}
                          onChange={(e) => setShortVision(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600 min-h-[80px]"
                          placeholder="כאן יופיע תקציר החזון, או שתוכל לכתוב אותו בעצמך..."
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-4 border-t border-white/5">
                        <Button 
                          type="button"
                          onClick={handleSaveVision} 
                          disabled={savingVision}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                        >
                          {savingVision ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          שמור שינויים
                        </Button>
                        <Button 
                          type="button"
                          onClick={() => setIsAiModalOpen(true)}
                          variant="outline"
                          className="bg-white/5 hover:bg-white/10 border-white/10 text-purple-400"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          שפר עם AI
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}



            {/* Logo Accordion */}
            {activeStep >= 8 && (
              <div className={`w-full border-b border-white/5 bg-[#181818] transition-all scroll-mt-24 duration-500 ${isLogoOpen ? 'ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] z-10 relative' : ''}`}>
                <button
                  onClick={(e) => {
                    const next = !isLogoOpen;
                    setIsLogoOpen(next);
                    if (next) scrollToTop(e);
                  }}
                  className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-blue-400" />
                    הלוגו שלך
                  </span>
                  {isLogoOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>
                {isLogoOpen && (
                  <div className="p-4 sm:p-6 bg-[#111] border-t border-white/5 animate-in fade-in duration-200">
                    <div className="flex flex-col items-center justify-center gap-4 bg-[#181818] p-6 sm:p-8 rounded-2xl border border-white/10 border-dashed">
                      {logoUrl ? (
                        <div className="flex flex-col items-center gap-4">
                          <img src={logoUrl} alt="Company Logo" className="h-24 object-contain" />
                          <div className="flex gap-3">
                            <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
                              {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              החלף לוגו
                              <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} disabled={isUploadingLogo} />
                            </label>
                            <button onClick={handleRemoveLogo} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors">
                              הסר
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-400 text-sm text-center max-w-sm">
                            העלה את לוגו החברה. הוא ישמש כברירת מחדל בכל הדפים והשירותים שלך.
                          </p>
                          <label className="cursor-pointer mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2">
                            {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            {isUploadingLogo ? "מעלה לוגו..." : "העלה לוגו"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} disabled={isUploadingLogo} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Colors Accordion */}
            {activeStep >= 8 && (
              <div className={`w-full border-b border-white/5 bg-[#181818] transition-all scroll-mt-24 duration-500 ${isColorsOpen ? 'ring-1 ring-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)] z-10 relative' : ''}`}>
                <button
                  onClick={(e) => {
                    const next = !isColorsOpen;
                    setIsColorsOpen(next);
                    if (next) scrollToTop(e);
                  }}
                  className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-pink-400" />
                    צבעים גלובליים
                  </span>
                  {isColorsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>
                {isColorsOpen && settings && (
                  <div className="p-4 bg-[#111] border-t border-white/5 animate-in fade-in duration-200 space-y-4">
                    
                    {logoUrl && (
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                        <div className="flex-1 text-right">
                          <p className="text-sm text-indigo-200 font-semibold">זיהינו שהעלית לוגו!</p>
                          <p className="text-xs text-indigo-300">לחץ כדי לשלוף את הצבעים הראשיים של הלוגו ולהגדיר אותם כצבעים הגלובליים.</p>
                        </div>
                        <button
                          onClick={handleApplyLogoColors}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                        >
                          קבע צבעי לוגו
                        </button>
                      </div>
                    )}

                    {/* Base Colors Sub-accordion */}
                    <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-[#181818] scroll-mt-24">
                      <button
                        onClick={(e) => {
                          const next = !isBaseColorsOpen;
                          setIsBaseColorsOpen(next);
                          if (next) scrollToTop(e);
                        }}
                        className="w-full p-3 bg-black/20 hover:bg-black/40 flex items-center justify-between font-bold text-white text-xs cursor-pointer transition-colors"
                      >
                        <span>צבעי בסיס</span>
                        {isBaseColorsOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {isBaseColorsOpen && (
                        <div className="p-4 bg-black/10 border-t border-white/5 grid grid-cols-1 gap-4">
                          {/* NOTE: Always row by row / 1 column (grid-cols-1) */}
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">צבע ראשי</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.primaryColor || "#d8435d"} onChange={(e) => updateField("primaryColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.primaryColor || "#d8435d"} onChange={(e) => updateField("primaryColor", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">צבע משני</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.secondaryColor || "#10354b"} onChange={(e) => updateField("secondaryColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.secondaryColor || "#10354b"} onChange={(e) => updateField("secondaryColor", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">צבע רקע גלובלי</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.backgroundColor || "#f8f9fa"} onChange={(e) => updateField("backgroundColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.backgroundColor || "#f8f9fa"} onChange={(e) => updateField("backgroundColor", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text Colors Sub-accordion */}
                    <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-[#181818] scroll-mt-24">
                      <button
                        onClick={(e) => {
                          const next = !isTextColorsOpen;
                          setIsTextColorsOpen(next);
                          if (next) scrollToTop(e);
                        }}
                        className="w-full p-3 bg-black/20 hover:bg-black/40 flex items-center justify-between font-bold text-white text-xs cursor-pointer transition-colors"
                      >
                        <span>צבעי טקסט</span>
                        {isTextColorsOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {isTextColorsOpen && (
                        <div className="p-4 bg-black/10 border-t border-white/5 grid grid-cols-1 gap-4">
                          {/* NOTE: Always row by row / 1 column (grid-cols-1) */}
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">כותרת ראשית (H1)</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.textColorH1 || "#000000"} onChange={(e) => updateField("textColorH1", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.textColorH1 || "#000000"} onChange={(e) => updateField("textColorH1", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">כותרת משנית (H2)</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.textColorH2 || "#333333"} onChange={(e) => updateField("textColorH2", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.textColorH2 || "#333333"} onChange={(e) => updateField("textColorH2", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">כותרת (H3)</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.textColorH3 || "#444444"} onChange={(e) => updateField("textColorH3", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.textColorH3 || "#444444"} onChange={(e) => updateField("textColorH3", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">טקסט רגיל (p)</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.textColor || "#1a1a1a"} onChange={(e) => updateField("textColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.textColor || "#1a1a1a"} onChange={(e) => updateField("textColor", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Button Colors Sub-accordion */}
                    <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-[#181818] scroll-mt-24">
                      <button
                        onClick={(e) => {
                          const next = !isButtonColorsOpen;
                          setIsButtonColorsOpen(next);
                          if (next) scrollToTop(e);
                        }}
                        className="w-full p-3 bg-black/20 hover:bg-black/40 flex items-center justify-between font-bold text-white text-xs cursor-pointer transition-colors"
                      >
                        <span>צבעי כפתורים</span>
                        {isButtonColorsOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {isButtonColorsOpen && (
                        <div className="p-4 bg-black/10 border-t border-white/5 grid grid-cols-1 gap-4">
                          {/* NOTE: Always row by row / 1 column (grid-cols-1) */}
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">רקע כפתור</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.buttonBgColor || "#2563eb"} onChange={(e) => updateField("buttonBgColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.buttonBgColor || "#2563eb"} onChange={(e) => updateField("buttonBgColor", e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex flex-col"><span className="text-sm font-semibold text-gray-200">טקסט כפתור</span></div>
                            <div className="flex items-center gap-3 bg-black/60 p-1 pr-3 rounded-full border border-white/10">
                              <input type="text" className="w-20 bg-transparent border-none text-xs font-mono text-gray-300 focus:outline-none focus:text-white uppercase text-left" dir="ltr" value={settings.buttonTextColor || "#ffffff"} onChange={(e) => updateField("buttonTextColor", e.target.value)} />
                              <input type="color" className="w-7 h-7 rounded-full cursor-pointer" value={settings.buttonTextColor || "#ffffff"} onChange={(e) => updateField("buttonTextColor", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveGeneral} disabled={savingGeneral} className="bg-pink-600 hover:bg-pink-500 text-white text-xs px-6 py-2 rounded-xl">
                        {savingGeneral ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        שמור צבעים
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media Section */}
            {activeStep >= 8 && (
              <CompanyMediaSection 
                onApplyColors={async (colors) => {
                  if (colors.length >= 2) {
                    const newSettings = { ...settings, primaryColor: colors[0], secondaryColor: colors[1] };
                    updateField("primaryColor", colors[0]);
                    updateField("secondaryColor", colors[1]);
                    if (colors[2]) updateField("backgroundColor", colors[2]);
                    
                    setSavingGeneral(true);
                    await saveGlobalSettings(newSettings);
                    setSavingGeneral(false);
                    onSave?.();
                    
                    setIsColorsOpen(true);
                    setTimeout(() => {
                      alert("הצבעים הוחלו בהצלחה!");
                    }, 100);
                  }
                }}
              />
            )}

            {/* Generate Site Button Section */}
            {(canGenerateSite || hasMiniSiteSlug) && (
              <div className="w-full p-6 bg-[#111] border-t border-white/5 flex flex-col items-center justify-center">
                {hasMiniSiteSlug ? (
                  <Button 
                    onClick={() => router.push(`/${settings?.miniSiteSlug}`)}
                    className="w-full max-w-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-lg transition-all"
                  >
                    <Globe className="w-6 h-6" />
                    עבור לאתר שלך
                  </Button>
                ) : isMiniSiteModalOpen ? (
                  <div className="w-full p-8 bg-[#181818] border border-white/10 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black !text-white flex items-center gap-3">
                        <Globe className="w-8 h-8 text-indigo-500" />
                        קבע את הסיומת של כתובת האתר שלך
                      </h2>
                      <button 
                        onClick={() => setIsMiniSiteModalOpen(false)}
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-center gap-2" dir="ltr">
                        <span className="text-slate-400 font-mono text-sm bg-[#111] border border-white/10 px-4 py-3.5 rounded-xl select-none shrink-0 w-full sm:w-auto text-center sm:text-left">
                          /
                        </span>
                        <input
                          type="text"
                          value={slugName}
                          onChange={(e) => setSlugName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          placeholder="e.g. my-awesome-site"
                          className="flex-1 w-full p-3.5 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all font-mono"
                          dir="ltr"
                          required
                        />
                      </div>
                      
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200/80 text-sm" dir="rtl">
                        <strong>שים לב:</strong> יש להזין אותיות באנגלית, מספרים ומקפים בלבד (לדוגמה: my-site).
                        <br />
                        הכתובת היא קבועה ולא תהיה ניתנת להחלפה לאחר מכן.
                      </div>

                      <div className="pt-4 border-t border-white/10 flex justify-end gap-3" dir="rtl">
                        <Button 
                          onClick={() => setIsMiniSiteModalOpen(false)}
                          variant="outline"
                          className="bg-transparent border-white/10 hover:bg-white/5 text-white"
                        >
                          ביטול
                        </Button>
                        <Button 
                          onClick={handleGenerateMiniSite}
                          disabled={generatingMiniSite || !slugName.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8"
                        >
                          {generatingMiniSite ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                          {generatingMiniSite ? "מייצר אתר..." : "המשך ויצירת מיני-סייט"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button 
                      onClick={() => setIsMiniSiteModalOpen(true)}
                      className="w-full max-w-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-lg transition-all"
                    >
                      <Wand2 className="w-6 h-6" />
                      בוא נחולל אתר
                    </Button>
                    <p className="text-xs text-slate-400 mt-3 text-center">
                      זיהינו שמילאת את כל הפרטים הנדרשים (שם, חזון, סלוגן, נתוני התקשרות ושירות אחד לפחות). כעת ניתן לייצר מיני סייט אוטומטי בלחיצת כפתור!
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* AI Improvement Modal */}
      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)}>
        <Modal.Content className="max-w-md w-full bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh] p-0 overflow-hidden">
          <div dir="rtl" className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 shrink-0 bg-white z-10 flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              שיפור ניסוח עם Gemini 3.1
            </h3>
            <Modal.Close className="text-slate-400 hover:text-slate-600 relative top-auto right-auto left-auto" />
          </div>

          {/* AI Result Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 relative">
            {aiResult ? (
              <div className="relative group h-full flex flex-col">
                <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative pb-16 min-h-[300px]">
                  <RichTextEditor
                    value={aiResult}
                    onChange={(val) => setAiResult(val)}
                    placeholder="התוצאה תופיע כאן..."
                  />
                  
                  {/* Icons pinned to bottom of textarea */}
                  <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                    <button 
                      onClick={handleCopyAiResult} 
                      className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                      title="העתק טקסט"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? "הועתק" : "העתק"}
                    </button>
                    <button 
                      onClick={handleReplaceVision} 
                      className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                      title="החלף טקסט קיים"
                    >
                      <Check className="w-4 h-4" />
                      החלף טקסט
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-slate-400">
                 {aiLoading ? (
                   <div className="flex flex-col items-center gap-4">
                     <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                     <p className="text-sm animate-pulse">Gemini מנסח מחדש...</p>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-3">
                     <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                       <Wand2 className="w-8 h-8 text-purple-500" />
                     </div>
                     <p className="text-sm text-center font-medium text-slate-500">הכנס הנחיות למטה כדי לקבל ניסוח משופר.</p>
                     <p className="text-xs text-center text-slate-400">הטקסט הנוכחי ישלח ל-AI כדי לשפר ולדייק אותו.</p>
                   </div>
                 )}
              </div>
            )}
          </div>

          {/* Bottom Fixed Input Area */}
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <p className="text-xs text-slate-500 mb-2 font-medium">הנחיות ל-AI (אופציונלי):</p>
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiLoading && companyVision.trim()) {
                    handleImproveWithAI();
                  }
                }}
                placeholder="לדוגמה: קצר את הטקסט, הוסף אימוג'י..."
                className="w-full pl-[85px] pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
              <Button 
                onClick={handleImproveWithAI} 
                disabled={aiLoading || !companyVision.trim()} 
                className="absolute left-1.5 top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-4"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                {aiLoading ? "" : "שלח"}
              </Button>
            </div>
          </div>
          </div>
        </Modal.Content>
      </Modal>


    </div>
  );
}
