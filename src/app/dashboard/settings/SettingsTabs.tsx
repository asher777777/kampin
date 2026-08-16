"use client";

import { useState } from "react";
import { UserProfileSettingsForm } from "@/features/settings/components/UserProfileSettingsForm";
import { KesherSettingsForm } from "@/features/kesher/KesherSettingsForm";
import { AiSettingsForm } from "@/features/ai/AiSettingsForm";
import { WhatsAppSettingsForm } from "@/features/whatsapp/components/WhatsAppSettingsForm";
import { GoogleSettingsCard } from "./GoogleSettingsCard";
import { AccountSettingsForm } from "@/features/users/components/AccountSettingsForm";
import { CreditCard, Bot, MessageCircle, CalendarDays, UserCog, User, ChevronDown, ChevronUp } from "lucide-react";

interface SettingsTabsProps {
  isGoogleConnected: boolean;
}

type TabType = "profile" | "kesher" | "google" | "whatsapp" | "ai" | "account";

export function SettingsTabs({ isGoogleConnected }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  const tabs = [
    { id: "profile" as const, label: "פרופיל משתמש", icon: User, colorClass: "text-purple-400" },
    { id: "kesher" as const, label: "סליקה (קשר)", icon: CreditCard, colorClass: "text-blue-400" },
    { id: "google" as const, label: "יומן Google", icon: CalendarDays, colorClass: "text-indigo-400" },
    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle, colorClass: "text-emerald-400" },
    { id: "ai" as const, label: "Gemini AI", icon: Bot, colorClass: "text-amber-400" },
    { id: "account" as const, label: "הגדרות חשבון", icon: UserCog, colorClass: "text-purple-400" },
  ];

  return (
    <div className="flex flex-col md:gap-4 w-full max-w-3xl mx-auto" dir="rtl">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <div key={tab.id} className="md:border border-white/5 bg-[#181818] md:rounded-2xl overflow-hidden shadow-sm group border-b last:border-b-0 md:border-b">
            <button
              onClick={() => setActiveTab(isActive ? ("" as any) : tab.id)}
              className="w-full p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-base cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl bg-white/5 ${tab.colorClass}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <span>{tab.label}</span>
              </div>
              {isActive ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-white" />}
            </button>

            {isActive && (
              <div className="p-6 bg-[#111] border-t border-white/5 animate-in fade-in duration-200">
                <div className="mb-6 relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-10 bg-current ${tab.colorClass}`} />
                  {tab.id === "profile" && <p className="text-sm text-gray-400">ניהול פרטים אישיים, לוגו, נתוני התקשרות ורשתות חברתיות של האתר.</p>}
                  {tab.id === "kesher" && <p className="text-sm text-gray-400">חיבור למערכת קשר לטובת קבלות וסליקה.</p>}
                  {tab.id === "google" && <p className="text-sm text-gray-400">חיבור לחשבון גוגל לניהול פגישות ומשימות.</p>}
                  {tab.id === "whatsapp" && <p className="text-sm text-gray-400">הגדרת חיבור Green API לשליחת הודעות אוטומטיות.</p>}
                  {tab.id === "ai" && <p className="text-sm text-gray-400">חיבור המערכת למנוע יצירת התוכן החכם של Google.</p>}
                  {tab.id === "account" && <p className="text-sm text-gray-400">ניהול סיסמה והגדרות אבטחה של המשתמש שלך.</p>}
                </div>
                
                {tab.id === "profile" && <UserProfileSettingsForm />}
                {tab.id === "kesher" && <KesherSettingsForm />}
                {tab.id === "google" && <GoogleSettingsCard isConnected={isGoogleConnected} />}
                {tab.id === "whatsapp" && <WhatsAppSettingsForm />}
                {tab.id === "ai" && <AiSettingsForm />}
                {tab.id === "account" && <AccountSettingsForm />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
