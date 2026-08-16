"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { CenterSettingsModal } from "./CenterSettingsModal";
import { DashboardQuickActions } from "@/app/dashboard/DashboardQuickActions";
import { MosaicMenuModal } from "./MosaicMenuModal";

export interface RhombusMenuItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface RhombusMenuProps {
  topRight: RhombusMenuItemProps;
  topLeft: RhombusMenuItemProps;
  bottomRight: RhombusMenuItemProps;
  bottomLeft: RhombusMenuItemProps;
  center: {
    content: ReactNode;
  };
  hideFixedButtons?: boolean;
}

export function RhombusMenu({
  topRight,
  topLeft,
  bottomRight,
  bottomLeft,
  center,
  hideFixedButtons = false,
}: RhombusMenuProps) {
  const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);

  // Dispatches a custom event to open the sidebar. The DashboardSidebar component or parent shell should listen to this, 
  // or we can rely on a context. Since we don't have a context handy for this, we use a custom event.
  const handleOpenMenu = () => {
    window.dispatchEvent(new CustomEvent("open-dashboard-sidebar"));
    // Fallback: If there's an existing toggle logic, it might be looking for clicks.
    // For now we assume a custom event will be hooked up in DashboardShell or Layout.
  };

  // Dispatches a custom event to open the quick actions modal
  const handleOpenQuickActions = () => {
    window.dispatchEvent(new CustomEvent("open-quick-actions"));
  };

  const renderItem = (item: RhombusMenuItemProps, style?: React.CSSProperties) => {
    const Inner = (
      <>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-amber-500/10 to-transparent transition-opacity duration-500" />
        <div 
          className="flex flex-col items-center justify-center text-center p-2 relative z-10 w-full h-full"
          style={{ transform: "rotate(-45deg)" }}
        >
          {item.icon}
          <span className="text-amber-500 font-bold tracking-wide text-xs sm:text-sm md:text-base mt-1.5 md:mt-2 whitespace-nowrap">{item.label}</span>
        </div>
      </>
    );

    const className = "absolute z-10 bg-[#0a0a0a] border border-amber-500/60 hover:bg-[#111] transition-colors shadow-2xl flex items-center justify-center group cursor-pointer overflow-hidden animate-in fade-in zoom-in duration-700 fill-mode-both";

    if (item.href) {
      return (
        <Link href={item.href} className={className} style={style}>
          {Inner}
        </Link>
      );
    }

    return (
      <button onClick={item.onClick} className={className} style={style}>
        {Inner}
      </button>
    );
  };

  return (
    <>
      <div 
        className="relative w-full h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
        style={{ 
          '--s': 'min(calc((100vw - 13px) / 2.121), 180px)',
          '--c': 'var(--s)',
          '--offset': 'calc(var(--s) + 5px)'
        } as React.CSSProperties}
      >
        {!hideFixedButtons && (
          <>
            {/* Top Menu Button - Fixed Top Center */}
            <div className="absolute top-8 md:top-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 fade-in duration-700">
              <button 
                onClick={handleOpenMenu}
                className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 transition-transform group border border-amber-500/30"
              >
                <Menu className="w-6 h-6 md:w-8 md:h-8 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>

            {/* Bottom Plus Button - Fixed Bottom Center */}
            <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-700">
              <button 
                onClick={handleOpenQuickActions}
                className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex items-center justify-center hover:scale-105 transition-transform hover:shadow-[0_15px_40px_rgba(245,158,11,0.3)] group border border-amber-500/30"
              >
                <Plus className="w-8 h-8 md:w-10 md:h-10 text-amber-500 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </>
        )}

        <div className="z-10 flex flex-col items-center justify-center w-full max-w-5xl px-0 py-12">
          <div className="relative flex items-center justify-center w-full min-h-[400px]">
            <div 
              className="relative"
              style={{ 
                width: '0px',
                height: '0px',
                transform: "rotate(45deg)",
              }}
            >
              {/* Top Left Visually -> Unrotated Left (L) -> X = -offset, Y = 0 */}
              {renderItem(topLeft, {
                width: 'var(--s)', height: 'var(--s)',
                top: '0', left: 'calc(var(--offset) * -1)',
                transform: 'translate(-50%, -50%)'
              })}

              {/* Top Right Visually -> Unrotated Top (T) -> X = 0, Y = -offset */}
              {renderItem(topRight, {
                width: 'var(--s)', height: 'var(--s)',
                top: 'calc(var(--offset) * -1)', left: '0',
                transform: 'translate(-50%, -50%)'
              })}

              {/* Center */}
              <div 
                className="absolute z-20 flex items-center justify-center"
                style={{
                  width: 'var(--c)',
                  height: 'var(--c)',
                  top: '0',
                  left: '0',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button 
                  onClick={() => setIsCenterModalOpen(true)}
                  className="w-full h-full bg-[#0a0a0a] border border-amber-500/30 shadow-[0_0_80px_rgba(245,158,11,0.5)] flex items-center justify-center overflow-hidden relative cursor-pointer hover:scale-105 transition-transform duration-500 animate-in zoom-in fade-in duration-700 delay-150 fill-mode-both"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-amber-600 to-black opacity-90" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.2),transparent,rgba(252,211,77,0.5),transparent)] animate-spin-slow blur-sm mix-blend-screen" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-[conic-gradient(from_180deg,transparent,rgba(245,158,11,0.6),transparent,rgba(254,240,138,0.8),transparent)] animate-[spin_4s_linear_infinite_reverse] blur-md mix-blend-screen" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,211,77,0.8)_0%,transparent_50%)] mix-blend-overlay" />
                  
                  <div 
                    className="relative z-10 flex flex-col items-center justify-center w-full h-full"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    {center.content}
                  </div>
                </button>
              </div>

              {/* Bottom Right Visually -> Unrotated Right (R) -> X = offset, Y = 0 */}
              {renderItem(bottomRight, {
                width: 'var(--s)', height: 'var(--s)',
                top: '0', left: 'var(--offset)',
                transform: 'translate(-50%, -50%)'
              })}

              {/* Bottom Left Visually -> Unrotated Bottom (B) -> X = 0, Y = offset */}
              {renderItem(bottomLeft, {
                width: 'var(--s)', height: 'var(--s)',
                top: 'var(--offset)', left: '0',
                transform: 'translate(-50%, -50%)'
              })}
            </div>
          </div>
        </div>
      </div>

      <CenterSettingsModal 
        isOpen={isCenterModalOpen} 
        onClose={() => setIsCenterModalOpen(false)} 
      />

      {!hideFixedButtons && (
        <>
          <DashboardQuickActions />
          <MosaicMenuModal />
        </>
      )}
    </>
  );
}
