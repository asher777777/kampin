"use client";

import React, { useState } from "react";
import { useSprings, animated, config } from "@react-spring/web";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface SquishyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SquishyTabs: React.FC<SquishyTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const springs = useSprings(
    tabs.length,
    tabs.map((tab) => ({
      scale: shouldReduceMotion ? 1 : hoveredTab === tab.id ? 1.05 : 1,
      opacity: activeTab === tab.id ? 1 : 0.6,
      config: config.stiff,
    }))
  );

  return (
    <div className={cn("flex p-1 bg-muted/50 rounded-2xl backdrop-blur-md", className)}>
      {springs.map((props, index) => {
        const tab = tabs[index];
        const isActive = activeTab === tab.id;

        return (
          <animated.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={props}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-xl transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background rounded-xl shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </animated.button>
        );
      })}
    </div>
  );
};
