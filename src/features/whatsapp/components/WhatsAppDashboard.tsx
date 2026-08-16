"use client";

import { useState } from "react";
import { ConnectionTab } from "./ConnectionTab";
import { GroupSendTab } from "./GroupSendTab";
import { HistoryTab } from "./HistoryTab";
import { Link2, MessageSquare, History } from "lucide-react";

type TabName = "connection" | "groupsend" | "history";

export function WhatsAppDashboard() {
  const [activeTab, setActiveTab] = useState<TabName>("connection");

  const tabs = [
    { id: "connection" as TabName, name: "חיבור ומצב", icon: Link2 },
    { id: "groupsend" as TabName, name: "שליחה קבוצתית", icon: MessageSquare },
    { id: "history" as TabName, name: "היסטוריית קמפיינים", icon: History },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Subpage Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
          ממשק ניהול WhatsApp (Green API)
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          חבר את מופע הוואטסאפ שלך, סנן ושלח קמפיינים מותאמים אישית ועקוב אחר דוחות מסירה ושליפות.
        </p>
      </div>

      {/* Internal Navigation tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto scrollbar-none py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 font-black text-sm border-b-2 transition-all shrink-0 ${
                isActive 
                  ? "border-emerald-500 text-emerald-600" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Active Tab Screen */}
      <div className="mt-6">
        {activeTab === "connection" && <ConnectionTab />}
        {activeTab === "groupsend" && <GroupSendTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
