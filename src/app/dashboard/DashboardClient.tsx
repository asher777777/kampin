"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Coins, 
  Globe, 
  ShieldCheck, 
} from "lucide-react";
import { StatBadge } from "@/components/ui/StatBadge";
import { getGlobalSettings, GlobalSettings } from "@/features/settings/actions";
import { getCompanyServices } from "@/features/company-services/actions";

interface DashboardClientProps {
  initialSettings: GlobalSettings;
  initialServices: any[];
  contactCount: number;
  totalSpentResult: number;
  userName: string;
}

export function DashboardClient({
  initialSettings,
  initialServices,
  contactCount,
  totalSpentResult,
  userName,
}: DashboardClientProps) {
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [services, setServices] = useState<any[]>(initialServices);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })).getHours();
  let greeting = "שלום";
  if (hour >= 5 && hour < 12) greeting = "בוקר טוב";
  else if (hour >= 12 && hour < 17) greeting = "צהריים טובים";
  else if (hour >= 17 && hour < 21) greeting = "ערב טוב";
  else greeting = "לילה טוב";

  return (
    <div className="space-y-6 text-right pb-8" dir="rtl">
      {/* Greeting & Guide Progress Banner */}
      <div className="px-4 md:px-2 mt-8 mb-2 space-y-3">
        <div className="text-base md:text-lg font-medium text-white drop-shadow-sm">
          {greeting}, {userName} ✨
        </div>
      </div>

      {/* Stats Badges Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 w-full pt-4 px-4 md:px-0">
        <StatBadge 
          icon={<Users className="w-5 h-5 text-indigo-400" />} 
          value={contactCount} 
          label="חברי קהילה ב-CRM" 
          description="מספר אנשי הקשר וחברי הקהילה הרשומים במערכת ה-CRM"
          badgeColorClass="bg-indigo-500/10 border-indigo-500/20"
        />
        <StatBadge 
          icon={<Globe className="w-5 h-5 text-purple-400" />} 
          value={services.length} 
          label="עמודי שירות ודפים" 
          description="עמודי שירות ודפי נחיתה פעילים באתר שנוצרו על ידי ה-AI"
          badgeColorClass="bg-purple-500/10 border-purple-500/20"
        />
        <StatBadge 
          icon={<Coins className="w-5 h-5 text-emerald-400" />} 
          value={`₪${totalSpentResult.toLocaleString("he-IL")}`} 
          label="סה״כ תרומות/עסקאות" 
          description="סך התרומות והתשלומים שהתקבלו החודש מחברי הקהילה ב-CRM"
          badgeColorClass="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatBadge 
          icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} 
          value="תקין" 
          label="תקינות המערכת" 
          description="מצב חיבורי השרת, ה-Database וה-API של Gemini"
          badgeColorClass="bg-blue-500/10 border-blue-500/20"
        />
      </div>
    </div>
  );
}
