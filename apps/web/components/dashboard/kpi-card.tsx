"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-5 transition-all duration-base hover:border-border-hover hover:bg-card-hover hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-subtle transition-colors group-hover:bg-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
