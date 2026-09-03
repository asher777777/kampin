"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getCRMAnalytics, getFormSubmissionsAnalytics } from "@/features/crm/analyticsActions";
import { updateRecordField } from "@/features/crm/updateAction";
import { getContactById, handleBulkAction, deleteTagGlobally } from "@/features/crm/actions";
import { mergeDuplicateContacts } from "@/features/crm/mergeContacts";
import { syncKesherClients } from "@/features/kesher/actions";
import { ContactModal } from "../ContactModal";
import { CrmFloatingNav } from "@/components/navigation/CrmFloatingNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Tag, 
  List, 
  MapPin, 
  Filter, 
  Edit2, 
  Trash2, 
  Plus, 
  Columns, 
  PieChart as PieChartIcon, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Printer, 
  User, 
  Building, 
  Calendar, 
  CreditCard,
  X,
  CheckSquare,
  RotateCcw,
  DollarSign,
  Tag as TagIcon,
  ChevronDown,
  Search,
  Globe,
  Bookmark,
  Save,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Contact } from "@/features/crm/types";
import { ContactImportModal } from "@/app/dashboard/crm/ContactImportModal";
import { GroupImportModal } from "@/app/dashboard/crm/GroupImportModal";

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#3b82f6'];

export default function AnalyticsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showContactImportModal, setShowContactImportModal] = useState(false);
  const [showGroupImportModal, setShowGroupImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [dataSource, setDataSource] = useState<"contacts" | "forms">("contacts");
  const [contactStatus, setContactStatus] = useState<"active" | "all" | "trashed">("active");
  
  // States for Advanced Filtering & Dynamic Table
  const [showGraphs, setShowGraphs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "conta_name", 
    "tags", 
    "total_spent"
  ]);
  const [filterSource, setFilterSource] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterForm, setFilterForm] = useState("");
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<string | null>(null);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [filterCommunity, setFilterCommunity] = useState("");
  const [showCommunitySelector, setShowCommunitySelector] = useState(false);
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [selectedQuickTags, setSelectedQuickTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagFilterSearch, setTagFilterSearch] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [columnDataFilters, setColumnDataFilters] = useState<Record<string, 'all' | 'has_data' | 'no_data'>>({});
  const [showRowNumbering, setShowRowNumbering] = useState(true);
  const [showRowCheckboxes, setShowRowCheckboxes] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showSummaries, setShowSummaries] = useState(true);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Saved Table Views (Presets) State
  const [savedViews, setSavedViews] = useState<Array<{
    id: string;
    name: string;
    selectedColumns: string[];
    activeTabFilter: string | null;
    filterCommunity: string;
    filterSource: string;
    selectedQuickTags: string[];
    columnDataFilters: Record<string, 'all' | 'has_data' | 'no_data'>;
    showSummaries: boolean;
    showRowNumbering: boolean;
    showRowCheckboxes: boolean;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    createdAt: string;
  }>>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [showSavedViewsMenu, setShowSavedViewsMenu] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // New Tag Modal / Inline Input state
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tagScope, setTagScope] = useState<"selected" | "all">("selected");
  
  const [data, setData] = useState<{
    totalContacts: number;
    totalSpent: number;
    totalCampaignAmount: number;
    tagsCount: Record<string, number>;
    leadSourcesCount: Record<string, number>;
    formsCount: Record<string, number>;
    numericFieldsAgg: Record<string, { 
      sum: number; 
      count: number; 
      entries: Array<{
        contactId: string;
        parentName: string;
        phone: string;
        childName?: string;
        totalSpent: number;
        hasPaid: boolean;
        value: number;
      }>;
    }>;
    textFieldsAgg: Record<string, Record<string, number>>;
    contacts: Contact[];
    customFields: Array<{id: string, label: string, category?: string, type?: string}>;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (dataSource === "contacts") {
        const result = await getCRMAnalytics({ startDate, endDate, status: contactStatus });
        if ((result as any).error) {
          alert("שגיאה בטעינת הנתונים: " + (result as any).error);
        } else {
          setData(result as any);
        }
      } else {
        const result = await getFormSubmissionsAnalytics({ startDate, endDate });
        if ((result as any).error) {
          alert("שגיאה בטעינת הנתונים: " + (result as any).error);
        } else {
          setData({
            totalContacts: (result as any).totalSubmissions,
            totalSpent: 0,
            totalCampaignAmount: 0,
            tagsCount: {},
            leadSourcesCount: {},
            formsCount: (result as any).formsCount,
            numericFieldsAgg: {},
            textFieldsAgg: {},
            contacts: (result as any).submissions,
            customFields: []
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dataSource, contactStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamically adjust columns when a form is selected
  useEffect(() => {
    if (filterForm && data) {
      const formContacts = data.contacts.filter((c: any) => 
        c.formName === filterForm || c.last_form_name === filterForm || (c.form_submissions || []).some((fs: any) => fs.name === filterForm)
      );
      
      if (formContacts.length > 0) {
        const formKeys = new Set<string>();
        formContacts.forEach((c: any) => {
          Object.keys(c).forEach(k => {
            if (c[k] !== null && c[k] !== undefined && c[k] !== "" && !["id", "ownerId", "events", "form_submissions", "children", "status", "createdAt", "updatedAt"].includes(k)) {
              formKeys.add(k);
            }
          });
        });
        
        const baseColumns = ["conta_name", "conta_phone", "total_spent", "campaign_amount", "order_count", "last_order_date"];
        const newColumns = Array.from(new Set([...baseColumns, ...Array.from(formKeys)]));
        setSelectedColumns(newColumns);
      }
    }
  }, [filterForm, data]);

  // Formats data for Recharts Pie/Bar
  const formatForChart = (record: Record<string, number>) => {
    return Object.entries(record)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleQuickTag = (tag: string) => {
    setSelectedQuickTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getColumnLabel = (col: string) => {
    const map: Record<string, string> = {
      "conta_name": "איש קשר",
      "f_m": "שם פרטי",
      "community": "קהילה",
      "tags": "תגיות",
      "tg1": "תגית 1",
      "tg2": "תגית 2",
      "tg3": "תגית 3",
      "total_spent": "סכום בפועל (₪)",
      "conta_phone": "טלפון",
      "email": "אימייל",
      "gender": "מין",
      "mh_crm_city": "עיר",
      "mh_crm_street": "רחוב",
      "company_name": "שם חברה",
      "job_title": "תפקיד",
      "work_phone": "טלפון בעבודה",
      "website": "אתר אינטרנט",
      "birth_date": "תאריך לידה",
      "status": "סטטוס",
      "campaign_amount": "סכום תרומה / קמפיין (₪)",
      "order_count": "כמות הזמנות",
      "last_order_date": "תאריך הזמנה אחרונה",
      "lead_source": "מקור הגעה",
      "segment": "מגזר / סגמנט",
      "notes": "הערות",
      "campaign_title": "שם קמפיין",
      "campaign_donation_mode": "אופן תרומה",
      "campaign_payment_status": "סטטוס תשלום",
      "campaign_payment_method": "אמצעי תשלום",
      "campaign_tier": "דרגת תרומה",
      "campaign_dedication": "הקדשה",
      "campaign_ambassador_name": "שם שגריר",
      "last_form_name": "טופס אחרון",
      "last_form_page": "עמוד טופס אחרון",
      "last_form_submission_date": "תאריך מילוי טופס אחרון",
      "last_message_read_status": "סטטוס קריאת הודעה",
      "formName": "שם הטופס",
      "formPage": "עמוד הטופס",
      "submissionDate": "תאריך הגשה",
      "father_name": "שם האב",
      "mother_name": "שם האם",
      "father_phone": "טלפון האב",
      "mother_phone": "טלפון האם",
      "createdAt": "תאריך יצירה",
      "updatedAt": "תאריך עדכון",
    };
    if (map[col]) return map[col];
    
    // Check custom fields
    if (data?.customFields) {
      const custom = data.customFields.find(f => f.id === col);
      if (custom) return custom.label;
    }
    return col;
  };

  const handleEditClick = async (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const realId = contactId.includes('_sub_') ? contactId.split('_sub_')[0] : contactId;
      const contact = await getContactById(realId);
      setSelectedContact(contact);
      setModalOpen(true);
    } catch (error: any) {
      alert("שגיאה בשליפת איש קשר: " + error.message);
    }
  };

  const handleDeleteClick = async (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("האם אתה בטוח שברצונך להעביר איש קשר זה לסל האשפה?")) return;
    try {
      const realId = contactId.includes('_sub_') ? contactId.split('_sub_')[0] : contactId;
      await handleBulkAction([realId], "trash");
      loadData();
    } catch (error: any) {
      alert("שגיאה במחיקה: " + error.message);
    }
  };

  const handleBulkActionExecute = async (action: "trash" | "restore" | "delete_permanent") => {
    if (selectedRowIds.length === 0) return;
    const actionText = action === "delete_permanent" ? "למחוק לצמיתות" : (action === "restore" ? "לשחזר למצב פעיל" : "להעביר לסל המחזור");
    if (!window.confirm(`האם אתה בטוח שברצונך ${actionText} ${selectedRowIds.length} אנשי קשר שנבחרו?`)) return;

    try {
      const cleanIds = selectedRowIds.map(id => id.includes('_sub_') ? id.split('_sub_')[0] : id);
      const uniqueIds = Array.from(new Set(cleanIds));
      await handleBulkAction(uniqueIds, action);
      setSelectedRowIds([]);
      loadData();
      alert(`בוצע בהצלחה עבור ${uniqueIds.length} אנשי קשר`);
    } catch (error: any) {
      alert("שגיאה בביצוע הפעולה: " + error.message);
    }
  };

  // Tag Operations
  const handleCreateAndAssignTag = async () => {
    const cleanTag = newTagName.trim();
    if (!cleanTag) {
      alert("נא להזין שם תווית");
      return;
    }

    try {
      setLoading(true);
      let targetIds = selectedRowIds;
      if (tagScope === "all" || targetIds.length === 0) {
        targetIds = (data?.contacts || []).map(c => c.id || "").filter(Boolean);
      }
      
      const cleanIds = Array.from(new Set(targetIds.map(id => id.includes('_sub_') ? id.split('_sub_')[0] : id)));
      if (cleanIds.length === 0) {
        alert("אין אנשי קשר להקצאת התווית");
        return;
      }

      await handleBulkAction(cleanIds, "add_tag", { tag: cleanTag });
      setShowNewTagModal(false);
      setNewTagName("");
      loadData();
      alert(`התווית "${cleanTag}" נוספה בהצלחה ל-${cleanIds.length} אנשי קשר!`);
    } catch (e: any) {
      alert("שגיאה בהוספת תווית: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את התווית "${tag}" מכל אנשי הקשר במערכת?`)) return;

    try {
      setLoading(true);
      const res = await deleteTagGlobally(tag);
      if (res.success) {
        setSelectedQuickTags(prev => prev.filter(t => t !== tag));
        loadData();
        alert(`התווית "${tag}" הוסרה בהצלחה מכל אנשי הקשר.`);
      } else {
        alert("שגיאה במחיקת תווית: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKesherSync = async (timeframe: "all" | "year" | "3months" | "week" = "all") => {
    if (!window.confirm("האם להתחיל בסנכרון עסקאות מקשר? המערכת תיצור כרטיסים לאנשי קשר חדשים, תרענן נתונים חסרים ללקוחות קיימים ותאחד את כל היסטוריית התשלומים.")) return;
    try {
      setLoading(true);
      const res = await syncKesherClients(timeframe);
      if (res.success) {
        alert(res.message);
        loadData();
      } else {
        alert("שגיאה בסנכרון: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה בסנכרון: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddTag = async () => {
    if (selectedRowIds.length === 0) return;
    const tag = prompt(`הזן שם תווית להוספה עבור ${selectedRowIds.length} אנשי הקשר שנבחרו:`);
    if (!tag || !tag.trim()) return;

    try {
      setLoading(true);
      const cleanIds = Array.from(new Set(selectedRowIds.map(id => id.includes('_sub_') ? id.split('_sub_')[0] : id)));
      await handleBulkAction(cleanIds, "add_tag", { tag: tag.trim() });
      loadData();
      alert(`התווית "${tag.trim()}" נוספה בהצלחה.`);
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemoveTag = async () => {
    if (selectedRowIds.length === 0) return;
    const tag = prompt(`הזן שם תווית להסרה מ-${selectedRowIds.length} אנשי הקשר שנבחרו:`);
    if (!tag || !tag.trim()) return;

    try {
      setLoading(true);
      const cleanIds = Array.from(new Set(selectedRowIds.map(id => id.includes('_sub_') ? id.split('_sub_')[0] : id)));
      await handleBulkAction(cleanIds, "remove_tag", { tag: tag.trim() });
      loadData();
      alert(`התווית "${tag.trim()}" הוסרה בהצלחה.`);
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!window.confirm("האם לאחד כרטיסי איש קשר כפולים? כל נתוני התשלום, התרומות והאירועים יישמרו ויאוחדו תחת כרטיס אחד לכל לקוח.")) return;
    try {
      setLoading(true);
      const res = await mergeDuplicateContacts();
      if (res.success) {
        alert(`איחוד הכפילויות הושלם בהצלחה! אוחדו ${res.clustersMerged} קבוצות כפולות, והוסרו ${res.totalRemoved} כרטיסים כפולים.`);
        loadData();
      } else {
        alert("שגיאה באיחוד כפילויות: " + res.error);
      }
    } catch (e: any) {
      alert("שגיאה: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Saved Views from LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("crm_saved_table_views");
      if (raw) {
        setSavedViews(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load saved views:", e);
    }
  }, []);

  const handleSaveCurrentView = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newView = {
      id: "view_" + Date.now(),
      name: cleanName,
      selectedColumns,
      activeTabFilter,
      filterCommunity,
      filterSource,
      selectedQuickTags,
      columnDataFilters,
      showSummaries,
      showRowNumbering,
      showRowCheckboxes,
      sortConfig,
      createdAt: new Date().toISOString()
    };
    const updated = [...savedViews.filter(v => v.name !== cleanName), newView];
    setSavedViews(updated);
    setActiveSavedViewId(newView.id);
    try {
      localStorage.setItem("crm_saved_table_views", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save view:", e);
    }
    setShowSaveViewModal(false);
    setNewViewName("");
  };

  const handleApplyView = (view: any) => {
    if (view.selectedColumns) setSelectedColumns(view.selectedColumns);
    setActiveTabFilter(view.activeTabFilter || null);
    setFilterCommunity(view.filterCommunity || "");
    setFilterSource(view.filterSource || "");
    setSelectedQuickTags(view.selectedQuickTags || []);
    setColumnDataFilters(view.columnDataFilters || {});
    if (view.showSummaries !== undefined) setShowSummaries(view.showSummaries);
    if (view.showRowNumbering !== undefined) setShowRowNumbering(view.showRowNumbering);
    if (view.showRowCheckboxes !== undefined) setShowRowCheckboxes(view.showRowCheckboxes);
    if (view.sortConfig !== undefined) setSortConfig(view.sortConfig);
    setActiveSavedViewId(view.id);
    setShowSavedViewsMenu(false);
  };

  const handleDeleteSavedView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updated);
    if (activeSavedViewId === viewId) setActiveSavedViewId(null);
    try {
      localStorage.setItem("crm_saved_table_views", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to update saved views:", err);
    }
  };

  const handleAddContact = () => {
    setSelectedContact(null);
    setModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    try {
      const res = await updateRecordField(dataSource, editingCell.id, editingCell.field, editValue);
      if (!res.success) throw new Error(res.error);
      
      // Update local data state
      setData(prev => {
        if (!prev) return prev;
        const newContacts = prev.contacts.map(c => {
          if (c.id === editingCell.id) {
            if (dataSource === "forms") {
              const topLevelFields = ["contactId", "ownerId", "formName", "formPage", "submissionDate", "isMigrated"];
              if (topLevelFields.includes(editingCell.field)) {
                return { ...c, [editingCell.field]: editValue };
              } else {
                return { ...c, [editingCell.field]: editValue, payload: { ...(c.payload || {}), [editingCell.field]: editValue } };
              }
            } else {
              return { ...c, [editingCell.field]: editValue };
            }
          }
          return c;
        });
        return { ...prev, contacts: newContacts };
      });
      setEditingCell(null);
    } catch (error: any) {
      alert("שגיאה בעדכון השדה: " + error.message);
    }
  };

  // Quick Tab Filters
  const tabFilters = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "details",
        label: "פרטים כלליים",
        icon: User,
        filterFn: (c: any, customFields: any[]) => {
          const detailFields = ["f_m", "gender", "birth_date", "email", "mh_crm_city", "mh_crm_street", "work_phone"];
          const hasBase = detailFields.some(
            field => c[field] !== null && c[field] !== undefined && c[field] !== ""
          );
          const detailsCustom = customFields.filter((f: any) => f.category === "details").map((f: any) => f.id);
          const hasCustom = detailsCustom.some(
            (id: string) => c[id] !== null && c[id] !== undefined && c[id] !== ""
          );
          return hasBase || hasCustom;
        }
      },
      {
        id: "company",
        label: "חברה ומקור",
        icon: Building,
        filterFn: (c: any, customFields: any[]) => {
          const companyFields = ["company_name", "job_title", "work_phone", "website", "lead_source", "last_form_name"];
          const hasBase = companyFields.some(
            field => c[field] !== null && c[field] !== undefined && c[field] !== ""
          );
          const companyCustom = customFields.filter((f: any) => f.category === "company").map((f: any) => f.id);
          const hasCustom = companyCustom.some(
            (id: string) => c[id] !== null && c[id] !== undefined && c[id] !== ""
          );
          return hasBase || hasCustom;
        }
      },
      {
        id: "tags",
        label: "תיוגים והערות",
        icon: Tag,
        filterFn: (c: any, customFields: any[]) => {
          const tagsFields = ["tg1", "tg2", "tg3", "notes"];
          const hasBase = tagsFields.some(
            field => c[field] !== null && c[field] !== undefined && c[field] !== ""
          );
          const tagsCustom = customFields.filter((f: any) => f.category === "tags").map((f: any) => f.id);
          const hasCustom = tagsCustom.some(
            (id: string) => c[id] !== null && c[id] !== undefined && c[id] !== ""
          );
          return hasBase || hasCustom;
        }
      },
      {
        id: "events",
        label: "אירועים ומפגשים",
        icon: Calendar,
        filterFn: (c: any, customFields: any[]) => {
          const hasEvents = c.events && Array.isArray(c.events) && c.events.length > 0;
          const eventsCustom = customFields.filter((f: any) => f.category === "events").map((f: any) => f.id);
          const hasCustom = eventsCustom.some(
            (id: string) => c[id] !== null && c[id] !== undefined && c[id] !== ""
          );
          return hasEvents || hasCustom;
        }
      },
      {
        id: "payments",
        label: "תשלומים",
        icon: CreditCard,
        filterFn: (c: any) => {
          return (
            (c.total_spent !== undefined && Number(c.total_spent) > 0) ||
            (c.order_count !== undefined && Number(c.order_count) > 0) ||
            (c.campaign_amount !== undefined && Number(c.campaign_amount) > 0) ||
            (c.last_order_date !== null && c.last_order_date !== undefined && c.last_order_date !== "")
          );
        }
      }
    ];
  }, [data]);

  const getContactValue = (c: any, col: string) => {
    if (col === "tags") {
      if (Array.isArray(c.tags) && c.tags.length > 0) return c.tags.join(", ");
      return c.tg1 || "";
    }
    if (col === "community") {
      return c.community || c.mh_crm_community || "";
    }
    if (col === "tg1") {
      return c.tg1 || "";
    }
    if (col === "tg2") {
      return c.tg2 || "";
    }
    if (col === "tg3") {
      return c.tg3 || "";
    }
    if (col === "total_spent") {
      return c.total_spent !== undefined && c.total_spent !== null ? `₪${Number(c.total_spent).toLocaleString()}` : (c.campaign_amount ? `₪${Number(c.campaign_amount).toLocaleString()}` : "₪0");
    }
    return c[col];
  };

  const filteredContacts = data ? data.contacts.filter((c: any) => {
    // 0. Global Deep Search (Scans all parameters in client card)
    if (globalSearchTerm.trim()) {
      const q = globalSearchTerm.trim().toLowerCase();
      const matchesSearch = Object.entries(c).some(([key, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          return String(val).toLowerCase().includes(q);
        }
        if (Array.isArray(val)) {
          return val.some((item) => {
            if (typeof item === "string" || typeof item === "number") {
              return String(item).toLowerCase().includes(q);
            }
            if (typeof item === "object" && item !== null) {
              return Object.values(item).some((sub) => String(sub || "").toLowerCase().includes(q));
            }
            return false;
          });
        }
        if (typeof val === "object" && val !== null) {
          return Object.values(val).some((sub) => String(sub || "").toLowerCase().includes(q));
        }
        return false;
      });
      if (!matchesSearch) return false;
    }

    // 1. Community filter
    if (filterCommunity) {
      const cTags: string[] = Array.isArray(c.tags) ? c.tags : [];
      const comm = (c.community || c.mh_crm_community || c.tg1 || "").trim();
      const matchesCommunity = cTags.includes(filterCommunity) || comm === filterCommunity;
      if (!matchesCommunity) return false;
    }

    // 2. Lead Source filter
    if (filterSource) {
      const isSource = c.lead_source === filterSource;
      const isCity = `עיר: ${c.mh_crm_city || ""}`.trim() === filterSource;
      if (!isSource && !isCity) return false;
    }

    if (filterForm && c.last_form_name !== filterForm && !(c.form_submissions || []).some((fs: any) => fs.name === filterForm)) return false;
    
    // 3. Real Tags filter
    if (selectedQuickTags.length > 0) {
      const cTags: string[] = Array.isArray(c.tags) ? [...c.tags] : [];
      if (c.tg2) cTags.push(c.tg2);
      if (c.tg3) cTags.push(c.tg3);
      const matchesAnyTag = selectedQuickTags.some(tag => cTags.includes(tag));
      if (!matchesAnyTag) return false;
    }

    if (activeMetricFilter === 'has_spent' && !(Number(c.total_spent || 0) > 0)) return false;
    if (activeMetricFilter === 'has_campaign' && !(Number(c.campaign_amount || 0) > 0)) return false;
    if (activeMetricFilter && activeMetricFilter !== 'all' && activeMetricFilter !== 'has_spent' && activeMetricFilter !== 'has_campaign') {
        if (!c[activeMetricFilter] || Number(c[activeMetricFilter]) === 0) return false;
    }

    // Apply column-level data filter (All / Has Data / No Data)
    for (const col of selectedColumns) {
      const filterVal = columnDataFilters[col] || 'all';
      if (filterVal === 'all') continue;
      
      const val = getContactValue(c, col);
      const isEmpty = val === null || val === undefined || val === "" || val === 0 || val === "0";
      
      if (filterVal === 'has_data' && isEmpty) return false;
      if (filterVal === 'no_data' && !isEmpty) return false;
    }

    if (activeTabFilter) {
      const matchedTab = tabFilters.find(t => t.id === activeTabFilter);
      if (matchedTab && !matchedTab.filterFn(c, data.customFields || [])) {
        return false;
      }
    }
    
    return true;
  }) : [];

  const processedContacts = useMemo(() => {
    let result = filteredContacts;
    
    if (sortConfig) {
      const isDate = (val: any) => {
        if (val instanceof Date) return true;
        if (typeof val === 'string') {
          return /^\d{4}-\d{2}-\d{2}/.test(val) || 
                 /^\d{2}\/\d{2}\/\d{4}/.test(val) || 
                 (!isNaN(Date.parse(val)) && isNaN(Number(val)));
        }
        return false;
      };
      
      const parseDate = (val: any) => {
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'string') {
          if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) {
            const [d, m, y] = val.split('/').map(Number);
            return new Date(y, m - 1, d).getTime();
          }
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };
      
      const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (val === true) return 1;
        if (val === false) return 0;
        const cleanStr = String(val).replace(/[^0-9.-]/g, '');
        const num = Number(cleanStr);
        return isNaN(num) || cleanStr === "" ? null : num;
      };

      result = [...result].sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        // 1. Sort by Date / Time
        if (isDate(valA) && isDate(valB)) {
          const timeA = parseDate(valA);
          const timeB = parseDate(valB);
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        // 2. Sort by numbers (from smallest to largest / min to max)
        const numA = parseNum(valA);
        const numB = parseNum(valB);
        if (numA !== null && numB !== null) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // 3. Sort by Alphabet / Hebrew (A-Z)
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredContacts, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null; // Cancel sort
      }
      return { key, direction: 'asc' };
    });
  };

  const moveColumnUp = (col: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = selectedColumns.indexOf(col);
    if (idx > 0) {
      const newCols = [...selectedColumns];
      [newCols[idx - 1], newCols[idx]] = [newCols[idx], newCols[idx - 1]];
      setSelectedColumns(newCols);
    }
  };

  const moveColumnDown = (col: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = selectedColumns.indexOf(col);
    if (idx < selectedColumns.length - 1) {
      const newCols = [...selectedColumns];
      [newCols[idx + 1], newCols[idx]] = [newCols[idx], newCols[idx + 1]];
      setSelectedColumns(newCols);
    }
  };

  const formatCellValue = (val: any) => {
    if (val === true) return "כן";
    if (val === false) return "לא";
    if (val === null || val === undefined || val === "") return "-";
    
    if (typeof val === 'string') {
      const isIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(val);
      if (isIso || isDateOnly) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("he-IL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: isIso ? "2-digit" : undefined,
            minute: isIso ? "2-digit" : undefined,
          });
        }
      }
    }
    
    return String(val);
  };

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(processedContacts.length / Number(pageSize)));
  
  const paginatedContacts = useMemo(() => {
    if (pageSize === "all") return processedContacts;
    const start = (currentPage - 1) * Number(pageSize);
    return processedContacts.slice(start, start + Number(pageSize));
  }, [processedContacts, pageSize, currentPage]);

  const exportToExcel = () => {
    if (!processedContacts || processedContacts.length === 0) return;
    
    // Create header row
    const headers = selectedColumns.map(col => getColumnLabel(col));
    
    // Create data rows
    const dataRows = processedContacts.map((contact: any) => {
      return selectedColumns.map(col => {
        const val = getContactValue(contact, col);
        const formatted = formatCellValue(val);
        return formatted === "-" ? "" : formatted;
      });
    });

    const worksheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    ws['!cols'] = selectedColumns.map((col) => {
      const headerLen = getColumnLabel(col).length;
      return { wch: Math.max(headerLen + 4, 16) };
    });

    // Right-to-left view for Hebrew
    ws['!views'] = [{ rightToLeft: true }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אנשי קשר");

    const fileName = `דוח_אנשי_קשר_${new Date().toLocaleDateString('he-IL').replaceAll('/', '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const allAvailableColumns = useMemo(() => {
    const defaultCols = [
      "conta_name",
      "f_m",
      "conta_phone",
      "email",
      "community",
      "tags",
      "tg1",
      "tg2",
      "tg3",
      "gender",
      "mh_crm_city",
      "mh_crm_street",
      "company_name",
      "job_title",
      "lead_source",
      "segment",
      "work_phone",
      "website",
      "birth_date",
      "notes",
      "total_spent",
      "campaign_amount",
      "order_count",
      "last_order_date",
      "campaign_title",
      "campaign_donation_mode",
      "campaign_payment_status",
      "campaign_payment_method",
      "campaign_tier",
      "last_form_name",
      "last_form_page",
      "last_form_submission_date",
      "last_message_read_status",
      "createdAt",
      "updatedAt"
    ];

    const contactCols = data?.contacts ? Array.from(new Set(
      data.contacts.flatMap((c: any) => Object.keys(c))
    )) : [];

    const customCols = data?.customFields ? data.customFields.map(f => f.id) : [];

    const merged = Array.from(new Set([...defaultCols, ...contactCols, ...customCols]))
      .filter(k => !["id", "ownerId", "events", "form_submissions", "children", "status"].includes(k));

    return merged;
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-indigo-600">
        <RefreshCw className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  const availableTags = Object.keys(data.tagsCount || {}).sort();
  const availableCommunities = Object.keys((data as any).communitiesCount || {}).sort();
  const availableLeadSources = Object.keys(data.leadSourcesCount || {}).sort();
  const tagsData = formatForChart(data.tagsCount || {});
  const formsData = formatForChart(data.formsCount || {});
  const sourcesData = formatForChart(data.leadSourcesCount || {});

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto h-full overflow-y-auto p-4 md:p-6 pb-36 space-y-8 text-right" dir="rtl">
      {/* Header & Data Source Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm shrink-0 print:hidden">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-slate-100 p-1 rounded-2xl h-14">
            <button
              type="button"
              onClick={() => { setDataSource("contacts"); setFilterForm(""); }}
              className={`flex-1 rounded-xl font-bold px-6 transition-all cursor-pointer ${dataSource === "contacts" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              אנשי קשר
            </button>
            <button
              type="button"
              onClick={() => { setDataSource("forms"); setFilterForm(""); }}
              className={`flex-1 rounded-xl font-bold px-6 transition-all cursor-pointer ${dataSource === "forms" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              הגשות טפסים
            </button>
          </div>

          {dataSource === "contacts" && (
            <div className="flex bg-slate-100 p-1 rounded-2xl h-14">
              <button
                type="button"
                onClick={() => setContactStatus("active")}
                className={`rounded-xl font-bold px-4 transition-all text-xs cursor-pointer ${contactStatus === "active" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                פעילים
              </button>
              <button
                type="button"
                onClick={() => setContactStatus("all")}
                className={`rounded-xl font-bold px-4 transition-all text-xs cursor-pointer ${contactStatus === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                הכל
              </button>
              <button
                type="button"
                onClick={() => setContactStatus("trashed")}
                className={`rounded-xl font-bold px-4 transition-all text-xs cursor-pointer ${contactStatus === "trashed" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                סל מחזור
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-end gap-3 flex-wrap">
          <Button 
            onClick={() => setShowGraphs(!showGraphs)}
            className="rounded-xl h-11 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <PieChartIcon className="w-4 h-4" />
            {showGraphs ? "הסתר תרשימים" : "הצג תרשימים"}
          </Button>

          <Button 
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl h-11 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            סינון מתקדם
          </Button>

          <Button 
            onClick={() => handleKesherSync("all")}
            variant="outline"
            className="rounded-xl h-11 font-bold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 flex items-center gap-2 cursor-pointer transition-colors"
            title="סנכרון עסקאות משרתי קשר, יצירת כרטיסי לקוח חסרים ורענון נתונים"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            סנכרן עסקאות מקשר
          </Button>

          <Button 
            onClick={handleMergeDuplicates}
            variant="outline"
            className="rounded-xl h-11 font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-2 cursor-pointer transition-colors"
            title="איחוד כרטיסי לקוח כפולים (לפי טלפון/אימייל) ושמירת כל היסטוריית התשלומים"
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            איחוד כפילויות
          </Button>

          <Button 
            onClick={() => setShowContactImportModal(true)}
            variant="outline"
            className="rounded-xl h-11 font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-2 cursor-pointer transition-colors"
            title="ייבא אנשי קשר חדשים ועדכן קיימים מקובץ Excel"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>ייבוא אנשי קשר מאקסל</span>
          </Button>

          <Button 
            onClick={handleAddContact}
            className="rounded-xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 ml-4 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            איש קשר חדש
          </Button>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">מתאריך</label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">עד תאריך</label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <Button 
            onClick={loadData}
            className="rounded-xl h-11 font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            סנן
          </Button>
          {(startDate || endDate) && (
            <Button 
              onClick={() => { setStartDate(""); setEndDate(""); }}
              variant="outline"
              className="rounded-xl h-11 border-slate-200 text-slate-600 cursor-pointer"
            >
              נקה
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards - Clickable Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 print:hidden">
        <div 
          onClick={() => { setDataSource("contacts"); setFilterForm(""); setActiveMetricFilter(null); }}
          className={`bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 cursor-pointer transition-all ${dataSource === 'contacts' && !filterForm ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : 'border border-slate-100 hover:shadow-md'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">סה"כ אנשי קשר</p>
            <h3 className="text-3xl font-black text-slate-800">{dataSource === 'contacts' ? data.totalContacts.toLocaleString() : "-"}</h3>
          </div>
        </div>
        
        {/* Actual Revenue (Matches total_spent in Table) */}
        <div 
          onClick={() => setActiveMetricFilter(activeMetricFilter === 'has_spent' ? null : 'has_spent')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 cursor-pointer transition-all ${activeMetricFilter === 'has_spent' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'border border-slate-100 hover:shadow-md'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">הכנסות בפועל (₪)</p>
            <h3 className="text-3xl font-black text-slate-800">₪{data.totalSpent.toLocaleString()}</h3>
          </div>
        </div>

        {/* Campaign Amount / Pledged Donations */}
        <div 
          onClick={() => setActiveMetricFilter(activeMetricFilter === 'has_campaign' ? null : 'has_campaign')}
          className={`bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 cursor-pointer transition-all ${activeMetricFilter === 'has_campaign' ? 'ring-2 ring-amber-500 bg-amber-50/50' : 'border border-slate-100 hover:shadow-md'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">סך תרומות/קמפיינים (₪)</p>
            <h3 className="text-3xl font-black text-slate-800">₪{(data.totalCampaignAmount || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div 
          onClick={() => { setDataSource("forms"); setFilterForm(""); setActiveMetricFilter(null); }}
          className={`bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 cursor-pointer transition-all ${dataSource === 'forms' && !filterForm ? 'ring-2 ring-pink-500 bg-pink-50/50' : 'border border-slate-100 hover:shadow-md'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0">
            <List className="w-7 h-7 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">הגשות טפסים</p>
            <h3 className="text-3xl font-black text-slate-800">{Object.values(data.formsCount).reduce((a, b) => a + b, 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer/Section */}
      {showFilters && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 fade-in shrink-0 print:hidden">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">מקור הגעה / עיר</label>
            <select 
              value={filterSource} 
              onChange={e => setFilterSource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 h-11 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">הכל</option>
              {Object.keys(data.leadSourcesCount).map(s => <option key={s} value={s.replace("עיר: ", "")}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">תגית</label>
            <select 
              value={filterTag} 
              onChange={e => setFilterTag(e.target.value)}
              className="w-full rounded-xl border border-slate-200 h-11 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">הכל</option>
              {Object.keys(data.tagsCount).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">טופס אחרון / הרשמה</label>
            <select 
              value={filterForm} 
              onChange={e => setFilterForm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 h-11 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">הכל</option>
              {Object.keys(data.formsCount).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Modern High-End Filter Omnibar (Zero Horizontal Scroll) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs shrink-0 flex flex-wrap items-center justify-between gap-3 print:hidden">
        
        {/* Left Side: Segment, Communities, Lead Sources & Tag Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 1. Client Card Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTabSelector(!showTabSelector);
                setShowCommunitySelector(false);
                setShowSourceSelector(false);
                setShowTagSelector(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                activeTabFilter
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-600/10"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              {activeTabFilter ? (
                <>
                  {React.createElement(tabFilters.find(t => t.id === activeTabFilter)?.icon || Users, { className: "w-3.5 h-3.5" })}
                  <span>{tabFilters.find(t => t.id === activeTabFilter)?.label}</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>כל הלשוניות</span>
                </>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTabSelector ? "rotate-180" : ""} ${activeTabFilter ? "text-indigo-200" : "text-slate-400"}`} />
            </button>

            {/* Dropdown Menu */}
            {showTabSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTabSelector(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-60 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 space-y-0.5 text-right">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    סינון לפי לשונית כרטיס לקוח
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTabFilter(null);
                      setShowTabSelector(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTabFilter === null ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>הצג את כל הלקוחות</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {data.contacts.length}
                    </span>
                  </button>

                  {tabFilters.map((tab) => {
                    const isSelected = activeTabFilter === tab.id;
                    const Icon = tab.icon;
                    const count = data.contacts.filter((c) => tab.filterFn(c, data.customFields || [])).length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTabFilter(tab.id);
                          setShowTabSelector(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                          <span>{tab.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-slate-100 text-slate-600"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 2. Communities Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCommunitySelector(!showCommunitySelector);
                setShowTabSelector(false);
                setShowSourceSelector(false);
                setShowTagSelector(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                filterCommunity
                  ? "bg-purple-600 border-purple-600 text-white shadow-purple-600/10"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <Building className={`w-3.5 h-3.5 ${filterCommunity ? "text-white" : "text-purple-500"}`} />
              <span>{filterCommunity ? filterCommunity : `קהילות (${availableCommunities.length})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCommunitySelector ? "rotate-180" : ""} ${filterCommunity ? "text-purple-100" : "text-slate-400"}`} />
            </button>

            {/* Dropdown Menu */}
            {showCommunitySelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCommunitySelector(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-60 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 space-y-0.5 text-right">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    סינון לפי קהילה
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCommunity("");
                      setShowCommunitySelector(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      !filterCommunity ? "bg-purple-50 text-purple-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>כל הקהילות</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {data.contacts.length}
                    </span>
                  </button>

                  {availableCommunities.map((comm) => {
                    const isSelected = filterCommunity === comm;
                    const count = (data as any).communitiesCount?.[comm] || 0;
                    return (
                      <button
                        key={comm}
                        type="button"
                        onClick={() => {
                          setFilterCommunity(comm);
                          setShowCommunitySelector(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected ? "bg-purple-50 text-purple-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{comm}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-purple-100 text-purple-700 font-bold" : "bg-slate-100 text-slate-600"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {availableCommunities.length === 0 && (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      אין קהילות מוגדרות
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 3. Lead Sources Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSourceSelector(!showSourceSelector);
                setShowTabSelector(false);
                setShowCommunitySelector(false);
                setShowTagSelector(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                filterSource
                  ? "bg-teal-600 border-teal-600 text-white shadow-teal-600/10"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${filterSource ? "text-white" : "text-teal-500"}`} />
              <span>{filterSource ? filterSource : `מקורות הגעה (${availableLeadSources.length})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSourceSelector ? "rotate-180" : ""} ${filterSource ? "text-teal-100" : "text-slate-400"}`} />
            </button>

            {/* Dropdown Menu */}
            {showSourceSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSourceSelector(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-68 max-h-64 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 space-y-0.5 text-right">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    סינון לפי מקור הגעה / עיר
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSource("");
                      setShowSourceSelector(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      !filterSource ? "bg-teal-50 text-teal-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>הכל</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {data.contacts.length}
                    </span>
                  </button>

                  {availableLeadSources.map((src) => {
                    const isSelected = filterSource === src;
                    const count = data.leadSourcesCount[src] || 0;
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => {
                          setFilterSource(src);
                          setShowSourceSelector(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected ? "bg-teal-50 text-teal-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">{src}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-teal-100 text-teal-700 font-bold" : "bg-slate-100 text-slate-600"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 4. Real Tags Filter Dropdown (Zero ID numbers!) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTagSelector(!showTagSelector);
                setShowTabSelector(false);
                setShowCommunitySelector(false);
                setShowSourceSelector(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                selectedQuickTags.length > 0
                  ? "bg-amber-500 border-amber-500 text-white shadow-amber-500/10"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <Tag className={`w-3.5 h-3.5 ${selectedQuickTags.length > 0 ? "text-white" : "text-amber-500"}`} />
              <span>
                {selectedQuickTags.length === 0
                  ? `תוויות (${availableTags.length})`
                  : selectedQuickTags.length === 1
                  ? selectedQuickTags[0]
                  : `${selectedQuickTags.length} תוויות נבחרו`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTagSelector ? "rotate-180" : ""} ${selectedQuickTags.length > 0 ? "text-amber-100" : "text-slate-400"}`} />
            </button>

            {/* Dropdown Menu */}
            {showTagSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTagSelector(false)} />
                <div className="absolute top-full right-0 mt-1.5 w-68 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 z-50 space-y-2 text-right">
                  
                  {/* Search inside tags */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="חפש תווית..."
                      value={tagFilterSearch}
                      onChange={e => setTagFilterSearch(e.target.value)}
                      className="w-full pr-8 pl-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                      onClick={e => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  {/* Tags list */}
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                    {availableTags.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        אין תוויות מוגדרות עדיין
                      </div>
                    ) : (
                      availableTags
                        .filter(t => t.toLowerCase().includes(tagFilterSearch.toLowerCase().trim()))
                        .map(tag => {
                          const isSelected = selectedQuickTags.includes(tag);
                          const count = data.tagsCount[tag] || 0;
                          return (
                            <div
                              key={tag}
                              className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isSelected ? "bg-amber-100/80 text-amber-950 font-bold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleQuickTag(tag)}
                                className="flex-1 flex items-center justify-between text-right cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                                    isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 bg-white"
                                  }`}>
                                    {isSelected && "✓"}
                                  </span>
                                  <span className="truncate">{tag}</span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 shadow-2xs">
                                  {count}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTag(tag, e)}
                                className="text-slate-300 hover:text-rose-600 p-1 mr-1 transition-colors cursor-pointer"
                                title="מחק תווית זו לצמיתות"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Actions inside tag dropdown */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTagSelector(false);
                        setShowNewTagModal(true);
                      }}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>תווית חדשה</span>
                    </button>

                    {selectedQuickTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedQuickTags([])}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        נקה בחירה
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active Filter Clear Button */}
          {(activeTabFilter || filterCommunity || filterSource || selectedQuickTags.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setActiveTabFilter(null);
                setFilterCommunity("");
                setFilterSource("");
                setSelectedQuickTags([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
              title="נקה את כל הסינונים"
            >
              <X className="w-3.5 h-3.5" />
              <span>נקה סינונים</span>
            </button>
          )}
        </div>

        {/* Right Side: Quick Add Tag & Summary Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium font-mono">
            {processedContacts.length} מתוך {data.contacts.length} לקוחות
          </span>

          <button
            type="button"
            onClick={() => setShowNewTagModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-amber-400 text-amber-800 bg-amber-50/50 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="הוסף תווית חדשה למערכת"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>תווית חדשה</span>
          </button>
        </div>
      </div>

      {/* Add New Tag Modal Dialog */}
      {showNewTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-amber-500" />
                הוספת תווית חדשה
              </h3>
              <button onClick={() => setShowNewTagModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">שם התווית</label>
                <Input
                  autoFocus
                  placeholder="למשל: תורם זהב, VIP, מתעניין, כנס 2026..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAndAssignTag();
                    if (e.key === "Escape") setShowNewTagModal(false);
                  }}
                  className="rounded-xl h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">הקצאה לאנשי קשר:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="tagScope"
                      checked={tagScope === "selected"}
                      onChange={() => setTagScope("selected")}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    {selectedRowIds.length > 0 ? (
                      <span>שייך ל-{selectedRowIds.length} אנשי הקשר שנבחרו בטבלה</span>
                    ) : (
                      <span>שייך לכל אנשי הקשר המוצגים בטבלה ({processedContacts.length})</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="tagScope"
                      checked={tagScope === "all"}
                      onChange={() => setTagScope("all")}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>שייך לכל אנשי הקשר במערכת ({data.totalContacts})</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowNewTagModal(false)}
                className="rounded-xl"
              >
                ביטול
              </Button>
              <Button
                onClick={handleCreateAndAssignTag}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6"
                disabled={!newTagName.trim() || loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "שמור תווית"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Table View Modal */}
      {showSaveViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Save className="w-5 h-5 text-indigo-600" />
                שמירת תצוגת טבלה מותאמת
              </h3>
              <button 
                type="button"
                onClick={() => setShowSaveViewModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              שמירה זו תזכור את {selectedColumns.length} העמודות שנבחרו, הסינונים הפעילים, מיון הנתונים והגדרות התצוגה הנוכחיות.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">שם התצוגה:</label>
              <Input
                autoFocus
                placeholder="לדוגמה: תורמי קמפיין ירושלים, דוח טלפונים..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCurrentView(newViewName);
                  if (e.key === "Escape") setShowSaveViewModal(false);
                }}
                className="rounded-xl h-11"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowSaveViewModal(false)}
                className="rounded-xl"
              >
                ביטול
              </Button>
              <Button
                onClick={() => handleSaveCurrentView(newViewName)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6"
                disabled={!newViewName.trim()}
              >
                שמור תצוגה
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid - Conditionally Rendered */}
      {showGraphs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 shrink-0 print:hidden">
          {/* Lead Sources / Forms Pie Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              מקורות הגעה (ערים / דפי נחיתה)
            </h3>
            <div className="h-72 w-full" dir="ltr">
              {sourcesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcesData.slice(0, 10)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourcesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">אין נתונים להצגה</div>
              )}
            </div>
          </div>

          {/* Tags Bar Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-pink-500" />
              התפלגות לפי תגיות וסטטוסים
            </h3>
            <div className="h-72 w-full" dir="ltr">
               {tagsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagsData.slice(0, 10)} layout="vertical" margin={{ left: 50, right: 10 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
               ) : (
                <div className="flex h-full items-center justify-center text-slate-400">אין נתונים להצגה</div>
               )}
            </div>
          </div>

          {/* Forms Submissions Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <List className="w-5 h-5 text-emerald-500" />
              מילוי טפסים / הרשמות
            </h3>
            <div className="h-80 w-full" dir="ltr">
               {formsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formsData.slice(0, 15)} margin={{ bottom: 50 }}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: 12}} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
               ) : (
                <div className="flex h-full items-center justify-center text-slate-400">אין נתונים להצגה</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Contacts Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
          
          {/* Left Side: Saved Views Dropdown & Save Button */}
          <div className="flex items-center gap-2">
            
            {/* Saved Views Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSavedViewsMenu(!showSavedViewsMenu)}
                className={`flex items-center gap-2 px-3.5 h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  activeSavedViewId
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-600/10"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${activeSavedViewId ? "text-white" : "text-indigo-600"}`} />
                <span>
                  {activeSavedViewId
                    ? `תצוגה: ${savedViews.find(v => v.id === activeSavedViewId)?.name || "מותאמת"}`
                    : `תצוגות שמורות (${savedViews.length})`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSavedViewsMenu ? "rotate-180" : ""}`} />
              </button>

              {showSavedViewsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSavedViewsMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 z-50 space-y-1 text-right">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>תצוגות טבלה שמורות</span>
                      <span className="text-[10px] font-mono">{savedViews.length} תצוגות</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {savedViews.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          אין תצוגות שמורות עדיין. שמור את התצוגה הנוכחית (עמודות + סינונים) בלחיצה על "שמור תצוגה".
                        </div>
                      ) : (
                        savedViews.map(view => {
                          const isSelected = activeSavedViewId === view.id;
                          return (
                            <div
                              key={view.id}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors ${
                                isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleApplyView(view)}
                                className="flex-1 text-right flex items-center gap-2 cursor-pointer truncate"
                              >
                                <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                                <span className="truncate">{view.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({view.selectedColumns.length} עמ')</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedView(view.id, e)}
                                className="text-slate-300 hover:text-rose-600 p-1 mr-1 transition-colors cursor-pointer"
                                title="מחק תצוגה שמורה"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSavedViewsMenu(false);
                          setShowSaveViewModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>שמור מצב נוכחי כתצוגה</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Save Current View Button */}
            <button
              type="button"
              onClick={() => setShowSaveViewModal(true)}
              className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="שמור את העמודות, הסינונים והסדר הנוכחיים כתבנית תצוגה"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span>שמור תצוגה</span>
            </button>
          </div>

          {/* Center / Right: Global Instant Deep Search & Rows Selector */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl">
            {/* Global Deep Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש מהיר בכל כרטיס הלקוח (שם, טלפון, הערות, תשלום...)..."
                value={globalSearchTerm}
                onChange={(e) => {
                  setGlobalSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-8.5 pl-8 h-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
              {globalSearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="נקה חיפוש"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 h-10 rounded-xl shrink-0">
              <span className="font-semibold text-slate-500">שורות:</span>
              <select
                value={String(pageSize)}
                onChange={(e) => {
                  const val = e.target.value === "all" ? "all" : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="all">הכל ({processedContacts.length})</option>
              </select>
            </div>
          </div>

          {/* Right Side: Options & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap print:hidden">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 h-10 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox"
                checked={showSummaries}
                onChange={() => setShowSummaries(!showSummaries)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              סיכומים
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 h-10 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox"
                checked={showRowNumbering}
                onChange={() => setShowRowNumbering(!showRowNumbering)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              מיספור
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 h-10 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox"
                checked={showRowCheckboxes}
                onChange={() => {
                  setShowRowCheckboxes(!showRowCheckboxes);
                  setSelectedRowIds([]);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              בחירה
            </label>

            <Button 
              onClick={exportToExcel}
              variant="outline" 
              className="rounded-xl h-10 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 flex items-center gap-2 transition-colors cursor-pointer"
              title="ייצא את הנתונים המסוננים לקובץ Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ייצא לאקסל</span>
            </Button>

            <Button 
              onClick={() => setShowContactImportModal(true)}
              variant="outline" 
              className="rounded-xl h-10 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
              title="ייבא אנשי קשר מקובץ Excel (.xlsx / .csv)"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>ייבוא אנשי קשר מאקסל</span>
            </Button>

            <Button 
              onClick={() => window.print()}
              variant="outline" 
              className="rounded-xl h-10 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              הדפס
            </Button>
            
            <div className="relative">
              <Button 
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                variant="outline" 
                className={`rounded-xl h-10 border-slate-200 flex items-center gap-2 cursor-pointer ${showColumnsMenu ? 'bg-slate-100 ring-2 ring-indigo-500/20' : ''}`}
              >
                <Columns className="w-4 h-4" />
                בחר עמודות להצגה
              </Button>
              
              {showColumnsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColumnsMenu(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                      {allAvailableColumns.map(col => {
                        const isSelected = selectedColumns.includes(col);
                        return (
                          <div key={col} className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer flex-grow min-w-0">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => toggleColumn(col)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
                              />
                              <span className="text-sm font-medium text-slate-700 truncate" title={getColumnLabel(col)}>{getColumnLabel(col)}</span>
                            </label>
                            {isSelected && (
                              <div className="flex flex-row-reverse items-center gap-0.5 shrink-0 ml-2">
                                <button onClick={(e) => moveColumnUp(col, e)} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded cursor-pointer" title="הזז למעלה/ימינה">
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => moveColumnDown(col, e)} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded cursor-pointer" title="הזז למטה/שמאלה">
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Bulk Action Bar with Tag Management */}
        {selectedRowIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-indigo-900 mb-6 animate-in fade-in slide-in-from-top-1 print:hidden shadow-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-800">נבחרו {selectedRowIds.length} אנשי קשר מתוך {processedContacts.length}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkAddTag}
                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs font-bold"
              >
                <Plus className="w-4 h-4" />
                הוסף תווית לנבחרים
              </button>

              <button
                type="button"
                onClick={handleBulkRemoveTag}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors font-bold"
              >
                <X className="w-4 h-4" />
                הסר תווית מנבחרים
              </button>

              {contactStatus === "trashed" ? (
                <button
                  type="button"
                  onClick={() => handleBulkActionExecute("restore")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  שחזר לסל פעיל ({selectedRowIds.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBulkActionExecute("trash")}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  העבר לסל מחזור ({selectedRowIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => handleBulkActionExecute("delete_permanent")}
                className="bg-rose-800 hover:bg-rose-900 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                מחיקה לצמיתות
              </button>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                ביטול בחירה
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-right min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                {showRowCheckboxes && (
                  <th className="px-4 py-3 text-center align-top w-10 whitespace-nowrap">
                    <input 
                      type="checkbox"
                      checked={processedContacts.length > 0 && selectedRowIds.length === processedContacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIds(processedContacts.map(c => c.id || ""));
                        } else {
                          setSelectedRowIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                {showRowNumbering && (
                  <th className="px-4 py-3 text-right align-top w-12 text-xs font-bold text-slate-500">
                    #
                  </th>
                )}
                {selectedColumns.map(col => (
                  <th key={col} className="px-4 py-3 whitespace-nowrap align-top">
                    <div className="flex flex-col gap-3">
                      <button 
                        type="button"
                        onClick={() => handleSort(col)}
                        className="flex items-center justify-end gap-1.5 text-slate-700 hover:text-indigo-600 transition-colors w-full cursor-pointer"
                        title="לחץ למיון"
                      >
                        {sortConfig?.key === col ? (
                          sortConfig.direction === 'asc' ? <ArrowDown className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                        )}
                        <span>{getColumnLabel(col)}</span>
                      </button>
                      <div className="w-full mt-1">
                        <select
                          value={columnDataFilters[col] || 'all'}
                          onChange={(e) => {
                            const val = e.target.value as 'all' | 'has_data' | 'no_data';
                            setColumnDataFilters(prev => ({ ...prev, [col]: val }));
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                        >
                          <option value="all">הצג הכל</option>
                          <option value="has_data">עם נתון בלבד</option>
                          <option value="no_data">ללא נתון בלבד</option>
                        </select>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center align-top print:hidden">פעולות</th>
              </tr>
              
              {showSummaries && filteredContacts.length > 0 && (
                <tr className="bg-indigo-50/40 border-t border-indigo-100 shadow-inner">
                  {showRowCheckboxes && <th className="px-4 py-3"></th>}
                  {showRowNumbering && <th className="px-4 py-3"></th>}
                  {selectedColumns.map(col => {
                    let sum = 0;
                    let count = 0;
                    let isNumeric = false;
                    filteredContacts.forEach((c: any) => {
                      const val = getContactValue(c, col);
                      if (val !== null && val !== undefined && val !== "") {
                        count++;
                        if (!isNaN(Number(val)) && typeof val !== "boolean") {
                          const strVal = String(val).replace(/[^0-9.-]/g, '');
                          if (strVal.length > 6 && col !== 'total_spent' && col !== 'campaign_amount') {
                            // Too long, treat as text
                          } else {
                            sum += Number(val);
                            isNumeric = true;
                          }
                        }
                      }
                    });
                    
                    return (
                      <th key={`summary-${col}`} className="px-4 py-3 whitespace-nowrap">
                        {isNumeric ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-medium text-slate-500">סה"כ:</span>
                            <span className="text-indigo-700 font-black">{sum.toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-medium text-slate-500">כמות:</span>
                            <span className="text-slate-700 font-bold">{count.toLocaleString()}</span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 print:hidden"></th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedColumns.length + 1 + (showRowCheckboxes ? 1 : 0) + (showRowNumbering ? 1 : 0)}
                    className="px-4 py-12 text-center text-slate-400 bg-slate-50/50"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">לא נמצאו רשומות התואמות את החיפוש והסינונים</p>
                      <p className="text-xs text-slate-400">נסה לנקות את שדה החיפוש או לשנות את הסינונים</p>
                      {globalSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setGlobalSearchTerm("")}
                          className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          נקה חיפוש מהיר
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact: any, idx: number) => {
                  const isSelected = selectedRowIds.includes(contact.id || "");
                  const rowNumber = pageSize === "all" ? idx + 1 : (currentPage - 1) * Number(pageSize) + idx + 1;
                  return (
                    <tr key={contact.id || idx} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                      {showRowCheckboxes && (
                        <td className="px-4 py-3 text-center w-10 whitespace-nowrap">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowIds(prev => [...prev, contact.id || ""]);
                              } else {
                                setSelectedRowIds(prev => prev.filter(id => id !== (contact.id || "")));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}
                      {showRowNumbering && (
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs w-12">
                          {rowNumber}
                        </td>
                      )}
                      {selectedColumns.map(col => {
                        const val = getContactValue(contact, col);
                        const isEditing = editingCell?.id === contact.id && editingCell?.field === col;
                        
                        return (
                          <td 
                            key={col} 
                            className={`px-4 py-3 text-slate-700 max-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors group ${
                              col === "conta_name" ? "font-bold text-slate-900" : ""
                            }`} 
                            title={col === "conta_name" ? "לחץ לפתיחת כרטיס איש קשר" : String(val || "")}
                            onClick={(e) => {
                              if (col === "conta_name") {
                                handleEditClick(contact.id, e);
                              }
                            }}
                            onDoubleClick={() => {
                              setEditingCell({ id: contact.id || "", field: col });
                              setEditValue(String(val || ""));
                            }}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                {col === "conta_name" ? (
                                  <span className="truncate text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
                                    {formatCellValue(val)}
                                  </span>
                                ) : (
                                  <span className="truncate">{formatCellValue(val)}</span>
                                )}
                                <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 flex items-center justify-center gap-2 print:hidden">
                        <button 
                          type="button"
                          onClick={(e) => handleEditClick(contact.id, e)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors cursor-pointer"
                          title="ערוך"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteClick(contact.id, e)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pageSize !== "all" && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100 print:hidden text-right">
            <span className="text-xs text-slate-500 font-medium">
              מציג {(currentPage - 1) * Number(pageSize) + 1} - {Math.min(currentPage * Number(pageSize), processedContacts.length)} מתוך {processedContacts.length} אנשי קשר
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>הקודם</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((pageNum, idx, arr) => {
                    const prevNum = arr[idx - 1];
                    const hasGap = prevNum && pageNum - prevNum > 1;
                    return (
                      <React.Fragment key={pageNum}>
                        {hasGap && <span className="px-1 text-slate-400 text-xs">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <span>הבא</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ContactModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        contact={selectedContact} 
        onSuccess={loadData} 
      />

      <ContactImportModal
        isOpen={showContactImportModal}
        onClose={() => setShowContactImportModal(false)}
        onSuccess={loadData}
      />

      {/* Floating Action Navigation Menu */}
      <CrmFloatingNav 
        activePage="analytics"
        onOpenNewContact={() => {
          setSelectedContact(null);
          setModalOpen(true);
        }}
      />
    </div>
  );
}
