"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type VideoGalleryImageItem = string | { 
  url: string; 
  title?: string;
  position?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left";
};

export interface VideoGalleryProps {
  id?: string;
  images?: VideoGalleryImageItem[];
  videoUrl?: string;
  videoType?: "drive-direct" | "iframe" | "auto";
  effect?: "fade" | "digital-squares" | "zoom-in" | "slide";
  objectFit?: "cover" | "contain" | "fill" | "scale-down";
  titleEffect?: "cinematic" | "glow" | "badge" | "fade-up";
  textPosition?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left";
  heightDesktop?: "normal" | "tall" | "extra-tall" | "auto" | "natural" | string;
  backgroundColor?: string;
}

const isDirectVideoUrl = (url: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov") ||
    lower.includes(".quicktime") ||
    lower.includes("firebasestorage.googleapis.com") ||
    lower.startsWith("blob:")
  );
};

const getDriveDirectUrl = (url: string) => {
  try {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch && fileIdMatch[0]) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
    }
  } catch (e) {
    console.error("Failed to parse Google Drive URL", e);
  }
  return url;
};

const getEmbedUrl = (url: string) => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1&rel=0`;
  }
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch && fileIdMatch[0]) {
      return `https://drive.google.com/file/d/${fileIdMatch[0]}/preview`;
    }
  }
  return url;
};

const normalizeImages = (rawImages: VideoGalleryImageItem[] = []): { 
  url: string; 
  title: string; 
  position?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left";
}[] => {
  if (!Array.isArray(rawImages)) return [];
  const list: { url: string; title: string; position?: "bottom" | "top" | "center" | "bottom-right" | "bottom-left" }[] = [];
  for (const item of rawImages) {
    if (!item) continue;
    if (typeof item === "string" && item.trim()) {
      list.push({ url: item.trim(), title: "", position: undefined });
    } else if (typeof item === "object" && item.url && item.url.trim()) {
      list.push({ url: item.url.trim(), title: item.title?.trim() || "", position: item.position });
    }
  }
  return list;
};

const getObjectFitClass = (fit: string = "cover") => {
  switch (fit) {
    case "contain":
      return "object-contain";
    case "fill":
      return "object-fill";
    case "scale-down":
      return "object-scale-down";
    case "cover":
    default:
      return "object-cover";
  }
};

const getPositionClass = (position: string = "bottom") => {
  switch (position) {
    case "top":
      return "top-6 md:top-10 inset-x-0 mx-auto justify-center";
    case "bottom-right":
      return "bottom-6 md:bottom-10 right-4 md:right-10 left-auto justify-start";
    case "bottom-left":
      return "bottom-6 md:bottom-10 left-4 md:left-10 right-auto justify-end";
    case "center":
      return "top-1/2 -translate-y-1/2 inset-x-0 mx-auto justify-center";
    case "bottom":
    default:
      return "bottom-6 md:bottom-10 inset-x-0 mx-auto justify-center";
  }
};

