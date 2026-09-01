"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

import { 
  getGroupsData, 
  saveSmartGroup, 
  deleteSmartGroup, 
  bulkAssignGroup, 
  bulkRemoveFromGroup, 
  moveContactsBetweenGroups, 
  setContactTags
} from "@/features/crm/groupsActions";
import type { 
  SmartGroup, 
  GroupRule 
} from "@/features/crm/groupsUtils";
import { isContactInGroup } from "@/features/crm/groupsUtils";
import { 
  Users, 
  Tag, 
  Plus, 
  Search, 
  RefreshCw, 
  Check, 
  X, 
  Trash2, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  UserPlus, 
  Sparkles, 
  Download, 
  ArrowRightLeft, 
  Edit3, 
  SlidersHorizontal, 
  Filter, 
  CheckSquare, 
  Square,
  HelpCircle,
  Zap,
  Folder,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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

export default function GroupsClientView() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<SmartGroup[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Selected Group Filter: "__all__" | "__untagged__" | "<group_id_or_name>"
  const [activeGroupId, setActiveGroupId] = useState<string>("__all__");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Group Form / Modal state (for Create / Edit)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#4f46e5");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<"manual" | "smart">("manual");
  const [formMatchType, setFormMatchType] = useState<"all" | "any">("all");
  const [formRules, setFormRules] = useState<GroupRule[]>([]);

  // Move / Add Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"add" | "move">("add");
  const [targetGroupForTransfer, setTargetGroupForTransfer] = useState("");

  // Add Members to Active Group Modal
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);

  // Inline Quick Tag dropdown
  const [tagDropdownContactId, setTagDropdownContactId] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGroupsData();
      if (res.success) {
        setContacts(res.contacts);
        setGroups(res.groups);
        setTotalContacts(res.totalContacts);
        setUntaggedCount(res.untaggedCount);
        setAvailableCities(res.availableCities);
      } else {
        alert("שגיאה בטעינת נתונים: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active Group Details
  const activeGroup = useMemo<SmartGroup>(() => {
    if (activeGroupId === "__all__") {
      return { id: "__all__", name: "כל אנשי הקשר", type: "manual" as const, count: totalContacts, color: "#4f46e5", description: "" };
    }
    if (activeGroupId === "__untagged__") {
      return { id: "__untagged__", name: "ללא שיוך לקבוצה", type: "manual" as const, count: untaggedCount, color: "#e11d48", description: "" };
    }
    const found = groups.find(g => g.id === activeGroupId || g.name === activeGroupId);
    if (found) return found;
    return { id: activeGroupId, name: activeGroupId, type: "manual" as const, count: 0, color: "#64748b", description: "" };
  }, [activeGroupId, groups, totalContacts, untaggedCount]);

  // Filter contacts by active group and search query
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // 1. Group membership filter
      if (activeGroupId === "__untagged__") {
        const inAny = groups.some(g => isContactInGroup(c, g));
        if (inAny) return false;
      } else if (activeGroupId !== "__all__") {
        if (!isContactInGroup(c, activeGroup)) return false;
      }

      // 2. Search query filter
      if (contactSearchQuery.trim()) {
        const q = contactSearchQuery.toLowerCase().trim();
        const name = (c.conta_name || "").toLowerCase();
        const phone = (c.conta_phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const city = (c.mh_crm_city || "").toLowerCase();
        const company = (c.company_name || "").toLowerCase();
        const tags = (c.tags || []).join(" ").toLowerCase();

        if (!name.includes(q) && !phone.includes(q) && !email.includes(q) && !city.includes(q) && !company.includes(q) && !tags.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, activeGroupId, activeGroup, groups, contactSearchQuery]);

  // Eligible contacts for adding to active group
  const eligibleForActiveGroup = useMemo(() => {
    if (activeGroupId.startsWith("__")) return [];
    return contacts.filter(c => {
      const alreadyIn = isContactInGroup(c, activeGroup);
      if (alreadyIn) return false;
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase().trim();
        const name = (c.conta_name || "").toLowerCase();
        const phone = (c.conta_phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [contacts, activeGroupId, activeGroup, pickerSearch]);

  // Real-time preview count of matching contacts for the Smart Group builder
  const smartRulePreviewCount = useMemo(() => {
    if (formType !== "smart" || formRules.length === 0) return 0;
    const tempGroup: SmartGroup = {
      id: "temp",
      name: formName,
      color: formColor,
      type: "smart",
      rules: formRules,
      matchType: formMatchType
    };
    return contacts.filter(c => isContactInGroup(c, tempGroup)).length;
  }, [contacts, formType, formRules, formMatchType, formName, formColor]);

  // Open modal to create a new group
  const handleOpenCreateGroup = (type: "manual" | "smart" = "manual") => {
    setEditingGroupId(null);
    setFormName("");
    setFormColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setFormDesc("");
    setFormType(type);
    setFormMatchType("all");
    setFormRules(type === "smart" ? [{ field: "total_spent", operator: "gte", value: 500 }] : []);
    setIsGroupModalOpen(true);
  };

  // Open modal to edit existing group
  const handleOpenEditGroup = (group: SmartGroup) => {
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormColor(group.color || "#4f46e5");
    setFormDesc(group.description || "");
    setFormType(group.type || "manual");
    setFormMatchType(group.matchType || "all");
    setFormRules(group.rules || []);
    setIsGroupModalOpen(true);
  };

  // Save Group (Create / Update)
  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      alert("נא להזין שם לקבוצה");
      return;
    }

    try {
      setLoading(true);
      const res = await saveSmartGroup({
        id: editingGroupId || undefined,
        name: formName.trim(),
        color: formColor,
        description: formDesc.trim(),
        type: formType,
        matchType: formMatchType,
        rules: formType === "smart" ? formRules : []
      });

      if (res.success) {
        setIsGroupModalOpen(false);
        setActiveGroupId(res.id || formName.trim());
        await loadData();
      } else {
        alert("שגיאה בשמירת קבוצה: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (group: SmartGroup) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הקבוצה "${group.name}"?`)) return;
    try {
      setLoading(true);
      const res = await deleteSmartGroup(group.id);
      if (res.success) {
        if (activeGroupId === group.id || activeGroupId === group.name) {
          setActiveGroupId("__all__");
        }
        await loadData();
      } else {
        alert("שגיאה במחיקת קבוצה: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Add / Move Handler
  const handleExecuteTransfer = async () => {
    if (!targetGroupForTransfer) {
      alert("נא לבחור קבוצת יעד");
      return;
    }
    if (selectedContactIds.length === 0) return;

    try {
      setLoading(true);
      if (transferMode === "add") {
        await bulkAssignGroup(selectedContactIds, targetGroupForTransfer);
      } else {
        await moveContactsBetweenGroups(
          selectedContactIds, 
          activeGroupId.startsWith("__") ? "" : activeGroup.name, 
          targetGroupForTransfer
        );
      }
      setIsTransferModalOpen(false);
      setSelectedContactIds([]);
      await loadData();
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Add Picker Members to Active Group
  const handleAddPickerMembers = async () => {
    if (pickerSelectedIds.length === 0 || activeGroupId.startsWith("__")) return;
    try {
      setLoading(true);
      await bulkAssignGroup(pickerSelectedIds, activeGroup.name);
      setIsAddMembersModalOpen(false);
      setPickerSelectedIds([]);
      await loadData();
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle single tag on contact
  const handleToggleTag = async (contactId: string, groupName: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    const currentTags: string[] = contact.tags || [];
    const hasTag = currentTags.includes(groupName);
    const newTags = hasTag ? currentTags.filter((t: string) => t !== groupName) : [...currentTags, groupName];

    // Optimistic update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tags: newTags } : c));

    try {
      await setContactTags(contactId, newTags);
      const res = await getGroupsData();
      if (res.success) {
        setGroups(res.groups);
        setUntaggedCount(res.untaggedCount);
      }
    } catch (e: any) {
      alert("שגיאה בעדכון: " + e.message);
      loadData();
    }
  };

  // Select all filtered contacts
  const handleToggleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredContacts.length === 0) return;
    const headers = ["שם", "טלפון", "אימייל", "עיר", "קבוצות", "סך תשלומים (₪)", "קמפיין (₪)"];
    const rows = filteredContacts.map(c => [
      c.conta_name || "",
      c.conta_phone || "",
      c.email || "",
      c.mh_crm_city || "",
      (c.tags || []).join(", "),
      c.total_spent || 0,
      c.campaign_amount || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `group_${activeGroup.name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 space-y-6 text-right select-none font-sans" dir="rtl">
      
      {/* 1. Clean Desktop Top Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                ניהול וחלוקת קבוצות
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-normal">
                  {groups.length} קבוצות מוגדרות
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                איש קשר אחד יכול להשתייך למספר קבוצות במקביל. ניתן ליצור קבוצות רגילות או חכמות לפי תנאים לוגיים.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={loadData}
            variant="outline"
            className="h-10 px-3.5 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>רענן נתונים</span>
          </Button>

          <Button
            onClick={() => handleOpenCreateGroup("smart")}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>⚡ קבוצה חכמה (לפי תנאים)</span>
          </Button>

          <Button
            onClick={() => handleOpenCreateGroup("manual")}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>קבוצה רגילה</span>
          </Button>
        </div>
      </div>

      {/* 2. Visual Group Tabs Bar (Desktop Optimized) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
          
          {/* All Contacts Tab */}
          <button
            type="button"
            onClick={() => setActiveGroupId("__all__")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
              activeGroupId === "__all__"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 opacity-80" />
            <span>כל אנשי הקשר</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
              activeGroupId === "__all__" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {totalContacts}
            </span>
          </button>

          {/* Untagged Contacts Tab */}
          <button
            type="button"
            onClick={() => setActiveGroupId("__untagged__")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
              activeGroupId === "__untagged__"
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-rose-50/60 text-rose-700 border-rose-200 hover:bg-rose-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span>ללא קבוצה</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
              activeGroupId === "__untagged__" ? "bg-white/20 text-white" : "bg-rose-200 text-rose-900"
            }`}>
              {untaggedCount}
            </span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

          {/* Custom Groups Tabs */}
          {groups.map((g) => {
            const isActive = activeGroupId === g.id || activeGroupId === g.name;
            const isSmart = g.type === "smart";

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroupId(g.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: g.color || "#4f46e5" }}
                />
                {isSmart && (
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-300" : "text-amber-600"}`} />
                )}
                <span>{g.name}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {g.count || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Desktop Workspace */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Workspace Action Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {activeGroup.name}
                {activeGroup.type === "smart" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    קבוצה חכמה (לפי תנאים)
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {filteredContacts.length} אנשי קשר מוצגים
              </span>
            </div>
            {activeGroup.description && (
              <p className="text-xs text-slate-500 mt-1">{activeGroup.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש מהיר לפי שם, טלפון, עיר..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="pr-9 bg-white border-slate-200 rounded-xl text-xs h-9.5 text-slate-800 placeholder:text-slate-400 w-full"
              />
            </div>

            {/* If regular custom group, show Add Members button */}
            {!activeGroupId.startsWith("__") && activeGroup.type !== "smart" && (
              <Button
                onClick={() => setIsAddMembersModalOpen(true)}
                className="h-9.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>הוסף אנשי קשר לקבוצה</span>
              </Button>
            )}

            {/* If custom group, show Edit and Delete buttons */}
            {!activeGroupId.startsWith("__") && (
              <>
                <Button
                  onClick={() => handleOpenEditGroup(activeGroup)}
                  variant="outline"
                  className="h-9.5 px-3 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="ערוך פרמטרים ותנאים לקבוצה"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>ערוך קבוצה</span>
                </Button>

                <Button
                  onClick={() => handleDeleteGroup(activeGroup)}
                  variant="outline"
                  className="h-9.5 px-2.5 rounded-xl border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="מחק קבוצה זו"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button
              onClick={handleExportCsv}
              variant="outline"
              className="h-9.5 px-3 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="ייצא רשימה לקובץ Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ייצא לאקסל</span>
            </Button>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.length > 0 && selectedContactIds.length === filteredContacts.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="p-3">שם איש קשר</th>
                <th className="p-3">טלפון / אימייל</th>
                <th className="p-3">עיר</th>
                <th className="p-3">סך תשלומים (₪)</th>
                <th className="p-3">קבוצות משויכות (ריבוי קבוצות)</th>
                <th className="p-3 text-left">פעולות מהירות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400">
                    {loading ? "טוען נתונים..." : "לא נמצאו אנשי קשר תואמים."}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => {
                  const isSelected = selectedContactIds.includes(c.id);
                  const isDropdownOpen = tagDropdownContactId === c.id;
                  const contactTags: string[] = c.tags || [];

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedContactIds(prev =>
                              isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Contact Name */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{c.conta_name || "ללא שם"}</span>
                          {c.company_name && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({c.company_name})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {c.conta_phone ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{c.conta_phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] truncate max-w-[150px]">
                              <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* City */}
                      <td className="p-3 text-slate-600 text-[11px]">
                        {c.mh_crm_city || "-"}
                      </td>

                      {/* Total Spent */}
                      <td className="p-3 font-mono font-bold text-slate-900 text-[11px]">
                        {Number(c.total_spent || 0) > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            ₪{Number(c.total_spent).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Multi-Group Badges */}
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5 relative">
                          {contactTags.length > 0 ? (
                            contactTags.map((tag: string) => {
                              const groupObj = groups.find(g => g.name === tag || g.id === tag);
                              const color = groupObj?.color || "#4f46e5";

                              return (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-200 shadow-2xs"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTag(c.id, tag);
                                    }}
                                    className="hover:text-rose-600 text-slate-400 p-0.5 cursor-pointer transition-colors"
                                    title={`הסר מהקבוצה "${tag}"`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              ללא קבוצות
                            </span>
                          )}

                          {/* Add Group Inline Dropdown Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTagDropdownContactId(isDropdownOpen ? null : c.id);
                              }}
                              className="h-6 px-1.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                              title="הוסף לקבוצה נוספת"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>הוסף</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                              <div
                                className="absolute right-0 top-7 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-[10px] font-bold text-slate-500 px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                                  <span>סמן קבוצות לשיוך:</span>
                                  <button
                                    type="button"
                                    onClick={() => setTagDropdownContactId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                                  {groups.map((g) => {
                                    const isChecked = contactTags.includes(g.name);
                                    return (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => handleToggleTag(c.id, g.name)}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                          isChecked
                                            ? "bg-indigo-50 text-indigo-700 font-bold"
                                            : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: g.color || "#4f46e5" }}
                                          />
                                          <span className="truncate">{g.name}</span>
                                        </div>
                                        {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3 text-left">
                        {!activeGroupId.startsWith("__") && activeGroup.type !== "smart" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTag(c.id, activeGroup.name);
                            }}
                            className="text-slate-400 hover:text-rose-600 text-xs px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`הסר מ-${activeGroup.name}`}
                          >
                            הסר מקבוצה זו
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Desktop Floating Bottom Action Bar for Bulk Operations */}
      {selectedContactIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3.5 px-6 rounded-2xl shadow-2xl z-40 flex items-center gap-4 flex-wrap border border-slate-700 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 font-bold text-xs">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-mono font-bold text-xs">
              {selectedContactIds.length}
            </span>
            <span>אנשי קשר נבחרו</span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          {/* Add to Another Group Button */}
          <Button
            onClick={() => {
              setTransferMode("add");
              setTargetGroupForTransfer("");
              setIsTransferModalOpen(true);
            }}
            className="h-8.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>הוסף לקבוצה נוספת</span>
          </Button>

          {/* Move Between Groups Button */}
          <Button
            onClick={() => {
              setTransferMode("move");
              setTargetGroupForTransfer("");
              setIsTransferModalOpen(true);
            }}
            variant="outline"
            className="h-8.5 px-3.5 rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>העבר מקבוצה לקבוצה</span>
          </Button>

          {/* Remove from current group */}
          {!activeGroupId.startsWith("__") && activeGroup.type !== "smart" && (
            <Button
              onClick={async () => {
                if (!window.confirm(`האם להסיר ${selectedContactIds.length} אנשי קשר מהקבוצה "${activeGroup.name}"?`)) return;
                try {
                  setLoading(true);
                  await bulkRemoveFromGroup(selectedContactIds, activeGroup.name);
                  setSelectedContactIds([]);
                  await loadData();
                } catch (e: any) {
                  alert("שגיאה: " + e.message);
                } finally {
                  setLoading(false);
                }
              }}
              variant="outline"
              className="h-8.5 px-3 rounded-xl border-rose-900/60 text-rose-400 bg-rose-950/30 hover:bg-rose-950/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>הסר מהקבוצה הנוכחית</span>
            </Button>
          )}

          {/* Clear selection */}
          <button
            type="button"
            onClick={() => setSelectedContactIds([])}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
          >
            בטל בחירה
          </button>
        </div>
      )}

      {/* 5. Modal: Create / Edit Group with Parameters & Logical Rules */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      >
        <div className="space-y-5 p-2 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {editingGroupId ? "עריכת פרמטרים לקבוצה" : "יצירת קבוצה חדשה"}
            </h3>
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Group Type Selector Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFormType("manual")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                formType === "manual" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>קבוצה רגילה (שיוך חופשי / ידני)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormType("smart");
                if (formRules.length === 0) {
                  setFormRules([{ field: "total_spent", operator: "gte", value: 500 }]);
                }
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                formType === "smart" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ קבוצה חכמה (לפי תנאים לוגיים)</span>
            </button>
          </div>

          {/* Basic Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                שם הקבוצה: *
              </label>
              <Input
                type="text"
                placeholder="לדוגמה: תורמי זהב, מתפללי שחרית..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                צבע מזהה:
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      formColor === c ? "scale-120 ring-2 ring-indigo-500 ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {formColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              תיאור הקבוצה (אופציונלי):
            </label>
            <Input
              type="text"
              placeholder="הסבר קצר על מטרת הקבוצה..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 rounded-xl h-9 text-xs"
            />
          </div>

          {/* Smart Group Logical Rule Builder */}
          {formType === "smart" && (
            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900">הגדרת תנאים לוגיים</h4>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-medium">התאמה:</span>
                  <select
                    value={formMatchType}
                    onChange={(e) => setFormMatchType(e.target.value as "all" | "any")}
                    className="bg-white border border-slate-300 rounded-lg text-xs h-7 px-2 font-bold text-slate-800"
                  >
                    <option value="all">כל התנאים יחד (AND / וגם)</option>
                    <option value="any">לפחות תנאי אחד (OR / או)</option>
                  </select>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {formRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex-wrap">
                    {/* Field */}
                    <select
                      value={rule.field}
                      onChange={(e) => {
                        const newRules = [...formRules];
                        newRules[idx].field = e.target.value as any;
                        setFormRules(newRules);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs h-8 px-2 font-semibold text-slate-800"
                    >
                      <option value="total_spent">סך תשלומים (₪)</option>
                      <option value="campaign_amount">סכום קמפיין (₪)</option>
                      <option value="order_count">מספר עסקאות</option>
                      <option value="mh_crm_city">עיר מגורים</option>
                      <option value="company_name">שם חברה</option>
                      <option value="has_phone">יש מספר טלפון</option>
                      <option value="has_email">יש כתובת אימייל</option>
                    </select>

                    {/* Operator */}
                    <select
                      value={rule.operator}
                      onChange={(e) => {
                        const newRules = [...formRules];
                        newRules[idx].operator = e.target.value as any;
                        setFormRules(newRules);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs h-8 px-2 font-semibold text-slate-800"
                    >
                      {rule.field === "has_phone" || rule.field === "has_email" ? (
                        <>
                          <option value="exists">קיים במערכת</option>
                          <option value="not_exists">לא קיים</option>
                        </>
                      ) : rule.field === "total_spent" || rule.field === "campaign_amount" || rule.field === "order_count" ? (
                        <>
                          <option value="gte">גדול או שווה ל- (≥)</option>
                          <option value="lte">קטן או שווה ל- (≤)</option>
                          <option value="eq">שווה בדיוק ל- (=)</option>
                        </>
                      ) : (
                        <>
                          <option value="eq">שווה בדיוק ל-</option>
                          <option value="contains">מכיל את הטקסט</option>
                        </>
                      )}
                    </select>

                    {/* Value */}
                    {rule.field !== "has_phone" && rule.field !== "has_email" && (
                      <Input
                        type={rule.field === "total_spent" || rule.field === "campaign_amount" || rule.field === "order_count" ? "number" : "text"}
                        value={rule.value}
                        onChange={(e) => {
                          const newRules = [...formRules];
                          newRules[idx].value = e.target.value;
                          setFormRules(newRules);
                        }}
                        className="w-32 bg-slate-50 border-slate-200 rounded-lg h-8 text-xs font-bold"
                        placeholder="ערך..."
                      />
                    )}

                    {/* Delete Rule */}
                    <button
                      type="button"
                      onClick={() => setFormRules(formRules.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer ml-auto"
                      title="הסר תנאי זה"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setFormRules([...formRules, { field: "mh_crm_city", operator: "eq", value: "" }])}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף תנאי לוגי נוסף</span>
                </button>

                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  מתאים כרגע ל-<strong>{smartRulePreviewCount}</strong> אנשי קשר במערכת
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGroupModalOpen(false)}
              className="rounded-xl h-10 font-semibold border-slate-200 text-slate-700"
            >
              ביטול
            </Button>
            <Button
              type="button"
              onClick={handleSaveGroup}
              disabled={!formName.trim()}
              className="rounded-xl h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-xs"
            >
              {editingGroupId ? "שמור שינויים" : "צור קבוצה"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. Modal: Transfer / Add Contacts to Group */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      >
        <div className="space-y-4 p-2 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {transferMode === "add" ? "הוספה לקבוצה נוספת" : "העברה מקבוצה לקבוצה"}
            </h3>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600">
            נבחרו <strong>{selectedContactIds.length}</strong> אנשי קשר.
            {transferMode === "add"
              ? " הם ישוייכו לקבוצת היעד בנוסף לקבוצות הקיימות שלהם."
              : ` הם יועברו לקבוצת היעד החדשה ויוסרו מהקבוצה הנוכחית (${activeGroup.name}).`}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              בחר קבוצת יעד:
            </label>
            <select
              value={targetGroupForTransfer}
              onChange={(e) => setTargetGroupForTransfer(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-bold text-slate-800"
            >
              <option value="">-- בחר קבוצה --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name} ({g.count || 0} חברים)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTransferModalOpen(false)}
              className="rounded-xl h-10 font-semibold border-slate-200 text-slate-700"
            >
              ביטול
            </Button>
            <Button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={!targetGroupForTransfer}
              className="rounded-xl h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6"
            >
              {transferMode === "add" ? "הוסף לקבוצה" : "בצע העברה"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Modal: Add Members to Current Group (Multi-Contact Picker) */}
      <Modal
        isOpen={isAddMembersModalOpen}
        onClose={() => {
          setIsAddMembersModalOpen(false);
          setPickerSelectedIds([]);
          setPickerSearch("");
        }}
      >
        <div className="space-y-4 p-2 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              הוספת אנשי קשר לקבוצה: {activeGroup.name}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddMembersModalOpen(false);
                setPickerSelectedIds([]);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="חיפוש לפי שם, טלפון, אימייל..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="pr-9 bg-white border-slate-200 text-slate-800 rounded-xl h-9.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>{eligibleForActiveGroup.length} אנשי קשר זמינים להוספה</span>
            <button
              type="button"
              onClick={() => {
                if (pickerSelectedIds.length === eligibleForActiveGroup.length) {
                  setPickerSelectedIds([]);
                } else {
                  setPickerSelectedIds(eligibleForActiveGroup.map(c => c.id));
                }
              }}
              className="text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {pickerSelectedIds.length === eligibleForActiveGroup.length && eligibleForActiveGroup.length > 0
                ? "בטל בחירת הכל"
                : "בחר את כולם"}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto divide-y divide-slate-100">
            {eligibleForActiveGroup.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                כל אנשי הקשר התואמים כבר שייכים לקבוצה זו.
              </div>
            ) : (
              eligibleForActiveGroup.map((c) => {
                const isChecked = pickerSelectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                      isChecked ? "bg-indigo-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setPickerSelectedIds(prev =>
                            isChecked ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{c.conta_name || "ללא שם"}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.conta_phone || c.email || "-"}</div>
                      </div>
                    </div>
                    {c.mh_crm_city && (
                      <span className="text-[10px] text-slate-400">{c.mh_crm_city}</span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-indigo-700">
              נבחרו: {pickerSelectedIds.length}
            </span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddMembersModalOpen(false);
                  setPickerSelectedIds([]);
                }}
                className="rounded-xl h-9.5 font-semibold border-slate-200 text-slate-700"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleAddPickerMembers}
                disabled={pickerSelectedIds.length === 0}
                className="rounded-xl h-9.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 shadow-xs"
              >
                הוסף {pickerSelectedIds.length} לקבוצה
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
