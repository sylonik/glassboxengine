"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "~/components/ui/badge";
import { ConfidenceRing } from "~/components/ui/confidence-ring";
import { ScanEye, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

interface Factor {
  name: string;
  weight: number;
  contribution: string;
}

interface ScoreContribution {
  name: string;
  weight: number;
  rawValue: number;
  weightedValue: number;
  contribution: string;
}

// Color mapping mirrors the intent-slider palette so the breakdown reads consistently.
const FACTOR_COLORS: Record<string, string> = {
  relevance: "var(--color-accent)",
  diversity: "var(--color-success)",
  novelty: "var(--color-warning)",
  popularity: "var(--color-info)",
};

function factorColor(name: string): string {
  return FACTOR_COLORS[name.toLowerCase()] ?? "var(--color-accent)";
}

interface FeedCardProps {
  rank: number;
  name: string;
  category: string | null;
  confidenceScore: number;
  shortLabel?: string;
  detailedReasoning?: string;
  factors?: Factor[];
  scoreBreakdown?: ScoreContribution[];
  matchedSignals?: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function FeedCard({
  rank,
  name,
  category,
  confidenceScore,
  shortLabel,
  detailedReasoning,
  factors,
  scoreBreakdown,
  matchedSignals,
  isExpanded,
  onToggle,
}: FeedCardProps) {
  // Largest weighted contribution drives the bar scale so factors are comparable.
  const maxWeighted = scoreBreakdown?.length
    ? Math.max(...scoreBreakdown.map((c) => Math.abs(c.weightedValue)), 0.0001)
    : 0;
  const hasDetail =
    Boolean(detailedReasoning) ||
    (scoreBreakdown?.length ?? 0) > 0 ||
    (matchedSignals?.length ?? 0) > 0 ||
    (factors?.length ?? 0) > 0;

  return (
    <motion.div
      layout
      onClick={onToggle}
      className={cn(
        "flex gap-4 rounded-lg border p-3 cursor-pointer transition-colors duration-fast",
        isExpanded
          ? "border-primary bg-card"
          : "border-border bg-background hover:border-primary/50 hover:shadow-glow"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-raised text-xs font-bold text-muted-foreground">
        #{rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">{name}</div>
            {category && (
              <Badge variant="secondary" className="mt-1 text-[11px]">
                {category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceRing value={confidenceScore} size={34} strokeWidth={3} />
            {hasDetail && (
              <ChevronDown
                size={15}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-fast",
                  isExpanded && "rotate-180 text-primary"
                )}
              />
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {shortLabel && (
            <div className="inline-flex items-center gap-1.5 rounded-sm bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
              <ScanEye size={12} />
              <span>{shortLabel}</span>
            </div>
          )}
          {/* Matched signals collapsed into compact chips when no short label */}
          {!shortLabel &&
            matchedSignals?.slice(0, 3).map((signal) => (
              <span
                key={signal}
                className="rounded-sm bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {signal}
              </span>
            ))}
        </div>

        <AnimatePresence>
          {isExpanded && hasDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 border-t border-border pt-3">
                {detailedReasoning && (
                  <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                    {detailedReasoning}
                  </p>
                )}

                {/* Score breakdown — faithful weighted contributions per intent factor */}
                {scoreBreakdown && scoreBreakdown.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Score Breakdown
                    </div>
                    <div className="flex flex-col gap-2">
                      {scoreBreakdown.map((c) => {
                        const color = factorColor(c.name);
                        const pct = Math.min(
                          (Math.abs(c.weightedValue) / maxWeighted) * 100,
                          100
                        );
                        return (
                          <div key={c.name} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="capitalize text-foreground">
                                {c.name}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                {c.contribution}
                              </span>
                            </div>
                            <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-raised">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  background: color,
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-mono">
                                weight {c.weight.toFixed(2)}
                              </span>
                              <span className="font-mono">
                                raw {c.rawValue.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Matched signals */}
                {matchedSignals && matchedSignals.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Matched Signals
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSignals.map((signal) => (
                        <Badge key={signal} variant="secondary" className="text-[11px]">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoner factor labels (if present) */}
                {factors && factors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {factors.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-sm bg-surface-raised px-2 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">{f.name}</span>
                        <span className="font-mono text-foreground">
                          {f.contribution}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
