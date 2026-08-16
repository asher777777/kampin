"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  getContacts, 
  getCRMStats, 
  getCRMFilters, 
  handleBulkAction, 
  importContacts 
} from "@/features/crm/actions";
import { getCommunities } from "@/features/communities/actions";
import dynamic from "next/dynamic";
import { Contact } from "@/features/crm/types";
import Link from "next/link";
// Lazy loaded modals
const ContactModal = dynamic(() => import("./ContactModal").then(m => m.ContactModal), { ssr: false });
const ImportExportModal = dynamic(() => import("./ImportExportModal").then(m => m.ImportExportModal), { ssr: false });
import { EXPORT_COLUMNS } from "./ImportExportModal";
const MessageModal = dynamic(() => import("./MessageModal").then(m => m.MessageModal), { ssr: false });
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Plus, 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  User,
  Users, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  ChevronLeft, 
  ArrowUpDown,
  ChevronDown,
  Trash2,
  MessageCircle,
  Mail,
  Clock,
  MoreVertical,
  Edit,
  Phone,
  Menu
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import * as XLSX from "xlsx/xlsx.mjs";

const getInitials = (name: string, fm?: string) => {
  const first = name ? name.trim().charAt(0) : "";
  const last = fm ? fm.trim().charAt(0) : "";
  return `${first}${last}`.toUpperCase();
};

const getAvatarBg = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-pink-500",
    "bg-purple-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-sky-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-orange-500",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const getCardTheme = (name: string) => {
  const themes = [
    { card: "bg-[#181818] border-white/5", iconBg: "bg-[#222]", iconText: "text-emerald-400", Icon: User },
    { card: "bg-[#181818] border-white/5", iconBg: "bg-[#222]", iconText: "text-blue-400", Icon: User },
    { card: "bg-[#181818] border-white/5", iconBg: "bg-[#222]", iconText: "text-purple-400", Icon: User },
    { card: "bg-[#181818] border-white/5", iconBg: "bg-[#222]", iconText: "text-amber-400", Icon: User },
    { card: "bg-[#181818] border-white/5", iconBg: "bg-[#222]", iconText: "text-pink-400", Icon: User },
  ];
  let sum = 0;
  if (name) {
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
  }
  return themes[sum % themes.length];
};

