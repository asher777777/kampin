import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StyledIconProps {
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * A wrapper for Lucide icons that injects the brand's secondary color (Orange-Gold)
 * as a subtle accent to the primary Navy Blue.
 */
export const BrandIcon = ({
  icon: Icon,
  className,
  iconClassName,
  size = 24,
  strokeWidth = 1.5,
}: StyledIconProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Subtle background glow or accent dot */}
      <div 
        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary opacity-80" 
        aria-hidden="true"
      />
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        className={cn("text-primary transition-colors", iconClassName)}
        style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
      />
    </div>
  );
};
