"use client";

import React, { useState } from "react";
import type { FormConfig } from "@/features/crm/components/CRMFormBuilder";
import { CRMFormRenderer } from "@/features/crm/components/CRMFormRenderer";
import { Modal } from "@/components/ui/Modal";

interface ImageListingItem {
  url: string;
  form?: FormConfig;
}

interface ImageListingSectionProps {
  id?: string;
  images: any[]; // string or ImageListingItem
  imagesPerRow: number;
  imagesPerRowMobile?: number;
  form?: FormConfig; // Global fallback form
  backgroundColor?: string;
  embeddingPostId?: string;
  embeddingCollection?: string;
  isEditing?: boolean;
  title?: string;
  titleColor?: string;
}

export const ImageListingSection = ({
  id = "imageListing",
  images = [],
  imagesPerRow = 4,
  imagesPerRowMobile = 1,
  form,
  backgroundColor = "#ffffff",
  embeddingPostId,
  embeddingCollection,
  isEditing = false,
  title,
  titleColor,
}: ImageListingSectionProps) => {
  const [selectedImageForm, setSelectedImageForm] = useState<FormConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageClick = (img: any) => {
    if (isEditing) return; // Disable clicks in edit mode
    
    // Extract specific form or fallback to global
    const imgForm = typeof img === "object" && img.form ? img.form : form;
    
    if (imgForm && imgForm.enabled) {
      setSelectedImageForm(imgForm);
      setIsModalOpen(true);
    }
  };

  const mobileCols = Number(imagesPerRowMobile) || 1;
  const desktopCols = Number(imagesPerRow) || 4;
  
  const widthMobile = {
    1: "w-full",
    2: "w-[calc(50%-0.5rem)]",
    3: "w-[calc(33.333%-0.666rem)]",
    4: "w-[calc(25%-0.75rem)]"
  }[mobileCols] || "w-full";

  const widthDesktop = { 
    1: "sm:w-full", 
    2: "sm:w-[calc(50%-0.5rem)]", 
    3: "sm:w-[calc(33.333%-0.666rem)]", 
    4: "sm:w-[calc(25%-0.75rem)]", 
    5: "sm:w-[calc(20%-0.8rem)]", 
    6: "sm:w-[calc(16.666%-0.833rem)]" 
  }[desktopCols] || "sm:w-[calc(25%-0.75rem)]";

  return (
    <section id={id} className="py-16 px-4 md:px-8 transition-colors duration-500" style={{ backgroundColor }} dir="rtl">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12" style={{ color: titleColor || 'var(--heading-2)' }}>
            {title}
          </h2>
        )}
        {images.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 bg-slate-50/50">
            לא נבחרו תמונות לאזור זה. בחר תמונות בעורך.
          </div>
        ) : (
          <div className="flex flex-row flex-wrap justify-center gap-4 w-full">
            {images.map((img, index) => {
              if (!img) return null;
              const url = typeof img === "string" ? img : img.url;
              if (!url) return null;

              return (
                <div 
                  key={`${url}-${index}`}
                  className={`relative aspect-square rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${widthMobile} ${widthDesktop} ${!isEditing ? "cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95" : ""}`}
                  onClick={() => handleImageClick(img)}
                >
                  <img 
                    src={url} 
                    alt={`Listing image ${index + 1}`} 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                  {!isEditing && (
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {selectedImageForm && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <Modal.Content className="max-w-md w-[95vw] p-0 overflow-hidden bg-transparent border-0 shadow-2xl relative">
            <Modal.Close className="z-50 top-6 left-6 !right-auto text-slate-400 hover:text-white bg-black/50 p-2 rounded-full" />
            
            <Modal.Body className="max-h-[85vh] p-0 custom-scrollbar">
              <CRMFormRenderer 
                config={selectedImageForm}
                formId={embeddingPostId || "home"}
                formTitle="טופס פנייה"
                embeddingCollection={embeddingCollection || "pages"}
                />
            </Modal.Body>
          </Modal.Content>
        </Modal>
      )}
    </section>
  );
};
