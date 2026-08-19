"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface VideoGalleryProps {
  id?: string;
  images?: string[];
  videoUrl?: string;
  videoType?: "drive-direct" | "iframe" | "auto";
  effect?: "fade" | "digital-squares";
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

export const VideoGallery = ({
  id = "video-gallery",
  images = [],
  videoUrl = "",
  videoType = "auto",
  effect = "fade",
  backgroundColor = "var(--background)",
}: VideoGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Background gallery rotation
  useEffect(() => {
    const validImages = images?.filter(img => img && img.trim() !== "") || [];
    if (validImages.length <= 1 || isModalOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images, isModalOpen]);

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
          style={{ border: 'none' }}
        />
      </div>
    );
  };

  const renderGalleryBackground = () => {
    const validImages = images?.filter(img => img && img.trim() !== "") || [];

    if (validImages.length === 0) {
      return (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-500">
          לא הוגדרו תמונות לגלריה
        </div>
      );
    }

    if (effect === "digital-squares") {
      // Custom grid overlay effect
      return (
        <div className="absolute inset-0 overflow-hidden">
          {validImages.map((img, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000",
                idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
            >
              <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
              
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

    // Default Fade effect
    const safeCurrentIndex = currentIndex % validImages.length;
    return (
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={safeCurrentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <Image src={validImages[safeCurrentIndex]} alt="Gallery" fill className="object-cover" />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <section 
      id={id} 
      className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden group"
      style={{ backgroundColor: backgroundColor || "var(--background)" }}
    >
      {/* Background layer */}
      {renderGalleryBackground()}
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-500 z-10" />

      {/* Center Play Button */}
      {videoUrl && (
        <button
          type="button"
          onClick={handleOpen}
          className="relative z-20 group/btn flex items-center justify-center cursor-pointer"
          aria-label="הפעל וידאו"
        >
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150 group-hover/btn:scale-175 transition-transform duration-500" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-md border-2 border-white/30 rounded-full flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-300 shadow-2xl">
            <Play className="w-10 h-10 md:w-12 md:h-12 text-white ml-2" fill="currentColor" />
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

            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-black">
               {renderVideoPlayer()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
