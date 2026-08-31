"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

interface GenericCanvasProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  initialOptions: { label: string; actionText?: string; href?: string; icon: React.ReactNode }[];
  context?: string;
}

export function GenericCanvas({ title, subtitle, icon, initialOptions }: GenericCanvasProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto p-6 text-center space-y-8" dir="rtl">
      <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-lg border border-white/10 text-amber-400">
        {icon}
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h1>
        <p className="text-slate-600 text-lg max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
        {initialOptions.map((opt, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-between p-6 bg-white border border-slate-200/80 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all text-center space-y-4 group cursor-pointer"
          >
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              {opt.icon}
            </div>
            <span className="font-bold text-slate-800 text-base">{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
