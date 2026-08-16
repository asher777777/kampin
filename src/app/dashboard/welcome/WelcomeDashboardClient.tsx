"use client";

import React, { useState } from "react";
import { Plus, Users, ShoppingCart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { OnboardingWizard } from "./OnboardingWizard";

interface WelcomeDashboardClientProps {
  userName: string;
  communities: any[];
  totalContacts: number;
}

export function WelcomeDashboardClient({ userName, communities, totalContacts }: WelcomeDashboardClientProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  if (isWizardOpen) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-[#111]">
        <OnboardingWizard onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-slate-50" dir="rtl">
      {/* Top Navigation Tabs */}
      <div className="flex items-center justify-end p-6 pb-2 gap-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border shadow-sm text-indigo-600 font-bold text-sm">
          <Users className="w-4 h-4" />
          קהילות ({communities.length})
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-500 font-medium text-sm hover:bg-slate-100 rounded-full transition">
          <Users className="w-4 h-4" />
          אנשי קשר ({totalContacts})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 flex-1 flex flex-col w-full max-w-full">
        <div className="flex items-center gap-4 mb-8 sm:mb-12">
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 shrink-0"
          >
            <Plus className="w-8 h-8" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1e1b4b] tracking-tight">הקהילה שלי</h1>
        </div>
        
        <div className="flex-1 flex flex-col mt-4">
          {communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-4">
              <div className="bg-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="w-10 h-10 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-slate-800">ברוך הבא {userName}!</h2>
              <p className="text-lg text-slate-500 font-medium mb-8">
                {userName}, עדיין אין לך קהילות
              </p>
              
              <button 
                onClick={() => setIsWizardOpen(true)}
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20 flex items-center gap-3"
              >
                <Plus className="w-6 h-6" />
                צור את הקהילה הראשונה שלך
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pl-2 w-full">
              {communities.map((community, idx) => (
                <div 
                  key={community.id || idx}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer w-full"
                >
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center transition">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                    <button className="w-10 h-10 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button className="w-10 h-10 rounded-full border border-indigo-100 text-indigo-500 hover:bg-indigo-50 flex items-center justify-center transition">
                       <Users className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-slate-800">{community.name || "קהילה ללא שם"}</span>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                       <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
