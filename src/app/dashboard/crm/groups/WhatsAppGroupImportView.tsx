"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  getWhatsAppGroupsList, 
  getWhatsAppGroupDetails, 
  getWhatsAppDirectContactsList, 
  importWhatsAppGroupMembersToCRM, 
  importWhatsAppContactsToCRM,
  type WhatsAppGroupItem,
  type WhatsAppGroupParticipant,
  type WhatsAppDirectContactItem
} from "@/features/whatsapp/whatsappImportActions";
import { getWhatsAppConnection } from "@/features/whatsapp/actions";
import { type WhatsAppConnectionState } from "@/features/whatsapp/types";
import { type SmartGroup } from "@/features/crm/groupsUtils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Users, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  Check, 
  CheckSquare, 
  Square, 
  UserPlus, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Layers, 
  Tag, 
  Shield, 
  Phone, 
  User, 
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  FolderPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_COLORS = [
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Rose
  "#7c3aed", // Purple
  "#0284c7", // Sky
  "#0891b2", // Cyan
  "#475569", // Slate
];

interface WhatsAppGroupImportViewProps {
  existingGroups: SmartGroup[];
  onImportComplete?: (targetGroupName: string) => void;
}

export default function WhatsAppGroupImportView({
  existingGroups,
  onImportComplete
}: WhatsAppGroupImportViewProps) {
  // Connection State
  const [connection, setConnection] = useState<WhatsAppConnectionState>({ status: "checking" });
  const [checkingConn, setCheckingConn] = useState(false);

  // Tab State: "groups" | "contacts"
  const [mode, setMode] = useState<"groups" | "contacts">("groups");

  // Groups Mode State
  const [groups, setGroups] = useState<WhatsAppGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Selected Group Details State
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    groupName: string;
    groupId: string;
    participants: WhatsAppGroupParticipant[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedParticipantPhones, setSelectedParticipantPhones] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  // Target Community Configuration
  const [communityTargetMode, setCommunityTargetMode] = useState<"new" | "existing">("new");
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityColor, setNewCommunityColor] = useState(PRESET_COLORS[0]);
  const [selectedExistingGroupName, setSelectedExistingGroupName] = useState<string>("");
  const [extraTagsInput, setExtraTagsInput] = useState("");

  // Direct Contacts Mode State
  const [directContacts, setDirectContacts] = useState<WhatsAppDirectContactItem[]>([]);
  const [loadingDirectContacts, setLoadingDirectContacts] = useState(false);
  const [directSearch, setDirectSearch] = useState("");
  const [selectedDirectPhones, setSelectedDirectPhones] = useState<string[]>([]);

  // Execution & Progress State
  const [importing, setImporting] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    createdCount: number;
    updatedCount: number;
    totalProcessed: number;
    communityName: string;
  } | null>(null);

  // 1. Check WhatsApp connection
  const checkConn = useCallback(async () => {
    setCheckingConn(true);
    try {
      const res = await getWhatsAppConnection();
      setConnection(res);
    } catch (e: any) {
      setConnection({ status: "error", error: e.message });
    } finally {
      setCheckingConn(false);
    }
  }, []);

  useEffect(() => {
    checkConn();
  }, [checkConn]);

  // 2. Fetch WhatsApp Groups
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await getWhatsAppGroupsList();
      if (res.success) {
        setGroups(res.groups);
      } else {
        console.warn("Failed to fetch groups:", res.error);
      }
    } catch (e) {
      console.error("Error fetching groups:", e);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // 3. Fetch Direct Contacts
  const fetchDirectContacts = useCallback(async () => {
    setLoadingDirectContacts(true);
    try {
      const res = await getWhatsAppDirectContactsList();
      if (res.success) {
        setDirectContacts(res.contacts);
      }
    } catch (e) {
      console.error("Error fetching direct contacts:", e);
    } finally {
      setLoadingDirectContacts(false);
    }
  }, []);

  // Auto-fetch data on mode switch
  useEffect(() => {
    if (connection.status === "authorized") {
      if (mode === "groups" && groups.length === 0) {
        fetchGroups();
      } else if (mode === "contacts" && directContacts.length === 0) {
        fetchDirectContacts();
      }
    }
  }, [connection.status, mode, groups.length, directContacts.length, fetchGroups, fetchDirectContacts]);

  // 4. Select Group & Load Details
  const handleSelectGroup = async (group: WhatsAppGroupItem) => {
    setSelectedGroupId(group.id);
    setLoadingDetails(true);
    setNewCommunityName(group.name);
    setNewCommunityColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setParticipantSearch("");

    try {
      const res = await getWhatsAppGroupDetails(group.id);
      if (res.success) {
        setSelectedGroupDetails(res);
        // Select all participants by default
        setSelectedParticipantPhones(res.participants.map(p => p.phone).filter(Boolean));
      } else {
        alert("שגיאה בטעינת משתתפי הקבוצה: " + res.error);
        setSelectedGroupDetails(null);
      }
    } catch (e: any) {
      alert("שגיאה בטעינת הקבוצה: " + e.message);
      setSelectedGroupDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase().trim();
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  // Filtered Group Participants
  const filteredParticipants = useMemo(() => {
    if (!selectedGroupDetails) return [];
    if (!participantSearch.trim()) return selectedGroupDetails.participants;
    const q = participantSearch.toLowerCase().trim();
    return selectedGroupDetails.participants.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q)
    );
  }, [selectedGroupDetails, participantSearch]);

  // Filtered Direct Contacts
  const filteredDirectContacts = useMemo(() => {
    if (!directSearch.trim()) return directContacts;
    const q = directSearch.toLowerCase().trim();
    return directContacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
  }, [directContacts, directSearch]);

  // Participant Checkbox toggles
  const handleToggleParticipant = (phone: string) => {
    if (!phone) return;
    setSelectedParticipantPhones(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const handleToggleAllParticipants = () => {
    if (selectedParticipantPhones.length === filteredParticipants.length && filteredParticipants.length > 0) {
      setSelectedParticipantPhones([]);
    } else {
      setSelectedParticipantPhones(filteredParticipants.map(p => p.phone).filter(Boolean));
    }
  };

  // Direct Contacts Checkbox toggles
  const handleToggleDirectContact = (phone: string) => {
    if (!phone) return;
    setSelectedDirectPhones(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const handleToggleAllDirectContacts = () => {
    if (selectedDirectPhones.length === filteredDirectContacts.length && filteredDirectContacts.length > 0) {
      setSelectedDirectPhones([]);
    } else {
      setSelectedDirectPhones(filteredDirectContacts.map(c => c.phone).filter(Boolean));
    }
  };

  // 5. Execute Group Import
  const handleExecuteGroupImport = async () => {
    if (!selectedGroupDetails) return;
    if (selectedParticipantPhones.length === 0) {
      alert("נא לסמן לפחות משתתף אחד לייבוא");
      return;
    }

    const targetName = communityTargetMode === "new" 
      ? newCommunityName.trim() 
      : selectedExistingGroupName.trim();

    if (!targetName) {
      alert("נא להזין או לבחור שם קהילה/קבוצה לשיוך אנשי הקשר");
      return;
    }

    const participantsToImport = selectedGroupDetails.participants
      .filter(p => selectedParticipantPhones.includes(p.phone))
      .map(p => ({
        phone: p.phone,
        name: p.name,
      }));

    const extraTags = extraTagsInput
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    setImporting(true);
    try {
      const res = await importWhatsAppGroupMembersToCRM({
        groupId: selectedGroupDetails.groupId,
        groupName: selectedGroupDetails.groupName,
        participants: participantsToImport,
        targetCommunityName: targetName,
        createAsNewCommunity: communityTargetMode === "new",
        communityColor: newCommunityColor,
        extraTags,
      });

      if (res.success) {
        setSummaryResult({
          createdCount: res.createdCount,
          updatedCount: res.updatedCount,
          totalProcessed: res.totalProcessed,
          communityName: res.communityName,
        });
      } else {
        alert("שגיאה בייבוא: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה בביצוע הייבוא: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  // 6. Execute Direct Contacts Import
  const handleExecuteDirectImport = async () => {
    if (selectedDirectPhones.length === 0) {
      alert("נא לסמן לפחות איש קשר אחד לייבוא");
      return;
    }

    const targetName = communityTargetMode === "new" 
      ? newCommunityName.trim() 
      : selectedExistingGroupName.trim();

    const contactsToImport = directContacts
      .filter(c => selectedDirectPhones.includes(c.phone))
      .map(c => ({
        phone: c.phone,
        name: c.name,
      }));

    const extraTags = extraTagsInput
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    setImporting(true);
    try {
      const res = await importWhatsAppContactsToCRM({
        contacts: contactsToImport,
        targetCommunityName: targetName || undefined,
        createAsNewCommunity: communityTargetMode === "new" && !!targetName,
        communityColor: newCommunityColor,
        extraTags,
      });

      if (res.success) {
        setSummaryResult({
          createdCount: res.createdCount,
          updatedCount: res.updatedCount,
          totalProcessed: res.totalProcessed,
          communityName: targetName || "כללי (ללא קהילה)",
        });
      } else {
        alert("שגיאה בייבוא: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה בביצוע הייבוא: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* 1. Header & WhatsApp Connection Status */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                ייבוא קבוצות ואנשי קשר מוואטסאפ (Green API)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ייבא קבוצות וואטסאפ שלמות, חלץ משתתפים, שייך לקהילות וצור כרטיסי CRM אוטומטית.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {connection.status === "authorized" ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>וואטסאפ מחובר: {connection.name || "פעיל"}</span>
              <span className="font-mono text-emerald-800" dir="ltr">+{connection.phoneNumber}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-2xl text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>וואטסאפ אינו מחובר</span>
              <a href="/dashboard/whatsapp" className="text-indigo-600 underline hover:text-indigo-800 mr-1">
                חבר כעת &gt;
              </a>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={checkConn}
            disabled={checkingConn}
            className="rounded-xl border-slate-200 text-slate-600 h-9 px-3 gap-1.5"
            title="רענן מצב חיבור"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingConn ? "animate-spin" : ""}`} />
            <span>רענן</span>
          </Button>
        </div>
      </div>

      {/* 2. Sub-tab Selector: Groups vs Direct Contacts */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => { setMode("groups"); setSelectedGroupId(null); setSelectedGroupDetails(null); }}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
            mode === "groups"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ייבוא קבוצות וואטסאפ ({groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setMode("contacts"); }}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
            mode === "contacts"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <User className="w-4 h-4" />
          <span>אנשי קשר אישיים ({directContacts.length})</span>
        </button>
      </div>

      {/* 3. Main Body */}
      {mode === "groups" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Groups List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>קבוצות הוואטסאפ שלך</span>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchGroups}
                  disabled={loadingGroups}
                  className="rounded-xl h-8 text-xs border-slate-200 text-slate-600 gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingGroups ? "animate-spin" : ""}`} />
                  <span>סנכרן קבוצות</span>
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <Input
                  placeholder="חיפוש קבוצה לפי שם..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="pr-9 rounded-xl border-slate-200 text-xs h-9"
                />
              </div>

              {/* List */}
              {loadingGroups ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold">סורק קבוצות משרתי Green API...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">לא נמצאו קבוצות וואטסאפ</p>
                  <p className="text-[11px] text-slate-400">ודא שהוואטסאפ מחובר ושבחשבון קיימות קבוצות.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                  {filteredGroups.map((g) => {
                    const isSelected = selectedGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGroup(g)}
                        className={`w-full text-right p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                            : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-xs truncate">{g.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono truncate block" dir="ltr">
                              {g.id}
                            </span>
                          </div>
                        </div>

                        <ChevronLeft className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Group Details & Import Wizard */}
          <div className="lg:col-span-7 space-y-6">
            {loadingDetails ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center space-y-3 shadow-sm text-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <h4 className="font-extrabold text-sm text-slate-700">טוען את משתתפי הקבוצה...</h4>
                <p className="text-xs text-slate-400">שולף מספרי טלפון ומצליב מול רשומות ה-CRM הקיימות.</p>
              </div>
            ) : !selectedGroupDetails ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center space-y-3 shadow-sm text-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-base text-slate-800">בחר קבוצת וואטסאפ מהרשימה</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  לאחר בחירת קבוצה, תוכל לצפות בכל המשתתפים, לבחור למי לייצר כרטיס CRM ולשייך אותם לקהילה קיימת או חדשה.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                
                {/* Selected Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      קבוצה נבחרת
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">{selectedGroupDetails.groupName}</h3>
                    <p className="text-xs text-slate-400 font-mono" dir="ltr">{selectedGroupDetails.groupId}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                      סה"כ {selectedGroupDetails.participants.length} משתתפים
                    </span>
                  </div>
                </div>

                {/* Target Community Settings */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-4">
                  <h4 className="font-black text-xs text-slate-700 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-indigo-600" />
                    <span>הגדרת שיוך לקהילה וקבוצה ב-CRM</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCommunityTargetMode("new")}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                        communityTargetMode === "new"
                          ? "bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        communityTargetMode === "new" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                      }`}>
                        {communityTargetMode === "new" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">צור קהילה חדשה</div>
                        <div className="text-[10px] text-slate-400">ייצר קבוצת CRM חדשה</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommunityTargetMode("existing")}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                        communityTargetMode === "existing"
                          ? "bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        communityTargetMode === "existing" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                      }`}>
                        {communityTargetMode === "existing" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">שייך לקהילה קיימת</div>
                        <div className="text-[10px] text-slate-400">הוסף לקבוצה מתוך הרשימה</div>
                      </div>
                    </button>
                  </div>

                  {communityTargetMode === "new" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-8">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">שם הקהילה החדשה</label>
                        <Input
                          value={newCommunityName}
                          onChange={(e) => setNewCommunityName(e.target.value)}
                          placeholder="שם הקהילה ב-CRM..."
                          className="rounded-xl border-slate-200 bg-white text-xs h-9"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">צבע תגית</label>
                        <div className="flex items-center gap-1.5 h-9 bg-white border border-slate-200 px-2 rounded-xl">
                          {PRESET_COLORS.slice(0, 5).map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewCommunityColor(color)}
                              className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                                newCommunityColor === color ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : ""
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">בחר קהילת יעד קיימת</label>
                      <select
                        value={selectedExistingGroupName}
                        onChange={(e) => setSelectedExistingGroupName(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none"
                      >
                        <option value="">-- בחר קהילה מהרשימה --</option>
                        {existingGroups.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name} ({g.count || 0} חברים)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      תגיות נוספות (אופציונלי, מופרדות בפסיקים)
                    </label>
                    <Input
                      placeholder="לדוגמה: כנס 2026, VIP, ליד חם"
                      value={extraTagsInput}
                      onChange={(e) => setExtraTagsInput(e.target.value)}
                      className="rounded-xl border-slate-200 bg-white text-xs h-9"
                    />
                  </div>
                </div>

                {/* Participants Selection Table */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs text-slate-800">
                        משתתפים לייבוא ({selectedParticipantPhones.length} מתוך {selectedGroupDetails.participants.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleAllParticipants}
                        className="h-8 rounded-xl text-xs border-slate-200 text-slate-600 gap-1"
                      >
                        {selectedParticipantPhones.length === filteredParticipants.length ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                            <span>בטל הכל</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span>בחר הכל</span>
                          </>
                        )}
                      </Button>
                      
                      <div className="relative w-40">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                        <Input
                          placeholder="סינון משתתף..."
                          value={participantSearch}
                          onChange={(e) => setParticipantSearch(e.target.value)}
                          className="h-8 pr-8 rounded-xl border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Participants Scroll List */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {filteredParticipants.map((p) => {
                      const isSelected = selectedParticipantPhones.includes(p.phone);
                      return (
                        <div
                          key={p.chatId || p.phone}
                          onClick={() => handleToggleParticipant(p.phone)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50/60" : "hover:bg-slate-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-800">{p.name}</span>
                                {p.isAdmin && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md">
                                    מנהל קבוצה
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 block" dir="ltr">
                                {p.phone}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {p.existsInCRM ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                קיים ב-CRM (יעודכן)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <UserPlus className="w-3 h-3 text-indigo-600" />
                                חדש (ייווצר כרטיס)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Import Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleExecuteGroupImport}
                    disabled={importing || selectedParticipantPhones.length === 0}
                    className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>מייבא אנשי קשר ל-CRM...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ייבא {selectedParticipantPhones.length} אנשי קשר ל-CRM</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Direct Contacts Mode */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">ייבוא אנשי קשר ישירים מוואטסאפ</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                בחר אנשי קשר מהחשבון שלך לייבוא מהיר ל-CRM ולשיוך לקהילה.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchDirectContacts}
              disabled={loadingDirectContacts}
              className="rounded-xl h-9 text-xs border-slate-200 text-slate-600 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDirectContacts ? "animate-spin" : ""}`} />
              <span>סנכרן אנשי קשר</span>
            </Button>
          </div>

          {/* Target Community Selector for Direct Contacts */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-4">
            <h4 className="font-black text-xs text-slate-700 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>שיוך לקהילה או תגיות (אופציונלי)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">קהילה קיימת</label>
                <select
                  value={selectedExistingGroupName}
                  onChange={(e) => {
                    setSelectedExistingGroupName(e.target.value);
                    if (e.target.value) setCommunityTargetMode("existing");
                  }}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none"
                >
                  <option value="">-- ללא שיוך לקהילה --</option>
                  {existingGroups.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">או צור קהילה חדשה</label>
                <Input
                  value={newCommunityName}
                  onChange={(e) => {
                    setNewCommunityName(e.target.value);
                    if (e.target.value) {
                      setCommunityTargetMode("new");
                      setSelectedExistingGroupName("");
                    }
                  }}
                  placeholder="שם קהילה חדשה..."
                  className="rounded-xl border-slate-200 bg-white text-xs h-9"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">תגיות נוספות (מופרדות בפסיקים)</label>
                <Input
                  value={extraTagsInput}
                  onChange={(e) => setExtraTagsInput(e.target.value)}
                  placeholder="תגית 1, תגית 2..."
                  className="rounded-xl border-slate-200 bg-white text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <Input
                placeholder="חיפוש לפי שם או טלפון..."
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                className="pr-9 rounded-xl border-slate-200 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleAllDirectContacts}
                className="h-9 rounded-xl text-xs border-slate-200 text-slate-600 gap-1.5"
              >
                {selectedDirectPhones.length === filteredDirectContacts.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>בטל בחירת הכל</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>בחר הכל ({filteredDirectContacts.length})</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleExecuteDirectImport}
                disabled={importing || selectedDirectPhones.length === 0}
                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
              >
                {importing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>ייבא {selectedDirectPhones.length} נבחרים</span>
              </Button>
            </div>
          </div>

          {/* Contacts Grid / List */}
          {loadingDirectContacts ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">שולף אנשי קשר מ-WhatsApp...</span>
            </div>
          ) : filteredDirectContacts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <User className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold">לא נמצאו אנשי קשר</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/20 max-h-[500px] overflow-y-auto divide-y divide-slate-100">
              {filteredDirectContacts.map((c) => {
                const isSelected = selectedDirectPhones.includes(c.phone);
                return (
                  <div
                    key={c.id || c.phone}
                    onClick={() => handleToggleDirectContact(c.phone)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-50/60" : "hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>

                      <div>
                        <span className="font-bold text-xs text-slate-800 block">{c.name}</span>
                        <span className="text-[11px] font-mono text-slate-500" dir="ltr">{c.phone}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {c.existsInCRM ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          קיים ב-CRM
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <UserPlus className="w-3 h-3 text-indigo-600" />
                          חדש
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Import Success Summary Modal */}
      {summaryResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">הייבוא הושלם בהצלחה! 🎉</h3>
              <p className="text-xs text-slate-500 mt-1">
                אנשי הקשר שובצו במערכת ה-CRM ושויכו לקהילה המבוקשת.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-white border rounded-xl p-3 shadow-xs">
                <span className="text-2xl font-black text-indigo-600 block">{summaryResult.createdCount}</span>
                <span className="text-[11px] font-bold text-slate-500">כרטיסים חדשים שנוצרו</span>
              </div>
              <div className="bg-white border rounded-xl p-3 shadow-xs">
                <span className="text-2xl font-black text-emerald-600 block">{summaryResult.updatedCount}</span>
                <span className="text-[11px] font-bold text-slate-500">כרטיסים קיימים שעודכנו</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  const targetName = summaryResult.communityName;
                  setSummaryResult(null);
                  if (onImportComplete) {
                    onImportComplete(targetName);
                  }
                }}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                <span>עבור לצפייה בקהילה ב-CRM</span>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => setSummaryResult(null)}
                className="w-full h-10 rounded-xl border-slate-200 text-slate-600 text-xs"
              >
                סגור והמשך בייבוא נוסף
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
