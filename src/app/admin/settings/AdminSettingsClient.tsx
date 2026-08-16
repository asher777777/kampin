"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { getGlobalConfigs, saveGlobalConfigs } from "./actions";
import { getSystemFieldLabels, saveSystemFieldLabels } from "@/features/crm/actions";
import { Folder, Loader2 } from "lucide-react";

export function AdminSettingsClient() {
  const [configs, setConfigs] = useState<any>({});
  const [crmLabels, setCrmLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      getGlobalConfigs(),
      getSystemFieldLabels()
    ]).then(([configsData, labelsData]) => {
      setConfigs(configsData || {});
      setCrmLabels(labelsData || {});
      setIsLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setIsSaved(false);
    try {
      await Promise.all([
        saveGlobalConfigs(configs),
        saveSystemFieldLabels(crmLabels)
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000); // revert to white folder after 3 sec
    } catch (e: any) {
      alert("שגיאה בשמירה: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] rounded-[2rem] border border-amber-500/20 shadow-2xl p-8 max-w-2xl mx-auto relative min-h-[60vh] flex flex-col justify-between">
      
      <div className="space-y-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-amber-500 mb-2">הגדרות API גלובליות</h2>
          <p className="text-sm text-gray-400">הכנס את המפתחות למערכות השונות. אלו ישמשו כברירת מחדל לכל המשתמשים.</p>
        </div>

        {/* Google AI */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">מפתח API (Google AI Key)</label>
            <Input
              type="text"
              value={configs.googleAiKey || ""}
              onChange={(e) => {
                setConfigs({ ...configs, googleAiKey: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              placeholder="AIzaSy..."
              dir="ltr"
            />
          </div>
        </div>

        {/* Kesher */}
        <div className="space-y-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-6"></div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">שם משתמש לקשר</label>
            <Input
              type="text"
              value={configs.kesherUserName || ""}
              onChange={(e) => {
                setConfigs({ ...configs, kesherUserName: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">סיסמה / API Key לקשר</label>
            <Input
              type="password"
              value={configs.kesherApiKey || ""}
              onChange={(e) => {
                setConfigs({ ...configs, kesherApiKey: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">מספר דף תשלום (Payment Page ID)</label>
            <Input
              type="text"
              value={configs.kesherPaymentPageId || ""}
              onChange={(e) => {
                setConfigs({ ...configs, kesherPaymentPageId: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">טוקן איזיקאונט (EzCount Token)</label>
            <Input
              type="password"
              value={configs.kesherEzCountToken || ""}
              onChange={(e) => {
                setConfigs({ ...configs, kesherEzCountToken: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
        </div>

        {/* Green API */}
        <div className="space-y-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-6"></div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">Instance ID (Green API)</label>
            <Input
              type="text"
              value={configs.greenApiInstanceId || ""}
              onChange={(e) => {
                setConfigs({ ...configs, greenApiInstanceId: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">API Token Instance (Green API)</label>
            <Input
              type="password"
              value={configs.greenApiToken || ""}
              onChange={(e) => {
                setConfigs({ ...configs, greenApiToken: e.target.value });
                setIsSaved(false);
              }}
              className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
              dir="ltr"
            />
          </div>
        </div>

        {/* CRM System Labels */}
        <div className="space-y-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-6"></div>
          <h3 className="text-xl font-bold text-amber-500 mb-4">תוויות שדות מערכת (CRM)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">שם פרטי</label>
              <Input
                type="text"
                value={crmLabels.conta_name || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_name: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="שם פרטי *"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">שם משפחה</label>
              <Input
                type="text"
                value={crmLabels.conta_last_name || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_last_name: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="שם משפחה"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">טלפון נייד</label>
              <Input
                type="text"
                value={crmLabels.conta_phone || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_phone: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="טלפון נייד *"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">אימייל</label>
              <Input
                type="text"
                value={crmLabels.conta_email || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_email: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="דואר אלקטרוני"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">עיר</label>
              <Input
                type="text"
                value={crmLabels.conta_city || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_city: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="עיר"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">רחוב</label>
              <Input
                type="text"
                value={crmLabels.conta_street || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_street: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="רחוב"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">שם החברה</label>
              <Input
                type="text"
                value={crmLabels.conta_company || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_company: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="שם החברה / ארגון"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-amber-500 mb-2 transition-all">תפקיד</label>
              <Input
                type="text"
                value={crmLabels.conta_title || ""}
                onChange={(e) => {
                  setCrmLabels({ ...crmLabels, conta_title: e.target.value });
                  setIsSaved(false);
                }}
                className="rounded-2xl bg-black border-amber-500/50 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all h-12"
                placeholder="תפקיד"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center pb-4">
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-16 h-16 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors focus:outline-none"
          title="שמור שינויים"
        >
          {isSaving ? (
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          ) : (
            <Folder 
              className={`w-10 h-10 transition-colors duration-500 ${isSaved ? "text-amber-500 fill-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "text-white hover:text-gray-300"}`} 
              strokeWidth={1.5}
            />
          )}
        </button>
      </div>
    </div>
  );
}
