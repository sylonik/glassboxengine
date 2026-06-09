import { cn } from "~/lib/utils";

interface StatusDotProps {
  status: "success" | "warning" | "danger" | "info" | "active" | "idle";
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<StatusDotProps["status"], string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  active: "bg-primary",
  idle: "bg-text-muted",
};

export function StatusDot({ status, pulse = false, className }: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            statusColors[status]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          statusColors[status]
        )}
      />
    </span>
  );
}
