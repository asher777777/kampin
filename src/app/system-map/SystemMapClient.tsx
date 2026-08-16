'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DBArchitectChat from './DBArchitectChat';
import {
  APP_ROUTES,
  API_ROUTES,
  FEATURE_MODULES,
  CORE_LIBS,
  SYSTEM_METRICS,
  RouteItem,
  ApiItem,
  FeatureModule,
  CoreLibItem
} from './systemMapData';
import {
  Folder,
  Layers,
  Globe,
  Server,
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Check,
  Code,
  Shield,
  Users,
  MessageSquare,
  FileText,
  CreditCard,
  Zap,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Database,
  Cpu,
  Workflow,
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Terminal,
  Activity,
  Coins,
  Settings as SettingsIcon,
  Sliders,
  Layout,
  Table,
  Filter,
  Eye,
  Bot,
  MessageCircle,
  CornerDownLeft,
  Building,
  Home,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  X,
  CheckSquare,
  Square,
  Flame
} from 'lucide-react';

type TabType = 'database' | 'overview' | 'routes' | 'apis' | 'features' | 'files' | 'libs' | 'skills';
type DbSortType = 'oldest-first' | 'newest-first' | 'id-asc' | 'id-desc';

interface ScannedFile {
  path: string;
  relPath: string;
  name: string;
  ext: string;
  size: number;
  lines: number;
  category: string;
  routePath?: string;
  httpMethods?: string[];
  exports: string[];
  functions: { name: string; signature: string; description: string; isAsync?: boolean }[];
  components: string[];
  lastModified: string;
}

interface ScanMetrics {
  totalFiles: number;
  totalLines: number;
  totalAppRoutes: number;
  totalApiRoutes: number;
  totalFeatures: number;
  totalComponents: number;
  totalLibs: number;
  totalFunctions: number;
}

interface DBCollectionItem {
  id: string;
  name: string;
  type: 'root' | 'sub';
  description: string;
  icon: string;
  category: string;
  knownSubCollections?: string[];
}

interface DBUserItem {
  id: string;
  name: string;
  email?: string;
  role?: string;
  siteSlug?: string;
}

interface DBDocumentItem {
  id: string;
  data: any;
  path: string;
  subCollections?: string[];
}

// Smart timestamp extractor
function extractDocTimestamp(doc: DBDocumentItem): number {
  if (!doc) return 0;
  const d = doc.data || {};

  const candidateFields = [
    d.createdAt,
    d.timestamp,
    d.updatedAt,
    d.date,
    d.created,
    d.lastModified,
    d.time,
    d.startTime
  ];

  for (const field of candidateFields) {
    if (!field) continue;
    if (typeof field === 'number' && field > 1000000000) {
      return field < 1000000000000 ? field * 1000 : field;
    }
    if (typeof field === 'string') {
      const parsed = Date.parse(field);
      if (!isNaN(parsed)) return parsed;
    }
  }

  const match = doc.id?.match(/(\d{12,14})/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }

  return 0;
}

function formatDocTimestamp(ts: number): string {
  if (!ts || ts === 0) return 'ללא תאריך מזוהה';
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch (e) {
    return 'תאריך לא תקין';
  }
}

