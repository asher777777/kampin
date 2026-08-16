"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Globe, Check, Trash2, Save } from "lucide-react";
import { saveGlobalSettings, GlobalSettings } from "@/features/settings/actions";

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

export function SocialNetworksTab({
  onSave,
  activeStep,
  settings,
  isOpen,
  onToggle,
  isCompleted
}: {
  onSave?: () => void;
  activeStep: number;
  settings: GlobalSettings | null;
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [openSocialSubTab, setOpenSocialSubTab] = useState<string | null>(null);

  const getSocialsSummary = () => {
    const active: string[] = [];
    if (settings?.hasFacebook === "yes" && settings?.contactFacebook) active.push("פייסבוק");
    if (settings?.hasInstagram === "yes" && settings?.contactInstagram) active.push("אינסטגרם");
    if (settings?.hasTikTok === "yes" && settings?.contactTikTok) active.push("טיקטוק");
    if (settings?.hasYouTube === "yes" && settings?.contactYouTube) active.push("יוטיוב");
    if (settings?.hasLinkedIn === "yes" && settings?.contactLinkedIn) active.push("לינקידין");
    return active.length > 0 ? active.slice(0, 2).join(", ") : "אין רשתות";
  };

  const handleSetSocialHasAccount = async (hasField: keyof GlobalSettings, yesNo: "yes" | "no") => {
    const update: any = { [hasField]: yesNo };
    if (yesNo === "no") {
      const linkField = hasField.replace("has", "contact") as keyof GlobalSettings;
      update[linkField] = "";
    }
    await saveGlobalSettings(update);
    onSave?.();
  };

  const handleSaveSocialLink = async (field: keyof GlobalSettings, value: string) => {
    await saveGlobalSettings({ [field]: value });
    onSave?.();
  };

  const socialNetworks = [
    {
      id: "facebook",
      name: "פייסבוק",
      hasField: "hasFacebook" as const,
      linkField: "contactFacebook" as const,
      baseUrl: "https://facebook.com",
      label: "קישור לעמוד"
    },
    {
      id: "instagram",
      name: "אינסטגרם",
      hasField: "hasInstagram" as const,
      linkField: "contactInstagram" as const,
      baseUrl: "https://instagram.com",
      label: "קישור לעמוד"
    },
    {
      id: "tiktok",
      name: "טיקטוק",
      hasField: "hasTikTok" as const,
      linkField: "contactTikTok" as const,
      baseUrl: "https://tiktok.com",
      label: "קישור לעמוד הטיקטוק"
    },
    {
      id: "youtube",
      name: "יוטיוב",
      hasField: "hasYouTube" as const,
      linkField: "contactYouTube" as const,
      baseUrl: "https://youtube.com",
      label: "קישור לערוץ"
    },
    {
      id: "linkedin",
      name: "לינקידין",
      hasField: "hasLinkedIn" as const,
      linkField: "contactLinkedIn" as const,
      baseUrl: "https://linkedin.com",
      label: "קישור לעמוד"
    }
  ];

  return (
    <div className="w-full border border-white/5 bg-[#181818] rounded-2xl">
      <div className="relative">
        <div className={`w-full bg-[#181818] transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md border-b border-white/5 rounded-t-2xl' : 'rounded-2xl'}`} dir="rtl">
          <button
            type="button"
            onClick={(e) => {
              onToggle();
              if (!isOpen) scrollToTop(e);
            }}
            className={`w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-blue-400'}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base">באיזה רשתות הקהילה שלך נמצאת</span>
                {isCompleted && (
                  <span className="text-[11px] text-emerald-400 font-semibold mt-0.5 font-sans">
                    הושלם: {getSocialsSummary()}
                  </span>
                )}
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {isOpen && settings && (
          <div className="p-4 bg-[#111] animate-in fade-in duration-200 space-y-4 rounded-b-2xl">
            <div className="flex flex-col gap-3">
              {socialNetworks.map((net) => (
                <div key={net.id} className="border border-white/5 rounded-xl bg-black/20 overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => setOpenSocialSubTab(openSocialSubTab === net.id ? null : net.id)}
                    className="w-full p-3.5 flex items-center justify-between text-right text-white font-semibold hover:bg-white/5 transition"
                  >
                    <span>{net.name}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSocialSubTab === net.id ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {openSocialSubTab === net.id && (
                    <div className="p-4 border-t border-white/5 bg-[#111] space-y-4 animate-in fade-in duration-200">
                      {!settings[net.hasField] ? (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-300">יש לך חשבון?</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetSocialHasAccount(net.hasField, "yes")}
                              className="flex-1 py-2 px-4 rounded-xl border border-white/10 hover:border-indigo-500/50 bg-[#181818] text-slate-200 font-bold hover:text-white transition text-center text-xs"
                            >
                              כן
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetSocialHasAccount(net.hasField, "no")}
                              className="flex-1 py-2 px-4 rounded-xl border border-white/10 hover:border-indigo-500/50 bg-[#181818] text-slate-200 font-bold hover:text-white transition text-center text-xs"
                            >
                              לא
                            </button>
                          </div>
                        </div>
                      ) : settings[net.hasField] === "no" ? (
                        <div className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-xl">
                          <span className="text-slate-400 text-xs">אין חשבון ברשת זו</span>
                          <button
                            type="button"
                            onClick={() => handleSetSocialHasAccount(net.hasField, null as any)}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-white/5 rounded-xl transition shrink-0"
                            title="שנה תשובה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-200 block">{net.label}</label>
                            <button
                              type="button"
                              onClick={() => handleSetSocialHasAccount(net.hasField, null as any)}
                              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                              title="מחק ועבור לשאלה"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>אפס בחירה</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              defaultValue={settings[net.linkField] || ""}
                              onBlur={(e) => handleSaveSocialLink(net.linkField, e.target.value)}
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors text-left"
                              placeholder="https://..."
                            />
                            <button 
                              type="button"
                              onClick={(e) => {
                                const val = (e.currentTarget.previousSibling as HTMLInputElement).value;
                                handleSaveSocialLink(net.linkField, val);
                              }}
                              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition shrink-0"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="pt-1">
                            <a 
                              href={net.baseUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline hover:text-indigo-300 transition"
                            >
                              פתח את {net.name} לקבלת הקישור ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeStep === 6 && (
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await saveGlobalSettings({ socialSetupCompleted: true });
                    onSave?.();
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span>סיום והמשך לפרטי התקשרות</span>
                  <Save className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
