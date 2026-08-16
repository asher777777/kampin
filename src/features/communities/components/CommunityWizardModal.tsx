"use client";

import { useState } from "react";
import { Community } from "../types";
import { X, ChevronRight, MessageSquare, Bot } from "lucide-react";

export interface CommunityWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Community>) => Promise<void>;
  initialData?: Community;
}

const PURPOSE_OPTIONS = [
  { id: 'finance', circle: 'כספי', pill: 'הגדלת מחזור הרווחים' },
  { id: 'volunteers', circle: 'מתנדבים', pill: 'גיוס מתנדבים' },
  { id: 'external', circle: 'קשרי חוץ', pill: 'השגת משאבים' },
  { id: 'employees', circle: 'עובדים', pill: 'חיבור והרגשת שייכות' },
];

export function CommunityWizardModal({ isOpen, onClose, onSave, initialData }: CommunityWizardModalProps) {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState(initialData?.purpose || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step === 1) {
      if (!purpose) return alert("אנא בחר מטרה לקהילה");
      setIsLoading(true);
      await onSave({ purpose, isDraft: true, name: initialData?.name || "קהילה חדשה", color: initialData?.color || "#6366f1", icon: initialData?.icon || "Users" });
      setIsLoading(false);
      alert("שלב 1 נשמר! ממתינים לשאלה 2 מהמשתמש.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0" dir="rtl">
      <div className="bg-white w-full sm:max-w-2xl rounded-[2rem] h-auto max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Content Wrapper */}
        <div className="p-8 sm:p-10 flex-1 overflow-y-auto relative flex flex-col gap-10">
          
          {/* Header */}
          <div className="flex flex-col gap-4 relative z-10">
            <h2 className="text-2xl font-bold text-slate-900">צור את הקהילה הראשונה שלך</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-3 bg-slate-200 rounded-full"></div>
                <div className="h-1.5 w-10 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-sm font-bold text-slate-400">שלב 1 מתוך 2</p>
            </div>
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-10 animate-in fade-in duration-300 relative z-10">
              
              {/* Question 1 */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold text-slate-800">1. עבור מי אנחנו בונים את הקהילה?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option: Independent */}
                  <button 
                    onClick={() => setPurpose('independent')}
                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-200 ${
                      purpose === 'independent' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">עסק עצמאי / יחיד</h4>
                    <p className="text-xs text-slate-400 text-center">יוצרי תוכן, מאמנים, יועצים</p>
                  </button>
                  
                  {/* Option: Company */}
                  <button 
                    onClick={() => setPurpose('company')}
                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-200 ${
                      purpose === 'company' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">חברה / תאגיד</h4>
                    <p className="text-xs text-slate-400 text-center">עובדים, לקוחות B2B, ארגונים</p>
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold text-slate-800">2. מה המטרה המרכזית שלך?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Option: Income */}
                  <button 
                    onClick={() => setPurpose('income')}
                    className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl transition-all duration-200 ${
                      purpose === 'income' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
                    </div>
                    <h4 className={`font-bold text-sm ${purpose === 'income' ? 'text-slate-800' : 'text-slate-500'}`}>הכנסה וקורסים</h4>
                  </button>

                  {/* Option: Support */}
                  <button 
                    onClick={() => setPurpose('support')}
                    className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl transition-all duration-200 ${
                      purpose === 'support' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>
                    </div>
                    <h4 className={`font-bold text-sm ${purpose === 'support' ? 'text-slate-800' : 'text-slate-500'}`}>תמיכה ושימור</h4>
                  </button>

                  {/* Option: Networking */}
                  <button 
                    onClick={() => setPurpose('networking')}
                    className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl transition-all duration-200 ${
                      purpose === 'networking' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <h4 className={`font-bold text-sm ${purpose === 'networking' ? 'text-slate-800' : 'text-slate-500'}`}>חיבור ונטוורקינג</h4>
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* Footer Action Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleNext}
              disabled={isLoading || !purpose}
              className="flex items-center gap-2 bg-[#8faef9] text-white px-8 py-3.5 rounded-xl font-bold shadow-sm hover:bg-[#7b9ef8] transition-colors disabled:opacity-50"
            >
              המשך
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