export const VideoGallery = ({
  id = "video-gallery",
  images = [],
  videoUrl = "",
  videoType = "auto",
  effect = "fade",
  objectFit = "cover",
  titleEffect = "cinematic",
  textPosition = "bottom",
  heightDesktop = "tall",
  backgroundColor = "#0f172a",
}: VideoGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const normalizedImages = useMemo(() => normalizeImages(images), [images]);
  const fitClass = getObjectFitClass(objectFit);
  const resolvedObjectFit: React.CSSProperties["objectFit"] = (objectFit as any) || "cover";
  const isAutoHeight = heightDesktop === "auto" || heightDesktop === "natural";

  // Background gallery rotation
  useEffect(() => {
    if (normalizedImages.length <= 1 || isModalOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [normalizedImages, isModalOpen]);

  // Handle modal close
  const handleClose = () => {
    if (videoRef.current) {
      setSavedTime(videoRef.current.currentTime);
      videoRef.current.pause();
    }
    setIsModalOpen(false);
  };

  // Handle modal open
  const handleOpen = () => {
    setIsModalOpen(true);
  };

  // Handle Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        handleClose();
      }
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  // Auto-play direct video whenever modal opens
  useEffect(() => {
    if (isModalOpen && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay was prevented by browser:", err);
        });
      }
    }
  }, [isModalOpen]);

  // Determine actual video type to use
  let actualVideoType = videoType;
  if (actualVideoType === "auto") {
    if (isDirectVideoUrl(videoUrl) || videoUrl.includes("drive.google.com")) {
      actualVideoType = "drive-direct";
    } else {
      actualVideoType = "iframe";
    }
  }

  const renderVideoPlayer = () => {
    if (actualVideoType === "drive-direct") {
      const src = isDirectVideoUrl(videoUrl) ? videoUrl : getDriveDirectUrl(videoUrl);
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={src}
            className="w-full max-h-[85vh] outline-none"
            controls
            autoPlay
            playsInline
            onLoadedMetadata={() => {
              if (videoRef.current) {
                if (savedTime > 0) {
                  videoRef.current.currentTime = savedTime;
                }
                videoRef.current.play().catch(() => {});
              }
            }}
          />
        </div>
      );
    }
    
    // Fallback to iframe (YouTube / Google Drive Preview)
    const embedSrc = getEmbedUrl(videoUrl);
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <iframe
          src={embedSrc}
          className="w-full h-[85vh] md:h-[75vh]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ border: "none" }}
        />
      </div>
    );
  };

  const renderGalleryBackground = () => {
    if (normalizedImages.length === 0) {
      return (
        <div className={cn("bg-slate-900 flex items-center justify-center text-slate-500 py-20", isAutoHeight ? "w-full min-h-[300px]" : "absolute inset-0")}>
          לא הוגדרו תמונות לגלריה
        </div>
      );
    }

    const safeCurrentIndex = currentIndex % normalizedImages.length;
    const current = normalizedImages[safeCurrentIndex];

    // ==========================================
    // 1. Natural / Auto Dimensions Mode (Mobile & Desktop)
    // ==========================================
    if (isAutoHeight) {
      const imgStyle: React.CSSProperties = {
        objectFit: resolvedObjectFit,
        maxHeight: "88vh",
        maxWidth: "100%",
        width: resolvedObjectFit === "fill" ? "100%" : resolvedObjectFit === "cover" ? "100%" : "auto",
        height: resolvedObjectFit === "fill" ? "65vh" : "auto",
        display: "block",
        margin: "0 auto",
      };

      if (effect === "digital-squares") {
        return (
          <div className="w-full relative flex items-center justify-center overflow-hidden bg-inherit">
            <AnimatePresence mode="wait">
              <motion.div
                key={safeCurrentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full relative flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.title || `Gallery ${safeCurrentIndex}`}
                  style={imgStyle}
                  className={cn("transition-all duration-500", fitClass)}
                />
                
                {/* Digital squares effect layer */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ 
                        duration: 0.8, 
                        delay: Math.random() * 0.5, 
                        ease: "easeOut"
                      }}
                      className="bg-black/50"
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        );
      }

      if (effect === "zoom-in") {
        return (
          <div className="w-full relative flex items-center justify-center overflow-hidden bg-inherit">
            <AnimatePresence mode="wait">
              <motion.div
                key={safeCurrentIndex}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="w-full relative flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.title || "Gallery"}
                  style={imgStyle}
                  className={cn("transition-all duration-500", fitClass)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        );
      }

      if (effect === "slide") {
        return (
          <div className="w-full relative flex items-center justify-center overflow-hidden bg-inherit">
            <AnimatePresence mode="wait">
              <motion.div
                key={safeCurrentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="w-full relative flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.title || "Gallery"}
                  style={imgStyle}
                  className={cn("transition-all duration-500", fitClass)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        );
      }

      // Default Fade in auto height
      return (
        <div className="w-full relative flex items-center justify-center overflow-hidden bg-inherit">
          <AnimatePresence mode="wait">
            <motion.div
              key={safeCurrentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="w-full relative flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt={current.title || "Gallery"}
                style={imgStyle}
                className={cn("transition-all duration-500", fitClass)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    // ==========================================
    // 2. Fixed Height Modes (tall, normal, extra-tall)
    // ==========================================
    if (effect === "digital-squares") {
      return (
        <div className="absolute inset-0 overflow-hidden">
          {normalizedImages.map((imgObj, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000",
                idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
            >
              <Image 
                src={imgObj.url} 
                alt={imgObj.title || `Gallery ${idx}`} 
                fill 
                sizes="100vw"
                style={{ objectFit: resolvedObjectFit }}
                className={cn("transition-all duration-700", fitClass)} 
              />
              
              {/* Digital squares effect layer */}
              {idx === currentIndex && (
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none">
                   {Array.from({ length: 100 }).map((_, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 1 }}
                       animate={{ opacity: 0 }}
                       transition={{ 
                         duration: 0.8, 
                         delay: Math.random() * 0.5, 
                         ease: "easeOut"
                       }}
                       className="bg-black/50"
                     />
                   ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (effect === "zoom-in") {
      return (
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={safeCurrentIndex}
              initial={{ opacity: 0, scale: 1.15 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image 
                src={current.url} 
                alt={current.title || "Gallery"} 
                fill 
                sizes="100vw"
                style={{ objectFit: resolvedObjectFit }}
                className={cn("transition-all duration-700", fitClass)} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    if (effect === "slide") {
      return (
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={safeCurrentIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image 
                src={current.url} 
                alt={current.title || "Gallery"} 
                fill 
                sizes="100vw"
                style={{ objectFit: resolvedObjectFit }}
                className={cn("transition-all duration-700", fitClass)} 
              />
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    // Default Fade effect (fixed container)
    return (
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={safeCurrentIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <Image 
              src={current.url} 
              alt={current.title || "Gallery"} 
              fill 
              sizes="100vw"
              style={{ objectFit: resolvedObjectFit }}
              className={cn("transition-all duration-700", fitClass)} 
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderTitleOverlay = () => {
    if (normalizedImages.length === 0) return null;
    const safeCurrentIndex = currentIndex % normalizedImages.length;
    const currentItem = normalizedImages[safeCurrentIndex];
    if (!currentItem || !currentItem.title) return null;

    const titleText = currentItem.title;
    const activePosition = currentItem.position || textPosition || "bottom";
    const posClass = getPositionClass(activePosition);

    if (titleEffect === "fade-up") {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={`title-${safeCurrentIndex}-${titleText}`}
            initial={{ opacity: 0, y: activePosition === "top" ? -20 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: activePosition === "top" ? -20 : -20 }}
            transition={{ duration: 0.6 }}
            className={cn(
              "absolute inset-x-0 z-30 px-6 flex items-center text-center pointer-events-none",
              activePosition === "top" 
                ? "top-0 pt-6 md:pt-8 pb-14 bg-gradient-to-b from-black/90 via-black/50 to-transparent justify-center" 
                : "bottom-0 pb-6 md:pb-8 pt-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent justify-center"
            )}
            dir="rtl"
          >
            <h3 className="text-base md:text-2xl font-bold text-white max-w-3xl drop-shadow-md">
              {titleText}
            </h3>
          </motion.div>
        </AnimatePresence>
      );
    }

    if (titleEffect === "glow") {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={`title-${safeCurrentIndex}-${titleText}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.7 }}
            className={cn(
              "absolute z-30 max-w-2xl px-6 md:px-8 py-3 md:py-4 rounded-3xl bg-amber-950/80 backdrop-blur-lg border border-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.35)] text-center mx-4 pointer-events-none flex items-center",
              posClass
            )}
            dir="rtl"
          >
            <h3 className="text-base md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200 drop-shadow">
              {titleText}
            </h3>
          </motion.div>
        </AnimatePresence>
      );
    }

    if (titleEffect === "badge") {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key={`title-${safeCurrentIndex}-${titleText}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "absolute z-30 px-5 py-2.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-xl text-center mx-4 pointer-events-none flex items-center",
              posClass
            )}
            dir="rtl"
          >
            <p className="text-sm md:text-base font-semibold text-slate-100 tracking-wide">{titleText}</p>
          </motion.div>
        </AnimatePresence>
      );
    }

    // Default "cinematic"
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`title-${safeCurrentIndex}-${titleText}`}
          initial={{ opacity: 0, y: activePosition === "top" ? -25 : 25, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: activePosition === "top" ? -15 : -15, scale: 0.96 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute z-30 max-w-3xl mx-4 px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-black/70 backdrop-blur-md border border-amber-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3 text-center pointer-events-none",
            posClass
          )}
          dir="rtl"
        >
          <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#f59e0b] animate-pulse" />
          <h3 className="text-base md:text-2xl font-bold tracking-wide text-white drop-shadow-md">
            {titleText}
          </h3>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Compute desktop & mobile height
  const getHeightClasses = () => {
    if (isAutoHeight) {
      return "h-auto min-h-0 py-0";
    }
    if (heightDesktop === "normal") {
      return "h-[40vh] sm:h-[50vh] md:h-[60vh] min-h-[220px] sm:min-h-[300px] md:min-h-[400px]";
    }
    if (heightDesktop === "extra-tall") {
      return "h-[55vh] sm:h-[70vh] md:h-[85vh] min-h-[320px] sm:min-h-[450px] md:min-h-[580px]";
    }
    // "tall" or default (+20% on desktop)
    return "h-[48vh] sm:h-[58vh] md:h-[72vh] min-h-[260px] sm:min-h-[360px] md:min-h-[480px]";
  };

  return (
    <section 
      id={id} 
      className={cn(
        "relative w-full flex items-center justify-center overflow-hidden group transition-all duration-500",
        getHeightClasses()
      )}
      style={{ backgroundColor: backgroundColor || "#0f172a" }}
    >
      {/* Background layer */}
      {renderGalleryBackground()}
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors duration-500 z-10 pointer-events-none" />

      {/* Title Overlay */}
      {renderTitleOverlay()}

      {/* Center Play Button */}
      {videoUrl && (
        <button
          type="button"
          onClick={handleOpen}
          className="relative z-20 group/btn flex items-center justify-center cursor-pointer"
          aria-label="הפעל וידאו"
        >
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl scale-150 group-hover/btn:scale-175 transition-transform duration-500" />
          <div className="relative w-20 h-20 md:w-28 md:h-28 bg-black/40 backdrop-blur-md border-2 border-amber-400/50 hover:border-amber-400 rounded-full flex items-center justify-center hover:bg-black/60 hover:scale-110 transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <Play className="w-9 h-9 md:w-12 md:h-12 text-amber-300 ml-1.5 drop-shadow" fill="currentColor" />
          </div>
        </button>
      )}

      {/* Video Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={handleClose}
        >
          <div 
            className="relative w-full h-full max-w-6xl mx-auto flex flex-col justify-center p-4 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 left-4 md:top-6 md:left-6 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all duration-200 z-[100000] shadow-xl cursor-pointer border border-white/20 hover:scale-110 active:scale-95"
              aria-label="סגור חלון"
              title="סגור חלון (ESC)"
            >
              <X className="w-7 h-7 stroke-[2.5]" />
            </button>

            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 relative bg-black">
               {renderVideoPlayer()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
