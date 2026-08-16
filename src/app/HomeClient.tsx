"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
const Hero = dynamic(() => import("@/components/sections/Hero").then(m => m.Hero), { ssr: true });
const ServicesGrid = dynamic(() => import("@/components/sections/ServicesGrid").then(m => m.ServicesGrid), { ssr: true });
const CommunitySection = dynamic(() => import("@/components/sections/CommunitySection").then(m => m.CommunitySection), { ssr: true });
const LivePostsGrid = dynamic(() => import("@/components/sections/LivePostsGrid").then(m => m.LivePostsGrid), { ssr: true });
const LandingSection = dynamic(() => import("@/components/sections/LandingSection").then(m => m.LandingSection), { ssr: true });
const VideoGallery = dynamic(() => import("@/components/sections/VideoGallery").then(m => m.VideoGallery), { ssr: true });
const ImageListingSection = dynamic(() => import("@/components/sections/ImageListingSection").then(m => m.ImageListingSection), { ssr: true });
const RichContentSection = dynamic(() => import("@/components/sections/RichContentSection").then(m => m.RichContentSection), { ssr: true });
const TimerSection = dynamic(() => import("@/components/sections/TimerSection").then(m => m.TimerSection), { ssr: true });
const PricingSection = dynamic(() => import("@/components/sections/PricingSection").then(m => m.PricingSection), { ssr: true });
const CourseBanner = dynamic(() => import("@/components/sections/CourseBanner").then(m => m.CourseBanner), { ssr: true });
const FaqSection = dynamic(() => import("@/components/sections/FaqSection").then(m => m.FaqSection), { ssr: true });
import { HomePageConfig } from "@/features/home/actions";
import { GlobalSettings } from "@/features/settings/actions";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { PageViewTracker } from "@/components/ui/PageViewTracker";

// Dynamically import the heavy editing interface so normal visitors never download it
const HomeEditor = dynamic(() => import("./HomeEditor").then(m => m.HomeEditor), { ssr: false });

interface HomeClientProps {
  initialConfig: HomePageConfig;
  initialGlobalSettings?: GlobalSettings;
  pageId?: string;
  collectionName?: string;
  canEdit?: boolean;
}

