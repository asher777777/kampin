"use client";

import React, { useState } from "react";
import { useSpring, animated, config } from "@react-spring/web";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SquishyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  squishIntensity?: number;
}

export const SquishyButton: React.FC<SquishyButtonProps> = ({
  children,
  className,
  squishIntensity = 1.1,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const springs = useSpring({
    transform: shouldReduceMotion
      ? "scale(1)"
      : isPressed
      ? `scale(${1 / squishIntensity})`
      : isHovered
      ? `scale(${squishIntensity})`
      : "scale(1)",
    config: {
      ...config.wobbly,
      tension: 300,
      friction: 10,
    },
  });

  return (
    <animated.button
      {...props}
      style={springs}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      className={cn(
        "relative px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium",
        "transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "active:bg-primary/90",
        "shadow-sm hover:shadow-xl hover:shadow-primary/30",
        className
      )}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </animated.button>
  );
};
