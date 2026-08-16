"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { stopImpersonating } from "@/features/users/impersonate";
import { LayoutDashboard } from "lucide-react";

interface OnboardingShellProps {
  children: React.ReactNode;
  userLogoUrl?: string | null;
  isImpersonating?: boolean;
}

export function OnboardingShell({
  children,
  userLogoUrl,
  isImpersonating,
}: OnboardingShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-900 md:items-center md:justify-center overflow-hidden" dir="rtl">
      
      {/* Phone Frame Wrapper (Mobile) / Fullscreen (Desktop) */}
      <div className="w-full max-w-[430px] h-[100dvh] md:max-w-full md:h-[100dvh] md:max-h-none md:aspect-auto flex flex-col relative overflow-hidden bg-[#0f172a] shadow-2xl mx-auto md:rounded-none md:border-none">
        
        {isImpersonating && (
          <div className="bg-amber-500 text-black text-center text-xs py-1.5 font-bold flex justify-center items-center gap-2">
            אתה מחובר כרגע כמשתמש
            <button
              onClick={async () => {
                await stopImpersonating();
                window.location.href = "/admin/users";
              }}
              className="px-2 py-0.5 bg-black/10 hover:bg-black/20 rounded-md transition-colors text-black flex items-center gap-1 cursor-pointer"
            >
              <LayoutDashboard className="w-3 h-3" />
              חזור לאדמין
            </button>
          </div>
        )}



        {/* Main Content Area (The Canvas) */}
        <main className={cn(
          "flex-1 min-h-0 relative w-full flex flex-col rounded-t-[2.5rem] shadow-2xl overflow-hidden border-t border-slate-700/50",
          "bg-[#0f172a] text-white"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar p-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
