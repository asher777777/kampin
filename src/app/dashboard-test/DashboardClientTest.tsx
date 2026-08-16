"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Coins, 
  Building2, 
  Heart, 
  Sparkles, 
  Loader2, 
  Globe, 
  ShieldCheck, 
  HelpCircle 
} from "lucide-react";
import { BrandingTab } from "@/components/dashboard/BrandingTab";
import { SocialNetworksTab } from "@/components/dashboard/SocialNetworksTab";
import { ContactDetailsTab } from "@/components/dashboard/ContactDetailsTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { CreateCommunityTab } from "@/components/dashboard/CreateCommunityTab";
import { StatBadge } from "@/components/ui/StatBadge";
import { saveGlobalSettings, getGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { getCompanyServices } from "@/features/company-services/actions";

interface DashboardClientProps {
  initialSettings: GlobalSettings;
  initialServices: any[];
  contactCount: number;
  totalSpentResult: number;
  userName: string;
}

export function DashboardClientTest({
  initialSettings,
  initialServices,
  contactCount,
  totalSpentResult,
  userName,
}: DashboardClientProps) {
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [services, setServices] = useState<any[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [openTab, setOpenTab] = useState<"branding" | "social" | "contact" | "whatToGenerate" | "community" | "services" | null>("branding");

  // Sync state on prop change
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  // Re-fetch function after each save step
  const handleSaveSuccess = async () => {
    try {
      const data = await getGlobalSettings();
      setSettings(data);
      const svcs = await getCompanyServices();
      setServices(svcs);
    } catch (err) {
      console.error("Error refreshing settings:", err);
    }
  };

  const getActiveStep = (): number => {
    if (!settings.organizationPurpose || settings.organizationPurpose.trim() === "") {
      return 1;
    }
    if (!settings.companyName || settings.companyName.trim() === "") {
      return 2;
    }
    if (!settings.memberCount || settings.memberCount.trim() === "") {
      return 3;
    }
    if (!settings.slogan || settings.slogan.trim() === "") {
      return 4;
    }
    if (!settings.companyVision || settings.companyVision.trim() === "") {
      return 5;
    }
    if (!settings.socialSetupCompleted) {
      return 6;
    }
    if (
      !settings.contactPhone || 
      settings.contactPhone.trim() === "" || 
      settings.contactPhone === "054-000-0000" || 
      !settings.contactEmail || 
      settings.contactEmail.trim() === "" || 
      settings.contactEmail === "info@community-generator.co.il"
    ) {
      return 7;
    }
    if (!settings.communities || settings.communities.length === 0) {
      return 8;
    }
    const comm = settings.communities[0];
    if (
      !comm.name || 
      comm.name.trim() === "" ||
      !comm.targetAudiences || 
      comm.targetAudiences.length === 0
    ) {
      return 8;
    }
    if (services.length === 0) {
      return 9;
    }
    return 10;
  };

  const activeStep = getActiveStep();

  // Auto-set open tab based on step changes during onboarding
  useEffect(() => {
    if (activeStep >= 2 && activeStep <= 5) {
      setOpenTab("branding");
    } else if (activeStep === 6) {
      setOpenTab("social");
    } else if (activeStep === 7) {
      setOpenTab("contact");
    } else if (activeStep === 8) {
      setOpenTab("community");
    } else if (activeStep === 9) {
      setOpenTab("services");
    }
  }, [activeStep]);

  // Auto-scroll the active open tab to the top of the viewport
  useEffect(() => {
    if (openTab) {
      setTimeout(() => {
        const element = document.getElementById(`tab-container-${openTab}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 250);
    }
  }, [openTab]);

  const selectPurpose = async (purpose: string) => {
    setLoading(true);
    try {
      await saveGlobalSettings({ organizationPurpose: purpose });
      await handleSaveSuccess();
    } catch (err) {
      alert("שגיאה בשמירת הנתונים. אנא נסה שנית.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Render Welcome Screen (Step 1)
  if (activeStep === 1) {
    const options = [
      {
        id: "commercial",
        text: "כספית - מכירה - נתינת שירותים",
        icon: Coins,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50",
      },
      {
        id: "public",
        text: "ציבורית - מתן שירות תחת משרדי ממשלה או עיירה",
        icon: Building2,
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50",
      },
      {
        id: "social",
        text: "אידאולוגית/חברתית- קידום אגנדות או שירותי דת",
        icon: Heart,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50",
      },
      {
        id: "other",
        text: "אחר - מטרה אישית, מקצועית או שונה",
        icon: Sparkles,
        color: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50",
      },
    ];

    return (
      <div className="w-full min-h-full bg-[#0f172a] text-right p-6 sm:p-8 flex flex-col justify-between" dir="rtl">
        <div className="flex-1 flex flex-col lg:flex-row justify-center max-w-6xl mx-auto w-full gap-8 py-4 items-center">
          
          {/* Right panel (Options list) */}
          <div className="flex-1 w-full space-y-6">
            {/* Mobile Header (hidden on desktop) */}
            <div className="flex items-center gap-4 mb-4 lg:hidden">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25 animate-pulse shrink-0">
                <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-indigo-400" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-none">{userName} מה שלומך ?</h2>
                <p className="text-xs text-indigo-400 font-semibold mt-1">מיכאל המחלל - מדריך אישי</p>
              </div>
            </div>

            {/* Mobile Guide Intro (hidden on desktop) */}
            <div className="bg-[#181818] border border-white/5 p-5 rounded-3xl relative text-slate-300 text-sm leading-relaxed space-y-3 shadow-xl lg:hidden">
              <p className="font-medium text-slate-200">
                אני מיכאל המחלל ואני המדריך האישי שלך במדריך לחולל קהילות.
              </p>
              <p className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                קהילה היא התאגדות המבוססת על חזון משותף, אשר נועדה לפתור באופן עקבי צורך בסיסי, אישי או מקצועי של חבריה.
              </p>
            </div>

            {/* Core Question */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white pr-1">
                מה מטרת התאגדות שלך {userName}
              </h3>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-[#111] border border-white/5 rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="text-xs text-slate-400 font-bold">שומר הגדרות...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {options.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => selectPurpose(opt.text)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border text-right transition-all duration-300 w-full hover:-translate-y-0.5 hover:shadow-lg ${opt.color}`}
                      >
                        <div className="p-2.5 rounded-xl bg-white/5 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-200">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop side panel (Michael character) */}
          <div className="hidden lg:flex w-80 shrink-0 flex-col justify-center border-r border-white/10 pr-8 pl-4 space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-lg shadow-indigo-500/25 animate-pulse shrink-0">
                <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black text-white leading-none">{userName} מה שלומך ?</h2>
                <p className="text-sm text-amber-500 font-semibold mt-1.5">מיכאל המחלל - מדריך אישי</p>
              </div>
            </div>

            <div className="bg-[#181818] border border-amber-500/20 p-6 rounded-[2rem] relative text-slate-300 text-sm leading-relaxed space-y-4 shadow-xl">
              <p className="font-bold text-amber-500 text-base">
                אני מיכאל המחלל ואני המדריך האישי שלך במדריך לחולל קהילות.
              </p>
              <p>
                קהילה היא התאגדות המבוססת על חזון משותף, אשר נועדה לפתור באופן עקבי צורך בסיסי, אישי או מקצועי של חבריה. 
                כדי לשרוד ולשמר את חבריה מעבר לסקרנות הראשונית, הקהילה חייבת לספק להם ערך פונקציונלי או רגשי ברור.
              </p>
              <p>
                היא אינה מרחב שמיועד ל"כולם", אלא נבנית סביב קהל יעד ספציפי מתוך הבנה עמוקה של המניעים, החסמים והכאבים שלו.
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. Progressive Setup Tabs Layout (Steps 2 to 9)
  const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })).getHours();
  let greeting = "שלום";
  if (hour >= 5 && hour < 12) greeting = "בוקר טוב";
  else if (hour >= 12 && hour < 17) greeting = "צהריים טובים";
  else if (hour >= 17 && hour < 21) greeting = "ערב טוב";
  else greeting = "לילה טוב";

  const showBranding = activeStep >= 2;
  const showSocial = activeStep >= 6;
  const showContact = activeStep >= 7;
  const showCommunity = activeStep >= 8;
  const showServices = activeStep >= 9;

  return (
    <div className="space-y-6 text-right pb-8" dir="rtl">
      
      {/* Split Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Right Column: Forms / Onboarding Tabs (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="px-4 md:px-2 mt-2 mb-2 space-y-3">
            <div className="text-base md:text-lg font-medium text-white drop-shadow-sm">
              {greeting}, {userName} ✨
            </div>
          </div>

          {/* Branding Tab */}
          {showBranding && (
            <div id="tab-container-branding" className="scroll-mt-4">
              <BrandingTab 
                onSave={handleSaveSuccess} 
                activeStep={activeStep}
                settings={settings}
                isOpen={openTab === "branding"}
                onToggle={() => setOpenTab(openTab === "branding" ? null : "branding")}
                isCompleted={activeStep >= 6}
              />
            </div>
          )}

          {/* Social Networks Tab */}
          {showSocial && (
            <div id="tab-container-social" className="scroll-mt-4">
              <SocialNetworksTab 
                onSave={handleSaveSuccess}
                activeStep={activeStep}
                settings={settings}
                isOpen={openTab === "social"}
                onToggle={() => setOpenTab(openTab === "social" ? null : "social")}
                isCompleted={activeStep >= 7}
              />
            </div>
          )}

          {/* Contact Details Tab */}
          {showContact && (
            <div id="tab-container-contact" className="scroll-mt-4">
              <ContactDetailsTab 
                onSave={handleSaveSuccess}
                activeStep={activeStep}
                settings={settings}
                isOpen={openTab === "contact"}
                onToggle={() => setOpenTab(openTab === "contact" ? null : "contact")}
                isCompleted={activeStep >= 8}
              />
            </div>
          )}

          {/* Create Community Tab */}
          {showCommunity && (
            <div id="tab-container-community" className="scroll-mt-4">
              <CreateCommunityTab 
                onSave={handleSaveSuccess}
                activeStep={activeStep}
                settings={settings}
                isOpen={openTab === "community"}
                onToggle={() => setOpenTab(openTab === "community" ? null : "community")}
                isCompleted={activeStep >= 9}
              />
            </div>
          )}

          {/* Services Tab */}
          {showServices && (
            <div id="tab-container-services" className="scroll-mt-4">
              <ServicesTab 
                onSave={handleSaveSuccess}
                activeStep={activeStep}
                settings={settings}
                companyServices={services}
                isOpen={openTab === "services"}
                onToggle={() => setOpenTab(openTab === "services" ? null : "services")}
                isCompleted={activeStep >= 10}
              />
            </div>
          )}
        </div>

        {/* Left Column: Desktop-only Sidebar (lg:col-span-1) */}
        <div className="hidden lg:flex flex-col gap-6 sticky top-8">
          
          {/* Michael's Guidance Card */}
          <div className="bg-[#181818] border border-amber-500/20 rounded-[2rem] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-md">
                <div className="w-full h-full rounded-full bg-[#181818] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">מיכאל המאמן</h3>
                <p className="text-[10px] text-amber-500/80 font-medium">ליווי צעד אחר צעד</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3 space-y-2">
              {openTab === "branding" && (
                <>
                  <p className="font-bold text-white text-sm">מיתוג וזהות הקהילה</p>
                  <p>כדי לבנות קהילה משמעותית, עלינו להגדיר תחילה את שמה, את החזון שלה ואת הסלוגן שמלווה אותה.</p>
                  <p>המיתוג הנכון יעזור לחברי הקהילה להבין מיד את הערך והערכים שאתה מביא עימך.</p>
                </>
              )}
              {openTab === "social" && (
                <>
                  <p className="font-bold text-white text-sm">חיבור לרשתות חברתיות</p>
                  <p>הרשתות החברתיות הן הצינורות המרכזיים דרכם חברי הקהילה יתקשרו איתך ויצרכו את התכנים.</p>
                  <p>חיבור הקישורים לדף הנחיתה של הקהילה מאפשר הצטרפות מהירה ופשוטה.</p>
                </>
              )}
              {openTab === "contact" && (
                <>
                  <p className="font-bold text-white text-sm">פרטי יצירת קשר</p>
                  <p>נגישות היא מפתח ליצירת אמון. פרטי הקשר שלך מאפשרים לחברים פוטנציאליים ליצור קשר ישיר, להציע הצעות או לבקש עזרה.</p>
                </>
              )}
              {openTab === "community" && (
                <>
                  <p className="font-bold text-white text-sm">הגדרת קהל היעד</p>
                  <p>קהילה מוצלחת פונה לקהל יעד מדויק ומבינה את הכאבים, הצרכים והמניעים שלו.</p>
                  <p>כאן אנו מעצבים את הלב של הקהילה - מי הם האנשים שתרצה לחבר ביניהם?</p>
                </>
              )}
              {openTab === "services" && (
                <>
                  <p className="font-bold text-white text-sm">יצירת דפי תוכן ושירותים</p>
                  <p>דפי שירות הם עמודי נחיתה ייעודיים שנבנים במיוחד עבור הקהילה שלך בעזרת הבינה המלאכותית.</p>
                  <p>באמצעותם תוכל להציע הרשמה למפגשים, תרומות, תכני העשרה ופעילויות שונות.</p>
                </>
              )}
              {!openTab && (
                <p>בחר באחת מהכרטיסיות מימין כדי לראות את ההסברים ואת תהליך ההתקדמות של המערכת.</p>
              )}
            </div>
          </div>

          {/* Stats Badges Section (Re-enabled on desktop) */}
          <div className="bg-[#181818] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-xs text-slate-400 tracking-wider uppercase">נתונים וביצועים</h3>
            
            <div className="flex flex-col gap-3">
              <StatBadge 
                icon={<Users className="w-4 h-4 text-indigo-400" />} 
                value={contactCount} 
                label="חברי קהילה ב-CRM" 
                description="אנשי קשר רשומים"
                badgeColorClass="bg-indigo-500/10 border-indigo-500/20"
              />
              <StatBadge 
                icon={<Globe className="w-4 h-4 text-purple-400" />} 
                value={services.length} 
                label="דפי שירות" 
                description="עמודי תוכן פעילים"
                badgeColorClass="bg-purple-500/10 border-purple-500/20"
              />
              <StatBadge 
                icon={<Coins className="w-4 h-4 text-emerald-400" />} 
                value={`₪${totalSpentResult.toLocaleString("he-IL")}`} 
                label="עסקאות ותרומות" 
                description="סך ההכנסות שנתקבלו"
                badgeColorClass="bg-emerald-500/10 border-emerald-500/20"
              />
              <StatBadge 
                icon={<ShieldCheck className="w-4 h-4 text-blue-400" />} 
                value="תקין" 
                label="מצב חיבורים" 
                description="שרת, מסד נתונים ו-API"
                badgeColorClass="bg-blue-500/10 border-blue-500/20"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
