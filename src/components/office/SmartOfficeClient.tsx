"use client";

import React, { useState, useEffect, useRef } from "react";
import { SmartOfficeDocument, SmartOfficeTab } from "@/lib/types/office";
import { SmartOfficeEditor } from "./SmartOfficeEditor";
import { 
  Mic, 
  MicOff, 
  Send, 
  Loader2, 
  Sliders, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  Check,
  Info,
  Users,
  AlertCircle,
  Activity,
  Bug,
  Folder,
  Volume2,
  VolumeX,
  History,
  MessageSquare,
  User,
  Bot,
  PanelLeftOpen,
  PanelLeftClose,
  ExternalLink,
  Sparkles,
  Play,
  Pause,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  Shield,
  Star,
  Circle,
  Hexagon,
  Video,
  BarChart3,
  Table,
  Globe,
  Maximize2,
  Search,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Bookmark,
  ChevronDown,
  Plus,
  Tag,
  Zap
} from "lucide-react";

// ---------------------------------------------------------------------------
// TYPEWRITER EFFECT COMPONENT FOR MOVIE SUBTITLES
// ---------------------------------------------------------------------------

function TypewriterText({ text, speed = 35 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    if (!text) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
}

// ---------------------------------------------------------------------------
// VECTOR SHAPE BADGE RENDERER
// ---------------------------------------------------------------------------

function VectorShapeBadge({ shape }: { shape?: any }) {
  if (!shape) return null;
  const ShapeIcon = 
    shape.type === 'shield' ? Shield : 
    shape.type === 'star' ? Star : 
    shape.type === 'circle' ? Circle : 
    shape.type === 'chart' ? BarChart3 : 
    shape.type === 'table' ? Table : Sparkles;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/50 rounded-full text-amber-300 text-xs font-black shadow-md shrink-0 dir-ltr">
      <ShapeIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
      <span>{shape.label || 'Vector Badge'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RICH GENERATIVE CANVAS VISUAL COMPONENTS (TEMPLATES FROM SERVER LIBRARY)
// ---------------------------------------------------------------------------

// Template 1: Text + Link to Image + Link to Page + Vector Shape (CONTAINED IMAGE!)
function TemplateTextImagePageVector({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/60 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black text-amber-400 tracking-wide">Data & Image Card</h4>
        </div>
        <VectorShapeBadge shape={data.vectorShape} />
      </div>

      <p className="text-xs text-slate-100 font-medium leading-relaxed">{data.text}</p>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
        {data.imageUrl && (
          <div className="w-full sm:w-36 h-28 rounded-2xl overflow-hidden border border-slate-800 bg-black/80 p-1 shrink-0 relative group flex items-center justify-center">
            {/* Fully Contained Image (object-contain) */}
            <img 
              src={data.imageUrl} 
              alt="Visual Link" 
              className="w-full h-full object-contain group-hover:scale-105 transition-all" 
            />
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 text-amber-300 text-[9px] font-bold rounded">Image Link</span>
          </div>
        )}

        <div className="flex-1 space-y-2 text-left w-full">
          {data.metrics && (
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              {Object.entries(data.metrics).map(([k, v]) => (
                <span key={k} className="font-mono"><strong className="text-amber-400">{k}:</strong> {String(v)}</span>
              ))}
            </div>
          )}

          {data.pageUrl && (
            <a
              href={data.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all"
            >
              <span>{data.pageTitle || 'Link to Page'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Template 2: Text + Vector Shape Link / Badge
function TemplateTextVectorShape({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/90 border border-amber-400/50 rounded-3xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md text-left">
      <div className="space-y-1">
        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Security & Authorization</span>
        <p className="text-xs text-slate-100 font-medium leading-relaxed">{data.text}</p>
      </div>
      <VectorShapeBadge shape={data.vectorShape} />
    </div>
  );
}

// Template 3: Text + Link to Image + Link to Page + Vector Shape (Alt Layout - CONTAINED IMAGE!)
function TemplateTextImagePageVectorAlt({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/60 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
        <h4 className="text-xs font-black text-amber-400">Multi-Aspect Audit</h4>
        <VectorShapeBadge shape={data.vectorShape} />
      </div>

      <p className="text-xs text-slate-100 font-medium leading-relaxed">{data.text}</p>

      {data.imageUrl && (
        <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-800 bg-black/80 p-1.5 relative flex items-center justify-center">
          {/* Fully Contained Image (object-contain) */}
          <img src={data.imageUrl} alt="Image Link" className="w-full h-full object-contain" />
        </div>
      )}

      {data.pageUrl && (
        <a
          href={data.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
        >
          <span>{data.pageTitle || 'Link to Page'}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
        </a>
      )}
    </div>
  );
}

// Template 4: Link to Page Card
function TemplatePageLinkCard({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/95 border border-amber-400/50 rounded-3xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md text-left">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-slate-100">{data.text || 'Page Link Card'}</h4>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <VectorShapeBadge shape={data.vectorShape} />
        <a
          href={data.pageUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md shrink-0"
        >
          <span>{data.pageTitle || 'Open Page'}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
        </a>
      </div>
    </div>
  );
}

// Template 5: Text + Video Link + Link to Page + Vector Shape
function TemplateTextVideoPageVector({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/60 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black text-amber-400">Video & Page Stream</h4>
        </div>
        <VectorShapeBadge shape={data.vectorShape} />
      </div>

      <p className="text-xs text-slate-100 font-medium leading-relaxed">{data.text}</p>

      {data.videoUrl && (
        <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-800 bg-black relative">
          <video src={data.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
            <Video className="w-3 h-3 text-amber-400" />
            <span>Video Link Player</span>
          </span>
        </div>
      )}

      {data.pageUrl && (
        <a
          href={data.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
        >
          <span>{data.pageTitle || 'Link to Page'}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-950" />
        </a>
      )}
    </div>
  );
}

// Template 6: Text + Video Link
function TemplateTextVideoLink({ data }: { data: any }) {
  return (
    <div className="w-full p-4 bg-slate-950/90 border border-amber-400/50 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-amber-400">Video Player Stream</h4>
        {data.badge && (
          <span className="px-2 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-md text-[10px] font-bold">
            {data.badge}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-100 font-medium leading-relaxed">{data.text}</p>

      {data.videoUrl && (
        <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-800 bg-black relative">
          <video src={data.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

// Template 7: Interactive Chart / Graph Renderer
function TemplateChartGraphCard({ data }: { data: any }) {
  const chartData = data.chartData || {
    title: 'Traffic Analytics Growth',
    labels: ['Offices', 'Landing', 'Events', 'Posts', 'Services'],
    values: [1010, 1130, 510, 440, 390],
  };

  const maxValue = Math.max(...chartData.values, 100);

  return (
    <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/70 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-amber-400" />
          <h4 className="text-xs font-black text-amber-400 tracking-wide">{chartData.title || data.text}</h4>
        </div>
        <VectorShapeBadge shape={data.vectorShape || { type: 'chart', label: 'Chart Analytics' }} />
      </div>

      <p className="text-xs text-slate-200 font-medium">{data.text}</p>

      {/* SVG Bar Chart Visualization */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
        <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
          {chartData.labels.map((label: string, idx: number) => {
            const val = chartData.values[idx] || 0;
            const heightPercent = Math.round((val / maxValue) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] font-mono text-amber-300 font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                  {val.toLocaleString()}
                </span>
                <div className="w-full bg-slate-950 rounded-t-lg overflow-hidden h-24 flex items-end p-0.5">
                  <div
                    style={{ height: `${Math.max(heightPercent, 10)}%` }}
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-md transition-all duration-500 shadow-md group-hover:from-amber-400 group-hover:to-amber-200"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-full">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Template 8: Interactive Excel Data Grid / Table Renderer (Edit, Delete, Filter, Sort, Real DB Sync)
function TemplateExcelTableCard({ data }: { data: any }) {
  const initialTable = data.tableData || {
    title: 'Database Table',
    headers: ['Title', 'Visits', 'Leads', 'Status'],
    rows: []
  };

  const [headers, setHeaders] = useState<string[]>(initialTable.headers || []);
  const [rows, setRows] = useState<any[]>(initialTable.rows || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<any>({});
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Re-sync when props change
  useEffect(() => {
    if (data.tableData) {
      setHeaders(data.tableData.headers || []);
      setRows(data.tableData.rows || []);
    }
  }, [data]);

  // Handle Header Click Sorting
  const handleSort = (header: string) => {
    if (sortKey === header) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(header);
      setSortOrder("asc");
    }
  };

  // Filter Rows
  const filteredRows = rows.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(r).some((val) => String(val).toLowerCase().includes(term));
  });

  // Sort Rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = String(a[sortKey] || "").toLowerCase();
    const valB = String(b[sortKey] || "").toLowerCase();

    const numA = parseFloat(valA.replace(/[^0-9.-]+/g, ""));
    const numB = parseFloat(valB.replace(/[^0-9.-]+/g, ""));

    if (!isNaN(numA) && !isNaN(numB)) {
      return sortOrder === "asc" ? numA - numB : numB - numA;
    }
    return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  // Delete Row Handler with Real DB Persistence
  const handleDeleteRow = async (originalIdx: number) => {
    const rowToDelete = rows[originalIdx];
    setRows((prev) => prev.filter((_, idx) => idx !== originalIdx));
    if (editingRowIdx === originalIdx) {
      setEditingRowIdx(null);
    }

    setSyncStatus("Deleting from Firestore Database...");
    try {
      const res = await fetch(`/api/office/david/update-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          recordData: rowToDelete,
        }),
      });
      if (res.ok) {
        setSyncStatus("Deleted from Database ✓");
      } else {
        setSyncStatus("Database Sync Warning (Local Saved)");
      }
    } catch (e) {
      setSyncStatus("Local Change Saved");
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // Start Edit Row Handler
  const handleStartEdit = (originalIdx: number, row: any) => {
    setEditingRowIdx(originalIdx);
    setEditingRowData({ ...row });
  };

  // Save Edit Row Handler with Real DB Persistence
  const handleSaveEdit = async () => {
    if (editingRowIdx === null) return;

    const updatedRow = { ...editingRowData };
    setRows((prev) => {
      const updated = [...prev];
      updated[editingRowIdx] = updatedRow;
      return updated;
    });
    setEditingRowIdx(null);

    setSyncStatus("Saving to Firestore Database...");
    try {
      const res = await fetch(`/api/office/david/update-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          recordData: updatedRow,
        }),
      });
      if (res.ok) {
        setSyncStatus("Saved to Database ✓");
      } else {
        setSyncStatus("Database Sync Warning (Local Saved)");
      }
    } catch (e) {
      setSyncStatus("Local Change Saved");
    } finally {
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const [visibleRowsCount, setVisibleRowsCount] = useState(5);

  // Slice displayed rows for 5-row pagination view
  const displayedRows = sortedRows.slice(0, visibleRowsCount);

  // ---------------------------------------------------------------------------
  // VERTICAL SINGLE-PERSON CONTACT CARD (Rendered when rows.length === 1)
  // Data stacked vertically below data - No horizontal scrolling!
  // ---------------------------------------------------------------------------
  if (rows.length === 1) {
    const singleRow = rows[0];
    const isEditingSingle = editingRowIdx === 0;

    return (
      <div className="w-full max-w-xl mx-auto p-5 bg-slate-950/95 border-2 border-amber-400/80 rounded-3xl shadow-2xl space-y-4 backdrop-blur-md text-left animate-fadeIn">
        {/* Vertical Card Header Bar */}
        <div className="flex items-center justify-between border-b border-amber-400/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-amber-400 font-bold">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-amber-400 tracking-wide">
                  {singleRow["Full Name"] || singleRow["name"] || initialTable.title}
                </h4>
                {syncStatus && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold animate-pulse">
                    {syncStatus}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Vertical Single-Person Contact Card</span>
            </div>
          </div>

          {/* Action Buttons (Edit / Delete / Save) */}
          <div className="flex items-center gap-2">
            {isEditingSingle ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-400/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRowIdx(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleStartEdit(0, singleRow)}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRow(0)}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-400/40 rounded-xl transition-all cursor-pointer"
                  title="Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Vertical Data List (Data Below Data) */}
        <div className="border border-slate-800 rounded-2xl bg-black/80 font-mono divide-y divide-slate-800/80 overflow-hidden">
          {headers.map((h: string) => (
            <div key={h} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 hover:bg-slate-900/50 transition-colors gap-2">
              <span className="text-xs font-bold text-amber-400/90 w-36 shrink-0">
                {h}
              </span>
              {isEditingSingle ? (
                <input
                  type="text"
                  value={editingRowData[h] !== undefined ? editingRowData[h] : ""}
                  onChange={(e) =>
                    setEditingRowData({ ...editingRowData, [h]: e.target.value })
                  }
                  className="w-full sm:w-2/3 bg-slate-950 border border-amber-400/80 rounded-xl px-2.5 py-1 text-xs text-amber-300 focus:outline-none"
                />
              ) : (
                <span className="text-xs text-slate-100 font-medium break-all">
                  {singleRow[h] !== undefined && singleRow[h] !== "" ? String(singleRow[h]) : "-"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/70 rounded-3xl shadow-2xl space-y-3 backdrop-blur-md text-left">
      {/* Table Title & Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-400/30 pb-2.5">
        <div className="flex items-center gap-2">
          <Table className="w-4.5 h-4.5 text-amber-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-amber-400 tracking-wide">{initialTable.title}</h4>
              {syncStatus && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold animate-pulse">
                  {syncStatus}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{rows.length} Total Rows Recorded</span>
          </div>
        </div>

        {/* Live Filter Search Input Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter table rows..."
              className="w-full pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-800 focus:border-amber-400/70 rounded-xl text-[11px] text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <VectorShapeBadge shape={data.vectorShape || { type: 'table', label: 'Excel Grid' }} />
        </div>
      </div>

      {data.text && <p className="text-xs text-slate-200 font-medium">{data.text}</p>}

      {/* Interactive Excel Data Grid Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-black/70 shadow-inner">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-amber-400 border-b border-slate-800 font-black select-none">
              {headers.map((h: string, idx: number) => {
                const isSorted = sortKey === h;
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(h)}
                    className="p-2.5 border-r border-slate-800 last:border-r-0 cursor-pointer hover:bg-slate-850 transition-colors"
                    title={`Click to sort by ${h}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{h}</span>
                      <span className="shrink-0 text-amber-400/80">
                        {isSorted ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
              {/* Row Actions Header (Edit / Delete) */}
              <th className="p-2.5 text-center w-20 text-slate-400 font-mono text-[10px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="p-4 text-center text-slate-400 italic">
                  No matching records found.
                </td>
              </tr>
            ) : (
              displayedRows.map((row: any, rIdx: number) => {
                const originalIndex = rows.indexOf(row);
                const isEditing = editingRowIdx === originalIndex;

                return (
                  <tr key={rIdx} className={`hover:bg-slate-900/60 transition-colors ${isEditing ? "bg-amber-500/10" : ""}`}>
                    {headers.map((h: string, cIdx: number) => (
                      <td key={cIdx} className="p-2.5 text-slate-200 border-r border-slate-800/60 last:border-r-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingRowData[h] !== undefined ? editingRowData[h] : ""}
                            onChange={(e) =>
                              setEditingRowData({ ...editingRowData, [h]: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-amber-400/80 rounded px-1.5 py-0.5 text-[11px] text-amber-300 focus:outline-none"
                          />
                        ) : (
                          row[h] !== undefined ? String(row[h]) : '-'
                        )}
                      </td>
                    ))}

                    {/* Edit & Delete Action Buttons */}
                    <td className="p-2 text-center border-l border-slate-800/60">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-all cursor-pointer"
                              title="Save Row Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRowIdx(null)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                              title="Cancel Edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(originalIndex, row)}
                              className="p-1 hover:bg-amber-400/20 text-amber-400/80 hover:text-amber-300 rounded-lg transition-all cursor-pointer"
                              title="Edit Row Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(originalIndex)}
                              className="p-1 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5-Row Paginated / Expandable Rows Controls with ChevronDown Arrow Icon */}
      {sortedRows.length > 5 && (
        <div className="flex items-center justify-between pt-2 px-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {Math.min(visibleRowsCount, sortedRows.length)} of {sortedRows.length} rows
          </span>
          {visibleRowsCount < sortedRows.length ? (
            <button
              type="button"
              onClick={() => setVisibleRowsCount((prev) => prev + 5)}
              className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-400/20 border border-amber-400/60 hover:border-amber-400 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer group hover:scale-105 active:scale-95"
            >
              <span>Discover More (5 Rows)</span>
              <ChevronDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setVisibleRowsCount(5)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Collapse to 5 Rows</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Template 9: iFrame / Embedded Web View Window
function TemplateIframeViewCard({ data }: { data: any }) {
  const iframeUrl = data.iframeUrl || '/office/david';
  return (
    <div className="w-full p-3 bg-slate-950/95 border-2 border-amber-400/70 rounded-3xl shadow-2xl space-y-2 backdrop-blur-md text-left">
      <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black text-amber-400 tracking-wide">{data.iframeTitle || 'Live iFrame Window'}</h4>
        </div>
        <VectorShapeBadge shape={data.vectorShape || { type: 'shield', label: 'Live iFrame' }} />
      </div>

      <p className="text-xs text-slate-200 font-medium">{data.text}</p>

      {/* Embedded Window Browser Frame */}
      <div className="w-full rounded-2xl border border-slate-800 overflow-hidden bg-black shadow-inner space-y-0">
        <div className="bg-slate-900 px-3 py-1.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 dir-ltr bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {iframeUrl}
          </span>
          <a href={iframeUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="w-full h-48 bg-slate-950 relative">
          <iframe
            src={iframeUrl}
            title={data.iframeTitle || 'Embedded View'}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

// Helper: Convert spoken English word numbers (e.g. "zero three three...") to digits ("033...")
function convertSpokenWordsToDigits(text: string): string {
  const numberMap: Record<string, string> = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    oh: "0",
    plus: "+",
    dash: "-",
  };

  let normalized = text.toLowerCase().trim();
  
  // Replace spoken word numbers
  Object.keys(numberMap).forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, "g");
    normalized = normalized.replace(reg, numberMap[word]);
  });

  // If result consists of digits, plus, or spaces, remove internal spaces for phone numbers
  const cleanedDigits = normalized.replace(/\s+/g, "");
  if (/^[\d+\-]+$/.test(cleanedDigits)) {
    return cleanedDigits;
  }

  return normalized;
}

// Field Validation Helper
function validateFieldInput(step: number, val: string): { isValid: boolean; hint?: string } {
  const cleanVal = val.trim();
  if (!cleanVal) return { isValid: false, hint: "Please provide an answer to continue." };

  if (step === 1) {
    if (cleanVal.length < 2) return { isValid: false, hint: "Full name must be at least 2 characters." };
    return { isValid: true };
  }

  if (step === 2) {
    const isEmailValid = /\S+@\S+\.\S+/.test(cleanVal);
    if (!isEmailValid) return { isValid: false, hint: "Please enter a valid email format (e.g. name@domain.com)." };
    return { isValid: true };
  }

  if (step === 3) {
    const digitsOnly = cleanVal.replace(/[^\d+]/g, "");
    if (digitsOnly.length < 7) return { isValid: false, hint: "Phone number should contain at least 7 digits." };
    return { isValid: true };
  }

  return { isValid: cleanVal.length > 0 };
}

// Helper: Convert spoken email terms ("moti at gmail dot com" / "moti שטרודל ג'ימייל נקודה קום") to "moti@gmail.com"
function convertSpokenEmail(text: string): string {
  let normalized = text.toLowerCase().trim();

  // Convert spoken terms for @
  normalized = normalized.replace(/\b(at|shtrudel|שטרודל|שטורדל)\b/gi, "@");

  // Convert spoken terms for .
  normalized = normalized.replace(/\b(dot|נקודה)\b/gi, ".");

  // Remove spaces around @ and .
  normalized = normalized.replace(/\s*@\s*/g, "@");
  normalized = normalized.replace(/\s*\.\s*/g, ".");

  return normalized;
}

// Conversational Form Canvas Component (Pixel-Perfect Match to User's Circular Ornate Design)
function ConversationalFormCard({
  step,
  totalSteps = 5,
  fieldLabel,
  title,
  question,
  options,
  currentValue,
  onChangeValue,
  onNextStep,
  onPrevStep,
  onInfoClick,
  onSaveAndFinish
}: {
  step: number;
  totalSteps?: number;
  fieldLabel: string;
  title: string;
  question: string;
  options?: Array<{ label: string; value: string }>;
  currentValue: string;
  onChangeValue: (val: string) => void;
  onNextStep: (val?: string) => void;
  onPrevStep?: () => void;
  onInfoClick?: (step: number) => void;
  onSaveAndFinish: () => void;
}) {
  const [isFormMicRecording, setIsFormMicRecording] = useState(false);
  const validation = validateFieldInput(step, currentValue);

  const toggleMic = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    if (isFormMicRecording) {
      setIsFormMicRecording(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true; // Continuous listening for extended time!
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          let processed = transcript.trim();
          if (step === 2) processed = convertSpokenEmail(processed);
          if (step === 3) processed = convertSpokenWordsToDigits(processed);
          onChangeValue(processed);
        }
      };

      rec.onend = () => {
        setIsFormMicRecording(false);
      };

      rec.onerror = () => {
        setIsFormMicRecording(false);
      };

      rec.start();
      setIsFormMicRecording(true);
    } catch (e) {
      console.warn("Card Mic error:", e);
      setIsFormMicRecording(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-3 relative animate-fadeIn">
      {/* ------------------------------------------------------------- */}
      {/* PERFECT CIRCULAR FORM CANVAS (Exact match to screenshot design) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-[310px] sm:w-[350px] h-[310px] sm:h-[350px] rounded-full bg-[#14120C] border-4 border-[#D4AF37]/80 shadow-[0_0_60px_rgba(212,175,55,0.35)] flex flex-col items-center justify-between p-5 relative mx-auto overflow-hidden backdrop-blur-2xl transition-all duration-300">
        
        {/* TOP BAR: Info (i) Button [Left], 3D Metallic Step Number [Center], Door with Save Icon [Right] */}
        <div className="w-[76%] sm:w-[78%] flex items-center justify-between pt-3 sm:pt-4 z-10">
          {/* Top Left: Information (i) Icon */}
          <button
            type="button"
            onClick={() => onInfoClick?.(step)}
            className="text-[#FFC800] hover:text-amber-300 transition-all cursor-pointer hover:scale-115 active:scale-95"
            title="David Explains How to Fill Field"
          >
            <div className="w-7 h-7 rounded-full border-2 border-[#FFC800] bg-[#14120C] flex items-center justify-center font-serif text-sm font-black text-[#FFC800] italic shadow-[0_0_10px_rgba(255,200,0,0.3)]">
              i
            </div>
          </button>

          {/* Top Center: Metallic Golden 3D Step Number */}
          <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-b from-[#FFF7D6] via-[#FFC800] to-[#997300] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tighter">
            {step}
          </span>

          {/* Top Right: Door with Save Package Icon */}
          <button
            type="button"
            onClick={onSaveAndFinish}
            className="text-[#FFC800] hover:text-amber-300 transition-all cursor-pointer hover:scale-115 active:scale-95"
            title="Save & Exit Form"
          >
            <svg className="w-7 h-7 text-[#FFC800] filter drop-shadow-[0_0_10px_rgba(255,200,0,0.3)]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="12" y="4" width="16" height="24" rx="1.5" stroke="#FFC800" fill="#14120C" />
              <circle cx="24" cy="16" r="1" fill="#FFC800" />
              <rect x="4" y="9" width="11" height="9" rx="1" fill="#FFC800" stroke="#B37B00" strokeWidth="1.2" />
              <path d="M4 12h11" stroke="#B37B00" strokeWidth="1" />
              <path d="M9.5 9v3" stroke="#B37B00" strokeWidth="1" />
            </svg>
          </button>
        </div>

        {/* MIDDLE TOP: Field Name Header */}
        <div className="w-full flex items-center justify-center relative px-4 -mt-1">
          <span className="text-[#FFC800] font-black text-xl sm:text-2xl tracking-wide lowercase drop-shadow-md">
            {fieldLabel}
          </span>
        </div>

        {/* CENTER: Choice Cards Grid (if options present) + Ornate Golden Bracketed Input Frame */}
        <div className="w-full flex flex-col items-center justify-center relative my-auto space-y-1.5 z-10 px-3">
          {/* Quick Select Choice Cards INSIDE CIRCLE (Exact match to user screenshot) */}
          {options && options.length > 0 && (
            <div className="w-[94%] grid grid-cols-2 gap-1.5 mb-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChangeValue(opt.value);
                    onNextStep(opt.value);
                  }}
                  className={`py-1.5 px-2 rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md ${
                    currentValue === opt.value
                      ? "bg-[#FFC800] text-slate-950 border-[#FFC800] font-black scale-105 shadow-[0_0_12px_rgba(255,200,0,0.5)]"
                      : "bg-[#1A160F] border-[#D4AF37]/50 text-slate-100 hover:border-[#FFC800] hover:bg-amber-500/20"
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-tight line-clamp-1">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Ornate Gold Border SVG Frame Input Box */}
          <div className="relative w-[92%] h-11 sm:h-12 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full text-[#D4AF37]"
              viewBox="0 0 300 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M14 2 L286 2 C294 2 298 12 298 24 C298 36 294 46 286 46 L14 46 C6 46 2 36 2 24 C2 12 6 2 14 2 Z"
                fill="#EAE5E1"
                stroke="#D4AF37"
                strokeWidth="3.5"
              />
              <path
                d="M18 6 L282 6 C288 6 293 14 293 24 C293 34 288 42 282 42 L18 42 C12 42 7 34 7 24 C7 14 12 6 18 6 Z"
                stroke="#A37B00"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>

            {/* Editable Gold Text Input */}
            <input
              type="text"
              value={currentValue}
              onChange={(e) => {
                const val = e.target.value;
                const processed = step === 3 ? convertSpokenWordsToDigits(val) : val;
                onChangeValue(processed);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && validation.isValid) {
                  e.preventDefault();
                  onNextStep(currentValue);
                }
              }}
              placeholder={
                isFormMicRecording
                  ? "listening..."
                  : options && options.length > 0
                  ? "Something else..."
                  : ""
              }
              className="relative z-10 w-full px-4 text-center bg-transparent text-[#B37B00] font-black text-sm sm:text-base focus:outline-none placeholder:text-slate-500 tracking-wide"
            />
          </div>

          {/* Real-time Field Hint */}
          {!validation.isValid && currentValue.trim().length > 0 && (
            <span className="text-[10px] text-amber-400/90 font-bold block mt-0.5">
              ⚠️ {validation.hint}
            </span>
          )}
        </div>

        {/* BOTTOM: Left Arrow <<< [Left], Mic/Bookmark [Center], Right Arrow >>> [Right] */}
        <div className="w-[82%] sm:w-[84%] flex items-center justify-between pb-3 z-10">
          {/* Bottom Left: <<< Back Arrow */}
          {step > 1 && onPrevStep ? (
            <button
              type="button"
              onClick={onPrevStep}
              className="text-[#FFC800] hover:text-white font-extrabold text-xl sm:text-2xl tracking-tighter transition-all cursor-pointer hover:scale-110 active:scale-95 px-2"
              title="Previous Step (Back)"
            >
              &lt;&lt;&lt;
            </button>
          ) : (
            <div className="w-10" />
          )}

          {/* Bottom Center: Action Button (Golden Retro Mic with Soundwaves OR Golden Circle Bookmark) */}
          {currentValue.trim().length > 0 && validation.isValid ? (
            /* FILLED STATE: Golden Circle Bookmark / Folder Save Button */
            <button
              type="button"
              onClick={() => onNextStep(currentValue)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] bg-slate-950/90 flex items-center justify-center text-[#FFC800] hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer group"
              title="Save Field / Next Step"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#D4AF37]/60 flex items-center justify-center">
                <Bookmark className="w-5 h-5 fill-[#FFC800] text-[#FFC800] group-hover:scale-110 transition-transform" />
              </div>
            </button>
          ) : (
            /* EMPTY / RECORDING STATE: Golden Retro Mic with Soundwaves */
            <button
              type="button"
              onClick={toggleMic}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] bg-slate-950/90 flex items-center justify-center text-[#FFC800] hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer ${
                isFormMicRecording ? "ring-4 ring-red-500 animate-pulse border-red-500 text-red-500" : ""
              }`}
              title={isFormMicRecording ? "Stop Recording" : "Click Mic to Speak"}
            >
              {isFormMicRecording ? (
                <MicOff className="w-6 h-6 text-red-500 animate-pulse" />
              ) : (
                <Mic className="w-6 h-6 text-[#FFC800]" />
              )}
            </button>
          )}

          {/* Bottom Right: >>> Forward/Next Arrow */}
          <button
            type="button"
            onClick={() => onNextStep(currentValue)}
            className="text-[#FFC800] hover:text-white font-extrabold text-xl sm:text-2xl tracking-tighter transition-all cursor-pointer hover:scale-110 active:scale-95 px-2"
            title="Next Step (Forward)"
          >
            &gt;&gt;&gt;
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerativeRenderer({ ui, onAction }: { ui: any; onAction: (text: string) => void }) {
  if (!ui) return null;
  
  // Render server template library types
  if (ui.type === "text_image_page_vector" || ui.templateId === "tpl_1_text_image_page_vector") {
    return <TemplateTextImagePageVector data={ui.data} />;
  }
  if (ui.type === "text_vector_shape" || ui.templateId === "tpl_2_text_vector_shape") {
    return <TemplateTextVectorShape data={ui.data} />;
  }
  if (ui.type === "text_image_page_vector_alt" || ui.templateId === "tpl_3_text_image_page_vector_alt") {
    return <TemplateTextImagePageVectorAlt data={ui.data} />;
  }
  if (ui.type === "page_link_card" || ui.templateId === "tpl_4_page_link_card") {
    return <TemplatePageLinkCard data={ui.data} />;
  }
  if (ui.type === "text_video_page_vector" || ui.templateId === "tpl_5_text_video_page_vector") {
    return <TemplateTextVideoPageVector data={ui.data} />;
  }
  if (ui.type === "text_video_link" || ui.templateId === "tpl_6_text_video_link") {
    return <TemplateTextVideoLink data={ui.data} />;
  }
  if (ui.type === "chart_graph_card" || ui.templateId === "tpl_7_chart_graph_card") {
    return <TemplateChartGraphCard data={ui.data} />;
  }
  if (ui.type === "excel_table_card" || ui.templateId === "tpl_8_excel_table_card") {
    return <TemplateExcelTableCard data={ui.data} />;
  }
  if (ui.type === "iframe_view_card" || ui.templateId === "tpl_9_iframe_view_card") {
    return <TemplateIframeViewCard data={ui.data} />;
  }

  // Fallback rendering
  if (ui.type === "InsightCard") return <TemplateTextVectorShape data={{ text: ui.data.text, vectorShape: { type: 'shield', label: ui.data.title } }} />;
  if (ui.type === "PageAuditGrid") return <TemplateExcelTableCard data={{ text: ui.data.title, tableData: { title: ui.data.title, headers: ['Page Title', 'Visits', 'Leads', 'Status'], rows: ui.data.pages || [] } }} />;
  if (ui.type === "UserMatrixCard") return <TemplateTextVectorShape data={{ text: ui.data.title, vectorShape: { type: 'rhombus', label: 'Users' } }} />;
  if (ui.type === "LinkCard") return <TemplatePageLinkCard data={{ text: ui.data.title, pageUrl: ui.data.url, pageTitle: ui.data.buttonText }} />;

  return null;
}

// ---------------------------------------------------------------------------
// MAIN SMART OFFICE CLIENT
// ---------------------------------------------------------------------------

function PromptIcon({ iconName, className = "w-3.5 h-3.5" }: { iconName: string; className?: string }) {
  if (iconName === "Users" || iconName === "users") return <Users className={className} />;
  if (iconName === "Table" || iconName === "table") return <Table className={className} />;
  if (iconName === "BarChart3" || iconName === "chart") return <BarChart3 className={className} />;
  if (iconName === "Sparkles" || iconName === "sparkles") return <Sparkles className={className} />;
  if (iconName === "FileText" || iconName === "text") return <FileText className={className} />;
  return <Bookmark className={className} />;
}

interface SmartOfficeClientProps {
  initialOffice: SmartOfficeDocument;
  userRole?: string;
  userId?: string | null;
}

export function SmartOfficeClient({
  initialOffice,
  userId = null,
}: SmartOfficeClientProps) {
  const [office, setOffice] = useState<SmartOfficeDocument>(initialOffice);
  const [currentTabIdx, setCurrentTabIdx] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Voice & Subtitle Input States
  const [userQueryInput, setUserQueryInput] = useState("");
  const [isEditingTopText, setIsEditingTopText] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Active Agent Response Subtitle
  const [currentAgentSubtitle, setCurrentAgentSubtitle] = useState<{
    text: string;
    uiCards?: any[];
  } | null>(null);

  // Conversation History List for Left Sidebar (HIDDEN BY DEFAULT per user requested comment)
  const [historyMessages, setHistoryMessages] = useState<Array<{
    id: string;
    sender: "user" | "agent";
    text: string;
    timestamp: string;
    uiCards?: any[];
  }>>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Hidden by default!
  const [leftWindowMode, setLeftWindowMode] = useState<"chat" | "transcript">("chat"); // Mode toggle: Chat vs Transcript

  const [speechSupported, setSpeechSupported] = useState(true);

  // Saved Prompts State
  const [savedPromptsList, setSavedPromptsList] = useState<any[]>(
    office.savedPrompts || office.smartWorkerConfig?.savedPrompts || [
      { id: "p_1", title: "User Table (Full Name, ID, Phone)", icon: "Users", promptText: "Table with 3 columns with user data Full name - ID - Phone" },
      { id: "p_2", title: "Subscriptions Ledger (Oldest -> Newest)", icon: "Table", promptText: "List of all subscriptions from oldest to newest" },
      { id: "p_3", title: "System Traffic & Lead Growth Chart", icon: "BarChart3", promptText: "Show database traffic and conversion growth chart" },
      { id: "p_4", title: "Financial Revenue & CRM Report", icon: "Sparkles", promptText: "Show total revenue and CRM lead transactions breakdown" }
    ]
  );
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [showSavedPromptsCanvasGrid, setShowSavedPromptsCanvasGrid] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptIcon, setNewPromptIcon] = useState("Users");

  // Step-by-Step Conversational Contact Creation Form State (1 question per step with choice cards)
  const [contactStep, setContactStep] = useState<number>(0);
  const [contactDraft, setContactDraft] = useState<{ name: string; email: string; phone: string; role: string; gender: string }>({
    name: "",
    email: "",
    phone: "",
    role: "",
    gender: ""
  });

  // Early Save & Finish Handler for Form (Rule 3)
  const handleSaveAndFinishForm = async () => {
    if (!contactDraft.name && !userQueryInput) {
      setContactStep(0);
      return;
    }

    const finalContact = {
      id: `cnt_${Date.now()}`,
      name: contactDraft.name || userQueryInput || "New Contact",
      email: contactDraft.email || "contact@partner.com",
      phone: contactDraft.phone || "+972-50-0000000",
      role: contactDraft.role || "Active Lead",
      gender: contactDraft.gender || "General",
      status: "Active Lead"
    };

    setContactStep(0);

    try {
      await fetch(`/api/office/${office.slug}/update-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          collectionName: "contacts",
          recordId: finalContact.id,
          recordData: {
            "Full Name": finalContact.name,
            "Email": finalContact.email,
            "Phone": finalContact.phone,
            "Role": finalContact.role,
            "Gender": finalContact.gender,
            "Status": finalContact.status,
            "id": finalContact.id
          }
        })
      });
    } catch (e) {
      console.warn("Save & Finish DB warning:", e);
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const completionText = `Contact ${finalContact.name} was successfully saved to Firestore Database (Save & Finish)!`;
    const uiCards = [
      {
        type: "excel_table_card",
        templateId: "tpl_8_excel_table_card",
        data: {
          text: `Contact Card saved to Firestore Database (Folder Saved)`,
          tableData: {
            title: `Contact Card - ${finalContact.name}`,
            headers: ["Full Name", "ID", "Phone", "Email", "Role", "Gender", "Status"],
            rows: [
              {
                "Full Name": finalContact.name,
                "ID": finalContact.id,
                "Phone": finalContact.phone,
                "Email": finalContact.email,
                "Role": finalContact.role,
                "Gender": finalContact.gender,
                "Status": finalContact.status
              }
            ]
          },
          vectorShape: { type: "table", color: "#FFC800", label: "Folder Saved" },
          badge: "Saved to Database ✓"
        }
      }
    ];

    setCurrentAgentSubtitle({ text: completionText, uiCards });
    setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: completionText, timestamp: timeStr, uiCards }]);
    speakText(completionText);
  };

  // Load saved prompts from Firestore DB on mount
  useEffect(() => {
    async function loadSavedPromptsFromDb() {
      try {
        const res = await fetch(`/api/office/${office.slug}/saved-prompts`);
        if (res.ok) {
          const data = await res.json();
          if (data.prompts && data.prompts.length > 0) {
            setSavedPromptsList(data.prompts);
          }
        }
      } catch (e) {
        console.warn("Error loading saved prompts from DB:", e);
      }
    }
    loadSavedPromptsFromDb();
  }, [office.slug]);

  const [saveToastMessage, setSaveToastMessage] = useState("");

  const handleSaveCustomPrompt = async () => {
    if (!userQueryInput.trim()) {
      alert("אנא הקלד או הקלט פרומפט לפני השמירה");
      return;
    }

    const generatedTitle =
      newPromptTitle.trim() ||
      (userQueryInput.trim().length > 25
        ? userQueryInput.trim().slice(0, 25) + "..."
        : userQueryInput.trim());

    const newPreset = {
      id: `p_${Date.now()}`,
      title: generatedTitle,
      icon: newPromptIcon || "Table",
      promptText: userQueryInput.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Optimistic UI update
    setSavedPromptsList((prev) => [newPreset, ...prev]);
    setNewPromptTitle("");
    setIsSavePromptModalOpen(false);

    // Instant Visual Feedback Toast
    setSaveToastMessage("✓ הפרומפט נשמר בהצלחה לספרייה!");
    setTimeout(() => setSaveToastMessage(""), 3500);

    // Save to Firestore DB!
    try {
      await fetch(`/api/office/${office.slug}/saved-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", prompt: newPreset })
      });
    } catch (e) {
      console.warn("Failed to persist saved prompt to Firestore:", e);
    }
  };

  const handleDeleteSavedPrompt = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI delete
    setSavedPromptsList((prev) => prev.filter((p) => p.id !== promptId));

    // Delete from Firestore DB!
    try {
      await fetch(`/api/office/${office.slug}/saved-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: promptId })
      });
    } catch (e) {
      console.warn("Failed to delete saved prompt from Firestore:", e);
    }
  };

  // Gemini State Management
  const [sessionId, setSessionId] = useState("");
  const [interactionId, setInteractionId] = useState("");

  const recognitionRef = useRef<any>(null);
  const topTextareaRef = useRef<HTMLTextAreaElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const isManagerOrAdmin = true;

  const tabs = office.tabs && office.tabs.length > 0 ? office.tabs : initialOffice.tabs;
  const currentTab: SmartOfficeTab = tabs[currentTabIdx % tabs.length];

  // Speech Recognition & Session Initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storagePrefix = `office_sess_${office.slug}`;
      let savedSession = localStorage.getItem(`${storagePrefix}_id`);
      if (!savedSession) {
        savedSession = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem(`${storagePrefix}_id`, savedSession);
      }
      setSessionId(savedSession);

      let savedInteraction = localStorage.getItem(`${storagePrefix}_interaction_id`);
      if (savedInteraction) {
        setInteractionId(savedInteraction);
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setUserQueryInput(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          const err = event?.error;
          if (err === "no-speech" || err === "aborted") {
            // Harmless browser events when silent or stopped - handle gracefully without console.error
            setIsRecording(false);
            return;
          }
          if (err === "not-allowed") {
            console.warn("Microphone access denied by user.");
          } else {
            console.warn("Speech recognition notice:", err);
          }
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [office.slug]);

  // Focus textarea when editing
  useEffect(() => {
    if (isEditingTopText && topTextareaRef.current) {
      topTextareaRef.current.focus();
      const len = topTextareaRef.current.value.length;
      topTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditingTopText]);

  // Auto-scroll history panel to bottom
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [historyMessages]);

  // Infinite Carousel Navigation
  const handlePrevTab = () => {
    setCurrentTabIdx((prev) => (prev - 1 + tabs.length) % tabs.length);
  };

  const handleNextTab = () => {
    setCurrentTabIdx((prev) => (prev + 1) % tabs.length);
  };

  // TTS Speech Synthesis with Agent Name Prefix & Constant High Quality Male Voice
  const speakText = (text: string, audioBase64?: string | null) => {
    const fullSpokenText = text.toLowerCase().startsWith("david")
      ? text
      : `${office.agentName || "David"}: ${text}`;

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        audio.play().catch(console.error);
        return;
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fullSpokenText);
      utterance.lang = "en-US";
      utterance.rate = 0.98;
      utterance.pitch = 1.0;

      // Select constant male English voice (e.g. Google US English / Microsoft David)
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("David") || v.name.includes("Google US English") || v.name.includes("Male") || v.name.includes("Alex"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (maleVoice) {
        utterance.voice = maleVoice;
      }

      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setUserQueryInput("");
      setIsEditingTopText(true);
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.warn("Speech recognition restart warning:", e);
      }
    }
  };

  const handleSendChat = async (overrideQuery?: string) => {
    const inputQuery = (overrideQuery || userQueryInput).trim();
    if (!inputQuery) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append User Request to History Sidebar
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user" as const,
      text: inputQuery,
      timestamp: timeStr,
    };
    setHistoryMessages((prev) => [...prev, userMsg]);

    setUserQueryInput("");
    setIsEditingTopText(false);
    setIsThinking(true);

    // -----------------------------------------------------------------------
    // CONVERSATIONAL STEP-BY-STEP CONTACT CREATION FORM (1 question per step)
    // -----------------------------------------------------------------------
    const lowerQuery = inputQuery.toLowerCase();
    const isFormTrigger =
      lowerQuery.includes("add contact") ||
      lowerQuery.includes("create contact") ||
      lowerQuery.includes("new contact") ||
      lowerQuery.includes("הוסף איש קשר") ||
      lowerQuery.includes("איש קשר חדש") ||
      lowerQuery.includes("צור איש קשר") ||
      lowerQuery.includes("הוספת איש קשר");

    if (contactStep === 0 && isFormTrigger) {
      setContactStep(1);
      setContactDraft({ name: "", email: "", phone: "", role: "", gender: "" });
      const step1Text = "Hello! I would love to help you add a new contact to our database. Could you please share their full name?";
      setCurrentAgentSubtitle({ text: step1Text, uiCards: [] });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: step1Text, timestamp: timeStr }]);
      speakText(step1Text);
      setIsThinking(false);
      return;
    }

    if (contactStep === 1) {
      const newName = inputQuery;
      setContactDraft((prev) => ({ ...prev, name: newName }));
      setContactStep(2);
      const step2Text = `Wonderful! What is the best email address for ${newName}?`;
      setCurrentAgentSubtitle({ text: step2Text, uiCards: [] });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: step2Text, timestamp: timeStr }]);
      speakText(step2Text);
      setIsThinking(false);
      return;
    }

    if (contactStep === 2) {
      const newEmail = inputQuery;
      setContactDraft((prev) => ({ ...prev, email: newEmail }));
      setContactStep(3);
      const step3Text = `Great! Please enter or speak ${contactDraft.name || "the contact"}'s phone number.`;
      setCurrentAgentSubtitle({ text: step3Text, uiCards: [] });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: step3Text, timestamp: timeStr }]);
      speakText(step3Text);
      setIsThinking(false);
      return;
    }

    if (contactStep === 3) {
      const newPhone = convertSpokenWordsToDigits(inputQuery);
      setContactDraft((prev) => ({ ...prev, phone: newPhone }));
      setContactStep(4);
      const step4Text = `Awesome! What role or position does ${contactDraft.name || "the contact"} hold?`;
      setCurrentAgentSubtitle({ text: step4Text, uiCards: [] });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: step4Text, timestamp: timeStr }]);
      speakText(step4Text);
      setIsThinking(false);
      return;
    }

    if (contactStep === 4) {
      const newRole = inputQuery;
      setContactDraft((prev) => ({ ...prev, role: newRole }));
      setContactStep(5);
      const step5Text = `Almost finished! What gender or entity category best describes ${contactDraft.name || "the contact"}?`;
      setCurrentAgentSubtitle({ text: step5Text, uiCards: [] });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: step5Text, timestamp: timeStr }]);
      speakText(step5Text);
      setIsThinking(false);
      return;
    }

    if (contactStep === 5) {
      const newGender = inputQuery;
      const finalContact = {
        id: `cnt_${Date.now()}`,
        name: contactDraft.name,
        email: contactDraft.email,
        phone: contactDraft.phone,
        role: contactDraft.role,
        gender: newGender,
        status: "Active Lead"
      };

      setContactStep(0);

      // Persist to Firestore DB!
      try {
        await fetch(`/api/office/${office.slug}/update-record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            collectionName: "contacts",
            recordId: finalContact.id,
            recordData: {
              "Full Name": finalContact.name,
              "Email": finalContact.email,
              "Phone": finalContact.phone,
              "Role": finalContact.role,
              "Gender": finalContact.gender,
              "Status": finalContact.status,
              "id": finalContact.id
            }
          })
        });
      } catch (e) {
        console.warn("Contact DB persistence warning:", e);
      }

      const completionText = `איש הקשר ${finalContact.name} נשמר בהצלחה במסד הנתונים Firestore!`;
      const uiCards = [
        {
          type: "excel_table_card",
          templateId: "tpl_8_excel_table_card",
          data: {
            text: `איש קשר חדש נשמר במסד הנתונים Firestore (Folder Saved)`,
            tableData: {
              title: `כרטיס איש קשר חדש - ${finalContact.name}`,
              headers: ["Full Name", "ID", "Phone", "Email", "Role", "Gender", "Status"],
              rows: [
                {
                  "Full Name": finalContact.name,
                  "ID": finalContact.id,
                  "Phone": finalContact.phone,
                  "Email": finalContact.email,
                  "Role": finalContact.role,
                  "Gender": finalContact.gender,
                  "Status": finalContact.status
                }
              ]
            },
            vectorShape: { type: "table", color: "#FFC800", label: "Folder Saved" },
            badge: "Saved to Database ✓"
          }
        }
      ];

      setCurrentAgentSubtitle({ text: completionText, uiCards });
      setHistoryMessages((prev) => [...prev, { id: `a_${Date.now()}`, sender: "agent", text: completionText, timestamp: timeStr, uiCards }]);
      speakText(completionText);
      setIsThinking(false);
      return;
    }

    try {
      const res = await fetch(`/api/office/${office.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: inputQuery,
          currentTab,
          agentName: office.agentName,
          sessionId,
          previous_interaction_id: interactionId,
          userId: userId || (typeof window !== "undefined" ? localStorage.getItem("david_user_id") || "david_user_001" : "david_user_001"),
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const data = await res.json();
      const replyMessage = data.reply || "Analytics processed successfully.";

      if (data.sessionId) setSessionId(data.sessionId);
      if (data.interactionId) {
        setInteractionId(data.interactionId);
        if (typeof window !== "undefined") {
          localStorage.setItem(`office_sess_${office.slug}_interaction_id`, data.interactionId);
        }
      }

      // Update active agent response (renders visual cards on central canvas)
      setCurrentAgentSubtitle({
        text: replyMessage,
        uiCards: data.uiComponents || [],
      });

      // Append Agent Reply to History Sidebar
      const agentMsg = {
        id: `a_${Date.now()}`,
        sender: "agent" as const,
        text: replyMessage,
        timestamp: timeStr,
        uiCards: data.uiComponents || [],
      };
      setHistoryMessages((prev) => [...prev, agentMsg]);

      speakText(replyMessage, data.audioBase64);
    } catch (err: any) {
      console.error(err);
      const errMsg = "Connection issue. Please try again.";
      setCurrentAgentSubtitle({
        text: errMsg,
      });
      setHistoryMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, sender: "agent", text: errMsg, timestamp: timeStr },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const isUserSpeakingOrTyping = isRecording || isEditingTopText || userQueryInput.trim().length > 0;

  return (
    <div
      className="h-screen w-full bg-black text-white flex flex-col justify-between items-center select-none font-sans relative overflow-hidden"
      dir="ltr"
      lang="en"
    >
      {/* ------------------------------------------------------------- */}
      {/* GOLD TOP HEADER (FIXED STICKY TOP)                            */}
      {/* ------------------------------------------------------------- */}
      <header className="shrink-0 sticky top-0 z-30 w-full bg-[#FFC800] pt-4 pb-5 px-4 flex flex-col items-center justify-center relative shadow-lg">
        {/* Toggle Left Conversation History Panel Button */}
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="absolute left-4 top-4 bg-slate-950 hover:bg-black text-[#FFC800] border border-amber-400/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          title={isHistoryOpen ? "Hide Left Window" : "Show Left Window / Chat Mode"}
        >
          {isHistoryOpen ? <PanelLeftClose className="w-4 h-4 text-[#FFC800]" /> : <PanelLeftOpen className="w-4 h-4 text-[#FFC800]" />}
          <span className="hidden sm:inline">{leftWindowMode === "chat" ? "Chat Mode" : "Text & Audio Window"}</span>
          {historyMessages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
              {historyMessages.length}
            </span>
          )}
        </button>

        {/* Centered Diamond Rhombus Logo Badge */}
        <div className="relative">
          <div className="w-56 sm:w-64 h-16 bg-black border-2 border-amber-400 rounded-2xl flex flex-col items-center justify-center shadow-2xl px-4 py-1">
            <span className="text-[#FFC800] font-black text-xl sm:text-2xl tracking-widest leading-none">
              {office.headerBrand || "M.A.M"}
            </span>
            <span className="text-white text-xs sm:text-sm font-semibold tracking-tight mt-0.5 opacity-90">
              {office.headerSubtitle || "Smart digital offices"}
            </span>
          </div>
        </div>

        {/* Gemini Connection Status Light Indicator */}
        <div className="absolute right-36 top-4 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-950/90 border border-amber-400/40 rounded-full text-xs font-bold shadow-md dir-ltr">
          <span className={`w-2.5 h-2.5 rounded-full ${isPlayingAudio || !isThinking ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
          <span className={isPlayingAudio || !isThinking ? 'text-emerald-400 font-mono text-[10px]' : 'text-red-400 font-mono text-[10px]'}>
            {isPlayingAudio || !isThinking ? 'Gemini Connected' : 'Gemini Offline'}
          </span>
        </div>

        {/* Manager / Admin Toggle Button */}
        {isManagerOrAdmin && (
          <button
            onClick={() => setIsEditorOpen(true)}
            className="absolute right-4 top-4 bg-slate-900/90 hover:bg-slate-800 text-[#FFC800] border border-amber-400/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Edit Office Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-[#FFC800]" />
            <span>Edit Office</span>
          </button>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDEBAR: HIDDEN BY DEFAULT WITH CHAT MODE TOGGLE          */}
      {/* ------------------------------------------------------------- */}
      {isHistoryOpen && (
        <aside className="fixed left-3 top-24 bottom-24 z-40 w-72 sm:w-80 bg-slate-950/95 border-2 border-amber-400/50 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn">
          {/* Sidebar Mode Header Switcher */}
          <div className="p-3 border-b border-amber-400/30 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setLeftWindowMode("chat")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  leftWindowMode === "chat" ? "bg-amber-400 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Chat Mode
              </button>
              <button
                onClick={() => setLeftWindowMode("transcript")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  leftWindowMode === "transcript" ? "bg-amber-400 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Transcript
              </button>
            </div>
            <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white p-1">
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Active Spoken Audio & Text Box */}
          {currentAgentSubtitle && (
            <div className="p-3 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-b border-amber-400/30 space-y-2 text-left shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>{office.agentName} (Spoken Audio)</span>
                </div>

                <button
                  onClick={() => speakText(currentAgentSubtitle.text)}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isPlayingAudio ? <VolumeX className="w-3 h-3 animate-pulse text-slate-950" /> : <Volume2 className="w-3 h-3 text-slate-950" />}
                  <span>{isPlayingAudio ? "Playing" : "Replay Audio"}</span>
                </button>
              </div>

              <div className="p-2.5 bg-black/60 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-medium">
                "<TypewriterText text={currentAgentSubtitle.text} />"
              </div>
            </div>
          )}

          {/* Sidebar Messages Timeline */}
          <div ref={historyScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {historyMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-amber-400/40" />
                <p className="text-xs font-medium">No conversation history yet.</p>
                <p className="text-[10px] text-slate-400">Audio playback & transcript text will appear here.</p>
              </div>
            ) : (
              historyMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    if (msg.sender === "agent") {
                      setCurrentAgentSubtitle({ text: msg.text, uiCards: msg.uiCards });
                    }
                  }}
                  className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                    msg.sender === "user"
                      ? "bg-slate-900/90 border-amber-400/40 text-amber-300 ml-4 hover:border-amber-400"
                      : "bg-slate-900/90 border-slate-800 text-slate-100 mr-2 hover:border-amber-400/50 shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {msg.sender === "user" ? (
                        <>
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400">User Request</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-white">{office.agentName} Answer</span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">{msg.timestamp}</span>
                  </div>

                  <p className="text-xs font-medium leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Chat Mode Input Bar inside Left Sidebar */}
          {leftWindowMode === "chat" && (
            <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 relative">
              {/* Saved Prompts Dropdown Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPromptsDropdownOpen(!isPromptsDropdownOpen)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Saved Prompts Library / פרומפטים שמורים"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Floating Prompts Menu */}
                {isPromptsDropdownOpen && (
                  <div className="absolute bottom-11 right-0 w-64 bg-slate-950/95 border-2 border-amber-400/80 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-md space-y-1.5">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-amber-400/30">
                      <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        <span>פרומפטים שמורים (Saved Prompts)</span>
                      </span>
                      <button
                        onClick={() => {
                          setIsPromptsDropdownOpen(false);
                          setIsSavePromptModalOpen(true);
                        }}
                        className="text-[10px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>שמור חדש</span>
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {savedPromptsList.map((preset) => (
                        <div
                          key={preset.id}
                          className="w-full text-right p-2 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-400/50 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div 
                            className="flex items-center gap-2 overflow-hidden flex-1"
                            onClick={() => {
                              setUserQueryInput(preset.promptText);
                              handleSendChat(preset.promptText);
                              setIsPromptsDropdownOpen(false);
                            }}
                          >
                            <span className="p-1.5 rounded-lg bg-slate-800 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0">
                              <PromptIcon iconName={preset.icon} className="w-3.5 h-3.5" />
                            </span>
                            <div className="truncate text-right">
                              <span className="text-[11px] font-bold text-slate-200 group-hover:text-amber-400 block truncate">
                                {preset.title}
                              </span>
                              <span className="text-[9px] text-slate-400 block truncate dir-ltr">
                                {preset.promptText}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedPrompt(preset.id, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer shrink-0 ml-1"
                            title="Delete Saved Prompt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={userQueryInput}
                onChange={(e) => setUserQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendChat();
                }}
                placeholder="Chat with agent..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleSendChat()}
                className="p-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold transition-all cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Save Prompt Modal */}
      {isSavePromptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border-2 border-amber-400 rounded-3xl p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>שמירת פרומפט חדש לספרייה</span>
              </h3>
              <button onClick={() => setIsSavePromptModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">כותרת הפרומפט (Title)</label>
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder='לדוגמה: "טבלת מנויים ממוינת"'
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">איקון מייצג (Icon)</label>
                <div className="grid grid-cols-5 gap-2">
                  {["Users", "Table", "BarChart3", "Sparkles", "FileText"].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewPromptIcon(icon)}
                      className={`p-2 rounded-xl flex items-center justify-center border transition-all ${
                        newPromptIcon === icon ? "bg-amber-400 text-slate-950 border-amber-400 font-bold" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400"
                      }`}
                    >
                      <PromptIcon iconName={icon} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">טקסט הפרומפט (Prompt Text)</label>
                <textarea
                  value={userQueryInput}
                  onChange={(e) => setUserQueryInput(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSavePromptModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveCustomPrompt}
                className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Folder className="w-4 h-4 fill-slate-950" />
                <span>שמור לספרייה</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BODY - GENERATIVE JSON CANVAS AREA                            */}
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* BODY - GENERATIVE JSON CANVAS AREA (SCROLLABLE CANVAS)        */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-2xl px-4 pt-3 pb-6 flex flex-col justify-between items-center relative z-10 overflow-y-auto custom-scrollbar">
        {/* ----------------------------------------------------------- */}
        {/* TOP DYNAMIC GENERATIVE VISUAL CANVAS ZONE                   */}
        {/* ----------------------------------------------------------- */}
        <div className="w-full text-center space-y-3 min-h-[140px] pt-2">
          {/* DESIGNED CARDS GRID FOR SAVED PROMPTS ON CANVAS */}
          {showSavedPromptsCanvasGrid && (
            <div className="w-full p-4 bg-slate-950/95 border-2 border-amber-400/80 rounded-3xl shadow-2xl backdrop-blur-md text-right space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-400/30 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4.5 h-4.5 text-amber-400 fill-amber-400/30 animate-pulse" />
                  <h4 className="text-sm font-black text-amber-400 tracking-wide">ספריית פרומפטים שמורים (Saved Prompts Cards Grid)</h4>
                </div>
                <button
                  onClick={() => setShowSavedPromptsCanvasGrid(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedPromptsList.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3.5 bg-slate-900/90 hover:bg-amber-500/15 border-2 border-slate-800 hover:border-amber-400/80 rounded-2xl transition-all duration-300 text-right flex flex-col justify-between space-y-2 shadow-lg hover:scale-[1.02] cursor-pointer group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-amber-400/60 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                        <PromptIcon iconName={preset.icon} className="w-4 h-4" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                          Preset Card
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedPrompt(preset.id, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Delete Saved Prompt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setUserQueryInput(preset.promptText);
                        handleSendChat(preset.promptText);
                        setShowSavedPromptsCanvasGrid(false);
                      }}
                    >
                      <h5 className="text-xs font-black text-amber-400 group-hover:text-amber-300 tracking-wide mb-1">
                        {preset.title}
                      </h5>
                      <p className="text-[11px] text-slate-300 font-mono line-clamp-2 dir-ltr">
                        {preset.promptText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP-BY-STEP CONVERSATIONAL FORM CARD ON CANVAS */}
          {contactStep > 0 && (
            <ConversationalFormCard
              step={contactStep}
              totalSteps={5}
              fieldLabel={
                contactStep === 1 ? "name" :
                contactStep === 2 ? "email" :
                contactStep === 3 ? "phon" :
                contactStep === 4 ? "role" : "gender"
              }
              title={
                contactStep === 1 ? "Add New Contact - Full Name" :
                contactStep === 2 ? "Email Address" :
                contactStep === 3 ? "Phone Number" :
                contactStep === 4 ? "Role / Position" : "Gender / Entity Type"
              }
              question={
                contactStep === 1 ? "What is the full name of the new contact?" :
                contactStep === 2 ? `What is the email address of ${contactDraft.name || "the contact"}?` :
                contactStep === 3 ? `What is the phone number of ${contactDraft.name || "the contact"}?` :
                contactStep === 4 ? `Select or type the role for ${contactDraft.name || "the contact"}:` :
                `Select or type gender/type for ${contactDraft.name || "the contact"}:`
              }
              options={
                contactStep === 4 ? [
                  { label: "👤 VIP Client", value: "VIP Client" },
                  { label: "👔 System Manager", value: "Manager" },
                  { label: "🛠️ Business Partner", value: "Partner" },
                  { label: "💼 Vendor", value: "Vendor" }
                ] : contactStep === 5 ? [
                  { label: "👨 Male", value: "Male" },
                  { label: "👩 Female", value: "Female" },
                  { label: "🏢 Corporate / Org", value: "Corporate" },
                  { label: "🌟 Other", value: "Other" }
                ] : undefined
              }
              currentValue={
                contactStep === 1 ? contactDraft.name :
                contactStep === 2 ? contactDraft.email :
                contactStep === 3 ? contactDraft.phone :
                contactStep === 4 ? contactDraft.role : contactDraft.gender
              }
              onChangeValue={(val) => {
                if (contactStep === 1) setContactDraft((prev) => ({ ...prev, name: val }));
                if (contactStep === 2) setContactDraft((prev) => ({ ...prev, email: val }));
                if (contactStep === 3) setContactDraft((prev) => ({ ...prev, phone: val }));
                if (contactStep === 4) setContactDraft((prev) => ({ ...prev, role: val }));
                if (contactStep === 5) setContactDraft((prev) => ({ ...prev, gender: val }));
              }}
              onNextStep={(val) => {
                const finalVal =
                  val !== undefined && val !== "" ? val :
                  contactStep === 1 ? contactDraft.name :
                  contactStep === 2 ? contactDraft.email :
                  contactStep === 3 ? contactDraft.phone :
                  contactStep === 4 ? contactDraft.role : contactDraft.gender;
                handleSendChat(finalVal);
              }}
              onPrevStep={() => {
                if (contactStep > 1) setContactStep(contactStep - 1);
              }}
              onInfoClick={(currentStep) => {
                const guideText =
                  currentStep === 1 ? "Please enter or speak the contact's full first and last name, for example: Moti Cohen or Sarah Smith." :
                  currentStep === 2 ? "Please enter a valid email address format, for example: name@company.com." :
                  currentStep === 3 ? "Please provide a full phone or mobile number using digits, for example: 0501234567." :
                  currentStep === 4 ? "Please type or select the contact's position or role, such as Manager, Partner, or Client." :
                  "Please select or type the gender or entity type for this contact.";

                setCurrentAgentSubtitle({ text: guideText, uiCards: [] });
                speakText(guideText);
              }}
              onSaveAndFinish={handleSaveAndFinishForm}
            />
          )}

          {isUserSpeakingOrTyping ? (
            /* NEW GOLDEN CIRCULAR PROMPT INPUT CARD (Exact match to User's Right-hand Diagram) */
            <div className="w-full flex flex-col items-center justify-center my-3 relative animate-fadeIn">
              {/* Main Golden Circle Canvas */}
              <div className="w-[320px] sm:w-[360px] h-[320px] sm:h-[360px] rounded-full bg-[#14120C] border-4 border-[#D4AF37]/80 shadow-[0_0_60px_rgba(212,175,55,0.35)] flex flex-col items-center justify-between p-6 relative mx-auto overflow-hidden backdrop-blur-2xl transition-all duration-300">
                
                {/* TOP: Bookmark Badge inside double golden circle */}
                <div className="pt-2 z-10 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full border-2 border-[#D4AF37] bg-slate-950/90 flex items-center justify-center text-[#FFC800] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                    <div className="w-8 h-8 rounded-full border border-[#D4AF37]/60 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 fill-[#FFC800] text-[#FFC800]" />
                    </div>
                  </div>
                </div>

                {/* CENTER: Dark Rectangular Input Frame */}
                <div className="w-full flex flex-col items-center justify-center relative my-auto px-4 z-10">
                  <div className="w-full bg-[#0A0906] border-2 border-[#D4AF37]/70 rounded-xl p-3 shadow-inner">
                    <textarea
                      ref={topTextareaRef}
                      value={userQueryInput}
                      onChange={(e) => setUserQueryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                      placeholder={isRecording ? "Listening to your voice..." : "Type or speak your needs..."}
                      rows={3}
                      className="w-full bg-transparent text-[#FFC800] font-extrabold text-base sm:text-lg text-center focus:outline-none resize-none leading-snug tracking-wide placeholder:text-slate-500"
                    />
                  </div>
                  {saveToastMessage && (
                    <span className="text-emerald-400 text-xs font-bold animate-pulse font-mono block mt-1">
                      {saveToastMessage}
                    </span>
                  )}
                </div>

                {/* BOTTOM CENTER: Large Golden Triangular Play Button */}
                <div className="pb-3 z-10 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleSendChat()}
                    className="w-14 h-14 rounded-full border-2 border-[#D4AF37] bg-slate-950/90 flex items-center justify-center text-[#FFC800] hover:scale-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.5)] cursor-pointer group"
                    title="Send Prompt / Run Request"
                  >
                    <svg className="w-7 h-7 text-[#FFC800] fill-[#FFC800] group-hover:scale-110 transition-transform ml-1" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* OUTSIDE THE CIRCLE (LEFT & RIGHT CONTROLS FROM DIAGRAM) */}
              <div className="w-[320px] sm:w-[360px] flex items-center justify-between px-2 -mt-10 relative z-20 pointer-events-auto">
                {/* BOTTOM-LEFT: Folder Pin Badge (Save Prompt) */}
                <button
                  type="button"
                  onClick={handleSaveCustomPrompt}
                  className="w-12 h-12 rounded-full border-2 border-[#FFC800] bg-[#14120C] flex items-center justify-center text-[#FFC800] hover:scale-115 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,200,0,0.4)] cursor-pointer"
                  title="Save Prompt to Library (Folder Badge)"
                >
                  <Folder className="w-5 h-5 text-[#FFC800] fill-[#FFC800]" />
                </button>

                {/* BOTTOM-RIGHT: Information (i) Badge */}
                <button
                  type="button"
                  onClick={() => {
                    const guideText = "Type or speak your needs in the box, then click the golden play button to run your request.";
                    setCurrentAgentSubtitle({ text: guideText, uiCards: [] });
                    speakText(guideText);
                  }}
                  className="w-12 h-12 rounded-full border-2 border-[#FFC800] bg-[#14120C] flex items-center justify-center font-serif text-xl font-black text-[#FFC800] italic shadow-[0_0_20px_rgba(255,200,0,0.4)] hover:scale-115 active:scale-95 transition-all cursor-pointer"
                  title="David Explains How to Use Prompt Box"
                >
                  i
                </button>
              </div>
            </div>
          ) : currentAgentSubtitle?.uiCards && currentAgentSubtitle.uiCards.length > 0 ? (
            /* DYNAMIC GENERATIVE VISUAL CANVAS (Renders JSON Visual Cards from Server Template Library) */
            <div className="w-full space-y-3 transition-all duration-300 animate-fadeIn">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{currentTab.title} Visual Canvas</span>
                </div>
                
                {currentTab.title?.toUpperCase().includes("GEMINI") || currentTab.modeType === "gemini" ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-400/50 rounded-full text-[10px] font-bold text-emerald-400 animate-pulse dir-ltr">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    <span>Gemini Connected (Green Light)</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentAgentSubtitle.uiCards.length} visual templates rendered
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {currentAgentSubtitle.uiCards.map((ui, uiIdx) => (
                  <GenerativeRenderer key={uiIdx} ui={ui} onAction={(text) => handleSendChat(text)} />
                ))}
              </div>
            </div>
          ) : (
            /* INITIAL DEFAULT CANVAS STATE */
            <div className="relative inline-flex items-center justify-center gap-2 group max-w-full">
              <div 
                className="flex items-center justify-center gap-2 cursor-pointer p-2 rounded-2xl hover:bg-slate-900/50 transition-all border border-transparent hover:border-amber-400/30" 
                onClick={() => {
                  setUserQueryInput("");
                  setIsEditingTopText(true);
                }}
              >
                <h2 className="text-[#FFC800] font-extrabold text-xl sm:text-2xl tracking-wide drop-shadow-md leading-snug">
                  <TypewriterText text={currentTab.subtitle || "smart strategy & lead intelligence"} />
                </h2>
                <button
                  className="p-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-[#FFC800] hover:bg-amber-500/20 transition-all shrink-0"
                  title="Click to edit or speak"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#FFC800]" />
                </button>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex items-center justify-center gap-2 p-2 bg-slate-900/90 border border-amber-400/40 rounded-2xl text-[#FFC800] text-xs w-fit mx-auto animate-pulse shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-[#FFC800]" />
              <span>{office.agentName} is matching & populating server JSON templates...</span>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PINNED BOTTOM STACK: Image & Carousel Arrows Pinned to Button */}
        {/* ----------------------------------------------------------- */}
        <div className="mt-auto pt-4 pb-1 flex flex-col items-center justify-end w-full">
          {/* SMART WORKER IMAGE / VIDEO: Compact height, pinned right above analyze-mode */}
          <div className="relative w-full max-w-[110px] sm:max-w-[130px] h-18 sm:h-22 flex items-center justify-center mb-[3px]">
            {currentTab.mediaType === "video" || currentTab.mediaUrl?.toLowerCase().includes(".mp4") ? (
              <video
                src={currentTab.mediaUrl}
                autoPlay
                loop={currentTab.loopMedia !== false}
                muted={currentTab.mutedMedia !== false}
                playsInline
                className="w-full h-full object-contain drop-shadow-lg"
              />
            ) : (
              <img
                src={currentTab.mediaUrl || "/edoffice/ed.webp"}
                alt={currentTab.title}
                className="w-full h-full object-contain drop-shadow-lg"
              />
            )}
          </div>

          {/* CAROUSEL NAVIGATION ROW: <<< growth-mode. >>> (Pinned 3px above the diamond button) */}
          <div className="w-full flex items-center justify-between px-6 mb-[3px]">
            {/* Left Arrow Button <<< */}
            <button
              onClick={handlePrevTab}
              className="flex items-center text-white hover:text-[#FFC800] transition-transform active:scale-95 group cursor-pointer"
              aria-label="Previous tab"
            >
              <span className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-[#FFC800] tracking-tighter">
                &lt;&lt;&lt;
              </span>
            </button>

            {/* Active Tab Title */}
            <div className="text-center px-2">
              <span className="text-[#FFC800] font-extrabold text-lg sm:text-xl tracking-wider leading-none block">
                {currentTab.title}
              </span>
            </div>

            {/* Right Arrow Button >>> */}
            <button
              onClick={handleNextTab}
              className="flex items-center text-white hover:text-[#FFC800] transition-transform active:scale-95 group cursor-pointer"
              aria-label="Next tab"
            >
              <span className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-[#FFC800] tracking-tighter">
                &gt;&gt;&gt;
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* GOLD BOTTOM FOOTER (FIXED STICKY BOTTOM)                      */}
      {/* ------------------------------------------------------------- */}
      <footer className="shrink-0 sticky bottom-0 z-30 w-full bg-[#FFC800] pt-7 pb-3 px-4 flex flex-col items-center justify-center relative shadow-2xl">
        {/* Lightning Zap Action Button: Open Saved Prompts Cards Grid on Canvas */}
        <button
          type="button"
          onClick={() => setShowSavedPromptsCanvasGrid(!showSavedPromptsCanvasGrid)}
          className={`absolute left-4 top-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
            showSavedPromptsCanvasGrid
              ? "bg-slate-950 text-amber-400 border-amber-300 font-bold scale-105"
              : "bg-slate-950/90 text-[#FFC800] border-amber-400/80 hover:bg-black"
          }`}
          title="Toggle Saved Prompts Cards Grid / שליפת פרומפטים שמורים"
        >
          <Zap className="w-4 h-4 text-[#FFC800] fill-amber-400/40 animate-pulse" />
          <span className="text-xs font-black hidden sm:inline text-[#FFC800]">פרומפטים</span>
        </button>

        {/* Centered Golden Microphone Action Button ("Check with David.") */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              if (userQueryInput.trim() && !isRecording) {
                handleSendChat();
              } else {
                toggleRecording();
              }
            }}
            className={`w-44 sm:w-48 h-16 bg-slate-950 hover:bg-black border-2 border-amber-300 rounded-2xl flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group ${
              isRecording ? "ring-4 ring-amber-400/50 animate-pulse" : ""
            }`}
          >
            {userQueryInput.trim().length > 0 && !isRecording ? (
              <span className="text-[#FFC800] font-bold text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>Send Query</span>
                <Send className="w-4 h-4 text-[#FFC800]" />
              </span>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="p-1 rounded-full bg-amber-500/20 text-[#FFC800]">
                  {isRecording ? (
                    <MicOff className="w-5 h-5 text-red-400 animate-pulse" />
                  ) : (
                    <Mic className="w-5 h-5 text-[#FFC800]" />
                  )}
                </div>
                <span className="text-[#FFC800] font-bold text-xs sm:text-sm tracking-wide mt-0.5">
                  {isRecording ? "Stop Recording" : office.agentTitle || `Check with ${office.agentName}.`}
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Footer Agent Text */}
        <div className="mt-3 text-center">
          <h1 className="text-black font-black text-3xl sm:text-4xl tracking-tight">
            {office.officeName || `${office.agentName}'s office.`}
          </h1>
        </div>
      </footer>

      {/* Admin Editor Modal */}
      {isEditorOpen && (
        <SmartOfficeEditor
          office={office}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSaveSuccess={(updated) => setOffice(updated)}
        />
      )}
    </div>
  );
}
