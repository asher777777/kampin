"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save, Wand2, Building2, ChevronDown, ChevronUp, Copy, Check, Users, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { 
  getCompanyServices, addCompanyService, updateCompanyService, deleteCompanyService, 
  getAudiences, addAudience, CompanyCoreService, Audience 
} from "@/features/company-services/actions";
import { Community } from "@/features/communities/types";
import { rephraseTextWithAI, suggestPainPointsWithAI } from "@/features/ai/actions";

const scrollToTop = (element: HTMLElement) => {
  setTimeout(() => {
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, 100);
};

interface CompanyServicesSectionProps {
  companyVision?: string;
  onSave?: () => void;
}

export function CompanyServicesSection({ companyVision, onSave }: CompanyServicesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [services, setServices] = useState<CompanyCoreService[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Service Name Modal
  const [isAddNameModalOpen, setIsAddNameModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNewService, setSavingNewService] = useState(false);

  const DEFAULT_AUDIENCES = ["לקוחות", "תורמים", "עובדים", "חברים"];
  const allAudiencesOptions = [...new Set([...DEFAULT_AUDIENCES, ...audiences.map(a => a.name)])];

  // AI Generation State
  const [isGeneratingService, setIsGeneratingService] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [srvs, auds, globalSettings] = await Promise.all([
        getCompanyServices(),
        getAudiences(),
        import("@/features/settings/actions").then(m => m.getGlobalSettings())
      ]);
      setServices(srvs);
      setAudiences(auds);
      setCommunities((globalSettings.communities as any) || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleGenerateServiceWithAI = async () => {
    if (!companyVision?.trim()) {
      alert("יש להזין חזון חברה בלשונית 'פרטי חברה' לפני חילוץ שירותים.");
      return;
    }
    setIsGeneratingService(true);
    try {
      const { suggestSingleServiceFromVisionWithAI } = await import("@/features/ai/actions");
      const existingNames = services.map(s => s.name);
      const res = await suggestSingleServiceFromVisionWithAI(companyVision, existingNames, allAudiencesOptions, true);
      if (res.success && res.service) {
        const processedProblems = (res.service.problems || []).map((p: any) => ({
          ...p,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          painPoints: (p.painPoints || []).map((pp: any) => ({
            ...pp,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
          }))
        }));

        const processedBenefits = (res.service.benefitGroups || []).map((bg: any) => ({
          ...bg,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          items: (bg.items || []).map((item: any) => ({
            ...item,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
          }))
        }));

        const newServiceData = {
          name: res.service.name || "שירות חדש (AI)",
          targetAudiences: res.service.targetAudiences || [],
          problems: processedProblems,
          benefitGroups: processedBenefits,
          benefits: "",
          communityId: ""
        };
        const createRes = await addCompanyService(newServiceData);
        if (createRes.success && createRes.id) {
          setServices([{ ...newServiceData, id: createRes.id, ownerId: "", createdAt: new Date().toISOString() }, ...services]);
          onSave?.();
        } else {
          alert("שגיאה בשמירת השירות שנוצר.");
        }
      } else {
        alert(res.error || "לא ניתן היה לייצר שירות כעת.");
      }
    } catch (e) {
      alert("אירעה שגיאה.");
    }
    setIsGeneratingService(false);
  };

  const handleCreateNewService = async () => {
    if (!newName.trim()) return;
    setSavingNewService(true);
    const data = {
      name: newName,
      targetAudiences: [],
      benefits: "",
      communityId: ""
    };
    const res = await addCompanyService(data);
    if (res.success && res.id) {
      setServices([{ ...data, id: res.id, ownerId: "", createdAt: new Date().toISOString() }, ...services]);
      setIsAddNameModalOpen(false);
      setNewName("");
      onSave?.();
    } else {
      alert("שגיאה ביצירת שירות");
    }
    setSavingNewService(false);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק שירות זה?")) return;
    const res = await deleteCompanyService(id);
    if (res.success) {
      setServices(services.filter(s => s.id !== id));
      onSave?.();
    } else {
      alert("שגיאה במחיקת השירות");
    }
  };

  if (loading) {
    return (
      <div className="border border-white/5 bg-[#181818] rounded-2xl overflow-hidden shadow-sm p-5 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full border-b border-white/5 bg-[#181818]">
      <div
        onClick={(e) => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) scrollToTop(e.currentTarget as HTMLElement);
        }}
        className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-3">
            השירותים שלנו
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); handleGenerateServiceWithAI(); }} 
              disabled={isGeneratingService || !companyVision?.trim()}
              className="p-1.5 hover:bg-purple-500/10 rounded-lg text-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="חלץ שירות מהחזון בעזרת AI"
            >
              {isGeneratingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAddNameModalOpen(true); }} 
              className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
              title="הוסף שירות חדש ידנית"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isOpen && services.length > 0 && (
            <span className="text-indigo-400 font-bold text-sm bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              {services.length} שירותים
            </span>
          )}
          {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-[#111] border-t border-white/5 animate-in fade-in duration-200">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-[#181818] border border-white/10 border-dashed rounded-2xl">
              <Building2 className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4 text-center">טרם הוגדרו שירותים עבור החברה.</p>
              <div className="flex gap-3">
                <Button onClick={handleGenerateServiceWithAI} disabled={isGeneratingService || !companyVision?.trim()} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                  {isGeneratingService ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  חלץ שירות בעזרת AI
                </Button>
                <Button onClick={() => setIsAddNameModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף שירות ידנית
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <ServiceAccordionItem 
                  key={service.id} 
                  service={service} 
                  allAudiencesOptions={allAudiencesOptions}
                  audiencesList={audiences}
                  setAudiencesList={setAudiences}
                  communities={communities}
                  onUpdate={async (id: string, data: any) => {
                    const res = await updateCompanyService(id, data);
                    if (res.success) {
                      setServices(services.map(s => s.id === id ? { ...s, ...data } : s));
                      onSave?.();
                      return true;
                    }
                    return false;
                  }}
                  onDelete={handleDeleteService}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Name Modal */}
      <Modal isOpen={isAddNameModalOpen} onClose={() => setIsAddNameModalOpen(false)}>
        <Modal.Content className="max-w-md w-full bg-[#181818] border border-white/10 rounded-2xl p-6">
          <div dir="rtl">
          <h3 className="text-lg font-bold text-white mb-4">מה שם השירות?</h3>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !savingNewService && newName.trim()) {
                handleCreateNewService();
              }
            }}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 mb-6"
            placeholder="לדוגמה: ייעוץ עסקי..."
            autoFocus
          />
          <div className="flex justify-end gap-3">
             <button onClick={() => setIsAddNameModalOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
             </button>
             <button onClick={handleCreateNewService} disabled={savingNewService || !newName.trim()} className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors disabled:opacity-50">
                {savingNewService ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             </button>
          </div>
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
}

// Inner Accordion Item for a Single Service
function ServiceAccordionItem({ 
  service, 
  allAudiencesOptions, 
  audiencesList,
  setAudiencesList,
  communities, 
  onUpdate, 
  onDelete 
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [openTab, setOpenTab] = useState<string | null>(null);

  // Local state for editing
  const [name, setName] = useState(service.name);
  const [targetAudiences, setTargetAudiences] = useState<string[]>(service.targetAudiences || []);
  const [benefits, setBenefits] = useState(service.benefits || "");
  const [communityId, setCommunityId] = useState(service.communityId || "");
  const [problems, setProblems] = useState<any[]>(service.problems || []);

  // Problems Modal -> Inline form
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
  const [problemTitle, setProblemTitle] = useState("");
  const [painPoints, setPainPoints] = useState<any[]>([]);
  const [generatingPainPoints, setGeneratingPainPoints] = useState(false);

  // Benefits Modal -> Inline form
  const [benefitGroups, setBenefitGroups] = useState<any[]>(service.benefitGroups || []);
  const [isEditingBenefit, setIsEditingBenefit] = useState(false);
  const [currentBenefitId, setCurrentBenefitId] = useState<string | null>(null);
  const [benefitTitle, setBenefitTitle] = useState("");
  const [benefitItems, setBenefitItems] = useState<any[]>([]);
  const [generatingBenefits, setGeneratingBenefits] = useState(false);

  // "Other" audience
  const [isOtherAudienceOpen, setIsOtherAudienceOpen] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [savingAudience, setSavingAudience] = useState(false);

  // Save states
  const [savingField, setSavingField] = useState<string | null>(null);



  const handleSave = async (field: string, value: any, tabName: string) => {
    setSavingField(field);
    await onUpdate(service.id, { [field]: value });
    setSavingField(null);
    if (openTab === tabName) setOpenTab(null);
  };

  const handleToggleTab = (tab: string, e: React.MouseEvent<HTMLElement>) => {
    const isOpening = openTab !== tab;
    setOpenTab(isOpening ? tab : null);
    if (isOpening) {
       scrollToTop(e.currentTarget);
       setIsEditingProblem(false);
       setIsEditingBenefit(false);
    } else {
       const parentEl = document.getElementById(`service-${service.id}`);
       if (parentEl) scrollToTop(parentEl);
    }
  };

  const handleSaveAudience = async () => {
    if (!newAudienceName.trim()) return;
    setSavingAudience(true);
    const res = await addAudience(newAudienceName);
    if (res.success && res.id) {
      setAudiencesList([...audiencesList, { id: res.id, name: newAudienceName, ownerId: "" }]);
      setTargetAudiences([...targetAudiences, newAudienceName]);
      setIsOtherAudienceOpen(false);
      setNewAudienceName("");
    } else {
      alert("שגיאה ביצירת קהל יעד");
    }
    setSavingAudience(false);
  };

  const startEditingProblem = (problem?: any) => {
    if (problem) {
      setCurrentProblemId(problem.id);
      setProblemTitle(problem.title);
      setPainPoints(problem.painPoints || []);
    } else {
      setCurrentProblemId(null);
      setProblemTitle("");
      setPainPoints([]);
    }
    setIsEditingProblem(true);
    setOpenTab("problems");
  };

  const handleGeneratePainPointsWithAI = async () => {
    if (!problemTitle) return alert("יש להזין נושא או כותרת תחילה");
    setGeneratingPainPoints(true);
    const res = await suggestPainPointsWithAI(problemTitle, targetAudiences, true);
    if (res.success && res.painPoints) {
      setPainPoints(res.painPoints.map((p: any, i: number) => ({ id: Date.now() + i, ...p })));
    } else {
      alert(res.error || "שגיאה ביצירת נקודות כאב");
    }
    setGeneratingPainPoints(false);
  };

  const handleSaveProblem = async () => {
    if (!problemTitle) return;
    
    let newProblems = [...problems];
    if (currentProblemId) {
      newProblems = newProblems.map(p => p.id === currentProblemId ? { ...p, title: problemTitle, painPoints } : p);
    } else {
      newProblems.push({
        id: Date.now().toString(),
        title: problemTitle,
        painPoints
      });
    }

    setProblems(newProblems);
    await handleSave("problems", newProblems, "problems");
    setIsEditingProblem(false);
  };

  const handleDeleteProblem = async (e: any, probId: string) => {
    e.stopPropagation();
    if (!confirm("האם ברצונך למחוק קבוצה זו?")) return;
    const newProblems = problems.filter(p => p.id !== probId);
    setProblems(newProblems);
    await handleSave("problems", newProblems, "problems");
  };

   const startEditingBenefit = (benefit?: any) => {
    if (benefit) {
      setCurrentBenefitId(benefit.id);
      setBenefitTitle(benefit.title);
      setBenefitItems(benefit.items || []);
    } else {
      setCurrentBenefitId(null);
      setBenefitTitle("");
      setBenefitItems([]);
    }
    setIsEditingBenefit(true);
    setOpenTab("benefits");
  };

  const handleGenerateBenefitsWithAI = async () => {
    if (!benefitTitle) return alert("יש להזין נושא או כותרת תחילה");
    
    // Collect all pain points text to send as context
    const allPainPoints = problems.flatMap(p => p.painPoints.map((pp: any) => `- ${pp.title}: ${pp.description}`)).join("\n");
    if (!allPainPoints) return alert("יש להזין לפחות נקודת כאב אחת לפני יצירת מעלות ב-AI");

    setGeneratingBenefits(true);
    const { suggestBenefitsWithAI } = await import("@/features/ai/actions");
    const res = await suggestBenefitsWithAI(benefitTitle, targetAudiences, allPainPoints, true);
    if (res.success && res.benefits) {
      setBenefitItems(res.benefits.map((b: any, i: number) => ({ id: Date.now() + i, ...b })));
    } else {
      alert(res.error || "שגיאה ביצירת מעלות");
    }
    setGeneratingBenefits(false);
  };

  const handleSaveBenefit = async () => {
    if (!benefitTitle) return;
    
    let newGroups = [...benefitGroups];
    if (currentBenefitId) {
      newGroups = newGroups.map(g => g.id === currentBenefitId ? { ...g, title: benefitTitle, items: benefitItems } : g);
    } else {
      newGroups.push({
        id: Date.now().toString(),
        title: benefitTitle,
        items: benefitItems
      });
    }

    setBenefitGroups(newGroups);
    await handleSave("benefitGroups", newGroups, "benefits");
    setIsEditingBenefit(false);
  };

  const handleDeleteBenefit = async (e: any, groupId: string) => {
    e.stopPropagation();
    if (!confirm("האם ברצונך למחוק קבוצה זו?")) return;
    const newGroups = benefitGroups.filter(g => g.id !== groupId);
    setBenefitGroups(newGroups);
    await handleSave("benefitGroups", newGroups, "benefits");
  };


  return (
    <div id={`service-${service.id}`} className="w-full border-b border-white/5 bg-[#181818]">
      <div
        onClick={(e) => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) scrollToTop(e.currentTarget as HTMLElement);
        }}
        className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm sm:text-base cursor-pointer transition-colors"
      >
        <span>{service.name}</span>
        <div className="flex items-center gap-3">
           <button onClick={(e) => { e.stopPropagation(); onDelete(service.id); }} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
             <Trash2 className="w-4 h-4" />
           </button>
           {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="w-full bg-[#111] border-t border-white/5 animate-in fade-in flex flex-col">
           
           {/* Name Tab */}
           <div className="w-full border-b border-white/5 bg-[#181818]">
             <div onClick={(e) => handleToggleTab("name", e as any)} className="w-full p-3 sm:p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors">
               <div className="flex items-center gap-3">
                 <span>שם השירות</span>
                 {name && openTab !== "name" && (
                   <span className="text-indigo-400 font-normal truncate max-w-[150px] sm:max-w-[200px] text-xs sm:text-sm">{name}</span>
                 )}
               </div>
               <div className="flex items-center gap-3">
                  {openTab === "name" ? (
                    <button onClick={(e) => { e.stopPropagation(); handleSave("name", name, "name"); }} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      {savingField === "name" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      שמור
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleToggleTab("name", e as any); }} className="flex items-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {openTab === "name" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
               </div>
             </div>
             {openTab === "name" && (
                <div className="p-4 bg-[#111] border-t border-white/5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="שם השירות..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
             )}
           </div>

           {/* Audience Tab */}
           <div className="w-full border-b border-white/5 bg-[#181818]">
             <div onClick={(e) => handleToggleTab("audience", e as any)} className="w-full p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors">
               <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                 <span>קהל היעד</span>
                 {targetAudiences.length > 0 && openTab !== "audience" && (
                   <span className="text-indigo-400 font-normal truncate max-w-[150px] sm:max-w-[200px] text-xs sm:text-sm">
                     {targetAudiences.join(", ")}
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-3 shrink-0">
                  {openTab === "audience" ? (
                    <button onClick={(e) => { e.stopPropagation(); handleSave("targetAudiences", targetAudiences, "audience"); }} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      {savingField === "targetAudiences" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      שמור
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleToggleTab("audience", e as any); }} className="flex items-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {openTab === "audience" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
               </div>
             </div>
             {openTab === "audience" && (
                <div className="p-4 bg-[#111] border-t border-white/5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allAudiencesOptions.map((aud: string) => (
                      <button
                        key={aud}
                        onClick={() => {
                          if (targetAudiences.includes(aud)) {
                            setTargetAudiences(targetAudiences.filter((a: string) => a !== aud));
                          } else {
                            setTargetAudiences([...targetAudiences, aud]);
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                          targetAudiences.includes(aud) 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {aud}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsOtherAudienceOpen(true)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-colors border bg-black/40 border-white/10 text-indigo-400 hover:text-indigo-300"
                    >
                      + אחר
                    </button>
                  </div>

                  {isOtherAudienceOpen && (
                    <div className="flex items-center gap-2 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 max-w-sm">
                      <input
                        type="text"
                        value={newAudienceName}
                        onChange={e => setNewAudienceName(e.target.value)}
                        placeholder="קהל יעד חדש..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-0"
                      />
                      <Button onClick={handleSaveAudience} disabled={savingAudience || !newAudienceName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-auto py-2 shrink-0">
                        {savingAudience ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <button onClick={() => setIsOtherAudienceOpen(false)} className="text-gray-500 hover:text-white p-2 shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
             )}
           </div>

           {/* Problems Tab */}
           <div className="w-full border-b border-white/5 bg-[#181818]">
             <div onClick={(e) => handleToggleTab("problems", e as any)} className="w-full p-3 sm:p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors">
               <div className="flex items-center gap-3">
                 <span>נקודות הכאב שהשירות פותר</span>
                 {problems.length > 0 && openTab !== "problems" && (
                   <span className="text-indigo-400 font-normal text-xs sm:text-sm">{problems.length} קבוצות כאב</span>
                 )}
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); startEditingProblem(); }} className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded-lg text-xs transition-colors font-medium">
                    <Plus className="w-4 h-4" />
                  </button>
                  {openTab === "problems" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
               </div>
             </div>
             {openTab === "problems" && (
                <div className="p-4 bg-[#111] border-t border-white/5 space-y-3">
                  {isEditingProblem ? (
                    <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">נקודות הכאב שהשירות פותר</h3>
                        <button onClick={() => setIsEditingProblem(false)} className="text-gray-500 hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">נושא (לדוגמה: לקוחות מבזבזים שעות על פעולות ידניות)</label>
                          <input
                            type="text"
                            value={problemTitle}
                            onChange={(e) => setProblemTitle(e.target.value)}
                            placeholder="לדוגמה: לקוחות מבזבזים שעות על פעולות ידניות"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-400">נקודות כאב מרכזיות</label>
                            <div className="flex gap-2">
                               <button onClick={() => setPainPoints([...painPoints, { id: Date.now(), title: "", description: "" }])} className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                 <Plus className="w-3 h-3" /> הוסף נקודה
                               </button>
                               <button onClick={handleGeneratePainPointsWithAI} disabled={generatingPainPoints || !problemTitle} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50">
                                 {generatingPainPoints ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI
                               </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {painPoints.map((pp, index) => (
                              <div key={pp.id} className="bg-black/20 border border-white/5 rounded-xl p-3 flex gap-3">
                                <div className="pt-2 text-gray-500">
                                  <ChevronDown className="w-4 h-4" />
                                </div>
                                <div className="flex-1 space-y-2">
                                   <input 
                                     type="text" 
                                     value={pp.title} 
                                     onChange={(e) => {
                                       const newPP = [...painPoints];
                                       newPP[index].title = e.target.value;
                                       setPainPoints(newPP);
                                     }}
                                     placeholder="כותרת (לדוגמה: חוסר זמן)" 
                                     className="w-full bg-transparent border-b border-white/10 pb-1 text-sm text-white font-bold focus:outline-none focus:border-indigo-500" 
                                   />
                                   <textarea
                                     value={pp.description}
                                     onChange={(e) => {
                                       const newPP = [...painPoints];
                                       newPP[index].description = e.target.value;
                                       setPainPoints(newPP);
                                     }}
                                     placeholder="פירוט ההשפעה של נקודת הכאב..."
                                     className="w-full bg-transparent border-none resize-none text-xs text-gray-400 focus:outline-none focus:text-gray-300 min-h-[40px]"
                                   />
                                </div>
                                <button onClick={() => setPainPoints(painPoints.filter(p => p.id !== pp.id))} className="text-gray-600 hover:text-red-400 self-start p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                            {painPoints.length === 0 && (
                              <div className="text-center py-6 text-gray-600 text-sm border border-dashed border-white/10 rounded-xl">
                                לחץ על AI כדי לייצר נקודות כאב אוטומטית מותאמות לקהל היעד
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
                        <button onClick={handleSaveProblem} disabled={!problemTitle} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">
                          <Save className="w-5 h-5" /> שמור שינויים
                        </button>
                      </div>
                    </div>
                  ) : problems.length === 0 ? (
                    <p className="text-gray-500 text-sm">טרם הוגדרו נקודות כאב.</p>
                  ) : (
                    <div className="space-y-4">
                      {problems.map((prob, probIdx) => (
                        <div key={prob.id || `prob-${probIdx}`} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-white font-bold">{prob.title}</span>
                            <div className="flex items-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); startEditingProblem(prob); }} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                                 <Edit2 className="w-3 h-3" /> ערוך
                               </button>
                               <button onClick={(e) => handleDeleteProblem(e, prob.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                             {prob.painPoints?.map((pp: any, ppIdx: number) => (
                               <div key={pp.id || `pp-${ppIdx}`} className="flex gap-3 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                                 <div className="pt-0.5">
                                   <Check className="w-4 h-4 text-rose-400" />
                                 </div>
                                 <div>
                                   <div className="text-white font-medium mb-1">{pp.title}</div>
                                   <div className="text-gray-400 text-xs leading-relaxed">{pp.description}</div>
                                 </div>
                               </div>
                             ))}
                             {(!prob.painPoints || prob.painPoints.length === 0) && (
                               <p className="text-gray-500 text-xs">אין נקודות כאב בקבוצה זו.</p>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             )}
           </div>

           {/* Benefits Tab */}
           <div className="w-full border-b border-white/5 bg-[#181818]">
             <div onClick={(e) => handleToggleTab("benefits", e as any)} className="w-full p-3 sm:p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors">
               <div className="flex items-center gap-3">
                 <span>מה המעלות בשירות שלנו</span>
                 {benefitGroups.length > 0 && openTab !== "benefits" && (
                   <span className="text-indigo-400 font-normal text-xs sm:text-sm">{benefitGroups.length} קבוצות מעלות</span>
                 )}
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); startEditingBenefit(); }} className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded-lg text-xs transition-colors font-medium">
                    <Plus className="w-4 h-4" />
                  </button>
                  {openTab === "benefits" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
               </div>
             </div>
             {openTab === "benefits" && (
                <div className="p-4 bg-[#111] border-t border-white/5 space-y-3">
                  {isEditingBenefit ? (
                    <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">מעלות בשירות שלנו</h3>
                        <button onClick={() => setIsEditingBenefit(false)} className="text-gray-500 hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">נושא (לדוגמה: אוטומציה וייעול תהליכים)</label>
                          <input
                            type="text"
                            value={benefitTitle}
                            onChange={(e) => setBenefitTitle(e.target.value)}
                            placeholder="לדוגמה: אוטומציה וייעול תהליכים"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-400">נקודות מעלה מרכזיות</label>
                            <div className="flex gap-2">
                               <button onClick={() => setBenefitItems([...benefitItems, { id: Date.now(), title: "", description: "" }])} className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                 <Plus className="w-3 h-3" /> הוסף נקודה
                               </button>
                               <button onClick={handleGenerateBenefitsWithAI} disabled={generatingBenefits || !benefitTitle || problems.length === 0} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50">
                                 {generatingBenefits ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} AI
                               </button>
                            </div>
                          </div>
                          
                          {problems.length === 0 && (
                            <p className="text-amber-500/80 text-xs mb-3">יש להזין לפחות קבוצת נקודות כאב אחת כדי שה-AI יוכל לייצר מעלות.</p>
                          )}

                          <div className="space-y-3">
                            {benefitItems.map((bi, index) => (
                              <div key={bi.id} className="bg-black/20 border border-white/5 rounded-xl p-3 flex gap-3">
                                <div className="pt-2 text-gray-500">
                                  <ChevronDown className="w-4 h-4" />
                                </div>
                                <div className="flex-1 space-y-2">
                                   <input 
                                     type="text" 
                                     value={bi.title} 
                                     onChange={(e) => {
                                       const newBI = [...benefitItems];
                                       newBI[index].title = e.target.value;
                                       setBenefitItems(newBI);
                                     }}
                                     placeholder="כותרת (לדוגמה: חיסכון בזמן)" 
                                     className="w-full bg-transparent border-b border-white/10 pb-1 text-sm text-white font-bold focus:outline-none focus:border-indigo-500" 
                                   />
                                   <textarea
                                     value={bi.description}
                                     onChange={(e) => {
                                       const newBI = [...benefitItems];
                                       newBI[index].description = e.target.value;
                                       setBenefitItems(newBI);
                                     }}
                                     placeholder="פירוט המעלה..."
                                     className="w-full bg-transparent border-none resize-none text-xs text-gray-400 focus:outline-none focus:text-gray-300 min-h-[40px]"
                                   />
                                </div>
                                <button onClick={() => setBenefitItems(benefitItems.filter(p => p.id !== bi.id))} className="text-gray-600 hover:text-red-400 self-start p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                            {benefitItems.length === 0 && (
                              <div className="text-center py-6 text-gray-600 text-sm border border-dashed border-white/10 rounded-xl">
                                לחץ על AI כדי לייצר מעלות באופן אוטומטי (מבוסס על נקודות הכאב)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
                        <button onClick={handleSaveBenefit} disabled={!benefitTitle} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">
                          <Save className="w-5 h-5" /> שמור שינויים
                        </button>
                      </div>
                    </div>
                  ) : benefitGroups.length === 0 ? (
                    <p className="text-gray-500 text-sm">טרם הוגדרו מעלות בשירות.</p>
                  ) : (
                    <div className="space-y-4">
                      {benefitGroups.map((group, bgIdx) => (
                        <div key={group.id || `bg-${bgIdx}`} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-white font-bold">{group.title}</span>
                            <div className="flex items-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); startEditingBenefit(group); }} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
                                 <Edit2 className="w-3 h-3" /> ערוך
                               </button>
                               <button onClick={(e) => handleDeleteBenefit(e, group.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                             {group.items?.map((item: any, itemIdx: number) => (
                               <div key={item.id || `item-${itemIdx}`} className="flex gap-3 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                                 <div className="pt-0.5">
                                   <Check className="w-4 h-4 text-emerald-400" />
                                 </div>
                                 <div>
                                   <div className="text-white font-medium mb-1">{item.title}</div>
                                   <div className="text-gray-400 text-xs leading-relaxed">{item.description}</div>
                                 </div>
                               </div>
                             ))}
                             {(!group.items || group.items.length === 0) && (
                               <p className="text-gray-500 text-xs">אין נקודות מעלה בקבוצה זו.</p>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             )}
           </div>

           {/* Community Tab */}
           <div className="w-full border-b border-white/5 bg-[#181818]">
             <div onClick={(e) => handleToggleTab("community", e as any)} className="w-full p-3 sm:p-4 bg-[#181818] hover:bg-[#202020] flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer transition-colors">
               <div className="flex items-center gap-3">
                 <span>הקהילה האחראית</span>
                 {communityId && openTab !== "community" && (
                   <span className="text-indigo-400 font-normal truncate max-w-[150px] sm:max-w-[200px] text-xs sm:text-sm">
                     {communities.find((c: any) => c.id === communityId)?.name || ""}
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-3">
                  {openTab === "community" ? (
                    <button onClick={(e) => { e.stopPropagation(); handleSave("communityId", communityId, "community"); }} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      {savingField === "communityId" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      שמור
                    </button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleToggleTab("community", e as any); }} className="flex items-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors font-medium">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {openTab === "community" ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
               </div>
             </div>
             {openTab === "community" && (
                <div className="p-4 bg-[#111] border-t border-white/5">
                  <select
                    value={communityId}
                    onChange={e => setCommunityId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">ללא שיוך לקהילה</option>
                    {communities.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}

