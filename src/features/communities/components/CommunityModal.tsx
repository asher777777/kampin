"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Community, CommunityFile } from "../types";
import { IconPicker } from "@/components/ui/IconPicker";
import { X, Upload, FileText, File, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadMediaFile } from "@/features/media/actions";

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Community>) => Promise<void>;
  initialData?: Community;
}

const COLORS = [
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#64748b", // slate
  "#000000", // black
];

export function CommunityModal({ isOpen, onClose, onSave, initialData }: CommunityModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [color, setColor] = useState(initialData?.color || COLORS[0]);
  const [icon, setIcon] = useState(initialData?.icon || "Users");
  const [files, setFiles] = useState<CommunityFile[]>(initialData?.files || []);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    await onSave({
      name,
      color,
      icon,
      files,
    });
    setLoading(false);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await uploadMediaFile(formData);
      if (res.success && res.url) {
        let type = "unknown";
        if (selectedFile.type.includes("pdf")) type = "pdf";
        else if (selectedFile.type.includes("image")) type = "image";
        else if (selectedFile.type.includes("word") || selectedFile.type.includes("document")) type = "doc";
        
        const newFile: CommunityFile = {
          name: selectedFile.name,
          url: res.url,
          type,
          size: selectedFile.size,
          uploadedAt: new Date().toISOString(),
        };
        setFiles((prev) => [...prev, newFile]);
      } else {
        alert("שגיאה בהעלאת הקובץ");
      }
    } catch (error) {
      console.error(error);
      alert("שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (type === "image") return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type === "doc") return <FileText className="w-5 h-5 text-blue-700" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className="max-w-md w-full p-6 bg-white rounded-2xl shadow-xl">
        <div dir="rtl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{initialData ? "עריכת קהילה" : "יצירת קהילה חדשה"}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שם הקהילה</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl bg-slate-50 focus:bg-white transition-colors"
              placeholder="למשל: תורמים, לקוחות..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">אייקון</label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">צבע</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? "border-slate-400 scale-110 shadow-md" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">קבצי הקהילה</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "מעלה..." : "העלה קובץ חדש"}
              </Button>

              <div className="space-y-2 mt-4 text-right">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getFileIcon(file.type)}
                      <span className="text-sm truncate max-w-[200px]" dir="ltr">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-slate-200 rounded text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {files.length === 0 && (
                  <p className="text-sm text-slate-400 text-center">לא הועלו קבצים</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {initialData ? "שמור שינויים" : "צור קהילה"}
            </Button>
          </div>
        </form>
        </div>
      </Modal.Content>
    </Modal>
  );
}
