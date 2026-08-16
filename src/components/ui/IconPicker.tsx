"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  triggerClassName?: string;
  iconClassName?: string;
  placeholder?: string;
}

// A curated list of popular icons to avoid rendering 1000+ icons
const POPULAR_ICONS = [
  "Star", "Heart", "Activity", "AlertCircle", "ArrowRight", "ArrowLeft", "ArrowUpRight", 
  "Check", "X", "Info", "HelpCircle", "Users", "User", "Settings", "Mail", "Phone", 
  "MapPin", "Search", "Plus", "Home", "FileText", "Image", "Layout", "Link", "List", 
  "Menu", "MessageCircle", "Music", "Share", "ShoppingCart", "Video", "Zap", 
  "Calendar", "Camera", "Bookmark", "Bell", "BookOpen", "Globe", "Newspaper",
  "UtensilsCrossed", "DoorOpen", "ScrollText", "Coffee", "HeartHandshake",
  "Building", "Bus", "Car", "CreditCard", "Database", "Edit", "Edit2", "Edit3",
  "Eye", "EyeOff", "Flag", "Folder", "Gift", "Headphones", "Key", "Laptop",
  "Lock", "Map", "Mic", "Monitor", "Moon", "Package", "PenTool", "PieChart",
  "Play", "Printer", "Radio", "Save", "Send", "Server", "Shield", "Smile",
  "Speaker", "StarHalf", "Sun", "Tag", "Target", "ThumbsUp", "Tool", "Trash",
  "Trash2", "TrendingUp", "Truck", "Tv", "Type", "Umbrella", "Unlock", "Upload",
  "UserCheck", "UserMinus", "UserPlus", "UserX", "Volume", "Volume1", "Volume2",
  "VolumeX", "Watch", "Wifi", "WifiOff", "Wind", "ZoomIn", "ZoomOut"
];

export function IconPicker({ value, onChange, triggerClassName, iconClassName, placeholder }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = POPULAR_ICONS.filter(icon => 
    icon.toLowerCase().includes(search.toLowerCase())
  );

  const CurrentIcon = value ? ((LucideIcons as any)[value] || LucideIcons.Star) : LucideIcons.Image;

  return (
    <div className="relative">
      <div 
        className={triggerClassName || "flex items-center gap-2 border rounded-lg p-2 bg-white cursor-pointer hover:border-primary transition-colors"}
        onClick={() => setIsOpen(true)}
      >
        <div className={iconClassName || "w-8 h-8 rounded bg-slate-50 flex items-center justify-center shrink-0"}>
          <CurrentIcon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium flex-1" dir="ltr">{value || placeholder || "בחר אייקון"}</span>
        <LucideIcons.ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">בחירת אייקון</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="חפש אייקון (באנגלית)..." 
                  className="w-full pl-4 pr-10 py-2 border rounded-xl text-left bg-slate-50 focus:bg-white transition-colors"
                  dir="ltr"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredIcons.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  לא נמצאו אייקונים התואמים לחיפוש
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" dir="ltr">
                  {filteredIcons.map(iconName => {
                    const Icon = (LucideIcons as any)[iconName];
                    if (!Icon) return null;
                    return (
                      <button
                        key={iconName}
                        onClick={() => {
                          onChange(iconName);
                          setIsOpen(false);
                        }}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all ${value === iconName ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 text-slate-600'}`}
                        title={iconName}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] truncate w-full text-center">{iconName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