export function HomeClient({ initialConfig, initialGlobalSettings, pageId, collectionName, canEdit }: HomeClientProps) {
  const { isAuthenticated } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<HomePageConfig>(initialConfig);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    ...(initialGlobalSettings || { siteLogoUrl: "", headerLayout: "classic", theme: "navy", navLinks: [] }),
    ...(initialConfig.pageSettings || {}),
    // Ensure branding fields always use the freshest data from user settings, ignoring stale pageSettings
    siteLogoUrl: initialGlobalSettings?.siteLogoUrl || (initialConfig.pageSettings as any)?.siteLogoUrl || "",
    companyName: initialGlobalSettings?.companyName || (initialConfig.pageSettings as any)?.companyName || "",
    slogan: initialGlobalSettings?.slogan || (initialConfig.pageSettings as any)?.slogan || "",
  } as GlobalSettings);

  useEffect(() => {
    if ((globalSettings as any)?.branding && (config as any).branding) {
      if ((config as any).branding.logo !== (globalSettings as any).branding.logo ||
          (config as any).branding.primaryColor !== (globalSettings as any).branding.primaryColor ||
          (config as any).branding.fontFamily !== (globalSettings as any).branding.fontFamily) {
        setConfig(prevConfig => ({
          ...prevConfig,
          branding: {
            ...(prevConfig as any).branding,
            logo: (globalSettings as any).branding.logo,
            primaryColor: (globalSettings as any).branding.primaryColor,
            fontFamily: (globalSettings as any).branding.fontFamily
          }
        }));
      }
    }
  }, [(globalSettings as any)?.branding, (config as any).branding?.logo, (config as any).branding?.primaryColor, (config as any).branding?.fontFamily]);

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
        },
        sectionOrder: prev.sectionOrder ? (prev.sectionOrder.includes("faq") ? prev.sectionOrder : [...prev.sectionOrder, "faq"]) : ["hero", "mainContent", "services", "community", "pricing", "livePosts", "faq", "timer", "richContent", "landingSection"]
      }));
    }
  }, [config.faq]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("home_editor_scroll");
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
      sessionStorage.removeItem("home_editor_scroll");
    }
  }, [isEditing]);

  // Determine if the user is allowed to edit this page
  // By default, if canEdit is not passed, we default to false for safety
  const allowedToEdit = isAuthenticated && (canEdit ?? false);

  // If in editing mode, swap out for the dynamic editor component
  if (allowedToEdit && isEditing) {
    return (
      <HomeEditor
        initialConfig={initialConfig}
        initialGlobalSettings={initialGlobalSettings}
        config={config}
        setConfig={setConfig}
        globalSettings={globalSettings}
        setGlobalSettings={setGlobalSettings}
        setIsEditing={setIsEditing}
        pageId={pageId}
        collectionName={collectionName}
      />
    );
  }

  const renderSection = (sectionId: string) => {
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
            heroStyle={config.hero.heroStyle}
            flexDirection={config.hero.flexDirection}
            formMode={config.hero.formMode}
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
        return (
          <LivePostsGrid 
            id={config.livePosts.anchorId || "livePosts"} 
            layout={config.livePosts.layout} 
            customPages={config.livePosts.customPages} 
            title={config.livePosts.title}
            titleColor={config.livePosts.titleColor}
            description={config.livePosts.description}
            descriptionColor={config.livePosts.descriptionColor}
          />
        );
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
      case "videoGallery":
        const vGalleryConf = config.videoGallery || { visible: false, images: [], videoUrl: "", videoType: "youtube" as const, effect: "none" as const };
        if (!vGalleryConf.visible) return null;
        return (
          <VideoGallery
            id={vGalleryConf.anchorId || "videoGallery"}
            images={vGalleryConf.images}
            videoUrl={vGalleryConf.videoUrl}
            videoType={vGalleryConf.videoType}
            effect={vGalleryConf.effect}
            backgroundColor={vGalleryConf.backgroundColor || globalSettings.backgroundColor}
          />
        );
      case "imageListing":
        if (!config.imageListing || config.imageListing.visible === false || String(config.imageListing.visible) === "false") return null;
        return (
          <ImageListingSection
            id={config.imageListing.anchorId || "imageListing"}
            images={config.imageListing.images}
            imagesPerRow={config.imageListing.imagesPerRow}
            imagesPerRowMobile={config.imageListing.imagesPerRowMobile}
            form={config.imageListing.form}
            backgroundColor={config.imageListing.backgroundColor || globalSettings.backgroundColor}
            title={config.imageListing.title}
            titleColor={config.imageListing.titleColor}
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
              embeddingPostId={pageId}
              embeddingCollection={collectionName}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const finalWhatsApp = !config.community?.whatsappNumber || config.community.whatsappNumber === "972545947701"
    ? (globalSettings.contactWhatsApp || globalSettings.contactPhone || "972545947701")
    : config.community.whatsappNumber;

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

  return (
    <div className={`flex flex-col min-h-screen ${globalSettings.theme ? `theme-${globalSettings.theme}` : "theme-navy"}`} style={customStyle}>
      {((config as any).isHeaderVisible ?? true) && (
        <Navbar 
          layout={globalSettings.headerLayout} 
          logoUrl={globalSettings.siteLogoUrl} 
          navLinks={globalSettings.navLinks} 
          companyName={globalSettings.companyName}
          slogan={globalSettings.slogan}
        />
      )}
      
      {/* Admin Floating Edit Button */}
      {allowedToEdit && (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2.5">
          <Button 
            variant="primary" 
            size="lg" 
            className="rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white h-14 w-14 p-0 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={() => {
              sessionStorage.setItem("home_editor_scroll", window.scrollY.toString());
              setIsEditing(true);
            }}
            title="ערוך עמוד זה"
          >
            <Edit3 className="w-6 h-6" />
          </Button>
        </div>
      )}

      <main className="flex-grow">
        {pageId && <PageViewTracker slug={pageId} collectionName={collectionName || "services"} />}
        <div className="flex flex-col w-full">
          {(config.sectionOrder || ["hero", "mainContent", "services", "community", "livePosts", "landingSection", "pricing", "timer", "richContent"]).map((sectionId) => {
            const isHiddenOnMobile = config.mobileHiddenSections?.includes(sectionId);
            return (
              <div key={sectionId} className={isHiddenOnMobile ? "max-sm:hidden" : undefined}>
                {renderSection(sectionId)}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
      <WhatsAppButton 
        phoneNumber={finalWhatsApp}
        defaultEmail={globalSettings.contactEmail || "info@example.com"}
        facebookUrl={globalSettings.contactFacebook || "https://www.facebook.com/"}
        address={globalSettings.contactAddress || "יצחק שדה 2, אזור"}
      />
    </div>
  );
}