export default function SystemMapClient() {
  const [activeTab, setActiveTab] = useState<TabType>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Dynamic Live Scan State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [liveMetrics, setLiveMetrics] = useState<ScanMetrics>(SYSTEM_METRICS as any);
  const [liveFiles, setLiveFiles] = useState<ScannedFile[]>([]);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [scanDuration, setScanDuration] = useState<number>(0);

  // Database Explorer State
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [knownCollections, setKnownCollections] = useState<DBCollectionItem[]>([]);
  const [dbUsers, setDbUsers] = useState<DBUserItem[]>([]);
  const [selectedDbUser, setSelectedDbUser] = useState<string>('1');
  const [selectedCollection, setSelectedCollection] = useState<DBCollectionItem | null>(null);
  const [currentDbPath, setCurrentDbPath] = useState<string>('employees');
  const [collectionDocs, setCollectionDocs] = useState<DBDocumentItem[]>([]);
  const [collectionFields, setCollectionFields] = useState<string[]>([]);
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [dbSearchField, setDbSearchField] = useState<string>('all');
  const [dbSortOrder, setDbSortOrder] = useState<DbSortType>('oldest-first');
  const [dbCategoryFilter, setDbCategoryFilter] = useState<string>('all');
  const [inspectingDoc, setInspectingDoc] = useState<DBDocumentItem | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [editDocData, setEditDocData] = useState<string>('');
  const [isSavingDoc, setIsSavingDoc] = useState<boolean>(false);
  const [createDocModalOpen, setCreateDocModalOpen] = useState<boolean>(false);
  const [createDocId, setCreateDocId] = useState<string>('');
  const [createDocData, setCreateDocData] = useState<string>('{\n  \n}');
  const [isCreatingDoc, setIsCreatingDoc] = useState<boolean>(false);
  const [architectChatOpen, setArchitectChatOpen] = useState<boolean>(false);

  // Multi-Selection / Batch Deletion State
  const [selectedDocPaths, setSelectedDocPaths] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState<boolean>(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState<boolean>(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  // Single Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; docId: string; title?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteNotification, setDeleteNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Function Runner Modal State
  const [runnerOpen, setRunnerOpen] = useState<boolean>(false);
  const [runnerTarget, setRunnerTarget] = useState<{
    name: string;
    type: 'action' | 'api';
    endpoint?: string;
    method?: string;
    file?: string;
    defaultParams?: any;
  } | null>(null);
  const [runnerParamsInput, setRunnerParamsInput] = useState<string>('{}');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runnerResult, setRunnerResult] = useState<any>(null);
  const [runnerError, setRunnerError] = useState<string | null>(null);
  const [runnerLatency, setRunnerLatency] = useState<number | null>(null);

  // Item Detail Modal
  const [selectedItem, setSelectedItem] = useState<{
    title: string;
    type: 'route' | 'api' | 'feature' | 'lib' | 'file';
    data: any;
  } | null>(null);

  // 1. Fetch live dynamic scan
  const fetchLiveScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/system-map/scan');
      const json = await res.json();
      if (json.success) {
        setLiveMetrics(json.metrics);
        setLiveFiles(json.data.allFiles || []);
        setLastScannedAt(json.scannedAt);
        setScanDuration(json.scanDurationMs);
      }
    } catch (err) {
      console.error('Failed to load dynamic scan:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Fetch DB collections & users metadata
  const fetchDbMetadata = async () => {
    try {
      const res = await fetch('/api/system-map/database');
      const json = await res.json();
      if (json.success) {
        const knownCols = json.knownCollections || [];
        const dynamicCols = json.dynamicRootCollections || [];
        const mergedCols = [...knownCols];
        
        dynamicCols.forEach((dCol: string) => {
          if (!mergedCols.find((c: any) => c.id === dCol)) {
            mergedCols.push({
              id: dCol,
              name: dCol,
              type: 'root',
              description: 'קולקציה דינמית שזוהתה אוטומטית',
              icon: 'Database',
              category: 'dynamic'
            });
          }
        });
        
        setKnownCollections(mergedCols);
        setDbUsers(json.users || []);
        if (json.users?.length > 0 && selectedDbUser === '1' && !json.users.some((u: any) => u.id === '1')) {
          setSelectedDbUser(json.users[0].id);
        }
        const empCol = mergedCols.find((c: any) => c.id === 'employees') || mergedCols[0];
        if (empCol && !selectedCollection) {
          setSelectedCollection(empCol);
          setCurrentDbPath(empCol.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch DB metadata:', err);
    }
  };

  // 3. Query documents by path
  const fetchPathDocs = async (path: string) => {
    setDbLoading(true);
    try {
      const res = await fetch('/api/system-map/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          limit: 50
        })
      });
      const json = await res.json();
      setDbLatency(json.executionTimeMs || 0);
      if (json.success) {
        setCollectionDocs(json.documents || []);
        setCollectionFields(json.fields || []);
      } else {
        setCollectionDocs([]);
        setCollectionFields([]);
      }
    } catch (err) {
      console.error('Failed to query path docs:', err);
      setCollectionDocs([]);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveScan();
    fetchDbMetadata();
  }, []);

  useEffect(() => {
    if (currentDbPath) {
      setSelectedDocPaths([]); // Reset selection on path change
      fetchPathDocs(currentDbPath);
    }
  }, [currentDbPath]);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Drilldown into sub-collection
  const drilldownTo = (docPath: string, subColName: string) => {
    const newPath = `${docPath}/${subColName}`;
    setCurrentDbPath(newPath);
    setDbSearchQuery('');
  };

  // Navigate breadcrumb path
  const navigateBreadcrumb = (index: number) => {
    const segments = currentDbPath.split('/').filter(Boolean);
    const newSegments = segments.slice(0, index + 1);
    setCurrentDbPath(newSegments.join('/'));
    setDbSearchQuery('');
  };

  // Select top-level collection from sidebar
  const handleSelectCollection = (col: DBCollectionItem) => {
    setSelectedCollection(col);
    if (col.type === 'root') {
      setCurrentDbPath(col.id);
    } else {
      setCurrentDbPath(`users/${selectedDbUser}/${col.id}`);
    }
    setDbSearchQuery('');
  };

  // Toggle single document selection
  const toggleDocSelection = (path: string) => {
    setSelectedDocPaths(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  // Toggle select all in current filtered documents
  const toggleSelectAllDocs = () => {
    const allPaths = filteredAndSortedDocs.map(d => d.path);
    const allSelected = allPaths.length > 0 && allPaths.every(p => selectedDocPaths.includes(p));

    if (allSelected) {
      setSelectedDocPaths(prev => prev.filter(p => !allPaths.includes(p)));
    } else {
      setSelectedDocPaths(prev => Array.from(new Set([...prev, ...allPaths])));
    }
  };

  // Toggle select all routes
  const toggleSelectAllRoutes = () => {
    const allRouteIds = filteredRoutes.map(r => r.id);
    const allSelected = allRouteIds.length > 0 && allRouteIds.every(id => selectedRoutes.includes(id));

    if (allSelected) {
      setSelectedRoutes([]);
    } else {
      setSelectedRoutes(allRouteIds);
    }
  };

  // Execute Document Creation
  const handleCreateDoc = async () => {
    setIsCreatingDoc(true);
    try {
      const parsedData = JSON.parse(createDocData || '{}');
      const docId = createDocId.trim() || Math.random().toString(36).substring(2, 10);
      const newPath = `${currentDbPath}/${docId}`;
      const res = await fetch('/api/system-map/database', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, data: parsedData })
      });
      const json = await res.json();
      if (json.success) {
        setDeleteNotification({ message: `מסמך נוצר בהצלחה: ${docId}` });
        setCreateDocModalOpen(false);
        setCreateDocId('');
        setCreateDocData('{\n  \n}');
        await fetchPathDocs(currentDbPath);
        await fetchDbMetadata();
      } else {
        setDeleteNotification({ message: json.error || 'שגיאה ביצירת המסמך', isError: true });
      }
    } catch (e: any) {
      setDeleteNotification({ message: 'JSON לא תקין או שגיאת רשת', isError: true });
    } finally {
      setIsCreatingDoc(false);
      setTimeout(() => setDeleteNotification(null), 4000);
    }
  };

  // Execute Document Update
  const handleSaveDoc = async () => {
    if (!inspectingDoc) return;
    setIsSavingDoc(true);
    try {
      const parsedData = JSON.parse(editDocData);
      const res = await fetch('/api/system-map/database', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: inspectingDoc.path, data: parsedData })
      });
      const json = await res.json();
      if (json.success) {
        setDeleteNotification({ message: 'המסמך נשמר בהצלחה!' });
        setIsEditingDoc(false);
        setInspectingDoc(prev => prev ? { ...prev, data: parsedData } : null);
        await fetchPathDocs(currentDbPath);
      } else {
        setDeleteNotification({ message: json.error || 'שגיאה בשמירת המסמך', isError: true });
      }
    } catch (e: any) {
      setDeleteNotification({ message: 'JSON לא תקין או שגיאת רשת', isError: true });
    } finally {
      setIsSavingDoc(false);
      setTimeout(() => setDeleteNotification(null), 4000);
    }
  };

  // Execute Single Document Deletion
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/system-map/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: deleteTarget.path })
      });
      const json = await res.json();
      if (json.success) {
        setDeleteNotification({ message: `המסמך ${deleteTarget.docId} נמחק לצמיתות!` });
        setSelectedDocPaths(prev => prev.filter(p => p !== deleteTarget.path));
        setDeleteTarget(null);
        if (inspectingDoc?.path === deleteTarget.path) setInspectingDoc(null);
        await fetchPathDocs(currentDbPath);
        await fetchDbMetadata();
      } else {
        setDeleteNotification({ message: json.error || 'שגיאה במחיקה', isError: true });
      }
    } catch (e: any) {
      setDeleteNotification({ message: e.message || 'שגיאת רשת במחיקה', isError: true });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteNotification(null), 4000);
    }
  };

  // Execute Batch / Bulk Deletion
  const confirmBatchDelete = async () => {
    if (selectedDocPaths.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const res = await fetch('/api/system-map/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: selectedDocPaths })
      });
      const json = await res.json();
      if (json.success) {
        setDeleteNotification({ message: `${json.deletedCount || selectedDocPaths.length} מסמכים נמחקו לצמיתות בהצלחה!` });
        setSelectedDocPaths([]);
        setBatchDeleteModalOpen(false);
        await fetchPathDocs(currentDbPath);
        await fetchDbMetadata();
      } else {
        setDeleteNotification({ message: json.error || 'שגיאה במחיקה מרובה', isError: true });
      }
    } catch (e: any) {
      setDeleteNotification({ message: e.message || 'שגיאת רשת במחיקה מרובה', isError: true });
    } finally {
      setIsBatchDeleting(false);
      setTimeout(() => setDeleteNotification(null), 4000);
    }
  };

  // Execute Full Collection Purge
  const confirmPurgeCollection = async () => {
    setIsBatchDeleting(true);
    try {
      const res = await fetch('/api/system-map/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purgeCollection: true,
          path: currentDbPath
        })
      });
      const json = await res.json();
      if (json.success) {
        setDeleteNotification({ message: `כל המסמכים בנתיב '${currentDbPath}' נמחקו לצמיתות!` });
        setSelectedDocPaths([]);
        setPurgeModalOpen(false);
        await fetchPathDocs(currentDbPath);
        await fetchDbMetadata();
      } else {
        setDeleteNotification({ message: json.error || 'שגיאה בריקון הקולקציה', isError: true });
      }
    } catch (e: any) {
      setDeleteNotification({ message: e.message || 'שגיאת רשת בריקון הקולקציה', isError: true });
    } finally {
      setIsBatchDeleting(false);
      setTimeout(() => setDeleteNotification(null), 4000);
    }
  };

  // Open Function Runner
  const openRunner = (targetName: string, type: 'action' | 'api', opts?: { endpoint?: string; method?: string; file?: string }) => {
    let defaults: any = {};

    if (type === 'action') {
      if (targetName === 'getContacts') defaults = { filters: { status: 'all' } };
      else if (targetName === 'getTimeline') defaults = { contactId: 'sample_id' };
      else if (targetName === 'getGlobalSettings') defaults = { userId: selectedDbUser || '1' };
      else if (targetName === 'fetchShabbatTimesFromAPI') defaults = {};
      else if (targetName === 'generateSlugOptionsWithAI') defaults = { businessName: 'קפה גן סיפור' };
      else if (targetName === 'parseTemplate') defaults = { template: 'שלום {name}, הסטטוס הוא {status}', data: { name: 'מיכאל', status: 'פעיל' } };
      else if (targetName === 'normalizePhone') defaults = { phone: '0501234567' };
      else if (targetName === 'getSystemLogs') defaults = { limit: 10 };
      else defaults = {};
    } else if (type === 'api') {
      if (opts?.method === 'POST') defaults = { test: true };
      else defaults = {};
    }

    setRunnerTarget({
      name: targetName,
      type,
      endpoint: opts?.endpoint,
      method: opts?.method || 'GET',
      file: opts?.file,
      defaultParams: defaults
    });
    setRunnerParamsInput(JSON.stringify(defaults, null, 2));
    setRunnerResult(null);
    setRunnerError(null);
    setRunnerLatency(null);
    setRunnerOpen(true);
  };

  // Execute Function / API
  const executeRunner = async () => {
    if (!runnerTarget) return;
    setIsRunning(true);
    setRunnerResult(null);
    setRunnerError(null);
    setRunnerLatency(null);

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(runnerParamsInput || '{}');
    } catch (e: any) {
      setRunnerError(`שגיאת JSON בפרמטרים: ${e.message}`);
      setIsRunning(false);
      return;
    }

    try {
      const payload = {
        type: runnerTarget.type,
        functionName: runnerTarget.type === 'action' ? runnerTarget.name : undefined,
        endpoint: runnerTarget.type === 'api' ? runnerTarget.endpoint : undefined,
        method: runnerTarget.method || 'GET',
        params: parsedParams,
        userId: selectedDbUser || '1'
      };

      const res = await fetch('/api/system-map/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      setRunnerLatency(json.executionTimeMs || 0);

      if (json.success) {
        setRunnerResult(json.result ?? json);
      } else {
        setRunnerError(json.error || 'ההרצה נכשלה');
      }
    } catch (err: any) {
      setRunnerError(err.message || 'שגיאת רשת בביצוע הקריאה');
    } finally {
      setIsRunning(false);
    }
  };

  // Filtered & Sorted DB Documents
  const filteredAndSortedDocs = useMemo(() => {
    let docs = [...collectionDocs];

    if (dbSearchQuery.trim()) {
      const q = dbSearchQuery.trim().toLowerCase();
      docs = docs.filter(doc => {
        if (dbSearchField === 'all') {
          if (doc.id.toLowerCase().includes(q)) return true;
          const str = JSON.stringify(doc.data || {}).toLowerCase();
          return str.includes(q);
        } else {
          const val = doc.data?.[dbSearchField];
          if (val === undefined || val === null) return false;
          return String(val).toLowerCase().includes(q);
        }
      });
    }

    docs.sort((a, b) => {
      if (dbSortOrder === 'oldest-first') {
        const tA = extractDocTimestamp(a);
        const tB = extractDocTimestamp(b);
        if (tA !== tB) return tA - tB;
        return a.id.localeCompare(b.id, 'he', { numeric: true });
      } else if (dbSortOrder === 'newest-first') {
        const tA = extractDocTimestamp(a);
        const tB = extractDocTimestamp(b);
        if (tA !== tB) return tB - tA;
        return b.id.localeCompare(a.id, 'he', { numeric: true });
      } else if (dbSortOrder === 'id-asc') {
        return a.id.localeCompare(b.id, 'he', { numeric: true });
      } else if (dbSortOrder === 'id-desc') {
        return b.id.localeCompare(a.id, 'he', { numeric: true });
      }
      return 0;
    });

    return docs;
  }, [collectionDocs, dbSearchQuery, dbSearchField, dbSortOrder]);

  const isAllDocsSelected = useMemo(() => {
    const allPaths = filteredAndSortedDocs.map(d => d.path);
    return allPaths.length > 0 && allPaths.every(p => selectedDocPaths.includes(p));
  }, [filteredAndSortedDocs, selectedDocPaths]);

  // Filtered DB Collections in sidebar
  const filteredCollections = useMemo(() => {
    if (dbCategoryFilter === 'all') return knownCollections;
    return knownCollections.filter(c => c.category === dbCategoryFilter);
  }, [knownCollections, dbCategoryFilter]);

  // Breadcrumbs parsing
  const pathBreadcrumbs = useMemo(() => {
    return currentDbPath.split('/').filter(Boolean);
  }, [currentDbPath]);

  // Filtered Routes
  const filteredRoutes = useMemo(() => {
    return APP_ROUTES.filter(r => {
      const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.path.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.components.some(c => c.toLowerCase().includes(q)) ||
        r.functions.some(f => f.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const isAllRoutesSelected = useMemo(() => {
    const allRouteIds = filteredRoutes.map(r => r.id);
    return allRouteIds.length > 0 && allRouteIds.every(id => selectedRoutes.includes(id));
  }, [filteredRoutes, selectedRoutes]);

  // Filtered APIs
  const filteredApis = useMemo(() => {
    return API_ROUTES.filter(api => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        api.endpoint.toLowerCase().includes(q) ||
        api.title.toLowerCase().includes(q) ||
        api.description.toLowerCase().includes(q) ||
        api.services.some(s => s.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  // Filtered Features
  const filteredFeatures = useMemo(() => {
    return FEATURE_MODULES.filter(feat => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        feat.name.toLowerCase().includes(q) ||
        feat.description.toLowerCase().includes(q) ||
        feat.functions.some(fn => fn.name.toLowerCase().includes(q) || fn.description.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  // Filtered Dynamic Live Files
  const filteredLiveFiles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return liveFiles.filter(f => {
      return (
        !q ||
        f.relPath.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.exports.some(e => e.toLowerCase().includes(q)) ||
        f.functions.some(fn => fn.name.toLowerCase().includes(q)) ||
        f.components.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [liveFiles, searchQuery]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#09090b] text-slate-100 font-sans pb-36 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Floating Notification Toast */}
      {deleteNotification && (
        <div className="fixed bottom-28 left-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2 text-sm font-bold ${
              deleteNotification.isError
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
            }`}
          >
            {deleteNotification.isError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{deleteNotification.message}</span>
          </div>
        </div>
      )}

      {/* FLOATING BATCH ACTIONS TOOLBAR */}
      {selectedDocPaths.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#181416]/95 backdrop-blur-xl border-2 border-rose-500/60 shadow-[0_10px_40px_rgba(244,63,94,0.35)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                {selectedDocPaths.length}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  נבחרו {selectedDocPaths.length} מסמכים מתוך {filteredAndSortedDocs.length}
                </div>
                <div className="text-xs text-rose-300">
                  מוכנים למחיקה מרוכזת ורקורסיבית ממסד הנתונים
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={toggleSelectAllDocs}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                {isAllDocsSelected ? 'בטל הכל' : 'בחר את כולם'}
              </button>
              <button
                onClick={() => setSelectedDocPaths([])}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                נקה בחירה
              </button>
              <button
                onClick={() => setBatchDeleteModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.5)] flex items-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>מחק {selectedDocPaths.length} שנבחרו</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-amber-500/20 bg-[#0c0c0e]/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                <Workflow className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    מפת ארכיטקטורה, בסיס נתונים & מריץ פונקציות
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Recursive Batch Delete Ready
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  מחיקה רקורסיבית מלאה (מסמכים + תת-קולקציות), ריקון קולקציות, לחצן "בחר הכל" ומיון כרונולוגי
                </p>
              </div>
            </div>

            {/* Actions: Live Scan & Navigation */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={fetchLiveScan}
                disabled={isScanning}
                className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'סורק קוד...' : 'רענן סריקה חיה'}</span>
              </button>

              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                דשבורד
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-4 pt-2">
            {[
              { id: 'database', label: `🗄️ בסיס נתונים ומחיקה רקורסיבית (${knownCollections.length || 15})`, icon: Database },
              { id: 'overview', label: 'מבט-על ותרשימי זרימה', icon: Workflow },
              { id: 'routes', label: `סייר עמודים (${APP_ROUTES.length})`, icon: Globe },
              { id: 'apis', label: `מרכז שרתי API (${API_ROUTES.length})`, icon: Server },
              { id: 'features', label: `מודולים ופונקציות (${FEATURE_MODULES.length})`, icon: Zap },
              { id: 'files', label: `סייר כל הקבצים בזמן אמת (${liveFiles.length || '410+'})`, icon: FileCode },
              { id: 'libs', label: `תשתיות וספריות (${CORE_LIBS.length})`, icon: Database },
              { id: 'skills', label: 'סוכני AI והנחיות מותג', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-[#141418] text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* TAB: DATABASE & MULTI-SELECTION BATCH DELETIONS */}
        {/* ========================================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-[#111115] border border-amber-500/30 rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    סייר מסד הנתונים ומחיקה רקורסיבית מוחלטת
                    {dbLatency !== null && (
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ⚡ {dbLatency}ms
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    מחיקה רקורסיבית מוחקת את המסמך ואת כל תת-הקולקציות המשויכות אליו (`conversations`, `messages`, וכו׳) ללא השארת שאריות ב-Firestore
                  </p>
                </div>
              </div>

              {/* User Switcher */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <span className="text-xs text-slate-400 whitespace-nowrap">צפה בדייר/משתמש:</span>
                <select
                  value={selectedDbUser}
                  onChange={e => {
                    const newU = e.target.value;
                    setSelectedDbUser(newU);
                    if (selectedCollection && selectedCollection.type === 'sub') {
                      setCurrentDbPath(`users/${newU}/${selectedCollection.id}`);
                    }
                  }}
                  className="bg-[#18181c] border border-slate-700 text-amber-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 transition cursor-pointer max-w-[220px] truncate"
                >
                  {dbUsers.map(user => (
                    <option key={user.id} value={user.id} className="bg-[#18181c] text-white">
                      {user.name} ({user.id})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setCreateDocModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition flex items-center gap-1.5 font-bold text-xs"
                  title="יצירת קולקציה/מסמך חדש בנתיב זה"
                >
                  <span>➕ צור חדש</span>
                </button>

                <button
                  onClick={() => setArchitectChatOpen(true)}
                  className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/40 transition flex items-center gap-1.5 font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                  title="סיעור מוחות עם ארכיטקט נתונים AI"
                >
                  <span>🧠 DB Architect</span>
                </button>

                <button
                  onClick={() => fetchPathDocs(currentDbPath)}
                  disabled={dbLoading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="רענן נתוני נתיב נוכחי"
                >
                  <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'כל הקולקציות' },
                { id: 'ai_agents', label: '🤖 סוכני AI ושיחות (Employees, Dotty)' },
                { id: 'content', label: '📄 עמודים ודפי נחיתה (Pages, Landing, Services)' },
                { id: 'core', label: '👥 משתמשים וחשבונות (Users)' },
                { id: 'crm', label: '🤝 קהילה ו-CRM' },
                { id: 'finance', label: '💳 כספים והוצאות' },
                { id: 'system', label: '⚙️ הגדרות ולוגים' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setDbCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    dbCategoryFilter === cat.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-[#141418] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Main DB Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Collection List Sidebar (4 cols) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>קולקציות ראשיות ({filteredCollections.length}):</span>
                </div>

                <div className="space-y-2 max-h-[700px] overflow-y-auto no-scrollbar pr-1">
                  {filteredCollections.map(col => {
                    const isSelected = selectedCollection?.id === col.id && (currentDbPath === col.id || currentDbPath.startsWith(`users/${selectedDbUser}/${col.id}`) || currentDbPath.startsWith(col.id));
                    return (
                      <div
                        key={col.id}
                        onClick={() => handleSelectCollection(col)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                            : 'bg-[#121216] border-slate-800/90 hover:border-slate-700 hover:bg-[#16161c]'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div
                            className={`p-2 rounded-lg ${
                              col.category === 'ai_agents'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : col.category === 'content'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : isSelected
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {col.category === 'ai_agents' ? <Bot className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{col.name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              {col.type === 'root' ? col.id : `users/${selectedDbUser}/${col.id}`}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            col.type === 'root'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {col.type === 'root' ? 'Root' : 'Sub-Col'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Documents & Drilldown Panel (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#111115] border border-slate-800 rounded-2xl p-5 space-y-4">
                  {/* Interactive Breadcrumbs Bar */}
                  <div className="bg-[#18181c] border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" />
                        Firestore:
                      </span>

                      {pathBreadcrumbs.map((segment, idx) => {
                        const isLast = idx === pathBreadcrumbs.length - 1;
                        return (
                          <React.Fragment key={idx}>
                            <span className="text-slate-600">/</span>
                            <button
                              onClick={() => navigateBreadcrumb(idx)}
                              className={`px-2 py-0.5 rounded transition ${
                                isLast
                                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              {segment}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {pathBreadcrumbs.length > 1 && (
                      <button
                        onClick={() => navigateBreadcrumb(pathBreadcrumbs.length - 2)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 flex items-center gap-1 transition shrink-0"
                      >
                        <CornerDownLeft className="w-3 h-3 text-amber-400" />
                        <span>חזרה רמה למעלה</span>
                      </button>
                    )}
                  </div>

                  {/* Header & ACTION BUTTONS: SELECT ALL + PURGE COLLECTION */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white font-mono">{currentDbPath}</h4>
                        <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {filteredAndSortedDocs.length} מתוך {collectionDocs.length} מסמכים
                        </span>
                        {selectedDocPaths.length > 0 && (
                          <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                            {selectedDocPaths.length} מסומנים
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        ממוין כעת: {dbSortOrder === 'oldest-first' ? '⏳ מהראשון מההתחלה לסוף' : dbSortOrder === 'newest-first' ? '⌛ מהחדש לישן' : '🔤 לפי מזהה'}
                      </p>
                    </div>

                    {/* ACTION BUTTONS (SELECT ALL & PURGE ALL) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {filteredAndSortedDocs.length > 0 && (
                        <button
                          onClick={toggleSelectAllDocs}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition shadow-md ${
                            isAllDocsSelected
                              ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300 hover:border-amber-500/40'
                          }`}
                        >
                          {isAllDocsSelected ? (
                            <CheckSquare className="w-4 h-4 text-black stroke-[2.5]" />
                          ) : (
                            <Square className="w-4 h-4 text-amber-400" />
                          )}
                          <span>
                            {isAllDocsSelected
                              ? `✕ בטל בחירה (${filteredAndSortedDocs.length})`
                              : `✓ בחר הכל (${filteredAndSortedDocs.length})`}
                          </span>
                        </button>
                      )}

                      {/* PURGE ALL DOCUMENTS IN THIS PATH */}
                      {collectionDocs.length > 0 && (
                        <button
                          onClick={() => setPurgeModalOpen(true)}
                          className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-rose-100 text-xs font-bold rounded-xl border border-rose-700/60 flex items-center gap-1.5 transition shadow-sm"
                          title="רוקן ומחק את כל המסמכים בקולקציה זו לצמיתות"
                        >
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>רוקן קולקציה זו</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SEARCH & SORT TOOLBAR */}
                  <div className="bg-[#15151a] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Field + Input */}
                    <div className="flex items-center gap-2 flex-1">
                      {collectionFields.length > 0 && (
                        <select
                          value={dbSearchField}
                          onChange={e => setDbSearchField(e.target.value)}
                          className="bg-[#1e1e24] border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-500 transition"
                        >
                          <option value="all">כל השדות</option>
                          {collectionFields.map((f, i) => (
                            <option key={i} value={f}>{f}</option>
                          ))}
                        </select>
                      )}

                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={dbSearchQuery}
                          onChange={e => setDbSearchQuery(e.target.value)}
                          placeholder="חיפוש מהיר במסמכי הקולקציה..."
                          className="w-full bg-[#1e1e24] border border-slate-700 rounded-xl pr-8 pl-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                        {dbSearchQuery && (
                          <button
                            onClick={() => setDbSearchQuery('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sorting Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-amber-400" />
                        מיון:
                      </span>

                      <select
                        value={dbSortOrder}
                        onChange={e => setDbSortOrder(e.target.value as DbSortType)}
                        className="bg-[#1e1e24] border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                      >
                        <option value="oldest-first">⏳ מהראשון מהתחלה לסוף (ישן ➔ חדש)</option>
                        <option value="newest-first">⌛ מהחדש לישן (הכי עדכני תחילה)</option>
                        <option value="id-asc">🔤 לפי מזהה (A ➔ Z)</option>
                        <option value="id-desc">🔤 לפי מזהה (Z ➔ A)</option>
                      </select>
                    </div>
                  </div>

                  {/* Documents List */}
                  {dbLoading ? (
                    <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      <span>טוען נתונים מ-Firestore ({currentDbPath})...</span>
                    </div>
                  ) : filteredAndSortedDocs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs bg-[#16161b] rounded-xl border border-slate-800 p-6 space-y-2">
                      <div className="font-bold text-white text-sm">אין מסמכים בנתיב: `{currentDbPath}`</div>
                      <p className="text-slate-400">
                        קולקציה זו טרם מכילה מסמכים או שכולם נמחקו בהצלחה.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar">
                      {filteredAndSortedDocs.map((doc, idx) => {
                        const subCols = doc.subCollections || [];
                        const timestamp = extractDocTimestamp(doc);
                        const formattedDate = formatDocTimestamp(timestamp);
                        const isSelected = selectedDocPaths.includes(doc.path);

                        return (
                          <div
                            key={doc.id || idx}
                            className={`border rounded-xl p-4 transition-all space-y-3 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                                : 'bg-[#16161b] border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Left / Start: Checkbox + ID + Timestamp */}
                              <div className="flex items-center gap-3 truncate">
                                {/* Individual Checkbox */}
                                <button
                                  onClick={() => toggleDocSelection(doc.path)}
                                  className={`p-1 rounded-lg border transition ${
                                    isSelected
                                      ? 'bg-amber-500 border-amber-400 text-black'
                                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/50'
                                  }`}
                                  title={isSelected ? 'בטל בחירה' : 'סמן למחיקה מרובה'}
                                >
                                  {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-3.5 h-3.5" />}
                                </button>

                                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30 truncate">
                                  {doc.id}
                                </span>

                                {/* Timestamp Badge */}
                                {timestamp > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shrink-0">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              {/* Right / Actions: Copy, Inspect, Delete */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleCopy(JSON.stringify(doc.data, null, 2))}
                                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
                                >
                                  <Copy className="w-3 h-3" />
                                  העתק JSON
                                </button>
                                <button
                                  onClick={() => {
                                    setInspectingDoc(doc);
                                    setEditDocData(JSON.stringify(doc.data, null, 2));
                                    setIsEditingDoc(false);
                                  }}
                                  className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded font-bold border border-amber-500/40 flex items-center gap-1 transition"
                                >
                                  <Eye className="w-3 h-3" />
                                  צפה
                                </button>

                                {/* Delete Document Button */}
                                <button
                                  onClick={() => setDeleteTarget({ path: doc.path, docId: doc.id })}
                                  className="text-[11px] text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600/80 px-2.5 py-1 rounded font-bold border border-rose-500/30 flex items-center gap-1 transition"
                                  title="מחק מסמך זה ואת כל תת-הקולקציות שלו לצמיתות"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                  מחק
                                </button>
                              </div>
                            </div>

                            {/* Sub-Collection Drilldown Badges */}
                            {subCols.length > 0 && (
                              <div className="bg-[#121216] p-2.5 rounded-lg border border-purple-500/20 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                                  <Bot className="w-3.5 h-3.5" />
                                  תת-קולקציות תחת מסמך זה:
                                </span>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {subCols.map((subName, sIdx) => (
                                    <button
                                      key={sIdx}
                                      onClick={() => drilldownTo(doc.path, subName)}
                                      className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-bold rounded-lg border border-purple-500/40 flex items-center gap-1.5 transition shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                                    >
                                      <span>📂 צלול ל-{subName}</span>
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary Fields Preview */}
                            <div className="bg-[#0e0e12] rounded-lg p-2.5 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-32 no-scrollbar">
                              <pre dir="ltr">{JSON.stringify(doc.data, null, 2)}</pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="bg-gradient-to-r from-purple-500/10 via-[#16161c] to-amber-500/10 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">קולקציות סוכנים, עמודים ושיחות מחוברות וממוינות</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    מחיקה רקורסיבית מלאה, ריקון קולקציות וחיפוש שדות עמוק
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab('database');
                  setCurrentDbPath('employees');
                }}
                className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <Bot className="w-3.5 h-3.5" />
                פתח סייר קולקציות
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#111115] border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="text-xs font-bold uppercase text-blue-400 mb-1">שכבה 1: ממשק משתמש</div>
                <h3 className="text-lg font-bold text-white mb-2">Next.js App Router</h3>
                <p className="text-xs text-slate-400">38+ עמודי לקוח, דפי נחיתה, דשבורד וסוכנים.</p>
              </div>

              <div className="bg-[#111115] border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="text-xs font-bold uppercase text-emerald-400 mb-1">שכבה 2: שרתי API</div>
                <h3 className="text-lg font-bold text-white mb-2">21 נקודות קצה</h3>
                <p className="text-xs text-slate-400">סליקת קשר, צ'אט Dotty/Ed, Webhooks, משימות Cron.</p>
              </div>

              <div className="bg-[#111115] border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="text-xs font-bold uppercase text-amber-400 mb-1">שכבה 3: מודולי לוגיקה</div>
                <h3 className="text-lg font-bold text-white mb-2">12 מודולי Features</h3>
                <p className="text-xs text-slate-400">CRM, וואטסאפ GreenAPI, בונה אתרים AI, כספים.</p>
              </div>

              <div className="bg-[#111115] border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="text-xs font-bold uppercase text-purple-400 mb-1">שכבה 4: מסד נתונים</div>
                <h3 className="text-lg font-bold text-white mb-2">Firestore Multi-Level</h3>
                <p className="text-xs text-slate-400">employees, conversations, messages, pages, users.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ROUTES (WITH "SELECT ALL" BUTTON & CHECKBOXES) */}
        {activeTab === 'routes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#111115] p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-300">
                סה״כ <strong>{filteredRoutes.length}</strong> עמודים ונתיבים במערכת
                {selectedRoutes.length > 0 && (
                  <span className="text-amber-400 font-bold mr-2">({selectedRoutes.length} נבחרו)</span>
                )}
              </div>

              {/* SELECT ALL ROUTES BUTTON */}
              <button
                onClick={toggleSelectAllRoutes}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition ${
                  isAllRoutesSelected
                    ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
                }`}
              >
                {isAllRoutesSelected ? (
                  <CheckSquare className="w-4 h-4 text-black stroke-[2.5]" />
                ) : (
                  <Square className="w-4 h-4 text-amber-400" />
                )}
                <span>{isAllRoutesSelected ? 'בטל בחירת הכל' : `✓ בחר את כל העמודים (${filteredRoutes.length})`}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoutes.map(route => {
                const isSelected = selectedRoutes.includes(route.id);
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedItem({ title: route.title, type: 'route', data: route })}
                    className={`border rounded-2xl p-5 flex flex-col justify-between transition-all group cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                        : 'bg-[#121216] border-slate-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedRoutes(prev =>
                                prev.includes(route.id) ? prev.filter(id => id !== route.id) : [...prev, route.id]
                              );
                            }}
                            className={`p-1 rounded-lg border transition ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-black'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/50'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <div className="w-3.5 h-3.5" />}
                          </button>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                            {route.category}
                          </span>
                        </div>

                        <button
                          onClick={e => handleCopy(route.path, e)}
                          className="p-1 text-slate-500 hover:text-amber-400 transition"
                        >
                          {copiedText === route.path ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="font-mono text-sm font-bold text-amber-300 break-all">{route.path}</div>
                      <h3 className="text-base font-bold text-white mt-1 mb-2">{route.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{route.description}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-500 truncate max-w-[170px]">{route.file}</span>
                      {!route.isDynamic && (
                        <Link
                          href={route.path}
                          onClick={e => e.stopPropagation()}
                          target="_blank"
                          className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 transition"
                        >
                          <span>פתח נתיב</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: APIS */}
        {activeTab === 'apis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApis.map(api => (
              <div key={api.id} className="bg-[#121216] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                      {api.method}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200 break-all">{api.endpoint}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2 mb-1">{api.title}</h4>
                  <p className="text-xs text-slate-400 mb-3">{api.description}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-slate-500 text-[10px]">{api.file}</span>
                  <button
                    onClick={() => openRunner(api.title, 'api', { endpoint: api.endpoint, method: api.method, file: api.file })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40 transition"
                  >
                    <Play className="w-3 h-3 fill-emerald-300" />
                    <span>הפעל API</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: FEATURES */}
        {activeTab === 'features' && (
          <div className="space-y-8">
            {filteredFeatures.map(feat => (
              <div key={feat.id} className="bg-[#111115] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">{feat.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{feat.description}</p>
                <div className="divide-y divide-slate-800 bg-[#16161b] rounded-xl border border-slate-800 overflow-hidden">
                  {feat.functions.map((fn, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm font-bold text-amber-400">{fn.name}</div>
                        <div className="text-xs text-slate-300 mt-0.5">{fn.description}</div>
                      </div>
                      <button
                        onClick={() => openRunner(fn.name, 'action', { file: feat.actionsFile })}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-amber-300" />
                        הפעל
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: FILES */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLiveFiles.slice(0, 120).map((file, i) => (
              <div key={i} className="bg-[#121216] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-amber-300 break-all">{file.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 break-all mb-2">{file.relPath}</div>
                </div>
                <button
                  onClick={() => handleCopy(file.relPath)}
                  className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 pt-2 border-t border-slate-800"
                >
                  <Copy className="w-3 h-3" />
                  העתק נתיב
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB: LIBS */}
        {activeTab === 'libs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_LIBS.map((lib, i) => (
              <div key={i} className="bg-[#121216] border border-slate-800 rounded-2xl p-5">
                <div className="font-mono text-sm font-bold text-purple-300 mb-1">{lib.name}</div>
                <div className="text-xs text-slate-300 mb-3">{lib.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: SKILLS */}
        {activeTab === 'skills' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111115] border border-amber-500/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Golden Flute Design System</h3>
              <p className="text-xs text-slate-300">שפת העיצוב הרשמית: רקע שחור עמוק (Deep Black), הדגשות זהב (amber-500), פונט Heebo בלבד.</p>
            </div>
            <div className="bg-[#111115] border border-emerald-500/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Kesher Payment & Invoice API</h3>
              <p className="text-xs text-slate-300">אינטגרציית סליקה והפקת קבלות דיגיטליות רשמיות דרך מסוף קשר.</p>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* PURGE / CLEAR FULL COLLECTION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {purgeModalOpen && (
        <div
          onClick={() => !isBatchDeleting && setPurgeModalOpen(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#1c0e12] border-2 border-rose-600 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-[0_0_70px_rgba(225,29,72,0.4)]"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-rose-950">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">אזהרה: ריקון קולקציה מלאה</h3>
                <p className="text-xs text-rose-300">
                  פעולה זו תמחק לצמיתות את <strong>כל {collectionDocs.length} המסמכים</strong> ואת כל תת-הקולקציות שלהם!
                </p>
              </div>
            </div>

            <div className="bg-[#0f0709] p-3.5 rounded-xl border border-rose-900/60 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">הנתיב שירוקן לחלוטין מ-Firestore:</div>
              <div className="font-mono text-sm font-bold text-rose-300 break-all">{currentDbPath}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPurgeModalOpen(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                ביטול
              </button>
              <button
                onClick={confirmPurgeCollection}
                disabled={isBatchDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-[0_0_25px_rgba(225,29,72,0.6)] flex items-center gap-2 transition disabled:opacity-50"
              >
                <Flame className={`w-4 h-4 ${isBatchDeleting ? 'animate-spin' : ''}`} />
                <span>{isBatchDeleting ? 'מרוקן קולקציה לצמיתות...' : `🗑️ אשר ורוקן את כל המסמכים בנתיב זה`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH / BULK DELETION CONFIRMATION MODAL */}
      {batchDeleteModalOpen && (
        <div
          onClick={() => !isBatchDeleting && setBatchDeleteModalOpen(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#181216] border-2 border-rose-500/60 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-[0_0_60px_rgba(244,63,94,0.35)]"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-rose-950">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">אישור מחיקה מרוכזת (Recursive Batch Delete)</h3>
                <p className="text-xs text-rose-300">
                  אתה עומד למחוק לצמיתות <strong>{selectedDocPaths.length}</strong> מסמכים ממסד הנתונים!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">רשימת המסמכים שנבחרו למחיקה:</div>
              <div className="bg-[#0f0b0d] p-3 rounded-xl border border-rose-900/50 max-h-48 overflow-y-auto font-mono text-xs text-rose-200 space-y-1">
                {selectedDocPaths.map((path, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-0.5 border-b border-rose-950/40 last:border-0">
                    <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                    <span className="truncate">{path}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                ביטול
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-[0_0_25px_rgba(244,63,94,0.5)] flex items-center gap-2 transition disabled:opacity-50"
              >
                <Trash2 className={`w-4 h-4 ${isBatchDeleting ? 'animate-spin' : ''}`} />
                <span>{isBatchDeleting ? 'מוחק כעת במרוכז...' : `🗑️ אשר ומחק ${selectedDocPaths.length} מסמכים לצמיתות`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DELETION CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          onClick={() => !isDeleting && setDeleteTarget(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#181216] border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-[0_0_50px_rgba(244,63,94,0.25)]"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-rose-950">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">אישור מחיקה סופית</h3>
                <p className="text-xs text-slate-400">פעולה זו בלתי הפיכה ותמחק את המסמך ואת כל תת-הקולקציות שלו לצמיתות</p>
              </div>
            </div>

            <div className="bg-[#0f0b0d] p-3.5 rounded-xl border border-rose-900/50 space-y-1.5">
              <div className="text-xs text-slate-400 font-semibold">הנתיב המלא למחיקה ב-Firestore:</div>
              <div className="font-mono text-xs font-bold text-rose-300 break-all">{deleteTarget.path}</div>
              <div className="text-[11px] text-slate-500 font-mono">ID: {deleteTarget.docId}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                ביטול
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center gap-2 transition disabled:opacity-50"
              >
                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                <span>{isDeleting ? 'מוחק כעת...' : '🗑️ אשר ומחק סופית'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT INSPECTOR MODAL */}
      {inspectingDoc && (
        <div
          onClick={() => setInspectingDoc(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#141418] border border-amber-500/40 rounded-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                  Firestore Document
                </span>
                <h3 className="text-lg font-bold font-mono text-white mt-1 break-all">{inspectingDoc.id}</h3>
                <div className="text-xs font-mono text-slate-500">{inspectingDoc.path}</div>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-sm"
              >
                סגור ✕
              </button>
            </div>

            {/* Sub-collections in Modal */}
            {inspectingDoc.subCollections && inspectingDoc.subCollections.length > 0 && (
              <div className="bg-[#1a1a20] p-3 rounded-xl border border-purple-500/30 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-purple-300">תת-קולקציות זמינות:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inspectingDoc.subCollections.map((sub, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => {
                        setInspectingDoc(null);
                        drilldownTo(inspectingDoc.path, sub);
                      }}
                      className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-bold rounded-lg border border-purple-500/40 flex items-center gap-1"
                    >
                      <span>📂 פתח {sub}</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              {isEditingDoc ? (
                <textarea
                  dir="ltr"
                  className="w-full min-h-[300px] p-4 bg-[#0a0a0d] border border-amber-500/50 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                  value={editDocData}
                  onChange={(e) => setEditDocData(e.target.value)}
                />
              ) : (
                <pre
                  dir="ltr"
                  className="p-4 bg-[#0a0a0d] border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto max-h-96"
                >
                  {JSON.stringify(inspectingDoc.data, null, 2)}
                </pre>
              )}

              <div className="absolute top-3 right-3 flex flex-row-reverse items-center gap-2">
                {!isEditingDoc && (
                  <button
                    onClick={() => setIsEditingDoc(true)}
                    className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    ✏️ ערוך
                  </button>
                )}
                {isEditingDoc && (
                  <>
                    <button
                      onClick={handleSaveDoc}
                      disabled={isSavingDoc}
                      className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                    >
                      {isSavingDoc ? 'שומר...' : '💾 שמור'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDoc(false);
                        setEditDocData(JSON.stringify(inspectingDoc.data, null, 2));
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
                    >
                      ביטול
                    </button>
                  </>
                )}
              </div>

              <div className="absolute top-3 left-3 flex items-center gap-2">
                <button
                  onClick={() => handleCopy(JSON.stringify(inspectingDoc.data, null, 2))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  העתק JSON
                </button>
                <button
                  onClick={() => setDeleteTarget({ path: inspectingDoc.path, docId: inspectingDoc.id })}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  מחק מסמך זה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DB ARCHITECT CHAT MODAL */}
      <DBArchitectChat 
        isOpen={architectChatOpen} 
        onClose={() => setArchitectChatOpen(false)} 
        onDataSeeded={() => {
          if (currentDbPath) fetchPathDocs(currentDbPath);
          fetchDbMetadata();
        }}
      />

      {/* CREATE DOCUMENT MODAL */}
      {createDocModalOpen && (
        <div
          onClick={() => setCreateDocModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#141418] border border-emerald-500/40 rounded-2xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  Create Document
                </span>
                <h3 className="text-lg font-bold font-mono text-white mt-1">יצירת מסמך / קולקציה חדשה</h3>
                <div className="text-xs font-mono text-slate-500 mt-1">נתיב נוכחי: {currentDbPath}</div>
              </div>
              <button
                onClick={() => setCreateDocModalOpen(false)}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-sm"
              >
                סגור ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">מזהה מסמך (ID) - השאר ריק ליצירה אוטומטית</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. my_custom_doc_123"
                  className="w-full bg-[#0a0a0d] border border-slate-700 rounded-xl px-4 py-2 text-sm text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                  value={createDocId}
                  onChange={e => setCreateDocId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">תוכן המסמך (JSON)</label>
                <textarea
                  dir="ltr"
                  className="w-full min-h-[300px] p-4 bg-[#0a0a0d] border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                  value={createDocData}
                  onChange={(e) => setCreateDocData(e.target.value)}
                  placeholder="{\n  \n}"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setCreateDocModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition"
              >
                ביטול
              </button>
              <button
                onClick={handleCreateDoc}
                disabled={isCreatingDoc}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 transition disabled:opacity-50"
              >
                {isCreatingDoc ? 'יוצר...' : '✨ צור מסמך'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FUNCTION RUNNER MODAL */}
      {runnerOpen && runnerTarget && (
        <div
          onClick={() => setRunnerOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#131317] border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-xl font-bold font-mono text-white">
                {runnerTarget.type === 'action' ? `${runnerTarget.name}()` : runnerTarget.endpoint}
              </h3>
              <button onClick={() => setRunnerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <textarea
              value={runnerParamsInput}
              onChange={e => setRunnerParamsInput(e.target.value)}
              rows={4}
              dir="ltr"
              className="w-full font-mono text-xs bg-[#0b0b0e] border border-slate-700/80 rounded-xl p-3 text-amber-300"
            />

            <button
              onClick={executeRunner}
              disabled={isRunning}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{isRunning ? 'מריץ...' : 'שגר קריאה'}</span>
            </button>

            {runnerResult && (
              <pre dir="ltr" className="p-3 bg-[#09090c] rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto max-h-48">
                {JSON.stringify(runnerResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
