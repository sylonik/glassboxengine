"use client";

import { cn } from "~/lib/utils";

const steps = ["Coordinator", "Architect", "Reasoner"];

interface PipelineIndicatorProps {
  isRunning: boolean;
}

export function PipelineIndicator({ isRunning }: PipelineIndicatorProps) {
  if (!isRunning) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  i === 0 && "bg-primary",
                  i === 1 && "bg-success",
                  i === 2 && "bg-warning"
                )}
                style={{ animationDelay: `${i * 300}ms` }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </div>
      <div className="relative h-0.5 w-48 overflow-hidden rounded-full bg-surface-raised">
        <div className="absolute inset-y-0 left-[-40%] w-[40%] animate-[loading-slide_1.2s_ease_infinite] rounded-full bg-primary" />
      </div>
      <p className="text-sm text-muted-foreground">Pipeline running\u2026</p>

      <style>{`
        @keyframes loading-slide { 0% { left: -40%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
}
