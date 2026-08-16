"use client";

import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "low" | "medium" | "high";
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className,
  intensity = "medium",
}) => {
  const filterId = useId();
  const shouldReduceMotion = useReducedMotion();

  const filterValues = {
    low: { scale: 5, baseFreq: "0.01 0.01" },
    medium: { scale: 15, baseFreq: "0.02 0.02" },
    high: { scale: 30, baseFreq: "0.05 0.05" },
  };

  const { scale, baseFreq } = filterValues[intensity];

  return (
    <div className={cn("relative isolate", className)}>
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFreq}
              numOctaves="3"
              result="noise"
            >
              {!shouldReduceMotion && (
                <animate
                  attributeName="baseFrequency"
                  values={`${baseFreq}; ${parseFloat(baseFreq.split(" ")[0]) * 1.5} ${parseFloat(baseFreq.split(" ")[1]) * 1.2}; ${baseFreq}`}
                  dur="10s"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={shouldReduceMotion ? scale / 2 : scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        style={{ filter: `url(#${filterId})` }}
        className="relative h-full w-full"
      >
        <div className="absolute inset-0 -z-10 bg-white/10 backdrop-blur-xl transition-all duration-500" />
        {children}
      </motion.div>
    </div>
  );
};
