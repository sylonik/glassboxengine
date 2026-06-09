"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { BarChart3, ShoppingCart } from "lucide-react";
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
import { StaggerContainer, StaggerItem } from "~/components/motion";

const EVENT_COLORS: Record<string, string> = {
  views: "hsl(var(--chart-1))",
  clicks: "hsl(var(--chart-2))",
  cartAdds: "hsl(var(--chart-3))",
  purchases: "hsl(var(--chart-4))",
};

export default function AnalyticsPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();
  const [days, setDays] = useState(30);

  const overview = useQuery(
    trpc.analytics.overview.queryOptions({
      projectId: activeProjectId,
      days,
    })
  );

  const timeline = useQuery(
    trpc.analytics.timeline.queryOptions({
      projectId: activeProjectId,
      days,
    })
  );

  const funnel = useQuery(
    trpc.analytics.funnel.queryOptions({
      projectId: activeProjectId,
      days,
    })
  );

  const topProducts = useQuery(
    trpc.analytics.topProducts.queryOptions({
      projectId: activeProjectId,
      days,
      limit: 10,
    })
  );

  const stats = overview.data;
  const funnelData = funnel.data;
  const timelineData = timeline.data ?? [];
  const topList = (topProducts.data ?? []) as Array<{
    productId: string | null;
    productName: string | null;
    productCategory: string | null;
    views: number;
    clicks: number;
    cartAdds: number;
    purchases: number;
    total: number;
  }>;

  // Funnel bar widths
  const funnelMax = Math.max(
    funnelData?.views ?? 0,
    funnelData?.clicks ?? 0,
    funnelData?.cartAdds ?? 0,
    funnelData?.purchases ?? 0,
    1
  );

  // Timeline bar chart max
  const timelineMax = Math.max(
    ...timelineData.map(
      (d) => d.recommendations + d.views + d.clicks + d.cartAdds + d.purchases
    ),
    1
  );

  function fmtNum(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  function fmtPct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
  }

  function fmtDay(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Recommendation quality and engagement metrics for ${activeProject?.name ?? "the active project"}`}
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
            </SelectContent>
          </Select>
        }
      />

      {/* KPI Cards */}
      <StaggerContainer className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { label: "Recommendations", value: fmtNum(stats?.totalRecommendations ?? 0), sub: `${fmtNum(stats?.uniqueEndUsers ?? 0)} unique users` },
          { label: "Feedback Events", value: fmtNum(stats?.totalFeedback ?? 0), sub: "total interactions" },
          { label: "CTR", value: fmtPct(stats?.ctr ?? 0), sub: "click-through rate" },
          { label: "Conversion", value: fmtPct(stats?.conversionRate ?? 0), sub: "purchase rate" },
          { label: "Avg Confidence", value: stats ? `${(stats.avgConfidence * 100).toFixed(0)}%` : "—", sub: "model confidence" },
          { label: "Avg Latency", value: stats ? `${stats.avgLatency}ms` : "—", sub: "response time" },
        ].map((kpi) => (
          <StaggerItem key={kpi.label}>
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {overview.isLoading ? <Skeleton className="mx-auto h-7 w-16" /> : kpi.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{kpi.sub}</div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Funnel + Top Products */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : funnelMax <= 1 && !funnelData?.views ? (
              <EmptyState
                icon={BarChart3}
                title="No feedback data yet"
                description="Integrate the SDK to start tracking engagement."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {([
                  { key: "views", label: "Views", value: funnelData?.views ?? 0 },
                  { key: "clicks", label: "Clicks", value: funnelData?.clicks ?? 0 },
                  { key: "cartAdds", label: "Cart Adds", value: funnelData?.cartAdds ?? 0 },
                  { key: "purchases", label: "Purchases", value: funnelData?.purchases ?? 0 },
                ] as const).map((step) => (
                  <div key={step.key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{step.label}</span>
                      <span className="font-mono">{fmtNum(step.value)}</span>
                    </div>
                    <div className="h-7 overflow-hidden rounded-md bg-secondary">
                      <div
                        className="h-full rounded-md transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max((step.value / funnelMax) * 100, 2)}%`,
                          background: EVENT_COLORS[step.key],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : topList.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No product engagement data yet"
                description="Products will appear here once users interact with recommendations."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col">
                {topList.map((item, i) => (
                  <div
                    key={item.productId ?? i}
                    className={cn(
                      "flex items-center gap-3 py-2",
                      i < topList.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.productName ?? "Unknown"}
                      </span>
                      {item.productCategory && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.productCategory}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 gap-3 max-sm:flex-col max-sm:gap-1">
                      <span className="font-mono text-xs" style={{ color: EVENT_COLORS.views }}>
                        {Number(item.views)} views
                      </span>
                      <span className="font-mono text-xs" style={{ color: EVENT_COLORS.clicks }}>
                        {Number(item.clicks)} clicks
                      </span>
                      <span className="font-mono text-xs" style={{ color: EVENT_COLORS.purchases }}>
                        {Number(item.purchases)} buys
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : timelineData.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No activity recorded"
              description="No activity recorded in this period."
              className="py-8"
            />
          ) : (
            <div>
              {/* Legend */}
              <div className="mb-3 flex gap-4">
                {[
                  { label: "Recs", color: "hsl(var(--chart-2))" },
                  { label: "Clicks", color: EVENT_COLORS.clicks },
                  { label: "Purchases", color: EVENT_COLORS.purchases },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <div className="relative flex h-40 items-end gap-[2px] overflow-x-auto pb-6">
                {timelineData.map((day) => (
                  <div
                    key={day.day}
                    className="flex h-full min-w-[24px] flex-1 flex-col items-center"
                  >
                    <div className="flex w-full flex-1 items-end gap-px">
                      <div
                        className="min-h-[2px] flex-1 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${(day.recommendations / timelineMax) * 100}%`,
                          background: "hsl(var(--chart-2))",
                        }}
                        title={`${day.recommendations} recs`}
                      />
                      <div
                        className="min-h-[2px] flex-1 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${(day.clicks / timelineMax) * 100}%`,
                          background: EVENT_COLORS.clicks,
                        }}
                        title={`${day.clicks} clicks`}
                      />
                      <div
                        className="min-h-[2px] flex-1 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${(day.purchases / timelineMax) * 100}%`,
                          background: EVENT_COLORS.purchases,
                        }}
                        title={`${day.purchases} purchases`}
                      />
                    </div>
                    <span className="absolute bottom-0 text-[9px] text-muted-foreground whitespace-nowrap mt-1">
                      {fmtDay(day.day)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
