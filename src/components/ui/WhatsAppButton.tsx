"use client";

import { useState, useEffect } from "react";
import { 
  Phone, MessageCircle, Mail, Navigation, X, Info 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  phoneNumber?: string;
  defaultEmail?: string;
  facebookUrl?: string;
  address?: string;
}

// Local SVG Icon Components to avoid lucide-react import version issues
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const WhatsAppButton = ({
  phoneNumber = "0545947701",
  defaultEmail = "info@example.com",
  facebookUrl = "https://www.facebook.com/",
  address = "יצחק שדה 2, אזור",
}: WhatsAppButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSeoTitle(document.title || "מחולל הקהילות");
      setSeoDescription(
        document.querySelector('meta[name="description"]')?.getAttribute("content") || 
        "אנחנו כאן בשבילך לכל שאלה ועניין."
      );
      setCurrentUrl(window.location.href);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  // Ensure correct country code format for WhatsApp api
  const formattedPhoneForWhatsApp = cleanPhone.startsWith("0") 
    ? `972${cleanPhone.substring(1)}` 
    : cleanPhone.startsWith("972") 
      ? cleanPhone 
      : `972${cleanPhone}`;

  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  const whatsappUrl = `https://wa.me/${formattedPhoneForWhatsApp}?text=${encodeURIComponent("שלום, אשמח ליצור קשר.")}`;
  
  // SEO Share Links
  const shareText = `${seoTitle}\n${seoDescription}\n`;
  const shareWhatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + currentUrl)}`;
  const shareFacebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-[999] flex items-center gap-2.5 px-6 py-4.5 rounded-full shadow-2xl transition-all duration-300",
          "bg-secondary hover:bg-secondary/95 text-secondary-foreground hover:scale-105 active:scale-95 group cursor-pointer"
        )}
        aria-label="אנחנו כאן - צור קשר"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <span className="font-extrabold text-base tracking-wide">אנחנו כאן</span>
      </button>

      {/* Contact & Share Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative text-right animate-in zoom-in-95 duration-300 flex flex-col gap-5 text-white" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="space-y-1 mt-2">
              <h3 className="text-xl font-black text-white">אנחנו כאן בשבילך</h3>
              <p className="text-xs text-slate-400 font-medium">בחר דרך ליצירת קשר או שתף את העמוד</p>
            </div>

            {/* Contact Buttons Grid */}
            <div className="grid grid-cols-5 gap-3">
              {/* Phone */}
              <a 
                href={`tel:${phoneNumber}`}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-center group/item"
                title="טלפון"
              >
                <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-400 group-hover/item:scale-110 transition-transform">
                  <Phone size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1.5 max-sm:hidden">טלפון</span>
              </a>

              {/* WhatsApp */}
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-center group/item"
                title="WhatsApp"
              >
                <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-400 group-hover/item:scale-110 transition-transform">
                  <MessageCircle size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1.5 max-sm:hidden">וואטסאפ</span>
              </a>

              {/* Email */}
              <a 
                href={`mailto:${defaultEmail}`}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-center group/item"
                title="אימייל"
              >
                <div className="p-2.5 rounded-full bg-red-500/10 text-red-400 group-hover/item:scale-110 transition-transform">
                  <Mail size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1.5 max-sm:hidden">מייל</span>
              </a>

              {/* Facebook */}
              <a 
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-center group/item"
                title="פייסבוק"
              >
                <div className="p-2.5 rounded-full bg-blue-600/10 text-blue-500 group-hover/item:scale-110 transition-transform">
                  <FacebookIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1.5 max-sm:hidden">פייסבוק</span>
              </a>

              {/* Waze */}
              <a 
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-center group/item"
                title="וויז"
              >
                <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-400 group-hover/item:scale-110 transition-transform">
                  <Navigation size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-1.5 max-sm:hidden">וויז</span>
              </a>
            </div>

            {/* Separator */}
            <div className="h-px bg-slate-800 my-1" />

            {/* Share Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 pr-1">שתפו את העמוד</h4>
              <div className="flex flex-col gap-2">
                {/* Share to WhatsApp */}
                <a 
                  href={shareWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white transition-all shadow-md cursor-pointer"
                >
                  <MessageCircle size={18} />
                  <span>שתפו ב-WhatsApp</span>
                </a>

                {/* Share to Facebook */}
                <a 
                  href={shareFacebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white transition-all shadow-md cursor-pointer"
                >
                  <FacebookIcon className="w-[18px] h-[18px]" />
                  <span>שתפו ב-Facebook</span>
                </a>

                {/* Copy link for Instagram / Others */}
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-sm text-white border border-white/10 transition-all cursor-pointer"
                >
                  <InstagramIcon className="w-[18px] h-[18px]" />
                  <span>העתקת קישור לאינסטגרם</span>
                </button>
              </div>

              {copied && (
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold p-2 bg-indigo-950/40 border border-indigo-500/20 rounded-xl animate-in slide-in-from-bottom-2">
                  <Info size={14} className="shrink-0" />
                  <span>הקישור הועתק! תוכל לשתף אותו באינסטגרם.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
