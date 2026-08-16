"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/Button";
import { 
  ImagePlus, 
  Library, 
  Loader2, 
  X, 
  Check, 
  Search, 
  Trash2, 
  Save, 
  Sparkles,
  Copy
} from "lucide-react";
import { 
  getMediaLibrary, 
  addMediaToLibrary, 
  deleteMediaItem, 
  updateMediaMetadata, 
  updateMediaFile,
  fetchImageAsBase64,
  getMediaFileMetadata,
  uploadMediaFile
} from "@/features/media/actions";

interface ImageUploadProps {
  onSelect: (url: any) => void;
  currentImage?: string;
  preserveFormat?: boolean;
  compact?: boolean;
  multiple?: boolean;
  size?: 'default' | 'sm';
  customTrigger?: (onClick: () => void) => React.ReactNode;
}

export function ImageUpload({ onSelect, currentImage, preserveFormat = false, compact = false, multiple = false, size = 'default', customTrigger }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // New States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempAlt, setTempAlt] = useState("");
  const [tempDesc, setTempDesc] = useState("");
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [targetFormat, setTargetFormat] = useState<'webp' | 'jpeg' | 'png'>('webp');
  const [keepOriginal, setKeepOriginal] = useState(true);

  // File size and dimensions states
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('.quicktime');
  };

  useEffect(() => {
    if (showGallery) {
      loadLibrary();
      setSelectedItem(null);
      setSelectedItems([]);
      setSearchQuery("");
    }
  }, [showGallery]);

  useEffect(() => {
    if (!selectedItem) {
      setDimensions(null);
      setFileSize(null);
      return;
    }

    setIsLoadingMetadata(true);

    // 1. Get image/video dimensions
    if (!isVideoUrl(selectedItem.url)) {
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        setDimensions(null);
      };
      img.src = selectedItem.url;
    } else {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        setDimensions({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        setDimensions(null);
      };
      video.src = selectedItem.url;
    }

    // 2. Fetch file size from Firebase Storage metadata via server action
    getMediaFileMetadata(selectedItem.url)
      .then(res => {
        if (res && typeof res.size === "number") {
          const kb = res.size / 1024;
          setFileSize(`${kb.toFixed(1)} KB`);
        } else {
          setFileSize("לא ידוע");
        }
      })
      .catch(() => {
        setFileSize("לא ידוע");
      })
      .finally(() => {
        setIsLoadingMetadata(false);
      });
  }, [selectedItem]);

  const loadLibrary = async () => {
    if (isLoadingLibrary) return;
    setIsLoadingLibrary(true);
    try {
      const items = await getMediaLibrary();
      setMediaItems(items || []);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        let fileToUpload: File | Blob = file;
        let extension = file.name.split('.').pop()?.toLowerCase() || '';

        if (!isVideo) {
          // 1. Image Compression
          let maxSizeMB = preserveFormat ? 0.25 : 0.095;
          let maxWidthOrHeight = 1920;
          
          const targetFileType = preserveFormat ? file.type : 'image/webp';
          
          const options = {
            maxSizeMB: maxSizeMB,
            maxWidthOrHeight: maxWidthOrHeight,
            useWebWorker: true,
            fileType: targetFileType
          };
          
          let compressedFile = await imageCompression(file, options);
          
          if (!preserveFormat) {
            let attempts = 0;
            while (compressedFile.size >= 100 * 1024 && attempts < 3) {
              attempts++;
              maxWidthOrHeight = Math.floor(maxWidthOrHeight * 0.75);
              maxSizeMB = maxSizeMB * 0.8;
              compressedFile = await imageCompression(compressedFile as File, {
                maxSizeMB: maxSizeMB,
                maxWidthOrHeight: maxWidthOrHeight,
                useWebWorker: true,
                fileType: 'image/webp'
              });
            }
          }

          fileToUpload = compressedFile;
          if (!preserveFormat) {
            extension = 'webp';
          }
        }
        
        // 2. Upload to Firebase Storage via Server Action
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const formData = new FormData();
        formData.append("file", fileToUpload, `${baseName}.${extension}`);
        
        const uploadRes = await uploadMediaFile(formData);
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || "Upload failed on server");
        }
        const url = uploadRes.url;

        // 3. Add to Media Library
        const libraryName = isVideo ? file.name : `${baseName}.${extension}`;
        await addMediaToLibrary(url, libraryName);
        uploadedUrls.push(url);
      }
      
      // Reload library to show new items
      const items = await getMediaLibrary();
      setMediaItems(items || []);
      
      if (multiple) {
        onSelect(uploadedUrls);
      } else {
        onSelect(uploadedUrls[0]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("העלאה נכשלה. וודא שחוקי ה-Storage ב-Firebase מאפשרים כתיבה.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSelectGridItem = (item: any) => {
    if (multiple) {
      if (selectedItems.find(i => i.id === item.id)) {
        setSelectedItems(prev => prev.filter(i => i.id !== item.id));
        if (selectedItem?.id === item.id) {
          setSelectedItem(null);
        }
      } else {
        setSelectedItems(prev => [...prev, item]);
        setSelectedItem(item);
        setTempAlt(item.alt || "");
        setTempDesc(item.description || "");
      }
    } else {
      setSelectedItem(item);
      setTempAlt(item.alt || "");
      setTempDesc(item.description || "");
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedItem) return;
    setIsUpdatingMetadata(true);
    try {
      const res = await updateMediaMetadata(selectedItem.id, tempDesc, tempAlt);
      if (res.success) {
        setMediaItems(prev => prev.map((item: any) => {
          if (item.id === selectedItem.id) {
            return { ...item, alt: tempAlt, description: tempDesc };
          }
          return item;
        }));
        setSelectedItem({ ...selectedItem, alt: tempAlt, description: tempDesc });
        alert("הפרטים נשמרו בהצלחה!");
      } else {
        alert("שגיאה בשמירת הפרטים.");
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירת הפרטים.");
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק קובץ זה לצמיתות מהשרת?")) return;
    setIsDeleting(true);
    try {
      const res = await deleteMediaItem(selectedItem.id);
      if (res.success) {
        setMediaItems(prev => prev.filter(item => item.id !== selectedItem.id));
        setSelectedItem(null);
        alert("הקובץ נמחק בהצלחה!");
      } else {
        alert("שגיאה במחיקת הקובץ.");
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה במחיקת הקובץ.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOptimizeExistingItem = async () => {
    if (!selectedItem) return;
    setIsOptimizing(true);
    try {
      // 1. Fetch image base64 via server action (bypass CORS)
      const fetchRes = await fetchImageAsBase64(selectedItem.url);
      if (fetchRes.error || !fetchRes.base64 || !fetchRes.contentType) {
        throw new Error(fetchRes.error || "Failed to fetch image data");
      }

      // 2. Convert base64 back to a File
      const byteCharacters = atob(fetchRes.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fetchRes.contentType });
      const baseName = selectedItem.name.substring(0, selectedItem.name.lastIndexOf('.')) || selectedItem.name;
      const file = new File([blob], `${baseName}.${fetchRes.contentType.split('/')[1]}`, { type: fetchRes.contentType });

      // 3. Compress using imageCompression
      let maxSizeMB = 0.095;
      let maxWidthOrHeight = 1920;
      const mimeType = targetFormat === 'webp' ? 'image/webp' : targetFormat === 'png' ? 'image/png' : 'image/jpeg';
      const fileExt = targetFormat === 'webp' ? 'webp' : targetFormat === 'png' ? 'png' : 'jpg';

      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: mimeType
      };

      let compressedFile = await imageCompression(file, options);
      
      let attempts = 0;
      while (compressedFile.size >= 100 * 1024 && attempts < 3) {
        attempts++;
        maxWidthOrHeight = Math.floor(maxWidthOrHeight * 0.75);
        maxSizeMB = maxSizeMB * 0.8;
        compressedFile = await imageCompression(compressedFile as File, {
          maxSizeMB,
          maxWidthOrHeight,
          useWebWorker: true,
          fileType: mimeType
        });
      }

      // 4. Upload the new file to Firebase Storage via Server Action
      const formData = new FormData();
      formData.append("file", compressedFile, `${baseName}.${fileExt}`);
      const uploadRes = await uploadMediaFile(formData);
      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || "Upload failed on server");
      }
      const newUrl = uploadRes.url;

      // 5. Update Firestore
      if (keepOriginal) {
        const saveRes = await addMediaToLibrary(
          newUrl,
          `${baseName}.${fileExt}`,
          selectedItem.description || "",
          selectedItem.alt || ""
        );
        if (saveRes.success && saveRes.id) {
          const newItem = {
            id: saveRes.id,
            url: newUrl,
            name: `${baseName}.${fileExt}`,
            description: selectedItem.description || "",
            alt: selectedItem.alt || "",
            createdAt: new Date()
          };
          setMediaItems(prev => [newItem, ...prev]);
          setSelectedItem(newItem);
          
          const newKb = compressedFile.size / 1024;
          setFileSize(`${newKb.toFixed(1)} KB`);
          
          alert(`הקובץ כווץ והומר ל-${targetFormat.toUpperCase()} כעותק חדש בהצלחה!`);
        } else {
          alert("שגיאה בשמירת הקובץ החדש בבסיס הנתונים.");
        }
      } else {
        const updateRes = await updateMediaFile(selectedItem.id, newUrl, `${baseName}.${fileExt}`);
        if (updateRes.success) {
          setMediaItems(prev => prev.map((item: any) => {
            if (item.id === selectedItem.id) {
              return { ...item, url: newUrl, name: `${baseName}.${fileExt}` };
            }
            return item;
          }));
          setSelectedItem({ ...selectedItem, url: newUrl, name: `${baseName}.${fileExt}` });
          
          // Update size state immediately
          const newKb = compressedFile.size / 1024;
          setFileSize(`${newKb.toFixed(1)} KB`);
          
          alert(`הקובץ כווץ והומר ל-${targetFormat.toUpperCase()} בהצלחה (והקובץ המקורי נמחק)!`);
        } else {
          alert("העלאה הצליחה אך עדכון בסיס הנתונים נכשל.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("שגיאה במהלך אופטימיזציית הקובץ.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const filteredMediaItems = mediaItems.filter(item => {
    const query = searchQuery.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(query);
    const descMatch = item.description?.toLowerCase().includes(query);
    const altMatch = item.alt?.toLowerCase().includes(query);
    return nameMatch || descMatch || altMatch;
  });

  return (
    <>
      {customTrigger ? (
        customTrigger(() => setShowGallery(true))
      ) : (
        <div className={`flex ${compact ? "flex-col" : "gap-2"}`}>
          <div className="flex gap-2">
            <div className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-primary/20 hover:border-secondary transition-colors flex flex-col items-center justify-center bg-muted/30 ${compact ? "h-16 w-full max-w-xs" : size === 'sm' ? "h-20 w-20" : "h-32 w-32"}`}>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple={multiple}
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-secondary" />
                  <span className="text-[8px] font-bold text-secondary animate-pulse">מעבד...</span>
                </div>
              ) : (
                <>
                  <ImagePlus className={`text-primary/40 group-hover:text-secondary transition-colors ${compact || size === 'sm' ? "h-4 w-4" : ""}`} />
                  <span className={`font-bold mt-1 uppercase text-center ${compact ? "text-[8px]" : size === 'sm' ? "text-[9px]" : "text-[10px] mt-2"}`}>העלאה<br className={size === 'sm' ? 'block' : 'hidden'}/>חדשה</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              className={`rounded-xl flex flex-col items-center justify-center border-primary/10 hover:border-primary/30 ${compact ? "h-16 w-full max-w-xs gap-1" : size === 'sm' ? "h-20 w-20 gap-1" : "h-32 w-32 gap-2"}`}
              onClick={() => setShowGallery(true)}
              disabled={isUploading}
            >
              <Library className={`text-primary/40 ${compact || size === 'sm' ? "h-4 w-4" : "h-6 w-6"}`} />
              <span className={`font-bold uppercase text-center ${compact ? "text-[8px]" : size === 'sm' ? "text-[9px]" : "text-[10px]"}`}>גלריית<br className={size === 'sm' ? 'block' : 'hidden'}/>מדיה</span>
            </Button>
          </div>

          {currentImage && (
            <div className={`rounded-xl overflow-hidden border relative group shrink-0 ${compact ? "h-32 w-full max-w-sm mt-3" : size === 'sm' ? "h-20 w-20" : "h-32 w-32"}`}>
              {isVideoUrl(currentImage) ? (
                <video src={currentImage} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline />
              ) : (
                <img src={currentImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Check className="text-white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" dir="rtl">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowGallery(false)} />
          <div className="relative bg-white w-full max-w-6xl max-h-[85vh] rounded-[2.5rem] shadow-2xl border overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between bg-muted/20 text-primary">
              <div className="flex items-center gap-3">
                <Library className="h-6 w-6 text-secondary" />
                <h3 className="text-xl font-bold">גלריית מדיה</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowGallery(false)} className="rounded-full h-10 w-10 p-0">
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="p-4 border-b bg-muted/5 flex items-center gap-3">
              <div className="relative flex-grow">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, תיאור או ALT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-right"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Modal Content Wrapper (Two-Pane Layout) */}
            <div className="flex-grow flex overflow-hidden">
              {/* Grid Pane (Left Side) */}
              <div className="flex-grow p-6 overflow-y-auto min-h-[300px]">
                {isLoadingLibrary ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-secondary h-12 w-12" />
                    <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">טוען ספריית מדיה...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredMediaItems.map((item: any) => {
                      const isSelected = multiple 
                        ? selectedItems.some((i: any) => i.id === item.id) 
                        : selectedItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectGridItem(item)}
                          className={`aspect-square relative rounded-xl overflow-hidden group border-2 transition-all shadow-sm hover:shadow-md ${
                            isSelected ? 'border-secondary ring-2 ring-secondary/50 scale-95' : 'border-transparent hover:border-secondary'
                          }`}
                        >
                          {isVideoUrl(item.url) ? (
                            <video src={item.url} className="absolute inset-0 w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url} alt={item.alt || item.name} className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          <div className={`absolute inset-0 bg-secondary/10 transition-opacity flex items-center justify-center ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <Check className="text-white h-8 w-8 drop-shadow-lg" />
                          </div>
                        </button>
                      );
                    })}
                    {filteredMediaItems.length === 0 && (
                      <div className="col-span-full py-24 text-center">
                        <Library className="h-12 w-12 mx-auto text-muted/20 mb-4" />
                        <p className="text-muted-foreground font-medium">לא נמצאו קבצים מתאימים.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details & Actions Pane (Right Side) */}
              {(selectedItem || (multiple && selectedItems.length > 0)) && (
                <div className="w-80 border-r border-slate-100 bg-slate-50/50 p-6 overflow-y-auto flex flex-col gap-5 text-right shrink-0" dir="rtl">
                  {selectedItem ? (
                    <>
                      <h4 className="font-bold text-lg border-b pb-2 text-primary">פרטי המדיה</h4>
                      
                      {/* Preview */}
                      <div className="aspect-video w-full rounded-xl overflow-hidden border bg-white flex items-center justify-center relative shadow-inner">
                        {isVideoUrl(selectedItem.url) ? (
                          <video src={selectedItem.url} className="w-full h-full object-contain" controls />
                        ) : (
                          <img src={selectedItem.url} alt={selectedItem.alt || selectedItem.name} className="w-full h-full object-contain" />
                        )}
                      </div>

                      {/* Text details */}
                      <div className="space-y-1 text-xs text-muted-foreground break-all">
                        <p className="font-semibold text-foreground text-sm truncate" title={selectedItem.name}>{selectedItem.name}</p>
                        <p>תאריך: {new Date(selectedItem.createdAt).toLocaleDateString('he-IL')}</p>
                        <p>משקל קובץ: {isLoadingMetadata ? 'טוען...' : fileSize || 'לא ידוע'}</p>
                        {dimensions && (
                          <p>מידות: {dimensions.width} × {dimensions.height} פיקסלים</p>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedItem.url);
                            alert("הקישור הועתק!");
                          }}
                          className="text-secondary hover:text-secondary/80 font-semibold flex items-center gap-1 mt-2 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          העתק קישור
                        </button>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Form */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">ALT Tag (טקסט אלטרנטיבי לגוגל)</label>
                          <input
                            type="text"
                            value={tempAlt}
                            onChange={(e) => setTempAlt(e.target.value)}
                            placeholder="טקסט לקידום נגישות ו-SEO..."
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">תיאור קובץ</label>
                          <textarea
                            value={tempDesc}
                            onChange={(e) => setTempDesc(e.target.value)}
                            placeholder="תיאור מפורט..."
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary resize-none"
                          />
                        </div>

                        <Button 
                          onClick={handleSaveMetadata} 
                          disabled={isUpdatingMetadata}
                          className="w-full py-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-sm font-semibold cursor-pointer"
                        >
                          {isUpdatingMetadata ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          שמור פרטים
                        </Button>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Actions */}
                      <div className="space-y-2">
                        {/* Optimize existing item */}
                        {!isVideoUrl(selectedItem.url) && (
                          <div className="space-y-3 p-3 bg-slate-100/60 rounded-xl border border-slate-200/50 mb-1">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 block">פורמט המרה</label>
                              <select
                                value={targetFormat}
                                onChange={(e) => setTargetFormat(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary cursor-pointer"
                              >
                                <option value="webp">WebP (מומלץ)</option>
                                <option value="jpeg">JPEG</option>
                                <option value="png">PNG</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-2 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                id="keepOriginalCheckbox"
                                checked={keepOriginal}
                                onChange={(e) => setKeepOriginal(e.target.checked)}
                                className="rounded border-slate-300 text-secondary focus:ring-secondary/50 h-3.5 w-3.5 cursor-pointer"
                              />
                              <label htmlFor="keepOriginalCheckbox" className="text-xs text-foreground font-semibold cursor-pointer">
                                שמור קובץ מקורי בגלריה
                              </label>
                            </div>

                            <Button
                              variant="outline"
                              onClick={handleOptimizeExistingItem}
                              disabled={isOptimizing}
                              className="w-full py-2 flex items-center justify-center gap-2 border-secondary/20 hover:border-secondary/50 text-secondary hover:bg-secondary/5 bg-white rounded-lg text-sm font-semibold cursor-pointer"
                            >
                              {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              {isOptimizing ? 'מבצע אופטימיזציה...' : 'בצע אופטימיזציה וכיווץ'}
                            </Button>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          onClick={handleDeleteItem}
                          disabled={isDeleting}
                          className="w-full py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm font-semibold cursor-pointer"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          מחק קובץ לצמיתות
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <Check className="h-12 w-12 text-secondary mb-4 opacity-50" />
                      <h4 className="font-bold text-lg text-primary">{selectedItems.length} קבצים נבחרו</h4>
                      <p className="text-sm text-muted-foreground mt-2">לחץ על 'בחר קבצים' למטה כדי להוסיף את כולם.</p>
                    </div>
                  )}

                  {/* Select main action */}
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        if (multiple) {
                          if (selectedItems.length > 0) {
                            onSelect(selectedItems.map((i: any) => i.url));
                          } else if (selectedItem) {
                            onSelect([selectedItem.url]);
                          }
                        } else if (selectedItem) {
                          onSelect(selectedItem.url);
                        }
                        setShowGallery(false);
                      }}
                      className="w-full py-3 bg-secondary hover:bg-secondary/95 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="h-5 w-5" />
                      {multiple && selectedItems.length > 0 ? `בחר ${selectedItems.length} קבצים` : 'בחר תמונה זו'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
