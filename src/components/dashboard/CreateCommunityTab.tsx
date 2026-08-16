"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Users, Check, Loader2 } from "lucide-react";
import { getGlobalSettings, saveGlobalSettings, GlobalSettings, CommunityData } from "@/features/settings/actions";
import { getAudiences, addAudience, Audience } from "@/features/company-services/actions";
import { getGoals, addGoal, GoalGlossaryItem } from "@/features/company-services/goals-actions";
import { CommunityEditor } from "./CommunityEditor";

const scrollToTop = (e: React.MouseEvent<HTMLElement>) => {
  const target = e.currentTarget.parentElement;
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
};

export function CreateCommunityTab({ 
  onSave, 
  activeStep, 
  settings: propSettings,
  isOpen,
  onToggle,
  isCompleted
}: { 
  onSave?: () => void; 
  activeStep?: number; 
  settings?: GlobalSettings; 
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
}) {
  const [settings, setSettings] = useState<GlobalSettings | null>(propSettings || null);
  const [loading, setLoading] = useState(!propSettings);
  
  // Glossaries
  const [audiencesList, setAudiencesList] = useState<Audience[]>([]);
  const [goalsList, setGoalsList] = useState<GoalGlossaryItem[]>([]);
  
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  useEffect(() => {
    const fetchGlossary = async () => {
      const auds = await getAudiences();
      setAudiencesList(auds);
      const gls = await getGoals();
      setGoalsList(gls);
    };
    fetchGlossary();

    if (propSettings) {
      setSettings(propSettings);
      setLoading(false);
    } else {
      const load = async () => {
        const data = await getGlobalSettings();
        setSettings(data);
        setLoading(false);
      };
      load();
    }
  }, [propSettings]);

  const handleUpdateCommunity = async (updated: CommunityData, index: number, nextField?: string) => {
    const currentCommunities = settings?.communities || [];
    const newCommunities = [...currentCommunities];
    newCommunities[index] = updated;

    await saveGlobalSettings({ communities: newCommunities });
    if (onSave && (!nextField || nextField === "null")) {
      onSave(); // Trigger dashboard reload
    }
  };

  const handleAddCommunity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCommunities = settings?.communities || [];
    const newCommunity: CommunityData = {
      id: Date.now().toString(),
      name: "",
      icon: "",
      targetAudiences: [],
      goals: [],
      brandColor: "#4f46e5"
    };
    
    // We don't save to DB until they edit it, but we can add it to local state
    setSettings((prev) => prev ? { ...prev, communities: [newCommunity, ...currentCommunities] } : null);
    setExpandedIndex(0);
    if (!isOpen) onToggle();
  };

  const handleAddAudience = async (name: string): Promise<string | null> => {
    const res = await addAudience(name);
    if (res.success && res.id) {
      setAudiencesList([...audiencesList, { id: res.id, name, ownerId: "" }]);
      return res.id;
    }
    return null;
  };

  const handleAddGoal = async (name: string, icon: string): Promise<string | null> => {
    const res = await addGoal(name, icon);
    if (res.success && res.id) {
      setGoalsList([...goalsList, { id: res.id, name, icon, ownerId: "" }]);
      return res.id;
    }
    return null;
  };

  const communities = settings?.communities || [];

  return (
    <div className="w-full border border-white/5 bg-[#181818] rounded-2xl">
      <div className="relative">
        {/* Sticky Header */}
        <div className={`w-full bg-[#181818] transition-all duration-300 ${isOpen ? 'sticky top-0 z-30 shadow-md border-b border-white/5 rounded-t-2xl' : 'rounded-2xl'}`} dir="rtl">
          <div
            onClick={(e) => {
              onToggle();
              if (!isOpen) scrollToTop(e as any);
            }}
            className={`w-full p-4 sm:p-5 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white cursor-pointer transition-colors ${isOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <div className="flex items-center gap-4 text-right">
              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-purple-400'}`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base">הקהילות שלי</span>
                  <button 
                    onClick={handleAddCommunity}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors flex items-center justify-center"
                    title="הוסף קהילה חדשה"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {communities.filter(c => c.name).length > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold mt-0.5 font-sans">
                    {communities.filter(c => c.name).map(c => c.name).join(", ")}
                  </span>
                )}
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </div>
        </div>

        {/* Outer Tab Content */}
        {isOpen && (
          <div className="w-full bg-[#111] animate-in fade-in duration-200 rounded-b-2xl flex flex-col p-4 gap-4" dir="rtl">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : communities.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <p>אין לך קהילות עדיין.</p>
                <button 
                  onClick={handleAddCommunity}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors"
                >
                  צור קהילה ראשונה
                </button>
              </div>
            ) : (
              communities.map((community, index) => (
                <CommunityEditor 
                  key={community.id}
                  community={community}
                  isOpen={expandedIndex === index}
                  onToggle={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
                  isCompleted={isCompleted}
                  audiencesList={audiencesList}
                  goalsList={goalsList}
                  onAddAudience={(name) => handleAddAudience(name).then(() => name)}
                  onAddGoal={(name, icon) => handleAddGoal(name, icon).then(() => name)}
                  onUpdate={(updated, nextField) => handleUpdateCommunity(updated, index, nextField)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
