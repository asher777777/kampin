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
  Copy,
  Upload,
  ExternalLink,
  Maximize2
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
import { cn } from "@/lib/utils";

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
  const [isDragging, setIsDragging] = useState(false);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewFit, setPreviewFit] = useState<'contain' | 'cover'>('contain');

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

  const processFiles = async (files: File[], isFromModal: boolean = false) => {
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (validFiles.length === 0) {
      alert("אנא בחר או גרור קבצי תמונה או וידאו תקינים בלבד.");
      return;
    }

    const filesToUpload = (multiple || isFromModal) ? validFiles : [validFiles[0]];
    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    try {
      const uploadedUrls: string[] = [];
      const newItems: any[] = [];
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress({ current: i + 1, total: filesToUpload.length });

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
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        // 2. Upload to Firebase Storage (Server Action with Client fallback)
        let url = "";
        try {
          const formData = new FormData();
          formData.append("file", fileToUpload, `${baseName}.${extension}`);
          const uploadRes = await uploadMediaFile(formData);
          if (uploadRes?.success && uploadRes.url) {
            url = uploadRes.url;
          }
        } catch (serverErr) {
          console.warn("Server action upload failed, using client Firebase Storage fallback:", serverErr);
        }

        if (!url) {
          // Direct client-side upload to Firebase Storage
          const storageRef = ref(storage, `uploads/${Date.now()}_${baseName}.${extension}`);
          const snapshot = await uploadBytes(storageRef, fileToUpload);
          url = await getDownloadURL(snapshot.ref);
        }

        if (!url) {
          throw new Error("לא ניתן היה להעלות את הקובץ");
        }

        // 3. Add to Media Library
        const libraryName = isVideo ? file.name : `${baseName}.${extension}`;
        let docId = "";
        try {
          const libRes = await addMediaToLibrary(url, libraryName);
          if (libRes?.id) docId = libRes.id;
        } catch (libErr) {
          console.warn("Could not save to library collection:", libErr);
        }
        
        uploadedUrls.push(url);
        newItems.push({
          id: docId || `media_${Date.now()}_${i}`,
          url,
          name: libraryName,
          description: "",
          alt: "",
          createdAt: new Date()
        });
      }
      
      // Reload library to show new items
      try {
        const items = await getMediaLibrary();
        if (items && items.length > 0) {
          setMediaItems(items);
        } else {
          setMediaItems(prev => [...newItems, ...prev]);
        }
      } catch (e) {
        console.warn("Failed to reload media library:", e);
        setMediaItems(prev => [...newItems, ...prev]);
      }
      
      if (isFromModal) {
        if (newItems.length > 0) {
          const firstUploaded = newItems[0];
          setSelectedItem(firstUploaded);
          setTempAlt("");
          setTempDesc("");
          if (multiple) {
            setSelectedItems(prev => [...newItems, ...prev]);
          }
        }
      } else {
        if (multiple) {
          onSelect(uploadedUrls);
        } else {
          onSelect(uploadedUrls[0]);
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("העלאה נכשלה. וודא שחוקי ה-Storage ב-Firebase מאפשרים כתיבה.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, isFromModal = false) => {
    const files = Array.from(e.target.files || []);
    processFiles(files, isFromModal);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
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
        <div className={`flex flex-wrap items-center ${compact ? "flex-col" : "gap-2"}`}>
          <div className="flex gap-2 items-center">
            <div 
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center select-none",
                isDragging 
                  ? "border-amber-500 bg-amber-500/15 scale-105 ring-2 ring-amber-500/40" 
                  : "border-primary/20 hover:border-secondary bg-muted/30",
                compact ? "h-16 w-full max-w-xs" : size === 'sm' ? "h-16 w-16 sm:h-20 sm:w-20" : "h-24 w-24 sm:h-32 sm:w-32"
              )}
            >
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple={multiple}
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-1.5 p-2 text-center">
                  <Loader2 className="animate-spin text-secondary h-5 w-5" />
                  <span className="text-[9px] font-bold text-secondary animate-pulse">
                    {uploadProgress && uploadProgress.total > 1
                      ? `מעלה ${uploadProgress.current}/${uploadProgress.total}...`
                      : "מעבד..."}
                  </span>
                </div>
              ) : isDragging ? (
                <div className="flex flex-col items-center gap-1 text-center animate-pulse">
                  <ImagePlus className="text-amber-500 h-6 w-6" />
                  <span className="text-[9px] font-extrabold text-amber-500">שחרר קבצים!</span>
                </div>
              ) : (
                <>
                  <ImagePlus className={`text-primary/40 group-hover:text-secondary transition-colors ${compact || size === 'sm' ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6"}`} />
                  <span className={`font-bold mt-1 uppercase text-center ${compact ? "text-[8px]" : size === 'sm' ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[10px] mt-1 sm:mt-2"}`}>
                    העלאה<br className={size === 'sm' ? 'block' : 'hidden'}/>חדשה
                    {multiple && size !== 'sm' && !compact && (
                      <span className="hidden sm:block text-[8px] font-normal text-muted-foreground normal-case mt-0.5">(או גרור קבצים)</span>
                    )}
                  </span>
                </>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className={`rounded-xl flex flex-col items-center justify-center border-primary/10 hover:border-primary/30 cursor-pointer ${compact ? "h-16 w-full max-w-xs gap-1" : size === 'sm' ? "h-16 w-16 sm:h-20 sm:w-20 gap-1" : "h-24 w-24 sm:h-32 sm:w-32 gap-1.5 sm:gap-2"}`}
              onClick={() => setShowGallery(true)}
              disabled={isUploading}
            >
              <Library className={`text-primary/40 ${compact || size === 'sm' ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6"}`} />
              <span className={`font-bold uppercase text-center ${compact ? "text-[8px]" : size === 'sm' ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[10px]"}`}>גלריית<br className={size === 'sm' ? 'block' : 'hidden'}/>מדיה</span>
            </Button>
          </div>

          {currentImage && (
            <div className={`rounded-xl overflow-hidden border relative group shrink-0 ${compact ? "h-32 w-full max-w-sm mt-2" : size === 'sm' ? "h-16 w-16 sm:h-20 sm:w-20" : "h-24 w-24 sm:h-32 sm:w-32"}`}>
              {isVideoUrl(currentImage) ? (
                <video src={currentImage} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline />
              ) : (
                <img src={currentImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Check className="text-white h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && mounted && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6" dir="rtl">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowGallery(false)} />
          <div className="relative bg-white w-full max-w-6xl h-[94vh] sm:h-[88vh] md:h-[85vh] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-2xl border overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 md:p-6 border-b flex items-center justify-between bg-muted/20 text-primary shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Library className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                <div>
                  <h3 className="text-base sm:text-xl font-bold leading-none">גלריית מדיה</h3>
                  <p className="hidden sm:block text-xs text-muted-foreground mt-1">בחר מדיה קיימת או העלה קבצים חדשים ישירות לגלריה</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="gallery-modal-upload-input"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={(e) => handleUpload(e, true)}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById("gallery-modal-upload-input")?.click()}
                  disabled={isUploading}
                  className="bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm shadow-sm cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      <span>{uploadProgress && uploadProgress.total > 1 ? `מעלה ${uploadProgress.current}/${uploadProgress.total}...` : 'מעלה...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>העלאת קבצים</span>
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowGallery(false)} className="rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="p-3 sm:p-4 border-b bg-muted/5 flex items-center gap-3 shrink-0">
              <div className="relative flex-grow">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, תיאור או ALT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 sm:py-2.5 border rounded-xl bg-background text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-right"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Modal Content Wrapper (Two-Pane Layout: Responsive column on mobile, row on desktop) */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative min-h-0">
              {/* Grid Pane */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isModalDragging) setIsModalDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isModalDragging) setIsModalDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsModalDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsModalDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(Array.from(e.dataTransfer.files), true);
                  }
                }}
                className="flex-grow p-3 sm:p-4 md:p-6 overflow-y-auto min-h-0 relative"
              >
                {/* Drag Overlay */}
                {isModalDragging && (
                  <div className="absolute inset-2 sm:inset-4 z-50 bg-amber-500/10 backdrop-blur-sm border-2 border-dashed border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200 select-none pointer-events-none">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 shadow-lg">
                      <ImagePlus className="h-6 w-6 sm:h-8 sm:w-8 animate-bounce" />
                    </div>
                    <p className="text-sm sm:text-base font-extrabold text-amber-600">שחרר קבצים כאן כדי להעלות אותם לגלריה!</p>
                  </div>
                )}

                {isLoadingLibrary ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-secondary h-10 w-10 sm:h-12 sm:w-12" />
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">טוען ספריית מדיה...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                    {/* First Card: Quick Upload Dropzone Tile */}
                    <div 
                      onClick={() => !isUploading && document.getElementById("gallery-modal-upload-input")?.click()}
                      className={cn(
                        "aspect-square relative rounded-xl border-2 border-dashed border-primary/20 hover:border-secondary bg-muted/20 hover:bg-secondary/5 transition-all flex flex-col items-center justify-center cursor-pointer p-2.5 sm:p-3 text-center group shadow-sm hover:shadow-md select-none",
                        isUploading && "pointer-events-none opacity-60 bg-secondary/5 border-secondary/40"
                      )}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                          <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-secondary" />
                          <span className="text-[10px] sm:text-[11px] font-bold text-secondary animate-pulse">
                            {uploadProgress && uploadProgress.total > 1
                              ? `מעלה ${uploadProgress.current}/${uploadProgress.total}...`
                              : "מעלה לגלריה..."}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 group-hover:bg-secondary/20 transition-all text-secondary">
                            <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <span className="text-xs font-bold text-foreground">העלאה לגלריה</span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">לחץ או גרור קבצים</span>
                        </>
                      )}
                    </div>

                    {filteredMediaItems.map((item: any) => {
                      const isSelected = multiple 
                        ? selectedItems.some((i: any) => i.id === item.id) 
                        : selectedItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectGridItem(item)}
                          className={`aspect-square relative rounded-xl overflow-hidden group border-2 transition-all shadow-sm hover:shadow-md bg-slate-100 ${
                            isSelected ? 'border-secondary ring-2 ring-secondary/50 scale-95' : 'border-transparent hover:border-secondary'
                          }`}
                        >
                          {isVideoUrl(item.url) ? (
                            <video src={item.url} className="absolute inset-0 w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url} alt={item.alt || item.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          <div className={`absolute inset-0 bg-secondary/10 transition-opacity flex items-center justify-center ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <Check className="text-white h-6 w-6 sm:h-8 sm:w-8 drop-shadow-lg" />
                          </div>
                        </button>
                      );
                    })}
                    {filteredMediaItems.length === 0 && searchQuery && (
                      <div className="col-span-full py-16 text-center">
                        <Library className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted/20 mb-3" />
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">לא נמצאו קבצים התואמים לחיפוש "{searchQuery}".</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details & Actions Pane (Responsive: Sidebar on Desktop, Bottom Sheet on Mobile) */}
              {(selectedItem || (multiple && selectedItems.length > 0)) && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-r border-slate-200 bg-slate-50/95 md:bg-slate-50/50 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 sm:gap-5 text-right shrink-0 max-h-[50vh] md:max-h-full shadow-lg md:shadow-none z-10" dir="rtl">
                  {selectedItem ? (
                    <>
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="font-bold text-base sm:text-lg text-primary">פרטי המדיה</h4>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(null)}
                          className="md:hidden text-xs text-muted-foreground hover:text-foreground px-2 py-1 bg-slate-200/60 rounded-lg cursor-pointer"
                        >
                          סגור פרטים
                        </button>
                      </div>
                      
                      {/* Responsive Preview with Contain / Cover adaptation toggle */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border bg-slate-200/50 flex items-center justify-center group shadow-inner">
                        {isVideoUrl(selectedItem.url) ? (
                          <video 
                            src={selectedItem.url} 
                            className={`w-full h-full ${previewFit === 'cover' ? 'object-cover' : 'object-contain'}`} 
                            controls 
                          />
                        ) : (
                          <img 
                            src={selectedItem.url} 
                            alt={selectedItem.alt || selectedItem.name} 
                            className={`w-full h-full transition-all duration-200 ${previewFit === 'cover' ? 'object-cover' : 'object-contain'}`} 
                          />
                        )}

                        {/* View Controls Overlay */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setPreviewFit(f => f === 'contain' ? 'cover' : 'contain')}
                            className="bg-black/70 hover:bg-black/90 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm transition-all cursor-pointer font-medium"
                            title="החלף התאמת גודל תמונה לתצוגה"
                          >
                            {previewFit === 'contain' ? 'התאמה מלאה' : 'מילוי שטח'}
                          </button>
                          <a
                            href={selectedItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black/70 hover:bg-black/90 text-white p-1 rounded-md backdrop-blur-sm transition-all"
                            title="פתח תמונה בגודל מלא"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
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
                          className="text-secondary hover:text-secondary/80 font-semibold flex items-center gap-1 mt-1.5 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          העתק קישור
                        </button>
                      </div>

                      <hr className="border-slate-200/60" />

                      {/* Form */}
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">ALT Tag (טקסט אלטרנטיבי לגוגל)</label>
                          <input
                            type="text"
                            value={tempAlt}
                            onChange={(e) => setTempAlt(e.target.value)}
                            placeholder="טקסט לקידום נגישות ו-SEO..."
                            className="w-full px-3 py-2 border rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-foreground">תיאור קובץ</label>
                          <textarea
                            value={tempDesc}
                            onChange={(e) => setTempDesc(e.target.value)}
                            placeholder="תיאור מפורט..."
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary resize-none"
                          />
                        </div>

                        <Button 
                          onClick={handleSaveMetadata} 
                          disabled={isUpdatingMetadata}
                          className="w-full py-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs sm:text-sm font-semibold cursor-pointer"
                        >
                          {isUpdatingMetadata ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          שמור פרטים
                        </Button>
                      </div>

                      <hr className="border-slate-200/60" />

                      {/* Actions */}
                      <div className="space-y-2">
                        {/* Optimize existing item */}
                        {!isVideoUrl(selectedItem.url) && (
                          <div className="space-y-2.5 p-3 bg-slate-100/80 rounded-xl border border-slate-200 mb-1">
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
                              className="w-full py-1.5 sm:py-2 flex items-center justify-center gap-2 border-secondary/20 hover:border-secondary/50 text-secondary hover:bg-secondary/5 bg-white rounded-lg text-xs sm:text-sm font-semibold cursor-pointer"
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
                          className="w-full py-1.5 sm:py-2 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          מחק קובץ לצמיתות
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                      <Check className="h-8 w-8 sm:h-12 sm:w-12 text-secondary mb-2 sm:mb-4 opacity-50" />
                      <h4 className="font-bold text-base sm:text-lg text-primary">{selectedItems.length} קבצים נבחרו</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">לחץ על 'בחר קבצים' למטה כדי להוסיף את כולם.</p>
                    </div>
                  )}

                  {/* Select main action */}
                  <div className="mt-auto pt-3 sm:pt-4 border-t border-slate-200/60 sticky bottom-0 bg-slate-50/95 py-2">
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
                      className="w-full py-2.5 sm:py-3 bg-secondary hover:bg-secondary/95 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
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
