"use client";

import { cn } from "~/lib/utils";

interface ConfidenceRingProps {
  value: number; // 0-1
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceRing({
  value,
  size = 36,
  strokeWidth = 3,
  className,
  showLabel = true,
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-[10px] font-medium text-muted-foreground">
          {Math.round(value * 100)}
        </span>
      )}
    </div>
  );
}
