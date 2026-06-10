"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { FlaskConical, GitCompareArrows } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { IntentSlider } from "~/components/alignment/intent-slider";
import { StatusDot } from "~/components/ui/status-dot";

interface SliderState {
  relevance: number;
  diversity: number;
  novelty: number;
  popularity: number;
}

const SLIDER_META: Record<
  keyof SliderState,
  { label: string; description: string; color: string }
> = {
  relevance: {
    label: "Relevance",
    description: "How closely items match preferences",
    color: "var(--color-accent)",
  },
  diversity: {
    label: "Diversity",
    description: "Variety across categories",
    color: "var(--color-success)",
  },
  novelty: {
    label: "Novelty",
    description: "Boost for new items",
    color: "var(--color-warning)",
  },
  popularity: {
    label: "Popularity",
    description: "Weight for trending items",
    color: "var(--color-info)",
  },
};

const DEFAULT_A: SliderState = {
  relevance: 0.7,
  diversity: 0.4,
  novelty: 0.3,
  popularity: 0.6,
};

interface ConfigMetrics {
  predictedEngagement: number;
  avgConfidence: number;
  categoryCoverage: number;
  topItems: string[];
}

interface ComparisonRow {
  personaId: string;
  personaName: string;
  a: ConfigMetrics;
  b: ConfigMetrics;
}

interface ComparisonResult {
  traceId: string;
  personas: ComparisonRow[];
  aggregate: {
    a: Omit<ConfigMetrics, "topItems">;
    b: Omit<ConfigMetrics, "topItems">;
  };
}

/**
 * Logic Drift testing: compare the ACTIVE slider configuration (A) against a
 * candidate configuration (B) across every simulated persona — before shipping
 * the change. Engagement is grounded in each persona's synthetic interactions.
 */
export function ConfigComparison({ projectId }: { projectId?: string }) {
  const trpc = useTRPC();
  const activeProfile = useQuery(
    trpc.alignment.getActive.queryOptions({ projectId })
  );
  const configA = (activeProfile.data?.sliders as SliderState | undefined) ?? DEFAULT_A;

  const [configB, setConfigB] = useState<SliderState>({
    relevance: 0.4,
    diversity: 0.8,
    novelty: 0.7,
    popularity: 0.3,
  });
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compare = useMutation(
    trpc.personas.compareConfigs.mutationOptions({
      onSuccess: (data) => {
        setResult(data as ComparisonResult);
        setError(null);
      },
      onError: (mutationError) => setError(mutationError.message),
    })
  );

  const handleRun = () => {
    setError(null);
    compare.mutate({ projectId, configA, configB });
  };

  const delta = (a: number, b: number) => {
    const diff = b - a;
    if (Math.abs(diff) < 0.0005) return <span className="text-muted-foreground">—</span>;
    return (
      <span className={diff > 0 ? "text-success" : "text-destructive"}>
        {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(3)}
      </span>
    );
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical size={16} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Strategy comparison
        </h2>
        <Badge variant="secondary" className="ml-1">Logic Drift</Badge>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Test a candidate slider configuration against the active one across
        every simulated persona — see who wins and who loses before you ship
        the change.
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A — Active profile
            </span>
            <StatusDot status="success" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SLIDER_META) as Array<keyof SliderState>).map((key) => (
              <Badge key={key} variant="secondary" className="font-mono text-[11px]">
                {SLIDER_META[key].label[0]}: {configA[key].toFixed(2)}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The configuration your feed currently runs with
            {activeProfile.data ? "" : " (defaults — no profile saved yet)"}.
          </p>
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            B — Candidate
          </span>
          {(Object.keys(SLIDER_META) as Array<keyof SliderState>).map((key) => (
            <IntentSlider
              key={key}
              name={`compare-${key}`}
              value={configB[key]}
              onChange={(value) =>
                setConfigB((previous) => ({ ...previous, [key]: value }))
              }
              label={SLIDER_META[key].label}
              description={SLIDER_META[key].description}
              color={SLIDER_META[key].color}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive">
          <StatusDot status="danger" className="mt-1" />
          <span>{error}</span>
        </div>
      )}

      <Button className="mt-4" onClick={handleRun} disabled={compare.isPending}>
        {compare.isPending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Ranking every persona twice…
          </>
        ) : (
          <>
            <GitCompareArrows size={14} />
            Run comparison
          </>
        )}
      </Button>

      {result && (
        <div className="mt-5">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Persona</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Predicted engagement
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Avg confidence
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Category coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.personas.map((row) => (
                  <tr key={row.personaId} className="border-b border-border/60">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.personaName}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.a.predictedEngagement.toFixed(3)} →{" "}
                      {row.b.predictedEngagement.toFixed(3)}{" "}
                      {delta(row.a.predictedEngagement, row.b.predictedEngagement)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.a.avgConfidence.toFixed(3)} → {row.b.avgConfidence.toFixed(3)}{" "}
                      {delta(row.a.avgConfidence, row.b.avgConfidence)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.a.categoryCoverage} → {row.b.categoryCoverage}{" "}
                      {delta(row.a.categoryCoverage, row.b.categoryCoverage)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-raised/60">
                  <td className="px-3 py-2 font-semibold text-foreground">
                    All personas
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {result.aggregate.a.predictedEngagement.toFixed(3)} →{" "}
                    {result.aggregate.b.predictedEngagement.toFixed(3)}{" "}
                    {delta(
                      result.aggregate.a.predictedEngagement,
                      result.aggregate.b.predictedEngagement
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {result.aggregate.a.avgConfidence.toFixed(3)} →{" "}
                    {result.aggregate.b.avgConfidence.toFixed(3)}{" "}
                    {delta(
                      result.aggregate.a.avgConfidence,
                      result.aggregate.b.avgConfidence
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {result.aggregate.a.categoryCoverage.toFixed(1)} →{" "}
                    {result.aggregate.b.categoryCoverage.toFixed(1)}{" "}
                    {delta(
                      result.aggregate.a.categoryCoverage,
                      result.aggregate.b.categoryCoverage
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Deterministic ranking, no LLM in the loop — every number reproducible. Trace{" "}
            {result.traceId}
          </p>
        </div>
      )}
    </div>
  );
}
