"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Plus, Trash2, Edit2, GripVertical, Settings } from "lucide-react";
import { Reorder } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { IconPicker } from "@/components/ui/IconPicker";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { CourseFeature } from "./CourseBanner";

interface CourseBannerEditorProps {
  config: any;
  onUpdate: (field: string, value: any) => void;
  onUpdateFeature: (features: CourseFeature[]) => void;
}

const getIcon = (iconName: string) => {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Check;
};

export function CourseBannerEditor({ config, onUpdate, onUpdateFeature }: CourseBannerEditorProps) {
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CourseFeature>>({});

  const handleSaveFeature = () => {
    const features = config.features || [];
    if (editingFeatureId === "new") {
      const newFeature: CourseFeature = {
        id: Date.now().toString(),
        title: editForm.title || "כותרת חדשה",
        subtitle: editForm.subtitle || "",
        icon: editForm.icon || "Star",
      };
      onUpdateFeature([...features, newFeature]);
    } else {
      const updated = features.map((f: any) => f.id === editingFeatureId ? { ...f, ...editForm } as CourseFeature : f);
      onUpdateFeature(updated);
    }
    setEditingFeatureId(null);
  };

  const handleDeleteFeature = (id: string) => {
    if (confirm("האם למחוק פריט זה?")) {
      onUpdateFeature((config.features || []).filter((f: any) => f.id !== id));
    }
  };

  return (
    <div className="w-full relative z-50" dir="rtl">
      <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          הגדרות אזור התוכן המרכזי
        </h3>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">כותרת ראשית</label>
          <input 
            type="text" 
            className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
            value={config.title || ""} 
            onChange={(e) => onUpdate("title", e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">תת כותרת</label>
          <input 
            type="text" 
            className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
            value={config.subtitle || ""} 
            onChange={(e) => onUpdate("subtitle", e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">טקסט כפתור</label>
          <input 
            type="text" 
            className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400" 
            value={config.primaryButton?.text || ""} 
            onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, text: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">קישור כפתור</label>
          <input 
            type="text" 
            className="w-full text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left" dir="ltr"
            value={config.primaryButton?.link || ""} 
            onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, link: e.target.value })} 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">צבע רקע כפתור</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-12 h-10 p-1 border border-slate-700 bg-[#1e293b] rounded cursor-pointer" 
              value={config.primaryButton?.backgroundColor || "#d8435d"} 
              onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, backgroundColor: e.target.value })} 
            />
            <input 
              type="text" 
              className="flex-1 text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left uppercase" dir="ltr"
              value={config.primaryButton?.backgroundColor || "#d8435d"} 
              onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, backgroundColor: e.target.value })} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">צבע טקסט כפתור</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-12 h-10 p-1 border border-slate-700 bg-[#1e293b] rounded cursor-pointer" 
              value={config.primaryButton?.textColor || "#ffffff"} 
              onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, textColor: e.target.value })} 
            />
            <input 
              type="text" 
              className="flex-1 text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left uppercase" dir="ltr"
              value={config.primaryButton?.textColor || "#ffffff"} 
              onChange={(e) => onUpdate("primaryButton", { ...config.primaryButton, textColor: e.target.value })} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">צבע רקע מרכזי</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-12 h-10 p-1 border border-slate-700 bg-[#1e293b] rounded cursor-pointer" 
              value={config.backgroundColor || "#e8dfcd"} 
              onChange={(e) => onUpdate("backgroundColor", e.target.value)} 
            />
            <input 
              type="text" 
              className="flex-1 text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left uppercase" dir="ltr"
              value={config.backgroundColor || "#e8dfcd"} 
              onChange={(e) => onUpdate("backgroundColor", e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">צבע פס תחתון וטקסט ראשי</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-12 h-10 p-1 border border-slate-700 bg-[#1e293b] rounded cursor-pointer" 
              value={config.bottomStripeColor || "#10354b"} 
              onChange={(e) => onUpdate("bottomStripeColor", e.target.value)} 
            />
            <input 
              type="text" 
              className="flex-1 text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left uppercase" dir="ltr"
              value={config.bottomStripeColor || "#10354b"} 
              onChange={(e) => onUpdate("bottomStripeColor", e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">צבע אזור נתונים (אייקונים וטקסט)</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              className="w-12 h-10 p-1 border border-slate-700 bg-[#1e293b] rounded cursor-pointer" 
              value={config.featuresTextColor || "#10354b"} 
              onChange={(e) => onUpdate("featuresTextColor", e.target.value)} 
            />
            <input 
              type="text" 
              className="flex-1 text-sm border border-slate-700 bg-[#1e293b] text-white rounded-lg p-3 focus:outline-none focus:border-purple-400 text-left uppercase" dir="ltr"
              value={config.featuresTextColor || "#10354b"} 
              onChange={(e) => onUpdate("featuresTextColor", e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">תמונה צדדית</label>
          <ImageUpload 
            currentImage={config.imageSrc} 
            onSelect={(url) => onUpdate("imageSrc", url)} 
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h4 className="font-bold text-lg">מאפיינים ואייקונים (Features)</h4>
        <Button onClick={() => { setEditingFeatureId("new"); setEditForm({ icon: "Star" }); }} size="sm">
          <Plus className="w-4 h-4 ml-2" /> פריט חדש
        </Button>
      </div>

      {editingFeatureId && (
        <div className="bg-slate-50 p-6 rounded-xl border mb-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">כותרת</label>
            <input type="text" className="w-full border rounded-lg p-2" value={editForm.title || ""} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תת כותרת</label>
            <input type="text" className="w-full border rounded-lg p-2" value={editForm.subtitle || ""} onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">בחירת אייקון</label>
            <IconPicker 
              value={editForm.icon || "Star"} 
              onChange={(icon) => setEditForm({...editForm, icon})} 
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingFeatureId(null)}>ביטול</Button>
            <Button onClick={handleSaveFeature}>שמור פריט</Button>
          </div>
        </div>
      )}

      <Reorder.Group axis="y" values={config.features || []} onReorder={onUpdateFeature} className="space-y-2">
        {(config.features || []).map((feature: any) => (
          <Reorder.Item key={feature.id} value={feature} className="flex items-center gap-4 bg-white border p-3 rounded-xl hover:shadow-md transition-shadow group">
            <GripVertical className="w-5 h-5 text-slate-300 cursor-grab" />
            <div className="p-2 bg-slate-100 rounded-lg shrink-0">
              {(() => { const Icon = getIcon(feature.icon); return <Icon className="w-5 h-5 text-slate-600" />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate" dir="auto">{feature.title}</div>
              <div className="text-sm text-slate-500 truncate" dir="auto">{feature.subtitle}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => { setEditingFeatureId(feature.id); setEditForm(feature); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDeleteFeature(feature.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
