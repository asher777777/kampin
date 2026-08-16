"use client";

import { useState, useEffect } from "react";
import { Community } from "@/features/communities/types";
import { createCommunity, updateCommunity, deleteCommunity } from "@/features/communities/actions";
import { CommunityEditor } from "@/components/dashboard/CommunityEditor";
import { getGlobalSettings, saveGlobalSettings } from "@/features/settings/actions";
import { addAudience, addGoal } from "@/features/company-services/actions";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Users, User, Menu } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";

interface CommunitiesClientProps {
  initialCommunities: Community[];
  initialStats: { active: number; trashed: number };
}

export function CommunitiesClient({ initialCommunities, initialStats }: CommunitiesClientProps) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<any | undefined>();
  const [settings, setSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    if (isModalOpen && !settings && !loadingSettings) {
      setLoadingSettings(true);
      getGlobalSettings().then(data => { setSettings(data); setLoadingSettings(false); });
    }
  }, [isModalOpen, settings, loadingSettings]);

  const handleCreate = () => {
    setEditingCommunity(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (community: Community) => {
    setEditingCommunity(community);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק קהילה זו?")) return;
    
    const res = await deleteCommunity(id);
    if (res.success) {
      setCommunities((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(res.error || "שגיאה במחיקה");
    }
  };

  const handleSave = async (data: Partial<Community>) => {
    if (editingCommunity?.id) {
      const res = await updateCommunity(editingCommunity.id, data);
      if (res.success) {
        setCommunities((prev) =>
          prev.map((c) => (c.id === editingCommunity.id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c))
        );
      } else {
        alert(res.error || "שגיאה בעדכון");
      }
    } else {
      const res = await createCommunity(data);
      if (res.success && res.id) {
        setCommunities((prev) => [{ id: res.id, ...data } as Community, ...prev]);
      } else {
        alert(res.error || "שגיאה ביצירה");
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 h-full overflow-y-auto pb-32" dir="rtl">
      
      {/* Header section */}
      <div className="flex flex-col gap-3 mb-8 mt-2 relative z-50">
        <div className="flex items-center gap-2 w-full pointer-events-auto bg-[#181818] backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/5">
          
          <div className="relative shrink-0">
            <Button 
              onClick={handleCreate}
              className="h-10 w-10 p-0 flex items-center justify-center rounded-full border-none shadow-md transition-colors bg-[#9333ea] hover:bg-purple-600"
              title="צור קהילה"
            >
              <Plus className="w-5 h-5 text-white transition-transform duration-300" strokeWidth={3} />
            </Button>
          </div>
          
          <div className="relative flex-1 flex justify-center">
             <div className="text-xl sm:text-2xl font-black !text-white tracking-tight">הקהילות שלך</div>
          </div>

          <div className="relative shrink-0">
            <Button
                variant="ghost"
                onClick={() => setTabsMenuOpen(!tabsMenuOpen)}
                className="h-10 w-10 p-0 rounded-full flex items-center justify-center hover:bg-[#222] text-gray-300 bg-[#181818] shadow-sm border border-white/5"
            >
                <Menu className="w-5 h-5" />
            </Button>

            {tabsMenuOpen && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setTabsMenuOpen(false)} />
                 <div className="absolute top-full left-0 mt-2 bg-[#181818] border border-white/5 shadow-2xl rounded-2xl p-2 z-50 flex flex-col w-48 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    <Link 
                      href="/dashboard/crm" 
                      onClick={() => setTabsMenuOpen(false)} 
                      className="flex items-center gap-3 px-3 py-3 w-full text-right text-sm text-gray-400 hover:bg-[#222] hover:text-white transition-colors font-medium"
                    >
                       <User className="w-4 h-4" /> 
                       <span>אנשי קשר ({initialStats.active})</span>
                    </Link>
                    <button 
                      onClick={() => setTabsMenuOpen(false)} 
                      className="flex items-center gap-3 px-3 py-3 w-full text-right text-sm bg-[#222] text-white font-bold transition-colors"
                    >
                       <Users className="w-4 h-4" /> 
                       <span>קהילות ({communities.length})</span>
                    </button>
                    <Link 
                      href="/dashboard/crm" 
                      onClick={() => setTabsMenuOpen(false)} 
                      className="flex items-center gap-3 px-3 py-3 w-full text-right text-sm text-gray-400 hover:bg-[#222] hover:text-white transition-colors font-medium"
                    >
                       <Trash2 className="w-4 h-4" /> 
                       <span>סל מחזור ({initialStats.trashed})</span>
                    </Link>
                 </div>
               </>
            )}
          </div>

        </div>
      </div>

      {communities.length === 0 ? (
        <div className="col-span-full py-16 mt-4 text-center border-2 border-dashed border-white/10 rounded-[2.5rem] text-gray-400 bg-[#181818]">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <div className="text-lg font-bold !text-white mb-2">אין קהילות עדיין</div>
          <p className="text-sm text-gray-500 mb-6">צור את הקהילה הראשונה שלך כדי להתחיל לסווג את אנשי הקשר.</p>
          <Button onClick={handleCreate} variant="outline" className="bg-[#222] border-white/5 hover:bg-[#333] hover:text-white rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> צור קהילה
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-8">
            {communities.map((community) => {
              const Icon = (LucideIcons as any)[community.icon] || Users;
              return (
                <div 
                  key={community.id} 
                  className="w-full flex flex-row items-center justify-between p-2 sm:p-2.5 rounded-2xl border bg-[#111] transition-all duration-300 hover:shadow-md" 
                  style={{ borderColor: community.color + "30" }}
                >
                  
                  {/* Right: Icon + Title */}
                  <div className="flex flex-1 items-center gap-3 overflow-hidden pr-1">
                    <div 
                      className="w-10 h-10 rounded-xl flex shrink-0 items-center justify-center bg-[#111] border border-white/5 shadow-sm"
                      style={{ color: community.color }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    
                    <div className="flex flex-col min-w-0 pl-2 justify-center">
                      <div className="font-bold text-lg sm:text-xl truncate !text-white">
                        {community.name}
                      </div>
                    </div>
                  </div>

                  {/* Left: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pl-1" dir="ltr">
                    {/* Delete */}
                    <button onClick={() => handleDelete(community.id!)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#111] border border-white/5 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors shadow-sm" title="מחק קהילה">
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {/* Edit */}
                    <button onClick={() => handleEdit(community)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#111] border border-white/5 text-gray-400 hover:bg-[#222] hover:text-white transition-colors shadow-sm" title="ערוך קהילה">
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {/* View Members */}
                    <a href={`/dashboard/crm`} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[#111] border border-white/5 text-[#9333ea] hover:bg-[#9333ea]/20 hover:text-purple-300 transition-colors shadow-sm" title="הצג אנשי קשר">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>
      )}

      {/* Floating Action Button (like in the picture) */}
      <button 
        onClick={handleCreate} 
        className="fixed bottom-24 left-6 sm:bottom-8 sm:left-8 w-16 h-16 rounded-full bg-[#9333ea] hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-40"
      >
        <Plus className="w-10 h-10" strokeWidth={3} />
      </button>

      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[#111]">
          <div className="p-4 border-b border-white/10 flex justify-between items-center" dir="rtl">
            <h2 className="text-white font-bold">{editingCommunity ? "ערוך קהילה" : "צור קהילה"}</h2>
            <button onClick={() => setIsModalOpen(false)}><LucideIcons.X className="text-white" /></button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto" dir="rtl">
            {loadingSettings || !settings ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <CommunityEditor 
                community={
                  editingCommunity 
                    ? (settings.communities?.find((c: any) => c.id === editingCommunity.id) || { 
                        id: editingCommunity.id, 
                        name: editingCommunity.name, 
                        icon: editingCommunity.icon, 
                        brandColor: editingCommunity.color || "#4f46e5", 
                        targetAudiences: [], 
                        goals: [] 
                      })
                    : { id: Date.now().toString(), name: "", icon: "", targetAudiences: [], goals: [], brandColor: "#4f46e5" }
                }
                isOpen={true}
                onToggle={() => {}}
                isCompleted={false}
                audiencesList={settings.audiences || []}
                goalsList={settings.goals || []}
                onAddAudience={async (name) => {
                  const res = await addAudience(name);
                  if (res.success && res.id) {
                    setSettings({...settings, audiences: [...(settings.audiences||[]), {id: res.id, name}]});
                    return res.id;
                  }
                  return null;
                }}
                onAddGoal={async (name, icon) => {
                  const res = await addGoal(name, icon);
                  if (res.success && res.id) {
                    setSettings({...settings, goals: [...(settings.goals||[]), {id: res.id, name, icon}]});
                    return res.id;
                  }
                  return null;
                }}
                onUpdate={async (updated, nextField) => {
                  const currentComms = settings.communities || [];
                  const idx = currentComms.findIndex((c: any) => c.id === updated.id);
                  let newComms = [...currentComms];
                  if (idx >= 0) newComms[idx] = updated;
                  else newComms.unshift(updated);
                  
                  await saveGlobalSettings({ communities: newComms });
                  setSettings({ ...settings, communities: newComms });
                  
                  setCommunities(newComms.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    color: c.brandColor || c.color || "#4f46e5",
                    icon: c.icon || "Users",
                    memberCount: c.memberCount || 0
                  })) as any);
                  
                  if (!nextField || nextField === "null") {
                    setIsModalOpen(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
