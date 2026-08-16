"use client";

import React, { useState } from "react";
import { SmartOfficeDocument, SmartOfficeTab, SmartWorkerConfig } from "@/lib/types/office";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { SmartWorkerSettings } from "./SmartWorkerSettings";
import { 
  X, 
  Plus, 
  Trash2, 
  Loader2, 
  Sliders, 
  Video, 
  Image as ImageIcon,
  ShieldCheck,
  Wrench,
  ChevronUp,
  ChevronDown,
  Folder,
  Bot
} from "lucide-react";

interface SmartOfficeEditorProps {
  office: SmartOfficeDocument;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedOffice: SmartOfficeDocument) => void;
}

export function SmartOfficeEditor({
  office,
  isOpen,
  onClose,
  onSaveSuccess,
}: SmartOfficeEditorProps) {
  const [formData, setFormData] = useState<SmartOfficeDocument>(office);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [moduleMode, setModuleMode] = useState<"tabs_layout" | "agent_instructions">("tabs_layout");

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof SmartOfficeDocument, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (index: number, field: keyof SmartOfficeTab, value: any) => {
    setFormData((prev) => {
      const newTabs = [...prev.tabs];
      newTabs[index] = { ...newTabs[index], [field]: value };
      return { ...prev, tabs: newTabs };
    });
  };

  const handleAddTab = () => {
    const newTab: SmartOfficeTab = {
      id: `tab-${Date.now()}`,
      title: "new-tab-mode.",
      subtitle: "smart worker task description",
      mediaType: "image",
      mediaUrl: "/edoffice/ed.webp",
      tools: ["general_assistant"],
      permissions: ["read"],
      loopMedia: true,
      mutedMedia: true,
      systemPrompt: "You are a smart agent assisting with workspace tasks."
    };
    setFormData((prev) => ({
      ...prev,
      tabs: [...prev.tabs, newTab],
    }));
    setActiveTabIdx(formData.tabs.length);
  };

  const handleDeleteTab = (index: number) => {
    if (formData.tabs.length <= 1) {
      alert("At least one tab is required in the office UI.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      tabs: prev.tabs.filter((_, idx) => idx !== index),
    }));
    if (activeTabIdx >= formData.tabs.length - 1) {
      setActiveTabIdx(Math.max(0, formData.tabs.length - 2));
    }
  };

  const handleMoveTab = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formData.tabs.length) return;

    setFormData((prev) => {
      const newTabs = [...prev.tabs];
      const temp = newTabs[index];
      newTabs[index] = newTabs[targetIdx];
      newTabs[targetIdx] = temp;
      return { ...prev, tabs: newTabs };
    });
    setActiveTabIdx(targetIdx);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/office/${formData.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save office settings");
      }

      const data = await res.json();
      if (data.office) {
        onSaveSuccess(data.office);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving office: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentEditingTab = formData.tabs[activeTabIdx] || formData.tabs[0];

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans text-white" dir="ltr" lang="en">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Editor Header */}
        <div className="p-5 border-b border-amber-500/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-400">Smart Office Editor ({formData.slug})</h2>
              <p className="text-xs text-slate-400">Configure tabs, media, tools & agent instructions</p>
            </div>
          </div>
          
          {/* Module Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-amber-500/30 rounded-2xl">
            <button
              onClick={() => setModuleMode("tabs_layout")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                moduleMode === "tabs_layout"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Tabs & Layout
            </button>
            <button
              onClick={() => setModuleMode("agent_instructions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                moduleMode === "agent_instructions"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Agent Instructions & Permissions</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {moduleMode === "agent_instructions" ? (
            /* DEDICATED AGENT INSTRUCTIONS & PERMISSION MATRIX TAB */
            <SmartWorkerSettings
              officeSlug={formData.slug}
              config={formData.smartWorkerConfig}
              onSaveSuccess={(savedConfig: SmartWorkerConfig) => {
                setFormData((prev) => ({ ...prev, smartWorkerConfig: savedConfig }));
              }}
            />
          ) : (
            /* TABS & LAYOUT EDITOR */
            <>
              {/* General Office Settings */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Global Branding & Agent Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Header Brand Title</label>
                    <input
                      type="text"
                      value={formData.headerBrand || "M.A.M"}
                      onChange={(e) => handleFieldChange("headerBrand", e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Header Subtitle</label>
                    <input
                      type="text"
                      value={formData.headerSubtitle || "Smart digital offices"}
                      onChange={(e) => handleFieldChange("headerSubtitle", e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Agent Name</label>
                    <input
                      type="text"
                      value={formData.agentName || "David"}
                      onChange={(e) => handleFieldChange("agentName", e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Agent Button Title</label>
                    <input
                      type="text"
                      value={formData.agentTitle || "Check with David."}
                      onChange={(e) => handleFieldChange("agentTitle", e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs Management */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Office Tabs Management ({formData.tabs.length})
                  </h3>
                  <button
                    onClick={handleAddTab}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Add New Tab
                  </button>
                </div>

                {/* Tab selector bar */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.tabs.map((tab, idx) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabIdx(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 border ${
                        activeTabIdx === idx
                          ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-400/40"
                      }`}
                    >
                      <span>{tab.title}</span>
                      <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100">
                        {idx > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveTab(idx, "up"); }}
                            title="Move left/up"
                            className="p-0.5 hover:text-white"
                          >
                            <ChevronUp className="w-3 h-3 rotate-[270deg]" />
                          </button>
                        )}
                        {idx < formData.tabs.length - 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveTab(idx, "down"); }}
                            title="Move right/down"
                            className="p-0.5 hover:text-white"
                          >
                            <ChevronDown className="w-3 h-3 rotate-[270deg]" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Tab Form Fields */}
                {currentEditingTab && (
                  <div className="p-4 bg-slate-900/90 border border-amber-400/30 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-amber-400">Editing Tab #{activeTabIdx + 1}: {currentEditingTab.title}</span>
                      <button
                        onClick={() => handleDeleteTab(activeTabIdx)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Tab
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Tab Title</label>
                        <input
                          type="text"
                          value={currentEditingTab.title}
                          onChange={(e) => handleTabChange(activeTabIdx, "title", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Tab Subtitle / Role Prompt</label>
                        <input
                          type="text"
                          value={currentEditingTab.subtitle || ""}
                          onChange={(e) => handleTabChange(activeTabIdx, "subtitle", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Media Type & Upload */}
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 font-semibold">Media Type</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name={`mediaType-${activeTabIdx}`}
                            value="image"
                            checked={currentEditingTab.mediaType === "image"}
                            onChange={() => handleTabChange(activeTabIdx, "mediaType", "image")}
                            className="accent-amber-400"
                          />
                          <ImageIcon className="w-4 h-4 text-amber-400" />
                          <span>Image</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name={`mediaType-${activeTabIdx}`}
                            value="video"
                            checked={currentEditingTab.mediaType === "video"}
                            onChange={() => handleTabChange(activeTabIdx, "mediaType", "video")}
                            className="accent-amber-400"
                          />
                          <Video className="w-4 h-4 text-amber-400" />
                          <span>Video</span>
                        </label>
                      </div>

                      {/* Image / Video Media Upload Integration */}
                      <div className="pt-2">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Upload & Compress Media</label>
                        <ImageUpload
                          currentImage={currentEditingTab.mediaUrl}
                          onSelect={(url) => handleTabChange(activeTabIdx, "mediaUrl", url)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions with Folder Save Icon */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 dir-ltr font-mono">
            root\{formData.slug}\smart_worker_config
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            {/* Folder Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-12 h-12 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-full font-bold flex items-center justify-center shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Save Office Changes"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              ) : (
                <Folder className="w-6 h-6 text-black fill-black" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