export default function CRMDashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState<"active" | "trashed">("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  
  // Communities
  const [communities, setCommunities] = useState<any[]>([]);
  
  // Sorting
  const [orderby, setOrderby] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Stats & Filters
  const [stats, setStats] = useState({ active: 0, trashed: 0 });
  const [filtersConfig, setFiltersConfig] = useState<{
    tags: string[];
    cities: string[];
    lead_sources: string[];
  }>({ tags: [], cities: [], lead_sources: [] });

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [actionMenuState, setActionMenuState] = useState<"main" | "kesher_sync">("main");
  const [showFilters, setShowFilters] = useState(false);
  const [tabsMenuOpen, setTabsMenuOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Message Modal States
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTargetContacts, setMessageTargetContacts] = useState<Contact[]>([]);
  const [messageModalType, setMessageModalType] = useState<"whatsapp" | "email" | "reminder" | null>(null);

  const openMessageModal = (contacts: Contact[], type: "whatsapp" | "email" | "reminder") => {
    setMessageTargetContacts(contacts);
    setMessageModalType(type);
    setMessageModalOpen(true);
  };

  const [activeDropdownContactId, setActiveDropdownContactId] = useState<string | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes, filtersRes, communitiesRes] = await Promise.all([
        getContacts({
          status,
          search: debouncedSearch,
          tag_filter: tagFilter,
          city_filter: cityFilter,
          lead_source_filter: leadSourceFilter,
          orderby,
          order,
          page,
          per_page: perPage,
          community_filter: communityFilter
        }),
        getCRMStats(),
        getCRMFilters(),
        getCommunities()
      ]);

      if ((res as any).error) {
        alert("שגיאה בטעינת אנשי קשר: " + (res as any).error);
      }

      if (page === 1) {
        setContacts(res.contacts);
      } else {
        setContacts(prev => {
          const newContacts = [...prev];
          res.contacts.forEach((c: any) => {
            if (!newContacts.find(x => x.id === c.id)) {
              newContacts.push(c);
            }
          });
          return newContacts;
        });
      }
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(statsRes);
      setFiltersConfig(filtersRes);
      setCommunities(communitiesRes);
      setSelectedIds([]); // clear selection on load
    } catch (error) {
      console.error("Failed to load CRM data:", error);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, tagFilter, cityFilter, leadSourceFilter, communityFilter, orderby, order, page, perPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sorting Handler
  const handleSort = (field: string) => {
    if (orderby === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderby(field);
      setOrder("desc");
    }
    setPage(1);
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map(c => c.id || ""));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Action Handler
  const handleExecuteBulkAction = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;

    if (bulkAction === "whatsapp" || bulkAction === "email") {
      const selectedContacts = contacts.filter(c => selectedIds.includes(c.id || ""));
      openMessageModal(selectedContacts, bulkAction);
      setBulkAction("");
      return;
    }

    if (bulkAction === "export") {
      setIsImportExportOpen(true);
      setBulkAction("");
      // Keep selectedIds so they can be exported
      return;
    }
    
    let confirmMsg = "";
    let actionType: "trash" | "restore" | "delete_permanent" | "assign_community";

    if (bulkAction === "trash") {
      confirmMsg = `האם אתה בטוח שברצונך להעביר ${selectedIds.length} אנשי קשר לסל האשפה?`;
      actionType = "trash";
    } else if (bulkAction === "restore") {
      confirmMsg = `האם אתה בטוח שברצונך לשחזר ${selectedIds.length} אנשי קשר?`;
      actionType = "restore";
    } else if (bulkAction === "delete_permanent") {
      confirmMsg = `אזהרה! האם אתה בטוח שברצונך למחוק לצמיתות ${selectedIds.length} אנשי קשר? פעולה זו אינה הפיכה!`;
      actionType = "delete_permanent";
    } else if (bulkAction.startsWith("assign_community_")) {
      const communityId = bulkAction.replace("assign_community_", "");
      const communityName = communities.find(c => c.id === communityId)?.name || "הקהילה";
      confirmMsg = `האם אתה בטוח שברצונך לצרף ${selectedIds.length} אנשי קשר לקהילת "${communityName}"?`;
      actionType = "assign_community";
    } else {
      return;
    }

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      if (actionType === "assign_community") {
        const communityId = bulkAction.replace("assign_community_", "");
        await handleBulkAction(selectedIds, actionType, { communityId });
      } else {
        await handleBulkAction(selectedIds, actionType);
      }
      alert("הפעולה הושלמה בהצלחה");
      setSelectedIds([]); // clear selection
      setBulkAction("");
      loadData();
    } catch (err) {
      console.error(err);
      alert("שגיאה בביצוע הפעולה");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    const actionType = status === "active" ? "trash" : "delete_permanent";
    const confirmMsg = status === "active" 
      ? "האם אתה בטוח שברצונך להעביר איש קשר זה לסל האשפה?" 
      : "אזהרה! האם אתה בטוח שברצונך למחוק לצמיתות איש קשר זה? פעולה זו אינה הפיכה!";
    
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await handleBulkAction([id], actionType);
      alert("הפעולה הושלמה בהצלחה");
      loadData();
    } catch (err) {
      console.error(err);
      alert("שגיאה בביצוע הפעולה");
    } finally {
      setActionLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async (options: {
    columns: string[] | "all";
    scope: "all" | "current" | "selected";
    limit?: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => {
    setActionLoading(true);
    try {
      let exportContacts = contacts;

      if (options.scope === "selected") {
        exportContacts = contacts.filter(c => selectedIds.includes(c.id || ""));
      } else if (options.scope === "all" || options.sortBy !== orderby || options.sortOrder !== order) {
        // Fetch specific data
        const res = await getContacts({
          status,
          search: options.scope === "current" ? debouncedSearch : "",
          tag_filter: options.scope === "current" ? tagFilter : "",
          city_filter: options.scope === "current" ? cityFilter : "",
          lead_source_filter: options.scope === "current" ? leadSourceFilter : "",
          orderby: options.sortBy,
          order: options.sortOrder,
          page: 1,
          per_page: 0, // 0 = all
          community_filter: options.scope === "current" ? communityFilter : ""
        });
        
        if ((res as any).error) {
          alert("שגיאה במשיכת נתוני ייצוא: " + (res as any).error);
          return;
        }
        exportContacts = res.contacts;
      }

      if (options.limit && options.limit > 0) {
        exportContacts = exportContacts.slice(0, options.limit);
      }

      if (exportContacts.length === 0) {
        alert("אין נתונים לייצוא");
        return;
      }

      const exportData = exportContacts.map(c => {
        const allFields: Record<string, any> = {
          "id": c.id || "",
          "conta_name": c.conta_name,
          "f_m": c.f_m || "",
          "conta_phone": c.conta_phone,
          "email": c.email || "",
          "gender": c.gender || "",
          "mh_crm_city": c.mh_crm_city || "",
          "mh_crm_street": c.mh_crm_street || "",
          "tg1": c.tg1 || "",
          "tg2": c.tg2 || "",
          "tg3": c.tg3 || "",
          "company_name": c.company_name || "",
          "job_title": c.job_title || "",
          "lead_source": c.lead_source || "",
          "work_phone": c.work_phone || "",
          "website": c.website || "",
          "birth_date": c.birth_date || "",
          "notes": c.notes || "",
        };

        const row: Record<string, any> = {};
        
        if (options.columns === "all") {
           EXPORT_COLUMNS.forEach(col => {
             row[col.label] = allFields[col.id];
           });
        } else {
           EXPORT_COLUMNS.filter(col => options.columns.includes(col.id)).forEach(col => {
             row[col.label] = allFields[col.id];
           });
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "אנשי קשר");
      XLSX.writeFile(wb, `crm_contacts_${status}_${Date.now()}.xlsx`);
    } catch (e: any) {
      alert("שגיאה בייצוא לאקסל");
    } finally {
      setActionLoading(false);
    }
  };

  // Sync with Kesher
  const handleKesherSync = async (timeframe: "all" | "year" | "3months" | "week") => {
    setActionLoading(true);
    console.log("Starting Kesher Sync from UI with timeframe:", timeframe);
    try {
      const { syncKesherClients } = await import("@/features/kesher/actions");
      const res = await syncKesherClients(timeframe);
      console.log("Kesher Sync Server Response:", res);
      
      if (res.success) {
        alert(res.message);
        loadData();
      } else {
        alert("שגיאה בסנכרון: " + res.error);
      }
    } catch (err: any) {
      console.error("Error during Kesher Sync:", err);
      alert("שגיאה בסנכרון: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };


  // Helper to safely get value from spreadsheet row keys
  const getValue = (row: any, keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
    }
    return "";
  };

  // Helper to normalize phone numbers and restore leading zeros
  const sanitizePhone = (val: any): string => {
    let phone = String(val || "").trim();
    if (!phone) return "";
    // Remove dashes, spaces, and other separators
    phone = phone.replace(/[-\s]/g, "");
    // If it's a 9-digit Israeli mobile number (starts with 5/7), prepend '0'
    if (/^[57]\d{8}$/.test(phone)) {
      phone = "0" + phone;
    }
    // If it's an 8-digit Israeli landline number (starts with 2/3/4/8/9), prepend '0'
    if (/^[23489]\d{7}$/.test(phone)) {
      phone = "0" + phone;
    }
    return phone;
  };

  // Import from Excel/CSV
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setActionLoading(true);
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws, { raw: false }) as any[];

        if (rawRows.length === 0) {
          alert("קובץ ריק או לא תקין");
          return;
        }

        // Map spreadsheet columns to CRM field keys
        const mappedContacts: Partial<Contact>[] = rawRows.map(row => {
          return {
            id: getValue(row, ["מזהה (ID)", "מזהה", "ID", "id"]),
            conta_name: getValue(row, ["שם פרטי", "שם", "Name", "First Name"]),
            f_m: getValue(row, ["שם משפחה", "Last Name"]),
            conta_phone: sanitizePhone(getValue(row, ["טלפון נייד", "טלפון", "נייד", "Phone", "Mobile"])),
            email: getValue(row, ["דוא\"ל", "דואל", "דואר אלקטרוני", "אימייל", "Email"]),
            gender: getValue(row, ["מגדר", "Gender"]),
            mh_crm_city: getValue(row, ["עיר", "City"]),
            mh_crm_street: getValue(row, ["רחוב", "Street"]),
            tg1: getValue(row, ["תג 1", "תג1", "Tag 1"]),
            tg2: getValue(row, ["תג 2", "תג2", "Tag 2"]),
            tg3: getValue(row, ["תג 3", "תג3", "Tag 3"]),
            company_name: getValue(row, ["שם חברה", "חברה", "Company", "Company Name"]),
            job_title: getValue(row, ["תפקיד", "Job Title", "Role"]),
            lead_source: getValue(row, ["מקור הליד", "מקור", "Lead Source"]),
            work_phone: sanitizePhone(getValue(row, ["טלפון עבודה", "Work Phone"])),
            website: getValue(row, ["אתר", "Website"]),
            birth_date: getValue(row, ["תאריך לידה", "Birth Date", "Date of Birth"]),
            notes: getValue(row, ["הערות", "Notes"]),
          };
        });

        const importResult = await importContacts(mappedContacts);
        alert(`ייבוא אקסל הושלם בהצלחה!\nנוצרו: ${importResult.created}\nעודכנו: ${importResult.updated}\nדולגו: ${importResult.skipped}`);
        loadData();
      } catch (err: any) {
        console.error(err);
        alert("שגיאה בפענוח קובץ האקסל: " + err.message);
      } finally {
        setActionLoading(false);
        // Reset file input
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const openEditModal = (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedContact(null);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto pb-32 h-full overflow-y-auto no-scrollbar" dir="rtl">
      
      {/* Header section */}
      <div className="flex flex-col gap-3 mb-4 mt-2 relative z-50">
        <div className="flex items-center gap-2 w-full pointer-events-auto bg-[#181818] backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/5">
          
          <div className="relative shrink-0">
            <Button 
              onClick={() => setIsActionMenuOpen(true)}
              className="h-10 w-10 p-0 flex items-center justify-center rounded-full border-none shadow-md transition-colors bg-[#9333ea] hover:bg-purple-600"
              title="תפריט פעולות"
            >
              <Plus className="w-5 h-5 text-white transition-transform duration-300" strokeWidth={3} />
            </Button>
          </div>
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              autoComplete="on"
              className="pr-9 rounded-full h-10 w-full text-sm shadow-sm border border-white/10 bg-[#111] text-white placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-400"
            />
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
                    <button 
                      onClick={() => { setStatus("active"); setPage(1); setTabsMenuOpen(false); }} 
                      className={`flex items-center gap-3 px-3 py-3 w-full text-right text-sm transition-colors ${status === "active" ? "bg-[#222] text-white font-bold" : "text-gray-400 hover:bg-[#222] hover:text-white font-medium"}`}
                    >
                       <User className="w-4 h-4" /> 
                       <span>אנשי קשר ({stats.active})</span>
                    </button>
                    <Link 
                      href="/dashboard/communities" 
                      onClick={() => setTabsMenuOpen(false)} 
                      className="flex items-center gap-3 px-3 py-3 w-full text-right text-sm text-gray-400 hover:bg-[#222] hover:text-white transition-colors font-medium"
                    >
                       <Users className="w-4 h-4" /> 
                       <span>קהילות ({communities.length})</span>
                    </Link>
                    <button 
                      onClick={() => { setStatus("trashed"); setPage(1); setTabsMenuOpen(false); }} 
                      className={`flex items-center gap-3 px-3 py-3 w-full text-right text-sm transition-colors ${status === "trashed" ? "bg-rose-900/20 text-rose-400 font-bold" : "text-gray-400 hover:bg-[#222] hover:text-white font-medium"}`}
                    >
                       <Trash2 className="w-4 h-4" /> 
                       <span>סל מחזור ({stats.trashed})</span>
                    </button>
                 </div>
               </>
            )}
          </div>

        </div>
      </div>

        {/* Sticky Table Controls (Sorting, Rows, Select All) */}
        <div className="sticky top-0 z-20 w-full flex items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400 font-bold bg-[#181818]/95 backdrop-blur-md px-4 py-2.5 rounded-b-2xl sm:rounded-2xl border border-white/5 shadow-lg mt-2 flex-nowrap overflow-visible">
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button 
              onClick={handleSelectAll} 
              className="text-gray-400 hover:text-[#9333ea] transition-colors flex items-center justify-center"
              type="button"
              title="בחר הכל"
            >
              {selectedIds.length === contacts.length && contacts.length > 0 ? (
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#9333ea] shrink-0" />
              ) : (
                <Square className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              )}
              {selectedIds.length > 0 && <span className="mr-1 text-[10px] font-bold">({selectedIds.length})</span>}
            </button>

            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#111] border border-white/10 rounded-full px-1 py-1 text-gray-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer text-[10px] sm:text-xs w-[48px] sm:w-[60px] shrink-0"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={0}>הכל</option>
            </select>

            {selectedIds.length >= 2 && (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-4 shrink-0">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="rounded-full bg-[#111] text-white border border-white/10 px-1 py-1 text-[10px] sm:text-xs font-bold focus:outline-none h-6 sm:h-7 w-[60px] sm:w-[80px] shrink-0 truncate"
                >
                  <option value="">פעולה...</option>
                  {status === "active" ? (
                    <option value="trash">לאשפה</option>
                  ) : (
                    <>
                      <option value="restore">שחזור</option>
                      <option value="delete_permanent">מחיקה</option>
                    </>
                  )}
                  <option value="whatsapp">וואטסאפ</option>
                  <option value="email">מייל</option>
                  <option value="export">ייצא לאקסל</option>
                  <optgroup label="לקהילה">
                    {communities.map(c => (
                      <option key={c.id} value={`assign_community_${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
                <Button 
                  onClick={handleExecuteBulkAction}
                  disabled={!bulkAction || actionLoading}
                  className="rounded-full font-bold bg-[#9333ea] hover:bg-purple-600 text-white px-2 h-6 sm:h-7 text-[10px] shrink-0 min-w-0"
                >
                  בצע
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
            <select
              value={communityFilter}
              onChange={(e) => {
                setCommunityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#111] border border-white/10 rounded-full px-1.5 py-1 text-gray-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer text-[10px] sm:text-xs w-[65px] sm:w-[100px] shrink truncate"
            >
              <option value="">קהילה</option>
              {communities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="relative shrink-0">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center text-gray-400 hover:text-[#9333ea] transition-colors bg-[#111] border border-white/10 rounded-full w-6 h-6 sm:w-7 sm:h-7 shrink-0"
                title="מיון"
              >
                <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"/>
              </button>

              {showFilters && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#181818] border border-white/5 shadow-2xl rounded-xl p-4 z-50 flex flex-col gap-3 w-64 animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-black text-gray-500 mb-1 text-right tracking-wider uppercase">מיון לפי:</div>
                    {[
                      { label: 'א-ב (שם)', field: 'conta_name' },
                      { label: 'תאריך עדכון אחרון', field: 'updatedAt' },
                      { label: 'שווי תורם', field: 'total_spent' },
                    ].map(opt => (
                      <div key={opt.field} className="flex flex-col gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className={`text-sm text-right font-bold ${orderby === opt.field ? 'text-[#9333ea]' : 'text-white'}`}>
                          {opt.label}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setOrderby(opt.field); setOrder("asc"); setPage(1); setShowFilters(false); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${orderby === opt.field && order === "asc" ? "bg-[#9333ea]/20 text-[#9333ea] border border-[#9333ea]/30" : "bg-[#222] text-gray-400 hover:text-white hover:bg-[#2a2a2a] border border-transparent"}`}
                          >
                            מהתחלה לסוף
                          </button>
                          <button 
                            onClick={() => { setOrderby(opt.field); setOrder("desc"); setPage(1); setShowFilters(false); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${orderby === opt.field && order === "desc" ? "bg-[#9333ea]/20 text-[#9333ea] border border-[#9333ea]/30" : "bg-[#222] text-gray-400 hover:text-white hover:bg-[#2a2a2a] border border-transparent"}`}
                          >
                            מהסוף להתחלה
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Button 
              onClick={() => { setPage(1); loadData(); }}
              variant="ghost"
              className="p-0 h-6 w-6 sm:h-7 sm:w-7 shrink-0 rounded-full text-gray-400 hover:bg-[#222] hover:text-white flex items-center justify-center min-w-0"
              title="טען מחדש"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

      <div className="flex flex-col gap-2">
        {/* Main List Container */}
        <div className="relative flex flex-col mt-2">
          {loading && contacts.length === 0 && (
            <div className="absolute inset-0 bg-[#0B101E]/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2rem]">
              <RefreshCw className="w-8 h-8 text-[#9333ea] animate-spin" />
            </div>
          )}

          {/* MOBILE LIST VIEW (hidden on desktop) */}
          <div className="flex flex-col gap-3 w-full md:hidden">
            {contacts.map((c) => {
              const theme = getCardTheme(c.conta_name);
              return (
                <div 
                  key={c.id}
                  onClick={() => setActiveDropdownContactId(activeDropdownContactId === c.id ? null : (c.id || null))}
                  className={`flex flex-col justify-center p-3 rounded-2xl border cursor-pointer transition-all duration-300 group select-none gap-1 ${theme.card} hover:shadow-md`}
                >
                  {/* Top Row: Checkbox, Name, Icon */}
                  <div className="flex items-center w-full justify-start gap-2">
                    {/* Checkbox */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleSelectOne(c.id || ""); }}
                      className="cursor-pointer shrink-0 text-gray-500 hover:text-indigo-600 transition-colors p-1"
                    >
                      {selectedIds.includes(c.id || "") ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </div>

                    {/* Name and small Community Icon aligned right */}
                    <div className="flex items-center justify-start gap-1.5 overflow-hidden flex-1 pl-2">
                      <span className="text-[16px] font-bold text-white whitespace-nowrap truncate">
                        {c.conta_name} {c.f_m}
                      </span>
                      {c.isUser && (
                        <div className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/30" title="משתמש מערכת רשום">
                          <LucideIcons.UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      )}
                      {(() => {
                        let IconComponent = theme.Icon;
                        let color = theme.iconText;
                        if (c.communityIds?.length && communities.length > 0) {
                          const comm = communities.find(cm => cm.id === c.communityIds![0]);
                          if (comm) {
                            IconComponent = (LucideIcons as any)[comm.icon] || theme.Icon;
                            return <IconComponent className={`w-[12px] h-[12px] shrink-0`} style={{ color: comm.color }} />;
                          }
                        }
                        return <IconComponent className={`w-[12px] h-[12px] shrink-0 ${color}`} />;
                      })()}
                    </div>
                  </div>

                  {/* Middle Row: Details */}
                  <div className="text-[11px] sm:text-xs text-gray-400 flex items-center justify-start gap-1.5 font-medium flex-wrap pr-9 pl-2">
                    {c.mh_crm_city && <span>{c.mh_crm_city}</span>}
                    {c.mh_crm_city && (c.total_spent || 0) > 0 && <span className="text-gray-600">•</span>}
                    {(c.total_spent || 0) > 0 && (
                      <span className="text-emerald-600 font-bold">₪{(c.total_spent || 0).toFixed(0)}</span>
                    )}
                  </div>

                  {/* Bottom Row: Action Buttons */}
                  {activeDropdownContactId === c.id && (
                    <div className="flex items-center justify-center gap-2 mt-3 w-full animate-in slide-in-from-top-2 fade-in duration-200" dir="ltr">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteContact(c.id || ""); }}
                        className="w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-rose-900/30 text-rose-400 hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                        className="w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-white/5 text-gray-400 hover:bg-[#222] transition-colors hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {c.conta_phone && (
                        <a
                          href={`tel:${c.conta_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-blue-50 text-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openMessageModal([c], "whatsapp"); }}
                        className="w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center shadow-sm border border-emerald-50 text-emerald-400 hover:bg-emerald-50 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (hidden on mobile) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-[2rem] border border-white/5 bg-[#181818]">
            <table className="w-full text-right border-collapse" dir="rtl">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs font-bold bg-[#111]">
                  <th className="p-4 w-12 text-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="text-gray-400 hover:text-[#9333ea] transition-colors inline-flex items-center justify-center"
                      type="button"
                    >
                      {selectedIds.length === contacts.length && contacts.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-[#9333ea]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 text-start">שם מלא</th>
                  <th className="p-4 text-start">טלפון</th>
                  <th className="p-4 text-start">אימייל</th>
                  <th className="p-4 text-start">עיר</th>
                  <th className="p-4 text-start">תגים</th>
                  <th className="p-4 text-start">שווי תורם</th>
                  <th className="p-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-200">
                {contacts.map((c) => {
                  const hasCommunity = c.communityIds?.length && communities.length > 0;
                  const firstCommunity = hasCommunity ? communities.find(cm => cm.id === c.communityIds![0]) : null;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleSelectOne(c.id || "")}
                          className="text-gray-500 hover:text-indigo-600 transition-colors inline-flex items-center justify-center"
                        >
                          {selectedIds.includes(c.id || "") ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{c.conta_name} {c.f_m}</span>
                          {c.isUser && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]" title="משתמש מערכת רשום">
                              מנהל
                            </span>
                          )}
                          {firstCommunity && (
                            <span 
                              className="w-2 h-2 rounded-full inline-block shrink-0" 
                              style={{ backgroundColor: firstCommunity.color }}
                              title={firstCommunity.name}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-300" dir="ltr">{c.conta_phone || "-"}</td>
                      <td className="p-4 text-slate-400 truncate max-w-[150px]">{c.email || "-"}</td>
                      <td className="p-4 text-slate-300">{c.mh_crm_city || "-"}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tg1 && <span className="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-md border border-white/5">{c.tg1}</span>}
                          {c.tg2 && <span className="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-md border border-white/5">{c.tg2}</span>}
                          {c.tg3 && <span className="bg-white/5 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-md border border-white/5">{c.tg3}</span>}
                          {!c.tg1 && !c.tg2 && !c.tg3 && <span className="text-gray-600">-</span>}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-500">
                        {c.total_spent ? `₪${c.total_spent.toLocaleString("he-IL")}` : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2" dir="ltr">
                          <button
                            onClick={() => handleDeleteContact(c.id || "")}
                            className="p-2 bg-[#111] rounded-lg border border-rose-900/30 text-rose-400 hover:bg-rose-900/20 transition-colors"
                            title={status === "active" ? "העבר לאשפה" : "מחק לצמיתות"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2 bg-[#111] rounded-lg border border-white/5 text-gray-400 hover:bg-[#222] transition-colors hover:text-white"
                            title="ערוך"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {c.conta_phone && (
                            <a
                              href={`tel:${c.conta_phone}`}
                              className="p-2 bg-[#111] rounded-lg border border-blue-50/20 text-blue-400 hover:bg-[#222] transition-colors"
                              title="התקשר"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => openMessageModal([c], "whatsapp")}
                            className="p-2 bg-[#111] rounded-lg border border-emerald-50/20 text-emerald-400 hover:bg-[#222] transition-colors"
                            title="שלח וואטסאפ"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {contacts.length === 0 && !loading && (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-2 bg-[#181818] border border-white/5 rounded-[2rem] w-full">
              <Users className="w-12 h-12 text-gray-600" />
              <span className="text-sm font-semibold">לא נמצאו אנשי קשר התואמים את הסינון.</span>
            </div>
          )}
        </div>

        {page < totalPages && (
          <div className="flex justify-center w-full my-6">
            <Button 
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
              className="w-full max-w-xs bg-[#181818] hover:bg-[#222] text-[#9333ea] font-bold border border-white/5 shadow-sm rounded-xl h-12 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "טען עוד אנשי קשר"}
            </Button>
          </div>
        )}
      </div>



      {/* Modal Dialog */}
      <ContactModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        contact={selectedContact}
        communities={communities}
        onSuccess={loadData}
      />

      {/* Action Menu Centered Modal */}
      {isActionMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => { setIsActionMenuOpen(false); setActionMenuState("main"); }}
          />
          <div className="relative bg-[#1e1e3f] p-6 rounded-[2.5rem] shadow-2xl z-10 w-full max-w-xs flex flex-col gap-4 animate-in zoom-in-95 fade-in duration-200 border border-slate-700">
            {actionMenuState === "main" ? (
              <>
                <div className="text-xl font-black !text-white text-center mb-2">פעולות</div>
                
                <button 
                  onClick={() => { openAddModal(); setIsActionMenuOpen(false); }}
                  className="w-full h-14 bg-gradient-to-b from-orange-300 to-orange-500 rounded-full text-slate-900 font-black shadow-inner border border-orange-200/50 hover:brightness-105 transition-all text-lg shadow-md flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  הוסף איש קשר
                </button>
                <button 
                  onClick={() => { document.getElementById('import-excel-hidden')?.click(); setIsActionMenuOpen(false); }}
                  className="w-full h-14 bg-gradient-to-b from-emerald-400 to-emerald-500 rounded-full text-white font-black shadow-inner border border-emerald-300/50 hover:brightness-105 transition-all text-lg shadow-md relative flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  ייבא מאקסל
                  <input 
                    id="import-excel-hidden"
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleImportExcel} 
                    className="hidden" 
                    disabled={actionLoading}
                  />
                </button>
                <button 
                  onClick={() => { setIsImportExportOpen(true); setIsActionMenuOpen(false); }}
                  className="w-full h-14 bg-gradient-to-b from-blue-400 to-blue-500 rounded-full text-white font-black shadow-inner border border-blue-300/50 hover:brightness-105 transition-all text-lg shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  ייצא לאקסל
                </button>
                <button 
                  onClick={() => setActionMenuState("kesher_sync")}
                  className="w-full h-14 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full text-white font-black shadow-inner border border-purple-400/50 hover:brightness-105 transition-all text-lg shadow-md flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  <RefreshCw className={`w-5 h-5 ${actionLoading ? 'animate-spin' : ''}`} />
                  סנכרון מקשר
                </button>
                
                <button 
                  onClick={() => setIsActionMenuOpen(false)}
                  className="mt-2 text-gray-500 font-bold hover:text-white transition-colors h-10"
                >
                  ביטול
                </button>
              </>
            ) : (
              <>
                <div className="text-xl font-black !text-white text-center mb-2">סנכרון מקשר</div>
                <div className="text-sm text-gray-400 text-center mb-2">ממתי לשלוף נתוני לקוחות?</div>
                
                <button 
                  onClick={() => { handleKesherSync("all"); setIsActionMenuOpen(false); setActionMenuState("main"); }}
                  className="w-full h-12 bg-[#2a2a4a] hover:bg-[#3a3a5a] rounded-full text-white font-bold transition-all"
                >
                  מהקמת החשבון
                </button>
                <button 
                  onClick={() => { handleKesherSync("year"); setIsActionMenuOpen(false); setActionMenuState("main"); }}
                  className="w-full h-12 bg-[#2a2a4a] hover:bg-[#3a3a5a] rounded-full text-white font-bold transition-all"
                >
                  מלפני שנה
                </button>
                <button 
                  onClick={() => { handleKesherSync("3months"); setIsActionMenuOpen(false); setActionMenuState("main"); }}
                  className="w-full h-12 bg-[#2a2a4a] hover:bg-[#3a3a5a] rounded-full text-white font-bold transition-all"
                >
                  מלפני שלושה חודשים
                </button>
                <button 
                  onClick={() => { handleKesherSync("week"); setIsActionMenuOpen(false); setActionMenuState("main"); }}
                  className="w-full h-12 bg-[#2a2a4a] hover:bg-[#3a3a5a] rounded-full text-white font-bold transition-all"
                >
                  מהשבוע
                </button>
                
                <button 
                  onClick={() => setActionMenuState("main")}
                  className="mt-2 text-gray-500 font-bold hover:text-white transition-colors h-10"
                >
                  חזור
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImport={handleImportExcel}
        onExport={handleExportExcel}
        actionLoading={actionLoading}
        currentSortBy={orderby}
        currentSortOrder={order}
        selectedCount={selectedIds.length}
      />



      {/* Message Modal */}
      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        contacts={messageTargetContacts}
        type={messageModalType}
        onSuccess={loadData}
      />
    </div>
  );
}
