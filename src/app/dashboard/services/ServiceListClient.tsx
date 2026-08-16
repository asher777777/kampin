"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, Layout, Trash2, Edit, FileText, Search, BarChart3, Activity, Eye, MousePointerClick, ShoppingCart, Loader2, ArrowUpDown, Clock } from "lucide-react";
import { deleteServicePage } from "@/features/services/actions";
import { Modal } from "@/components/ui/Modal";

interface ServiceListClientProps {
  initialServices: any[];
}

export function ServiceListClient({ initialServices }: ServiceListClientProps) {
  const [services, setServices] = useState(initialServices);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedServiceForAnalytics, setSelectedServiceForAnalytics] = useState<any>(null);

  const handleDelete = async (slug: string, type: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק עמוד זה? פעולה זו אינה הפיכה.")) return;
    
    setIsDeleting(slug);
    try {
      await deleteServicePage(slug, type);
      setServices(prev => prev.filter(s => s.slug !== slug));
    } catch (e: any) {
      alert("שגיאה במחיקת העמוד: " + e.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const openAnalytics = (service: any) => {
    setSelectedServiceForAnalytics(service);
    setAnalyticsModalOpen(true);
  };

  const filteredAndSortedServices = useMemo(() => {
    let result = [...services];

    // Filter by Type
    if (filterType !== "all") {
      result = result.filter(s => s.type === filterType);
    }

    // Sort
    if (sortBy === "views") {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
      // Newest
      result.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return result;
  }, [services, filterType, sortBy]);

  if (services.length === 0) {
    return (
      <div className="col-span-full py-16 mt-8 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] text-muted-foreground bg-white">
        <Layout className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        עדיין לא נוצרו עמודי שירות או דפי נחיתה. השתמש במחולל ה-AI שלמעלה כדי להתחיל בקלות!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Sort Icons Row */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
          <button
            onClick={() => setFilterType("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filterType === "all" ? "bg-slate-800 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilterType("landing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filterType === "landing" ? "bg-purple-600 text-white shadow-md shadow-purple-600/20" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
            }`}
          >
            <Sparkles className="w-4 h-4" /> דף נחיתה
          </button>
          <button
            onClick={() => setFilterType("service")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filterType === "service" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <Layout className="w-4 h-4" /> עמוד שירות
          </button>
          <button
            onClick={() => setFilterType("post")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              filterType === "post" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            <FileText className="w-4 h-4" /> תוכן SEO
          </button>
        </div>

        {/* Sorting */}
        <div className="flex gap-2 items-center border-r border-slate-100 pr-2">
          <button
            onClick={() => setSortBy("newest")}
            className={`p-1.5 rounded-lg transition-colors ${sortBy === "newest" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
            title="מיין לפי תאריך"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSortBy("views")}
            className={`p-1.5 rounded-lg transition-colors ${sortBy === "views" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
            title="מיין לפי צפיות"
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>

      </div>

      {filteredAndSortedServices.length === 0 && (
        <div className="text-center py-12 text-slate-400">לא נמצאו עמודים התואמים את הסינון.</div>
      )}

      {/* Long Buttons List View */}
      <div className="flex flex-col gap-3 pb-8">
        {filteredAndSortedServices.map((service, index) => {
          const isLanding = service.type === "landing";
          const isPost = service.type === "post";
          const pagePath = isLanding 
              ? `/landing/${service.slug}` 
              : (isPost ? `/post/${service.slug}` : `/service/${service.slug}`);
          
          // Determine row color based on type
          let rowColor = "bg-blue-50 border-blue-100 text-blue-900";
          let iconColor = "text-blue-500";
          let Icon = Layout;

          if (isLanding) {
            rowColor = "bg-purple-50 border-purple-100 text-purple-900";
            iconColor = "text-purple-500";
            Icon = Sparkles;
          } else if (isPost) {
            rowColor = "bg-emerald-50 border-emerald-100 text-emerald-900";
            iconColor = "text-emerald-500";
            Icon = FileText;
          }

          return (
            <div 
              key={`${service.slug}-${index}`} 
              className={`w-full flex flex-row items-center justify-between p-3 pl-4 rounded-2xl border ${rowColor} shadow-sm hover:shadow-md transition-all duration-300 group`}
            >
              {/* Title & Icon (Right side since RTL) */}
              <Link href={pagePath} className="flex flex-1 items-center gap-3 overflow-hidden">
                <div className={`p-2 bg-white rounded-xl shadow-sm shrink-0 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base md:text-lg truncate pl-4">
                  {service.hero?.title || service.title || service.slug}
                </h3>
              </Link>
              
              {/* Action Buttons (Left side) */}
              <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
                {/* Delete Button */}
                <button 
                  onClick={() => handleDelete(service.slug, service.type)}
                  disabled={isDeleting === service.slug}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm disabled:opacity-50"
                  title="מחק"
                >
                  {isDeleting === service.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                
                {/* Edit Button */}
                <Link href={pagePath}>
                  <button 
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
                    title="ערוך"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </Link>

                {/* Analytics Button */}
                <button 
                  onClick={() => openAnalytics(service)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shadow-sm"
                  title="נתונים"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Modal */}
      <Modal isOpen={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)}>
        <Modal.Content className="max-w-md w-full p-6 md:p-8 rounded-[2.5rem] bg-white">
          <div dir="rtl">
            <div className="mb-8">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">נתונים אנליטיים</h2>
              <p className="text-sm text-slate-500 mt-1 truncate">
                עבור: {selectedServiceForAnalytics?.hero?.title || selectedServiceForAnalytics?.slug}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <Eye className="w-6 h-6 text-slate-400 mb-2" />
                <div className="text-3xl font-black text-slate-800 mb-1">{selectedServiceForAnalytics?.views || 0}</div>
                <div className="text-xs font-bold text-slate-500">צפיות בעמוד</div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <MousePointerClick className="w-6 h-6 text-indigo-400 mb-2" />
                <div className="text-3xl font-black text-indigo-600 mb-1">{selectedServiceForAnalytics?.leads || 0}</div>
                <div className="text-xs font-bold text-indigo-600/70">לידים / המרות</div>
              </div>

              <div className="col-span-2 bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center mt-2">
                <ShoppingCart className="w-6 h-6 text-emerald-400 mb-2" />
                <div className="text-3xl font-black text-emerald-600 mb-1">{selectedServiceForAnalytics?.purchases || 0}</div>
                <div className="text-xs font-bold text-emerald-600/70">רכישות שבוצעו</div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-[10px] text-slate-400 font-medium">
            הנתונים מסונכרנים בזמן אמת מול מערכת פיירבייס אנליטיקס ומאגרי המידע המקומיים.
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setAnalyticsModalOpen(false)} 
              className="px-6 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors w-full"
            >
              סגור
            </button>
          </div>
        </Modal.Content>
      </Modal>
    </div>
  );
}
