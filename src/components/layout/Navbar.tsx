"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Heart, Menu, X, Phone, LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { useAuthStore } from "@/store/useAuthStore";
import { LoginModal } from "@/components/auth/LoginModal";
import Image from "next/image";

interface NavbarProps {
  layout?: "classic" | "center" | "left";
  logoUrl?: string;
  navLinks?: Array<{ name: string; href: string }>;
  companyName?: string;
  slogan?: string;
}

export const Navbar = ({ layout = "classic", logoUrl, navLinks, companyName, slogan }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isAuthenticated, logout } = useAuthStore();

  const defaultNavLinks = [
    { name: "בית", href: "/" },
    { name: "עמודי נחיתה", href: "/landing-pages" },
    { name: "שירותים", href: "/services-pages" },
    { name: "תוכן ו-SEO", href: "/content-pages" },
    { name: "צור קשר", href: "/contact" },
  ];

  const linksToUse = navLinks && navLinks.length > 0 ? navLinks : defaultNavLinks;

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const LogoSection = () => (
    <Link href="/" className="flex items-center gap-2 group shrink-0">
      {logoUrl ? (
        <div className="relative w-10 h-10 overflow-hidden rounded-md">
          <Image src={logoUrl} alt="Logo" fill className="object-contain" sizes="40px" />
        </div>
      ) : (
        <BrandIcon icon={Heart} size={32} />
      )}
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-primary leading-none">
          {companyName || "מחולל הקהילות"}
        </span>
        <span className="text-[10px] font-medium text-secondary-foreground tracking-widest uppercase">
          {slogan || "מערכת חכמה לניהול"}
        </span>
      </div>
    </Link>
  );

  const NavLinksSection = () => (
    <div className="hidden md:flex items-center justify-center gap-8 flex-1">
      {linksToUse.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="text-sm font-bold text-foreground/80 hover:text-primary transition-colors animate-in fade-in duration-200"
        >
          {link.name}
        </Link>
      ))}
    </div>
  );

  const ActionsSection = () => (
    <div className="hidden md:flex items-center gap-3 shrink-0">
      {mounted && (
        isAuthenticated ? (
          <>
            <Link 
              href="/auth-redirect"
              className="p-2 text-foreground/80 hover:text-primary transition-colors rounded-full hover:bg-secondary/20"
              title="לוח בקרה"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
            <button 
              onClick={logout}
              className="p-2 text-foreground/80 hover:text-primary transition-colors rounded-full hover:bg-secondary/20"
              title="התנתק"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="p-2 text-foreground/80 hover:text-primary transition-colors rounded-full hover:bg-secondary/20"
            title="התחבר"
          >
            <LogIn className="h-5 w-5" />
          </button>
        )
      )}
      <Button 
        variant="primary" 
        size="sm" 
        className="rounded-full px-6 shadow-md cursor-pointer"
        onClick={() => window.open("tel:0545947701")}
      >
        <Phone className="ml-2 h-4 w-4" />
        חיוג מהיר
      </Button>
    </div>
  );

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        isScrolled
          ? "bg-background/90 backdrop-blur-md border-b shadow-sm py-3"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {layout === "classic" && (
          <>
            <LogoSection />
            <NavLinksSection />
            <ActionsSection />
          </>
        )}
        
        {layout === "left" && (
          <>
            <ActionsSection />
            <NavLinksSection />
            <LogoSection />
          </>
        )}
        
        {layout === "center" && (
          <div className="w-full grid grid-cols-3 items-center">
            <div className="flex justify-start">
              <NavLinksSection />
            </div>
            <div className="flex justify-center">
              <LogoSection />
            </div>
            <div className="flex justify-end">
              <ActionsSection />
            </div>
          </div>
        )}

        {/* Mobile Toggle */}
        <button
          className={cn("md:hidden p-2 text-primary cursor-pointer", layout === "center" && "absolute right-6")}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300 shadow-xl">
          {linksToUse.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-lg font-bold"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-3 py-2 border-y border-border/50 my-2 text-right">
            {mounted && (
              isAuthenticated ? (
                <>
                  <Link
                    href="/auth-redirect"
                    className="flex items-center gap-2 text-foreground/80 hover:text-primary py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span>לוח בקרה</span>
                  </Link>
                  <button 
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-foreground/80 hover:text-primary py-1 text-right w-full font-medium cursor-pointer"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>התנתק</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-foreground/80 hover:text-primary py-1 cursor-pointer"
                >
                  <LogIn className="h-5 w-5" />
                  <span>התחבר</span>
                </button>
              )
            )}
          </div>
          <Button variant="primary" className="w-full cursor-pointer">
            צור קשר
          </Button>
        </div>
      )}
      
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </nav>
  );
};
