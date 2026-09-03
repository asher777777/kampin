"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

import { 
  getGroupsData, 
  saveSmartGroup, 
  deleteSmartGroup, 
  bulkAssignGroup, 
  bulkRemoveFromGroup, 
  moveContactsBetweenGroups, 
  bulkPermanentDeleteContacts,
  setContactTags,
  getCampaignsListForSelect,
  getCommunityInteractions,
  type SelectablePageOrCampaign
} from "@/features/crm/groupsActions";
import { ContactModal } from "../ContactModal";
import { CrmFloatingNav } from "@/components/navigation/CrmFloatingNav";
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
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
  Target,
  Compass,
  ImageIcon,
  HeartHandshake,
  Layers,
  MessageCircle,
  Clock,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Columns
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { MessageModal } from "@/app/dashboard/crm/MessageModal";
import WhatsAppGroupImportView from "./WhatsAppGroupImportView";

const ALL_GROUP_COLUMNS = [
  { id: "conta_name", label: "שם איש קשר" },
  { id: "tags", label: "קהילות משויכות" },
  { id: "conta_phone", label: "טלפון" },
  { id: "email", label: "אימייל" },
  { id: "mh_crm_city", label: "עיר" },
  { id: "total_spent", label: "סך תשלומים (₪)" },
  { id: "campaign_amount", label: "סכום קמפיין (₪)" },
  { id: "lead_source", label: "מקור הגעה / ליד" },
  { id: "gender", label: "מגדר" },
  { id: "company_name", label: "שם חברה" },
  { id: "job_title", label: "תפקיד" },
  { id: "status", label: "סטטוס" },
  { id: "createdAt", label: "תאריך הצטרפות" },
  { id: "actions", label: "פעולות מהירות" },
];

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
  const [campaigns, setCampaigns] = useState<SelectablePageOrCampaign[]>([]);

  // Selected Group Filter: "__all__" | "__untagged__" | "<group_id_or_name>"
  const [activeGroupId, setActiveGroupId] = useState<string>("__all__");
  const [mainViewMode, setMainViewMode] = useState<"manage" | "whatsapp_import">("manage");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Group Form / Modal state (for Create / Edit)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLeaderName, setFormLeaderName] = useState("");
  const [formColor, setFormColor] = useState("#4f46e5");
  const [formDesc, setFormDesc] = useState("");
  const [formVision, setFormVision] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formGallery, setFormGallery] = useState<string[]>([]);
  const [formMainCampaignId, setFormMainCampaignId] = useState("");
  const [formPageUrl, setFormPageUrl] = useState("");
  const [formPageSlug, setFormPageSlug] = useState("");
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

  // WhatsApp Composer Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Contact Detail Modal State (Open card on click)
  const [selectedContactForModal, setSelectedContactForModal] = useState<any | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Workspace Sub-Tabs: "contacts" | "interactions"
  const [workspaceTab, setWorkspaceTab] = useState<"contacts" | "interactions">("contacts");
  const [communityInteractions, setCommunityInteractions] = useState<any[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [expandedInteractionIds, setExpandedInteractionIds] = useState<string[]>([]);

  // Inline Quick Tag dropdown
  const [tagDropdownContactId, setTagDropdownContactId] = useState<string | null>(null);

  // Column Selector State (Default: only contact name and associated communities)
  const [selectedGroupColumns, setSelectedGroupColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crm_groups_selected_columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return ["conta_name", "tags"];
  });
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const toggleGroupColumn = (colId: string) => {
    setSelectedGroupColumns(prev => {
      let next: string[];
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev; // Keep at least 1 column
        next = prev.filter(c => c !== colId);
      } else {
        next = [...prev, colId];
      }
      try {
        localStorage.setItem("crm_groups_selected_columns", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const resetGroupColumns = () => {
    const defaults = ["conta_name", "tags"];
    setSelectedGroupColumns(defaults);
    try {
      localStorage.setItem("crm_groups_selected_columns", JSON.stringify(defaults));
    } catch (e) {}
  };

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, campList] = await Promise.all([
        getGroupsData(),
        getCampaignsListForSelect()
      ]);
      if (res.success) {
        setContacts(res.contacts);
        setGroups(res.groups);
        setTotalContacts(res.totalContacts);
        setUntaggedCount(res.untaggedCount);
        setAvailableCities(res.availableCities);
      } else {
        alert("שגיאה בטעינת נתונים: " + res.error);
      }
      setCampaigns(campList || []);
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

  // Load Community Interactions
  const loadCommunityInteractions = useCallback(async () => {
    setLoadingInteractions(true);
    try {
      const res = await getCommunityInteractions(activeGroupId, activeGroup?.name);
      if (res.success) {
        setCommunityInteractions(res.interactions || []);
      }
    } catch (err) {
      console.error("Failed to load community interactions:", err);
    } finally {
      setLoadingInteractions(false);
    }
  }, [activeGroupId, activeGroup]);

  useEffect(() => {
    loadCommunityInteractions();
  }, [loadCommunityInteractions]);

  const toggleExpandInteraction = (id: string) => {
    setExpandedInteractionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
    setFormLeaderName("");
    setFormColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setFormDesc("");
    setFormVision("");
    setFormPurpose("");
    setFormGallery([]);
    setFormMainCampaignId("");
    setFormPageUrl("");
    setFormPageSlug("");
    setFormType(type);
    setFormMatchType("all");
    setFormRules(type === "smart" ? [{ field: "total_spent", operator: "gte", value: 500 }] : []);
    setIsGroupModalOpen(true);
  };

  // Open modal to edit existing group
  const handleOpenEditGroup = (group: SmartGroup) => {
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormLeaderName((group as any).leaderName || "");
    setFormColor(group.color || "#4f46e5");
    setFormDesc(group.description || "");
    setFormVision(group.vision || "");
    setFormPurpose(group.purpose || "");
    setFormGallery(group.gallery || []);
    setFormMainCampaignId(group.mainCampaignId || "");
    setFormPageUrl(group.pageUrl || "");
    setFormPageSlug(group.pageSlug || group.pageId || "");
    setFormType(group.type || "manual");
    setFormMatchType(group.matchType || "all");
    setFormRules(group.rules || []);
    setIsGroupModalOpen(true);
  };

  // Save Group (Create / Update)
  const handleSaveGroup = async () => {
    if (!formName.trim()) {
      alert("נא להזין שם לקהילה");
      return;
    }

    try {
      setLoading(true);
      const chosenCampaign = campaigns.find(c => c.id === formMainCampaignId);
      const res = await saveSmartGroup({
        id: editingGroupId || undefined,
        name: formName.trim(),
        leaderName: formLeaderName.trim() || undefined,
        color: formColor,
        description: formDesc.trim(),
        vision: formVision.trim(),
        purpose: formPurpose.trim(),
        gallery: formGallery,
        mainCampaignId: formMainCampaignId,
        campaignTitle: chosenCampaign?.title || "",
        pageSlug: formPageSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || undefined,
        pageUrl: formPageUrl || undefined,
        type: formType,
        matchType: formMatchType,
        rules: formType === "smart" ? formRules : []
      } as any);

      if (res.success) {
        setIsGroupModalOpen(false);
        setActiveGroupId(res.id || formName.trim());
        await loadData();
      } else {
        alert("שגיאה בשמירת קהילה: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (group: SmartGroup) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את הקהילה "${group.name}"?`)) return;
    try {
      setLoading(true);
      const res = await deleteSmartGroup(group.id);
      if (res.success) {
        if (activeGroupId === group.id || activeGroupId === group.name) {
          setActiveGroupId("__all__");
        }
        await loadData();
      } else {
        alert("שגיאה במחיקת קהילה: " + res.error);
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
      alert("נא לבחור קהילת יעד");
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
    <div className="h-full w-full overflow-y-auto bg-slate-50 text-slate-800 p-4 md:p-8 pb-40 space-y-6 text-right select-none font-sans" dir="rtl">
      
      {/* 0. Top View Mode Switcher (Manage vs WhatsApp Import) */}
      {mainViewMode === "whatsapp_import" ? (
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => setMainViewMode("manage")}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>חזור לניהול קהילות וקבוצות</span>
            </button>
          </div>
          <WhatsAppGroupImportView
            existingGroups={groups}
            onImportComplete={(targetGroupName) => {
              setMainViewMode("manage");
              setActiveGroupId(targetGroupName);
              loadData();
            }}
          />
        </div>
      ) : (
        <>
          {/* 1. Ultra-Compact Unified Top Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Right side: Active Community Title & Pill Sub-tabs Switcher */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
                  style={{ backgroundColor: activeGroup.color || "#4f46e5" }}
                />
                <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeGroup.name}</span>
                  {activeGroup.type === "smart" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      חכמה
                    </span>
                  )}
                </h1>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

              {/* Sub-tabs: Contacts vs Interactions */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setWorkspaceTab("contacts")}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceTab === "contacts"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>אנשי קשר</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-200/70 text-slate-700">
                    {filteredContacts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab("interactions");
                    loadCommunityInteractions();
                  }}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceTab === "interactions"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>אינטראקציות</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-200/70 text-slate-700">
                    {communityInteractions.length}
                  </span>
                </button>
              </div>

              {/* Live Community Page Link if custom community */}
              {!activeGroupId.startsWith("__") && (activeGroup.pageUrl || activeGroup.campaignTitle) && (
                <div className="flex items-center gap-1.5 hidden md:flex">
                  {activeGroup.pageUrl && (
                    <a
                      href={activeGroup.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs border border-indigo-200 transition-colors"
                    >
                      <Globe className="w-3 h-3 text-indigo-600" />
                      <span>עמוד קהילה</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                  {activeGroup.campaignTitle && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg text-xs border border-rose-200">
                      <HeartHandshake className="w-3 h-3 text-rose-500" />
                      <span>קמפיין: {activeGroup.campaignTitle}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Left side: Consolidated Actions */}
            <div className="flex items-center gap-2">
              {/* Quick WhatsApp button */}
              <Button
                onClick={() => {
                  if (filteredContacts.length === 0) {
                    alert("אין אנשי קשר בקהילה זו לשליחה");
                    return;
                  }
                  setSelectedContactIds(filteredContacts.map(c => c.id));
                  setIsWhatsAppModalOpen(true);
                }}
                className="h-8.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">וואטסאפ לקהילה</span>
              </Button>

              {/* + קהילה חדשה button */}
              <Button
                onClick={() => handleOpenCreateGroup("manual")}
                className="h-8.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>קהילה חדשה</span>
              </Button>

              {/* Actions Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className={`h-8.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
                    showActionsDropdown ? "bg-slate-100 ring-2 ring-indigo-500/20" : ""
                  }`}
                  title="פעולות נוספות"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">פעולות</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showActionsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActionsDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 dir-rtl text-xs">
                      {!activeGroupId.startsWith("__") && activeGroup.type !== "smart" && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsDropdown(false);
                            setIsAddMembersModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-right cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                          <span>הוסף אנשי קשר לקהילה</span>
                        </button>
                      )}

                      {!activeGroupId.startsWith("__") && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActionsDropdown(false);
                            handleOpenEditGroup(activeGroup);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-right cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>ערוך הגדרות קהילה</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          handleExportCsv();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-right cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>ייצא רשימה לאקסל</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setMainViewMode("whatsapp_import");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 transition-colors text-right cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ייבוא קבוצות וואטסאפ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          handleOpenCreateGroup("smart");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-amber-800 hover:bg-amber-50 transition-colors text-right cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>צור קהילה חכמה (לפי תנאים)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          loadData();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-right cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                        <span>רענן נתונים</span>
                      </button>

                      {!activeGroupId.startsWith("__") && (
                        <div className="border-t border-slate-100 pt-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowActionsDropdown(false);
                              handleDeleteGroup(activeGroup);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-right cursor-pointer font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>מחק קהילה זו</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. Compact Scrolling Community Pills Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
            {/* All Contacts Tab */}
            <button
              type="button"
              onClick={() => setActiveGroupId("__all__")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                activeGroupId === "__all__"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Users className="w-3.5 h-3.5 opacity-80" />
              <span>כל אנשי הקשר</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeGroupId === "__all__" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {totalContacts}
              </span>
            </button>

            {/* Untagged Contacts Tab */}
            <button
              type="button"
              onClick={() => setActiveGroupId("__untagged__")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                activeGroupId === "__untagged__"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>ללא קהילה</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeGroupId === "__untagged__" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-900"
              }`}>
                {untaggedCount}
              </span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" />

            {/* Custom Communities Tabs */}
            {groups.map((g) => {
              const isActive = activeGroupId === g.id || activeGroupId === g.name;
              const isSmart = g.type === "smart";

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: g.color || "#4f46e5" }}
                  />
                  {isSmart && (
                    <Zap className={`w-3 h-3 shrink-0 ${isActive ? "text-amber-300" : "text-amber-600"}`} />
                  )}
                  <span>{g.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {g.count || 0}
                  </span>
                </button>
              );
            })}

            {/* Quick Add Community Pill Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateGroup("manual")}
              className="p-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 text-slate-400 hover:text-indigo-600 bg-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="צור קהילה חדשה"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Main Desktop Workspace */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tab 1: Contacts Table View */}
            {workspaceTab === "contacts" ? (
              <div>
                {/* Quick search & columns picker sub-bar */}
            <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 flex-grow max-w-lg">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="חיפוש מהיר לפי שם, טלפון, עיר..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="pr-9 bg-slate-50 border-slate-200 rounded-xl text-xs h-9 text-slate-800 placeholder:text-slate-400 w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                  מוצגים {filteredContacts.length} מתוך {contacts.length} אנשי קשר
                </span>

                {/* Column Picker Button & Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                    className={`px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showColumnsDropdown ? "bg-slate-100 ring-2 ring-indigo-500/20 text-indigo-700" : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5 text-indigo-600" />
                    <span>בחר עמודות להצגה ({selectedGroupColumns.length})</span>
                  </button>

                  {showColumnsDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowColumnsDropdown(false)} />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 dir-rtl">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800">עמודות בטבלה</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroupColumns(["conta_name", "tags"]);
                              try { localStorage.setItem("crm_groups_selected_columns", JSON.stringify(["conta_name", "tags"])); } catch (e) {}
                            }}
                            className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            איפוס לברירת מחדל
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {ALL_GROUP_COLUMNS.map(col => {
                            const isSelected = selectedGroupColumns.includes(col.id);
                            return (
                              <label
                                key={col.id}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/70 text-indigo-900" : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleGroupColumn(col.id)}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span>{col.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

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
                    {selectedGroupColumns.map(colId => {
                      const colDef = ALL_GROUP_COLUMNS.find(c => c.id === colId);
                      return (
                        <th key={colId} className={`p-3 ${colId === "actions" ? "text-left" : ""}`}>
                          {colDef?.label || colId}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={selectedGroupColumns.length + 1} className="p-16 text-center text-slate-400">
                        {loading ? "טוען נתונים..." : "לא נמצאו אנשי קשר תואמים."}
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => {
                      const isSelected = selectedContactIds.includes(c.id);
                      const contactTags: string[] = Array.isArray(c.tags) ? c.tags : [];
                      const isTagDropdownOpen = tagDropdownContactId === c.id;

                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => {
                            setSelectedContactForModal(c);
                            setIsContactModalOpen(true);
                          }}
                          className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/70" : ""
                          }`}
                          title="לחץ לפתיחת כרטיס איש הקשר"
                        >
                          {/* Checkbox */}
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedContactIds(prev =>
                                  isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                );
                              }}
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                            />
                          </td>

                          {/* Dynamic Columns */}
                          {selectedGroupColumns.map(colId => {
                            switch (colId) {
                              case "conta_name":
                                return (
                                  <td key={colId} className="p-3 font-semibold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        {(c.conta_name || "א").charAt(0)}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">{c.conta_name} {c.f_m || ""}</span>
                                        {c.company_name && (
                                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Building className="w-3 h-3" />
                                            {c.company_name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              case "tags":
                                return (
                                  <td key={colId} className="p-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 flex-wrap relative">
                                      {contactTags.length === 0 ? (
                                        <span className="text-[11px] text-slate-400 italic">ללא קהילות</span>
                                      ) : (
                                        contactTags.map((tag) => {
                                          const grp = groups.find((g) => g.name === tag);
                                          const color = grp?.color || "#4f46e5";
                                          return (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors group"
                                              style={{
                                                backgroundColor: `${color}15`,
                                                borderColor: `${color}40`,
                                                color: color,
                                              }}
                                            >
                                              <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: color }}
                                              />
                                              <span>{tag}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleTag(c.id, tag);
                                                }}
                                                className="hover:opacity-100 opacity-60 ml-0.5 cursor-pointer"
                                                title={`הסר מקהילת ${tag}`}
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </span>
                                          );
                                        })
                                      )}

                                      {/* Plus button to open inline community multi-select picker */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTagDropdownContactId(isTagDropdownOpen ? null : c.id);
                                          }}
                                          className="w-5 h-5 rounded-md border border-dashed border-slate-300 hover:border-indigo-500 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                                          title="שייך לקהילה נוספת"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>

                                        {/* Inline Dropdown Popover */}
                                        {isTagDropdownOpen && (
                                          <div 
                                            className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-100 mb-1">
                                              בחר קהילות לשיוך:
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
                                );
                              case "conta_phone":
                                return (
                                  <td key={colId} className="p-3" onClick={(e) => e.stopPropagation()}>
                                    {c.conta_phone ? (
                                      <a 
                                        href={`tel:${c.conta_phone}`} 
                                        className="text-slate-600 hover:text-indigo-600 flex items-center gap-1 font-mono text-[11px]"
                                        dir="ltr"
                                      >
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {c.conta_phone}
                                      </a>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                );
                              case "email":
                                return (
                                  <td key={colId} className="p-3" onClick={(e) => e.stopPropagation()}>
                                    {c.email ? (
                                      <a 
                                        href={`mailto:${c.email}`} 
                                        className="text-slate-600 hover:text-indigo-600 flex items-center gap-1 truncate max-w-[170px]"
                                      >
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{c.email}</span>
                                      </a>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                );
                              case "mh_crm_city":
                                return (
                                  <td key={colId} className="p-3 text-slate-600">
                                    {c.mh_crm_city ? (
                                      <span className="flex items-center gap-1 text-[11px]">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {c.mh_crm_city}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                );
                              case "total_spent":
                                return (
                                  <td key={colId} className="p-3 font-mono font-bold text-slate-800">
                                    {c.total_spent !== undefined && Number(c.total_spent) > 0 ? (
                                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        ₪{Number(c.total_spent).toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">₪0</span>
                                    )}
                                  </td>
                                );
                              case "campaign_amount":
                                return (
                                  <td key={colId} className="p-3 font-mono font-bold text-slate-800">
                                    {c.campaign_amount !== undefined && Number(c.campaign_amount) > 0 ? (
                                      <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                        ₪{Number(c.campaign_amount).toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">₪0</span>
                                    )}
                                  </td>
                                );
                              case "lead_source":
                                return (
                                  <td key={colId} className="p-3 text-slate-600">
                                    {c.lead_source || "-"}
                                  </td>
                                );
                              case "gender":
                                return (
                                  <td key={colId} className="p-3 text-slate-600">
                                    {c.gender === "male" || c.gender === "זכר" ? "זכר" : (c.gender === "female" || c.gender === "נקבה" ? "נקבה" : (c.gender || "-"))}
                                  </td>
                                );
                              case "company_name":
                                return (
                                  <td key={colId} className="p-3 text-slate-600">
                                    {c.company_name || "-"}
                                  </td>
                                );
                              case "job_title":
                                return (
                                  <td key={colId} className="p-3 text-slate-600">
                                    {c.job_title || "-"}
                                  </td>
                                );
                              case "status":
                                return (
                                  <td key={colId} className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      c.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                    }`}>
                                      {c.status === "active" ? "פעיל" : (c.status || "פעיל")}
                                    </span>
                                  </td>
                                );
                              case "createdAt":
                                return (
                                  <td key={colId} className="p-3 text-slate-500 font-mono text-[11px]">
                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("he-IL") : "-"}
                                  </td>
                                );
                              case "actions":
                                return (
                                  <td key={colId} className="p-3 text-left" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedContactIds([c.id]);
                                          setIsWhatsAppModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                        title="שלח וואטסאפ לאיש קשר זה"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </button>

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
                                          הסר
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                );
                              default:
                                return <td key={colId} className="p-3 text-slate-600">{String(c[colId] || "-")}</td>;
                            }
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Tab 2: Community Interactions Table with expandable recipients
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>היסטוריית אינטראקציות והודעות וואטסאפ של {activeGroup.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  כל ההודעות הקבוצתיות והאישיות שנשלחו לחברי הקהילה עם פירוט נמענים מלא
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={loadCommunityInteractions}
                  variant="outline"
                  className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingInteractions ? "animate-spin" : ""}`} />
                  <span>רענן</span>
                </Button>

                <Button
                  onClick={() => {
                    if (filteredContacts.length === 0) {
                      alert("אין אנשי קשר בקהילה זו לשליחה");
                      return;
                    }
                    setSelectedContactIds(filteredContacts.map(c => c.id));
                    setIsWhatsAppModalOpen(true);
                  }}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>שליחת הודעה חדשה</span>
                </Button>
              </div>
            </div>

            {loadingInteractions ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs font-semibold">טוען אינטראקציות קהילה...</p>
              </div>
            ) : communityInteractions.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800">טרם נשלחו הודעות לחברי קהילה זו</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    שליחת הודעות וואטסאפ מותאמות אישית לחברי הקהילה תתועד כאן אוטומטית ובכרטיס כל איש קשר.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (filteredContacts.length === 0) {
                      alert("אין אנשי קשר בקהילה זו לשליחה");
                      return;
                    }
                    setSelectedContactIds(filteredContacts.map(c => c.id));
                    setIsWhatsAppModalOpen(true);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 h-9 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  <span>שלח הודעה ראשונה לקהילה</span>
                </Button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="p-3.5 w-44">זמן ותאריך שליחה</th>
                      <th className="p-3.5">תוכן ההודעה</th>
                      <th className="p-3.5 w-40 text-center">סטטוס והיקף</th>
                      <th className="p-3.5 w-48 text-left">אנשי קשר ונמענים</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {communityInteractions.map((interaction) => {
                      const isExpanded = expandedInteractionIds.includes(interaction.id);
                      const recs = Array.isArray(interaction.recipients) ? interaction.recipients : [];
                      const createdDate = new Date(interaction.createdAt);
                      const formattedDate = createdDate.toLocaleDateString("he-IL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      });
                      const formattedTime = createdDate.toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <React.Fragment key={interaction.id}>
                          <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? "bg-emerald-50/20" : ""}`}>
                            {/* Date & Time */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {formattedDate}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {formattedTime}
                                </span>
                              </div>
                            </td>

                            {/* Message Content */}
                            <td className="p-3.5">
                              <div className="space-y-2 max-w-xl">
                                <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed whitespace-pre-line font-medium">
                                  {interaction.messageContent}
                                </p>

                                {/* Attached File or Media Link */}
                                {interaction.mediaUrl && (
                                  <div className="pt-0.5">
                                    {interaction.mediaUrl.startsWith("http://") || interaction.mediaUrl.startsWith("https://") ? (
                                      <a
                                        href={interaction.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition-colors shadow-2xs text-[11px] group"
                                        title="פתח קישור / קובץ מצורף"
                                      >
                                        <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        <span className="truncate max-w-[280px]">קישור מצורף: {interaction.mediaUrl}</span>
                                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
                                      </a>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200/80 shadow-2xs text-[11px]">
                                        <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span className="truncate max-w-[280px]">קובץ מצורף: {interaction.mediaUrl}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Status & Counts */}
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{interaction.successCount || recs.length} נשלחו בהצלחה</span>
                                </span>
                                {interaction.failureCount > 0 && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    {interaction.failureCount} נכשלו
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Expand Accordion Button */}
                            <td className="p-3.5 text-left whitespace-nowrap">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => toggleExpandInteraction(interaction.id)}
                                className={`h-8.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                  isExpanded 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span>{isExpanded ? "הסתר פירוט נמענים" : `הצג ${recs.length} נמענים`}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                            </td>
                          </tr>

                          {/* Expanded Accordion Row: Recipients Detail List */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={4} className="p-4 sm:p-5">
                                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-inner">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>פירוט נמענים שנשלחה אליהם ההודעה ({recs.length}):</span>
                                    </h4>
                                    <span className="text-[11px] font-mono text-slate-400">
                                      שליחה קבוצתית מותאמת אישית
                                    </span>
                                  </div>

                                  {recs.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">לא נמצא פירוט נמענים עבור אינטראקציה זו.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                      {recs.map((rec: any, rIdx: number) => {
                                        const isSuccess = rec.status === "השליחה הצליחה" || rec.status === "success" || !rec.status?.includes("נכשל");

                                        return (
                                          <div 
                                            key={rIdx}
                                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-1.5 text-xs"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                                  {(rec.name || "נ").charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-900">{rec.name || "איש קשר"}</span>
                                              </div>

                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                                isSuccess ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                              }`}>
                                                {isSuccess ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                <span>{rec.status || (isSuccess ? "נשלח" : "נכשל")}</span>
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono" dir="ltr">
                                              <span>{rec.phone}</span>
                                              {rec.messageId && (
                                                <span className="text-[9px] text-slate-400 truncate max-w-[120px]" title={rec.messageId}>
                                                  ID: {rec.messageId.slice(0, 10)}...
                                                </span>
                                              )}
                                            </div>

                                            {rec.personalizedContent && (
                                              <div className="mt-1 p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 line-clamp-2 italic" dir="rtl">
                                                "{rec.personalizedContent}"
                                              </div>
                                            )}

                                            {/* Attached Media / Link if exists */}
                                            {interaction.mediaUrl && (
                                              <div className="mt-1 pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[11px]">
                                                {interaction.mediaUrl.startsWith("http://") || interaction.mediaUrl.startsWith("https://") ? (
                                                  <a
                                                    href={interaction.mediaUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:underline flex items-center gap-1 font-bold truncate max-w-[240px]"
                                                  >
                                                    <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                                                    <span className="truncate">קובץ / קישור: {interaction.mediaUrl}</span>
                                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                                  </a>
                                                ) : (
                                                  <span className="text-amber-800 font-semibold flex items-center gap-1 truncate max-w-[240px]">
                                                    <Paperclip className="w-3 h-3 text-amber-600 shrink-0" />
                                                    <span className="truncate">קובץ מצורף: {interaction.mediaUrl}</span>
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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

          {/* Send WhatsApp Message Button (Step 3 Composer) */}
          <Button
            onClick={() => {
              setIsWhatsAppModalOpen(true);
            }}
            className="h-8.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>שליחת הודעת וואטסאפ</span>
          </Button>

          {/* Add to Another Community Button */}
          <Button
            onClick={() => {
              setTransferMode("add");
              setTargetGroupForTransfer("");
              setIsTransferModalOpen(true);
            }}
            className="h-8.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>הוסף לקהילה נוספת</span>
          </Button>

          {/* Move Between Communities Button */}
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
            <span>העבר בין קהילות</span>
          </Button>

          {/* Create New Community Button */}
          <Button
            onClick={() => handleOpenCreateGroup("manual")}
            variant="outline"
            className="h-8.5 px-3 rounded-xl border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ צור קהילה חדשה</span>
          </Button>

          {/* Remove from current community */}
          {!activeGroupId.startsWith("__") && activeGroup.type !== "smart" && (
            <Button
              onClick={async () => {
                if (!window.confirm(`האם להסיר ${selectedContactIds.length} אנשי קשר מהקהילה "${activeGroup.name}"?`)) return;
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
              className="h-8.5 px-3 rounded-xl border-amber-900/60 text-amber-300 bg-amber-950/30 hover:bg-amber-950/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>הסר מהקהילה הנוכחית</span>
            </Button>
          )}

          {/* Permanently Delete Selected Contacts */}
          <Button
            onClick={async () => {
              if (!window.confirm(`⚠️ פעולה בלתי הפיכה!\nהאם אתה בטוח שברצונך למחוק לצמיתות ${selectedContactIds.length} אנשי קשר ממסד הנתונים?`)) return;
              try {
                setLoading(true);
                const res = await bulkPermanentDeleteContacts(selectedContactIds);
                if (res.success) {
                  setSelectedContactIds([]);
                  await loadData();
                } else {
                  alert(res.error || "שגיאה במחיקת אנשי קשר");
                }
              } catch (e: any) {
                alert("שגיאה: " + e.message);
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            className="h-8.5 px-3 rounded-xl border-rose-500/50 text-rose-300 bg-rose-950/60 hover:bg-rose-900 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>הסרה לצמיתות</span>
          </Button>

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
      </>
      )}

      {/* 5. Modal: Create / Edit Community with Parameters & Logical Rules */}
      {isGroupModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 text-right space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingGroupId ? "עריכת פרמטרים לקהילה" : "יצירת קהילה חדשה"}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Community Type Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFormType("manual")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formType === "manual" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>קהילה רגילה (שיוך חופשי / ידני)</span>
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
                <span>⚡ קהילה חכמה (לפי תנאים לוגיים)</span>
              </button>
            </div>

            {/* Basic Parameters: Community Name & Leader Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  שם הקהילה: *
                </label>
                <Input
                  type="text"
                  placeholder="לדוגמה: קהילת חב&quot;ד נווה שאנן, תורמי זהב..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 text-xs font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  שם מוביל הקהילה:
                </label>
                <Input
                  type="text"
                  placeholder="לדוגמה: הרב ישראל כהן"
                  value={formLeaderName}
                  onChange={(e) => setFormLeaderName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  תיאור קצר (אופציונלי):
                </label>
                <Input
                  type="text"
                  placeholder="הסבר קצר על הקהילה..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            {/* Vision & Purpose Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  <span>חזון הקהילה:</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="תאר את החזון הרוחני / החברתי של הקהילה..."
                  value={formVision}
                  onChange={(e) => setFormVision(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>מטרת הקהילה ויעדים:</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="מהן מטרות הקהילה? (יעדי גיוס, פעילויות, אירועים)..."
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 rounded-xl p-2.5 text-xs focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Image Gallery with Media Upload Component */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>גלריית תמונות לקהילה ({formGallery.length})</span>
                </label>
                <span className="text-[11px] text-slate-400">העלאה או בחירה מספריית המדיה</span>
              </div>

              {/* Upload Component & Gallery Grid */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 space-y-3">
                {formGallery.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {formGallery.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-white">
                        <img src={url} alt={`קהילה ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormGallery(formGallery.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title="הסר תמונה זו"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <ImageUpload 
                    onSelect={(url) => {
                      if (typeof url === "string" && url) {
                        setFormGallery((prev) => [...prev, url]);
                      } else if (Array.isArray(url)) {
                        setFormGallery((prev) => [...prev, ...url]);
                      }
                    }} 
                    compact={true}
                  />
                  <span className="text-[11px] text-slate-500">
                    {formGallery.length === 0 ? "טרם הועלו תמונות לגלריה" : "לחץ להוספת תמונות נוספות"}
                  </span>
                </div>
              </div>
            </div>

            {/* Campaign & Page Link Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Linked Main Campaign / Target Page */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                  <span>קמפיין ראשי / עמוד יעד מקושר:</span>
                </label>
                <select
                  value={formMainCampaignId}
                  onChange={(e) => setFormMainCampaignId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">-- ללא עמוד / קמפיין מקושר --</option>
                  {Array.from(new Set(campaigns.map(c => c.category || "עמודים"))).map((category) => (
                    <optgroup key={category} label={`🔹 ${category}`}>
                      {campaigns
                        .filter(c => (c.category || "עמודים") === category)
                        .map((camp) => (
                          <option key={camp.id} value={camp.id}>
                            {camp.title} {camp.target && camp.target > 0 ? `(יעד: ₪${camp.target.toLocaleString()})` : ""}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Community Page Slug (English Only) & Direct Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>סלאג לעמוד הקהילה (באנגלית בלבד):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">a-z, 0-9, -</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl h-10 px-3 text-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
                  <span className="text-slate-400 font-mono font-bold">/</span>
                  <input
                    type="text"
                    value={formPageSlug}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setFormPageSlug(val);
                    }}
                    placeholder={editingGroupId ? `comm-${editingGroupId.substring(0, 8)}` : "my-community"}
                    className="w-full bg-transparent font-mono text-xs text-indigo-700 font-bold outline-none text-left"
                    dir="ltr"
                  />
                  {(formPageUrl || formPageSlug) && (
                    <a
                      href={formPageSlug ? `/${formPageSlug}` : formPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                      title="צפה בעמוד הקהילה"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ✨ הכתובת יכולה להכיל אותיות באנגלית, מספרים ומקפים בלבד (לדוגמה: <span className="font-mono text-indigo-600">tanya-community</span>).
                </p>
              </div>
            </div>

            {/* Smart Community Logical Rule Builder */}
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
                          const newField = e.target.value as any;
                          const newRules = [...formRules];
                          let defaultOp: any = "eq";
                          let defaultVal: any = "";

                          if (newField === "total_spent" || newField === "order_count") {
                            defaultOp = "gte";
                            defaultVal = newField === "total_spent" ? 500 : 1;
                          } else if (newField === "gender") {
                            defaultOp = "eq";
                            defaultVal = "זכר";
                          } else if (newField === "has_phone") {
                            defaultOp = "exists";
                            defaultVal = "";
                          } else {
                            defaultOp = "contains";
                            defaultVal = "";
                          }

                          newRules[idx] = {
                            field: newField,
                            operator: defaultOp,
                            value: defaultVal
                          };
                          setFormRules(newRules);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs h-8 px-2 font-semibold text-slate-800"
                      >
                        <option value="total_spent">סך תשלומים (₪)</option>
                        <option value="order_count">מספר עסקאות</option>
                        <option value="lead_source">מקור הליד</option>
                        <option value="gender">מגדר</option>
                        <option value="mh_crm_city">עיר מגורים</option>
                        <option value="company_name">שם חברה</option>
                        <option value="has_phone">יש מספר טלפון</option>
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
                        {rule.field === "has_phone" ? (
                          <>
                            <option value="exists">קיים במערכת</option>
                            <option value="not_exists">לא קיים</option>
                          </>
                        ) : rule.field === "total_spent" || rule.field === "order_count" ? (
                          <>
                            <option value="gte">גדול או שווה ל- (≥)</option>
                            <option value="lte">קטן או שווה ל- (≤)</option>
                            <option value="eq">שווה בדיוק ל- (=)</option>
                          </>
                        ) : rule.field === "gender" ? (
                          <>
                            <option value="eq">שווה בדיוק ל-</option>
                          </>
                        ) : (
                          <>
                            <option value="contains">מכיל את הטקסט</option>
                            <option value="eq">שווה בדיוק ל-</option>
                            <option value="exists">קיים / לא ריק</option>
                            <option value="not_exists">ריק / לא קיים</option>
                          </>
                        )}
                      </select>

                      {/* Value */}
                      {rule.field !== "has_phone" && rule.operator !== "exists" && rule.operator !== "not_exists" && (
                        rule.field === "gender" ? (
                          <select
                            value={String(rule.value || "זכר")}
                            onChange={(e) => {
                              const newRules = [...formRules];
                              newRules[idx].value = e.target.value;
                              setFormRules(newRules);
                            }}
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg h-8 text-xs font-bold px-2 text-slate-800"
                          >
                            <option value="זכר">זכר</option>
                            <option value="נקבה">נקבה</option>
                            <option value="אחר">אחר</option>
                          </select>
                        ) : (
                          <Input
                            type={rule.field === "total_spent" || rule.field === "order_count" ? "number" : "text"}
                            value={rule.value}
                            onChange={(e) => {
                              const newRules = [...formRules];
                              newRules[idx].value = e.target.value;
                              setFormRules(newRules);
                            }}
                            className="w-32 bg-slate-50 border-slate-200 rounded-lg h-8 text-xs font-bold"
                            placeholder="ערך..."
                          />
                        )
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
                className="rounded-xl h-10 font-semibold border-slate-200 text-slate-700 cursor-pointer"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleSaveGroup}
                disabled={!formName.trim()}
                className="rounded-xl h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-xs cursor-pointer"
              >
                {editingGroupId ? "שמור שינויים" : "צור קהילה"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Transfer / Add Contacts to Community */}
      {isTransferModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsTransferModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-right space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {transferMode === "add" ? "הוספה לקהילה נוספת" : "העברה מקהילה לקהילה"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              נבחרו <strong>{selectedContactIds.length}</strong> אנשי קשר.
              {transferMode === "add"
                ? " הם ישוייכו לקהילת היעד בנוסף לקהילות הקיימות שלהם."
                : ` הם יועברו לקהילת היעד החדשה ויוסרו מהקהילה הנוכחית (${activeGroup.name}).`}
            </p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  בחר קהילת יעד:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferModalOpen(false);
                    handleOpenCreateGroup("manual");
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors border border-indigo-200/60"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ צור קהילה חדשה</span>
                </button>
              </div>
              <select
                value={targetGroupForTransfer}
                onChange={(e) => setTargetGroupForTransfer(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- בחר קהילה קיימת --</option>
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
                className="rounded-xl h-10 font-semibold border-slate-200 text-slate-700 cursor-pointer"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={!targetGroupForTransfer}
                className="rounded-xl h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-6 cursor-pointer"
              >
                {transferMode === "add" ? "הוסף לקהילה" : "בצע העברה"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Add Members to Current Community (Multi-Contact Picker) */}
      {isAddMembersModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setIsAddMembersModalOpen(false);
            setPickerSelectedIds([]);
            setPickerSearch("");
          }}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 text-right space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                הוספת אנשי קשר לקהילה: {activeGroup.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddMembersModalOpen(false);
                  setPickerSelectedIds([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
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
                  כל אנשי הקשר התואמים כבר שייכים לקהילה זו.
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
                  className="rounded-xl h-9.5 font-semibold border-slate-200 text-slate-700 cursor-pointer"
                >
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={handleAddPickerMembers}
                  disabled={pickerSelectedIds.length === 0}
                  className="rounded-xl h-9.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 shadow-xs cursor-pointer"
                >
                  הוסף {pickerSelectedIds.length} לקהילה
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. WhatsApp Group Send Composer Modal (Step 3) */}
      <MessageModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        contacts={contacts.filter(c => selectedContactIds.includes(c.id))}
        type="whatsapp"
        communityId={activeGroupId}
        communityName={activeGroup.name}
        onSuccess={() => {
          setSelectedContactIds([]);
          loadData();
          loadCommunityInteractions();
        }}
      />

      {/* 9. Contact Card Modal (Open Full Contact Details on Row Click) */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setSelectedContactForModal(null);
        }}
        contact={selectedContactForModal}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Floating Action Navigation Menu */}
      <CrmFloatingNav 
        activePage="groups"
        onOpenNewContact={() => {
          setSelectedContactForModal(null);
          setIsContactModalOpen(true);
        }}
      />
    </div>
  );
}
