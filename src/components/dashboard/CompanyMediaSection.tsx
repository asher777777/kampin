"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, Edit2, Trash2, Save, X, Eye, Image as ImageIcon, FileText, Video, EyeOff, UploadCloud, Copy, HardDrive, CheckCircle, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { CompanyAsset, getCompanyAssets, addCompanyAsset, updateCompanyAsset, deleteCompanyAsset } from "@/features/company-assets/actions";
import { uploadMediaFile } from "@/features/media/actions";
import imageCompression from "browser-image-compression";
import { extractColors } from "extract-colors";

const CATEGORY_LABELS: Record<string, string> = {
  logo: "לוגו",
  incorporation_doc: "מסמך התאגדות",
  dealer_cert: "תעודת עוסק",
  vibe_image: "תמונת אווירה",
  other: "אחר"
};

interface CompanyMediaSectionProps {
  onApplyColors?: (colors: string[]) => void;
}

export function CompanyMediaSection({ onApplyColors }: CompanyMediaSectionProps) {
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  // New Asset Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<"image" | "document" | "video">("image");
  const [newAssetFile, setNewAssetFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newAssetCategory, setNewAssetCategory] = useState<CompanyAsset["category"]>("vibe_image");
  const [newAssetName, setNewAssetName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded Asset Details
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<CompanyAsset["category"]>("other");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    setLoading(true);
    const data = await getCompanyAssets();
    setAssets(data);
    setLoading(false);
  }

  const processFile = (file: File) => {
    setNewAssetFile(file);
    if (!newAssetName) {
      setNewAssetName(file.name.split(".")[0]);
    }
    
    // Create preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        setPreviewUrl(url);
        
        extractColors(url, { crossOrigin: "anonymous" })
          .then((colors) => {
            // Get up to 3 most prominent colors
            const topColors = colors
              .sort((a, b) => b.area - a.area)
              .slice(0, 3)
              .map(c => c.hex);
            setExtractedColors(topColors);
          })
          .catch(e => {
            console.error("Color extraction failed:", e);
          });
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
      setExtractedColors([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleAddAsset = async () => {
    if (!newAssetName) return alert("יש להזין שם לנכס");
    
    setIsUploading(true);
    let finalUrl = newAssetUrl;

    if (newAssetType === "image") {
      if (!newAssetFile) {
        setIsUploading(false);
        return alert("יש לבחור קובץ תמונה");
      }
      
      try {
        // Compress image to < 100KB
        const compressedFile = await imageCompression(newAssetFile, {
          maxSizeMB: 0.09, // ~90-100KB
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8
        });

        const formData = new FormData();
        formData.append("file", compressedFile, compressedFile.name);

        const uploadRes = await uploadMediaFile(formData);
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || "Upload failed");
        }
        finalUrl = uploadRes.url;
      } catch (err) {
        console.error("Image upload/compression error:", err);
        setIsUploading(false);
        return alert("שגיאה בהעלאת התמונה");
      }
    } else {
      if (!finalUrl.trim()) {
        setIsUploading(false);
        return alert("יש להזין קישור תקין (דרייב, יוטיוב וכו')");
      }
    }

    const res = await addCompanyAsset({
      name: newAssetName,
      category: newAssetCategory,
      url: finalUrl,
      fileType: newAssetType,
      extractedColors: extractedColors.length > 0 ? extractedColors : undefined
    });

    if (res.success) {
      await loadAssets();
      setIsAddModalOpen(false);
      setNewAssetFile(null);
      setPreviewUrl(null);
      setExtractedColors([]);
      setNewAssetUrl("");
      setNewAssetName("");
    } else {
      alert("שגיאה בשמירת הנכס");
    }
    
    setIsUploading(false);
  };

  const startEditing = (asset: CompanyAsset) => {
    setEditingAssetId(asset.id);
    setEditName(asset.name);
    setEditCategory(asset.category);
  };

  const handleSaveEdit = async (id: string) => {
    setIsSavingEdit(true);
    const res = await updateCompanyAsset(id, { name: editName, category: editCategory });
    if (res.success) {
      setAssets(assets.map(a => a.id === id ? { ...a, name: editName, category: editCategory } : a));
      setEditingAssetId(null);
    } else {
      alert("שגיאה בעדכון");
    }
    setIsSavingEdit(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק נכס זה?")) return;
    const res = await deleteCompanyAsset(id);
    if (res.success) {
      setAssets(assets.filter(a => a.id !== id));
      if (expandedAssetId === id) setExpandedAssetId(null);
    } else {
      alert("שגיאה במחיקה");
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>;
  }

  return (
    <div className="border-t border-white/5">
      {/* Accordion Header */}
      <div className="w-full flex items-center justify-between bg-[#181818] hover:bg-[#202020] transition-colors" dir="rtl">
        <button
          onClick={(e) => {
            const next = !isMediaOpen;
            setIsMediaOpen(next);
            if (next) {
              const target = e.currentTarget;
              setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
          }}
          className="flex-1 p-4 flex items-center justify-between font-bold text-white text-xs sm:text-sm cursor-pointer outline-none"
        >
          <span className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-indigo-400" />
            נכסי מדיה
          </span>
          <div className="flex items-center">
            {isMediaOpen ? <ChevronUp className="h-5 w-5 text-gray-400 mr-2" /> : <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />}
          </div>
        </button>
        
        {/* Quick Add Button */}
        <div className="pr-2 pl-4 flex items-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsAddModalOpen(true);
              setIsMediaOpen(true);
            }}
            className="flex items-center justify-center bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 p-2 rounded-lg transition-colors"
            title="הוסף נכס"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMediaOpen && (
        <div className="w-full bg-[#111] p-4 sm:p-6 border-t border-white/5 animate-in fade-in duration-200" dir="rtl">
          {/* Asset List */}
      <div className="space-y-3">
        {assets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-gray-500 text-sm">
            אין נכסי מדיה כרגע. הוסף את הלוגו, מסמכי התאגדות ותמונות אווירה שלך.
          </div>
        ) : (
          assets.map(asset => {
            const isExpanded = expandedAssetId === asset.id;
            const isEditing = editingAssetId === asset.id;
            
            return (
              <div key={asset.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all">
                {/* Row */}
                <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/40 rounded-lg text-indigo-400">
                      {asset.fileType === "image" ? <ImageIcon className="w-4 h-4" /> : 
                       asset.fileType === "video" ? <Video className="w-4 h-4" /> : 
                       <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{asset.name}</div>
                      <div className="text-xs text-gray-400">{CATEGORY_LABELS[asset.category] || asset.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                      className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    >
                      {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-black/20 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                    {isEditing ? (
                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">שם הנכס</label>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">סיווג</label>
                          <select 
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value as any)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key} className="bg-[#181818]">{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button 
                            onClick={() => handleSaveEdit(asset.id)}
                            disabled={isSavingEdit || !editName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                          >
                            {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} שמור
                          </button>
                          <button 
                            onClick={() => setEditingAssetId(null)}
                            disabled={isSavingEdit}
                            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Preview */}
                        <div className="w-full sm:w-48 h-32 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          {asset.fileType === "image" ? (
                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                          ) : (
                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                              {asset.fileType === "video" ? <Video className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                              <span className="text-xs font-medium underline">פתח קישור חיצוני</span>
                            </a>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="flex-1 flex flex-col gap-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>סוג קובץ: <span className="font-semibold text-white">{asset.fileType === "image" ? "תמונה" : asset.fileType === "video" ? "וידאו" : "מסמך"}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                              <HardDrive className="w-4 h-4 text-gray-400" />
                              <span>משקל: <span className="font-semibold text-white">לא ידוע</span></span>
                            </div>
                            
                            <button 
                              onClick={() => handleCopyUrl(asset.id, asset.url)}
                              className="self-start flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-white/5 text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                              {copiedUrlId === asset.id ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                              {copiedUrlId === asset.id ? "הקישור הועתק" : "העתק קישור לקובץ"}
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => startEditing(asset)}
                            className="self-start flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mt-auto"
                          >
                            <Edit2 className="w-3 h-3" /> ערוך פרטים
                          </button>
                            
                            {/* Color Palette Display */}
                            {asset.category === "logo" && asset.extractedColors && asset.extractedColors.length > 0 && (
                              <div className="mt-2 flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                                <div className="text-xs text-gray-400">צבעי לוגו:</div>
                                <div className="flex gap-2">
                                  {asset.extractedColors.map(c => (
                                    <button 
                                      key={c} 
                                      onClick={() => handleCopyColor(c)}
                                      className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform relative flex items-center justify-center shadow-sm" 
                                      style={{ backgroundColor: c }} 
                                      title={copiedColor === c ? "הועתק!" : `העתק צבע ${c}`}
                                    >
                                      {copiedColor === c && <CheckCircle className="w-3 h-3 text-white drop-shadow-md mix-blend-difference" />}
                                    </button>
                                  ))}
                                </div>
                                {onApplyColors && (
                                  <button
                                    onClick={() => onApplyColors(asset.extractedColors!)}
                                    className="mr-auto flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                  >
                                    <Palette className="w-3.5 h-3.5" /> החל כצבעי מערכת
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Inline Section */}
      {isAddModalOpen && (
        <div className="mt-6 border border-indigo-500/30 bg-indigo-500/5 rounded-2xl animate-in fade-in slide-in-from-top-2 overflow-hidden">
          <div className="bg-[#181818]/50">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">הוספת נכס חדש</h3>
              <button onClick={() => !isUploading && setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">סוג הקובץ</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewAssetType("image")}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${newAssetType === "image" ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-gray-300'}`}
                  >
                    תמונה (לוגו, אווירה)
                  </button>
                  <button 
                    onClick={() => setNewAssetType("document")}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${newAssetType === "document" ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-gray-300'}`}
                  >
                    מסמך / PDF
                  </button>
                  <button 
                    onClick={() => setNewAssetType("video")}
                    className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${newAssetType === "video" ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-gray-300'}`}
                  >
                    וידאו
                  </button>
                </div>
              </div>

              {newAssetType === "image" ? (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-medium">בחר תמונה (תכווץ אוטומטית מתחת ל-100KB)</label>
                  <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20'
                    }`}
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {previewUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <img src={previewUrl} alt="Preview" className="h-32 w-auto object-cover rounded-lg shadow-md border border-white/10" />
                        
                        {extractedColors.length > 0 && (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium">צבעים מרכזיים שזוהו:</span>
                            <div className="flex items-center gap-2">
                              {extractedColors.map((color, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 group">
                                  <div 
                                    className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                  <span className="text-[10px] text-gray-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-4 bg-black/80 px-1.5 py-0.5 rounded">{color}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <span className="text-sm text-indigo-400 font-medium">החלף תמונה</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-full text-gray-400">
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="text-indigo-400 font-medium hover:underline">לחץ לבחירת קובץ</span>
                          <span className="text-gray-400"> או גרור לכאן</span>
                        </div>
                        <span className="text-xs text-gray-500">תומך ב-JPG, PNG, WebP</span>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 block font-medium">קישור לקובץ (Drive, YouTube וכד')</label>
                  <p className="text-xs text-indigo-300/70 mb-2 leading-relaxed">
                    מכיוון שמסמכים ווידאו שוקלים הרבה, אנא העלה אותם לגוגל דרייב (או שירות דומה), וודא שהם מוגדרים ל"כל מי שיש לו את הקישור", והדבק את הקישור כאן:
                  </p>
                  <input 
                    type="url" 
                    value={newAssetUrl}
                    onChange={e => setNewAssetUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">שם הנכס</label>
                <input 
                  type="text" 
                  value={newAssetName}
                  onChange={e => setNewAssetName(e.target.value)}
                  placeholder="לדוגמה: הלוגו הראשי שלנו..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">סיווג הקובץ</label>
                <select 
                  value={newAssetCategory}
                  onChange={e => setNewAssetCategory(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-[#181818]">{label}</option>
                  ))}
                </select>
              </div>

            </div>
            
            <div className="p-5 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3">
              <button 
                onClick={() => !isUploading && setIsAddModalOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              <button 
                onClick={handleAddAsset}
                disabled={isUploading || (!newAssetFile && newAssetType === "image") || (!newAssetUrl && newAssetType !== "image") || !newAssetName}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : "שמור נכס"}
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
}
