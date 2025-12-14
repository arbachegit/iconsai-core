import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  infoContent?: React.ReactNode;
  onInfoClick?: () => void;
  className?: string;
}

export function StatBadge({
  label,
  value,
  unit,
  trend,
  infoContent,
  onInfoClick,
  className,
}: StatBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleInfoClick = () => {
    if (onInfoClick) {
      onInfoClick();
    }
  };

  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg",
        "border border-primary/30 bg-transparent",
        "transition-all duration-200",
        "hover:bg-primary/5 hover:border-primary/50",
        className
      )}
    >
      {/* Info Button */}
      {(infoContent || onInfoClick) && (
        <button
          onClick={handleInfoClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={cn(
            "absolute top-2 right-2",
            "w-5 h-5 rounded-full",
            "border border-white/50",
            "flex items-center justify-center",
            "text-xs font-semibold text-white/70",
            "transition-all duration-200",
            "hover:bg-orange-500 hover:border-orange-500 hover:text-white",
            "cursor-pointer"
          )}
        >
          i
        </button>
      )}

      {/* Label */}
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>

      {/* Value and Trend */}
      <div className="flex items-center gap-2 mt-1">
        <span className="font-bold text-lg">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </span>

        {trend && (
          <span
            className={cn(
              "flex items-center",
              trend === "up" && "text-green-500",
              trend === "down" && "text-red-500",
              trend === "stable" && "text-yellow-500"
            )}
          >
            {trend === "up" && <TrendingUp className="h-4 w-4" />}
            {trend === "down" && <TrendingDown className="h-4 w-4" />}
            {trend === "stable" && <Minus className="h-4 w-4" />}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatBadge;
