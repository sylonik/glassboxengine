"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { ArrowLeft, Filter, TrendingDown } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

const STEP_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
];

export default function FunnelAnalysisPage() {
  const params = useParams();
  const funnelId = params.id as string;
  const trpc = useTRPC();
  const [days, setDays] = useState(30);

  const funnel = useQuery(
    trpc.funnels.get.queryOptions({ id: funnelId })
  );

  const analysis = useQuery(
    trpc.funnels.analyze.queryOptions({ id: funnelId, days })
  );

  const funnelData = funnel.data;
  const analysisData = analysis.data;
  const stepsData = analysisData?.steps ?? [];
  const totalSessions = analysisData?.totalSessions ?? 0;
  const maxReached = Math.max(...stepsData.map((s) => s.reached), 1);
  // The funnel has matching traffic only when the analyze query saw at least
  // one session reach a step. A fresh/demo project with no website events
  // yields zero sessions — show a friendly empty state instead of empty bars.
  const hasData = totalSessions > 0 && stepsData.some((s) => s.reached > 0);
  const isLoading = analysis.isLoading || funnel.isLoading;

  function fmtNum(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
  }

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/dashboard/funnels"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to Funnels
        </Link>
      </div>
      <PageHeader
        title={funnelData?.name ?? "Funnel Analysis"}
        description={funnelData?.description ?? "Conversion funnel analysis"}
        actions={
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Overall stats */}
      {hasData && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Sessions
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {fmtNum(totalSessions)}
              </div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Steps
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {stepsData.length}
              </div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall Conversion
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {stepsData.length > 0
                  ? fmtPct(stepsData[stepsData.length - 1]!.conversionFromFirst)
                  : "0%"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : analysis.isError ? (
            <EmptyState
              icon={TrendingDown}
              title="Couldn't load funnel analysis"
              description="The analytics query failed. Once your site is sending events this will populate automatically."
              className="py-8"
            />
          ) : stepsData.length < 2 ? (
            <EmptyState
              icon={Filter}
              title="Funnel needs at least two steps"
              description="Add more steps to this funnel to analyze conversion between them."
              className="py-8"
            />
          ) : !hasData ? (
            <EmptyState
              icon={Filter}
              title="No matching sessions yet"
              description="No sessions matched this funnel in the selected time range. Once your website starts sending events, conversions will appear here."
              className="py-8"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {stepsData.map((step, i) => (
                <div key={step.id ?? i} className="flex flex-col gap-1.5">
                  {/* Step header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: STEP_COLORS[i] }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {step.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {step.matchField === "page_path" ? "path" : "event"}:{" "}
                        {step.matchValue}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-foreground">
                        {fmtNum(step.reached)}
                      </span>
                      {i > 0 && (
                        <span
                          className={cn(
                            "font-mono text-xs",
                            step.conversionFromPrevious >= 0.5
                              ? "text-green-600 dark:text-green-400"
                              : step.conversionFromPrevious >= 0.2
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {fmtPct(step.conversionFromPrevious)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bar with % of first step overlaid */}
                  <div className="relative h-8 overflow-hidden rounded-md bg-secondary">
                    <div
                      className="h-full rounded-md transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max((step.reached / maxReached) * 100, 2)}%`,
                        background: STEP_COLORS[i],
                        opacity: 0.8,
                      }}
                    />
                    <span className="absolute inset-y-0 right-2.5 flex items-center font-mono text-[11px] font-medium text-muted-foreground">
                      {fmtPct(step.conversionFromFirst)} of step 1
                    </span>
                  </div>
                  {/* Drop-off indicator */}
                  {i < stepsData.length - 1 && (
                    <div className="flex justify-center py-0.5 text-[10px] text-muted-foreground">
                      {step.reached - stepsData[i + 1]!.reached > 0 && (
                        <span>
                          -{fmtNum(step.reached - stepsData[i + 1]!.reached)}{" "}
                          dropped off
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
