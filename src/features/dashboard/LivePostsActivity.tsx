"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Wand2, 
  FileText, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2, 
  Calendar, 
  ChevronLeft, 
  Search, 
  X,
  CheckCircle
} from "lucide-react";
import { 
  getAllPosts, 
  deletePost, 
  togglePublishPost, 
  generatePostWithAI,
  LivePost 
} from "@/features/posts/actions";
import { getFormTemplates, FormTemplate } from "@/features/crm/formTemplates";
import { Button } from "@/components/ui/Button";
import { StatBadge } from "@/components/ui/StatBadge";

export function LivePostsActivity() {
  const [posts, setPosts] = useState<LivePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "published" | "drafts">("all");
  const [selectedPost, setSelectedPost] = useState<LivePost | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for focus event from Quick Actions
  useEffect(() => {
    const handleFocus = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.addEventListener("focus-ai-post-writer", handleFocus);
    return () => window.removeEventListener("focus-ai-post-writer", handleFocus);
  }, []);

  // Load posts initially
  useEffect(() => {
    async function load() {
      const data = await getAllPosts();
      setPosts(data);
      const temps = await getFormTemplates();
      setTemplates(temps);
      setIsLoading(false);
    }
    load();
  }, []);

  // Show notification helpers
  const triggerNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Pre-configured suggestions to write a prompt quickly
  const suggestions = [
    "דבר תורה קצר ומעורר השראה לפרשת השבוע",
    "הזמנה חמה למשפחות הקהילה לסעודת שבת משפחתית",
    "עדכון משמח על הגעת תפילין חדשות לבדיקה וחלוקה",
    "סיכום מרגש מערב נשים מיוחד שנערך השבוע"
  ];

  // AI generation handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      const res = await generatePostWithAI(prompt, selectedTemplate?.config);
      if (res.success && res.post) {
        setPosts(prev => [res.post!, ...prev]);
        setPrompt("");
        triggerNotification("success", "סוכן ה-AI יצר בהצלחה פוסט קהילתי חדש!");
      } else {
        triggerNotification("error", res.error || "שגיאה ביצירת פוסט. אנא ודא שמפתח ה-API מוגדר.");
      }
    } catch (err: any) {
      triggerNotification("error", err.message || "תקשורת עם סוכן ה-AI נכשלה");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle publish state optimistically
  const handleTogglePublish = async (id: string, currentState: boolean) => {
    // Optimistic UI update
    setPosts(prev => prev.map((p: any) => p.id === id ? { ...p, published: !currentState } : p));
    
    try {
      const res = await togglePublishPost(id, currentState);
      if (res.success) {
        triggerNotification("success", currentState ? "הפוסט הועבר לטיוטות" : "הפוסט פורסם בהצלחה!");
      } else {
        // Rollback on failure
        setPosts(prev => prev.map((p: any) => p.id === id ? { ...p, published: currentState } : p));
        triggerNotification("error", "שגיאה בעדכון מצב הפרסום");
      }
    } catch {
      setPosts(prev => prev.map((p: any) => p.id === id ? { ...p, published: currentState } : p));
      triggerNotification("error", "שגיאה בחיבור לשרת");
    }
  };

  // Delete post optimistically
  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק פוסט זה?")) return;

    const originalPosts = [...posts];
    setPosts(prev => prev.filter(p => p.id !== id));

    try {
      const res = await deletePost(id);
      if (res.success) {
        triggerNotification("success", "הפוסט נמחק לצמיתות");
        if (selectedPost?.id === id) setSelectedPost(null);
      } else {
        setPosts(originalPosts);
        triggerNotification("error", "שגיאה במחיקת הפוסט");
      }
    } catch {
      setPosts(originalPosts);
      triggerNotification("error", "שגיאה בחיבור לשרת");
    }
  };

  // Filtering logic
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "published") return matchesSearch && post.published;
    if (activeTab === "drafts") return matchesSearch && !post.published;
    return matchesSearch;
  });

  // Badge stylings based on category name
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "פרשת שבוע":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/50";
      case "חדשות הקהילה":
        return "bg-rose-50 text-rose-700 border-rose-200/50";
      case "הלכה יומית":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "חגים ומועדים":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "אירועים":
        return "bg-orange-50 text-orange-700 border-orange-200/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/50";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md ${
              notification.type === "success" 
                ? "bg-emerald-500/90 border-emerald-400/30 text-white" 
                : "bg-rose-500/90 border-rose-400/30 text-white"
            }`}
          >
            {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-sm font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Posts Stats Badges Row */}
      <div className="flex flex-wrap items-center gap-2.5 justify-start">
        <StatBadge 
          icon={<FileText className="w-4 h-4 text-indigo-600" />} 
          value={posts.length} 
          label="סה״כ פוסטים" 
          description="סך כל הפוסטים והעדכונים הקהילתיים שנוצרו במערכת"
          badgeColorClass="bg-indigo-50 border-indigo-100/50"
        />
        <StatBadge 
          icon={<Eye className="w-4 h-4 text-emerald-600" />} 
          value={posts.filter(p => p.published).length} 
          label="פוסטים מפורסמים" 
          description="מספר הפוסטים שגלויים לציבור ומופיעים באתר הקהילה"
          badgeColorClass="bg-emerald-50 border-emerald-100/50"
        />
        <StatBadge 
          icon={<EyeOff className="w-4 h-4 text-amber-600" />} 
          value={posts.filter(p => !p.published).length} 
          label="טיוטות במערכת" 
          description="מספר הפוסטים שטרם פורסמו ושמורים כטיוטות פנימיות"
          badgeColorClass="bg-amber-50 border-amber-100/50"
        />
      </div>

      {/* AI Agent Generator Card */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md text-amber-400 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">סוכן ה-AI ליצירת פוסטים חיים</h3>
              <p className="text-xs text-indigo-200">חולל תוכן קהילתי, פרשות שבוע ועדכונים בשניות</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-3">
            {templates.length > 0 && (
              <div className="w-full sm:w-1/2">
                <select 
                  value={selectedTemplateId} 
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  <option value="" className="text-slate-800">-- ללא טופס מוצמד --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id!} className="text-slate-800">{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="על מה תרצו לכתוב היום? (לדוגמה: פוסט מרגש על הכנת מצות עם ילדי הגן...)"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
                disabled={isGenerating}
              />
              <div className="absolute left-2.5 bottom-2.5">
                <Button 
                  type="submit" 
                  disabled={isGenerating || !prompt.trim()} 
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 h-auto"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  {isGenerating ? "מנסח..." : "חולל פוסט"}
                </Button>
              </div>
            </div>
          </form>

          {/* Prompt Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-indigo-300/70 font-semibold block">רעיונות מהירים:</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(s)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-2.5 py-1 rounded-full text-indigo-200 hover:text-white transition-all text-right max-w-full truncate"
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Listing Section */}
      <div className="rounded-3xl border bg-card/60 backdrop-blur-md shadow-sm p-6 space-y-4">
        
        {/* Header & Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">פוסטים ועדכונים חיים</h3>
            <p className="text-xs text-muted-foreground mt-0.5">ניהול תכנים המוצגים לקהילה</p>
          </div>
          
          {/* Quick Search */}
          <div className="relative max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש פוסט..."
              className="w-full h-9 pr-9 pl-3 rounded-xl border bg-muted/40 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b pb-1 gap-2">
          {[
            { id: "all", label: "הכל" },
            { id: "published", label: "מפורסמים" },
            { id: "drafts", label: "טיוטות" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Posts Cards Container */}
        <div className="relative min-h-[250px]">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs">טוען פוסטים...</span>
            </div>
          ) : filteredPosts.length > 0 ? (
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredPosts.map(post => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group relative bg-white border hover:border-slate-300 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3 justify-between"
                  >
                    {/* Top Row: Title, Category & Thumbnail */}
                    <div className="flex items-start gap-4">
                      {post.imageUrl && !post.imageUrl.startsWith("linear-gradient") && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border bg-muted flex-shrink-0 relative cursor-pointer" onClick={() => setSelectedPost(post)}>
                          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      
                      <div className="space-y-1 flex-grow text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryStyles(post.category)}`}>
                            {post.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(post.createdAt).toLocaleDateString("he-IL", {
                              day: "numeric",
                              month: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <h4 
                          onClick={() => setSelectedPost(post)}
                          className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors cursor-pointer hover:underline"
                        >
                          {post.title}
                        </h4>
                      </div>

                      {/* Post Status indicator */}
                      <span className={`w-2 h-2 rounded-full mt-2.5 flex-shrink-0 ${post.published ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    </div>

                    {/* Middle Row: Teaser */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {post.summary}
                    </p>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between border-t pt-2.5 mt-1">
                      <button 
                        onClick={() => setSelectedPost(post)}
                        className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        קרא פוסט מלא <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTogglePublish(post.id, post.published)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            post.published 
                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/50" 
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                          title={post.published ? "שנה לטיוטה" : "פרסם פוסט"}
                        >
                          {post.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
                          title="מחק פוסט"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground flex flex-col items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-indigo-200" />
              <span className="text-sm font-semibold">לא נמצאו פוסטים</span>
              <span className="text-xs">השתמש בסוכן ה-AI למעלה כדי ליצור פוסט ראשון!</span>
            </div>
          )}
        </div>
      </div>

      {/* Full Content Reader Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
            >
              {/* Header block with category gradient background or custom generated image background */}
              <div 
                className="p-6 text-white relative bg-cover bg-center overflow-hidden flex flex-col justify-end min-h-[200px]"
                style={{ 
                  backgroundImage: selectedPost.imageUrl?.startsWith("linear-gradient") 
                    ? undefined 
                    : `url(${selectedPost.imageUrl})`,
                  background: selectedPost.imageUrl?.startsWith("linear-gradient") 
                    ? selectedPost.imageUrl 
                    : undefined
                }}
              >
                {/* Dark atmospheric overlay for visual readability over image */}
                {selectedPost.imageUrl && !selectedPost.imageUrl.startsWith("linear-gradient") && (
                  <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] z-0" />
                )}
                
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="absolute left-6 top-6 p-1.5 rounded-full bg-white/25 hover:bg-white/40 text-white backdrop-blur-md transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="space-y-2 text-right relative z-10">
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm inline-block">
                    {selectedPost.category}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-md">{selectedPost.title}</h3>
                  <p className="text-xs text-white/90 flex items-center gap-1 drop-shadow-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    נכתב ב- {new Date(selectedPost.createdAt).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>

              {/* Teaser block */}
              <div className="bg-slate-50 p-4 border-b border-slate-100 text-right">
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">תקציר הפוסט:</p>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed italic">{selectedPost.summary}</p>
              </div>

              {/* Full Content Scrollable Block */}
              <div className="p-6 overflow-y-auto space-y-4 text-right leading-relaxed flex-1 scrollbar-thin">
                {selectedPost.content.split("\n").map((paragraph, index) => (
                  <p key={index} className="text-slate-800 text-sm md:text-base">
                    {paragraph}
                  </p>
                ))}

                {/* Displaying tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="pt-6 border-t flex flex-wrap gap-1.5">
                    {selectedPost.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Block */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  סטטוס: 
                  <span className={`font-bold ${selectedPost.published ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {selectedPost.published ? 'מפורסם לקהילה' : 'טיוטה פנימית'}
                  </span>
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      handleTogglePublish(selectedPost.id, selectedPost.published);
                      setSelectedPost(prev => prev ? { ...prev, published: !prev.published } : null);
                    }}
                    className="h-9 gap-1"
                  >
                    {selectedPost.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {selectedPost.published ? "הפוך לטיוטה" : "פרסם פוסט"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm("האם למחוק פוסט זה?")) {
                        handleDelete(selectedPost.id);
                      }
                    }}
                    className="h-9 gap-1 border-rose-100 hover:bg-rose-50 text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" /> מחק
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
