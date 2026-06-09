"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { MousePointerClick, Globe, Smartphone, BarChart3 } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { StaggerContainer, StaggerItem } from "~/components/motion";

export default function TrackingPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();
  const [days, setDays] = useState(30);

  const overview = useQuery(
    trpc.websiteAnalytics.overview.queryOptions({
      projectId: activeProjectId,
      days,
    })
  );

  const timeline = useQuery(
    trpc.websiteAnalytics.timeline.queryOptions({
      projectId: activeProjectId,
      days,
    })
  );

  const topEvents = useQuery(
    trpc.websiteAnalytics.topEvents.queryOptions({
      projectId: activeProjectId,
      days,
      limit: 10,
    })
  );

  const topPages = useQuery(
    trpc.websiteAnalytics.topPages.queryOptions({
      projectId: activeProjectId,
      days,
      limit: 10,
    })
  );

  const deviceBreakdown = useQuery(
    trpc.websiteAnalytics.eventBreakdown.queryOptions({
      projectId: activeProjectId,
      days,
      dimension: "device_type",
      limit: 5,
    })
  );

  const browserBreakdown = useQuery(
    trpc.websiteAnalytics.eventBreakdown.queryOptions({
      projectId: activeProjectId,
      days,
      dimension: "browser",
      limit: 5,
    })
  );

  const stats = overview.data;
  const timelineData = timeline.data ?? [];
  const events = topEvents.data ?? [];
  const pages = topPages.data ?? [];
  const devices = deviceBreakdown.data ?? [];
  const browsers = browserBreakdown.data ?? [];

  const timelineMax = Math.max(...timelineData.map((d) => d.total), 1);

  function fmtNum(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  function fmtDay(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div>
      <PageHeader
        title="Website Tracking"
        description={`Event tracking for ${activeProject?.name ?? "the active project"}`}
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
      <StaggerContainer className="mb-4 grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Events",
            value: fmtNum(stats?.totalEvents ?? 0),
            sub: "tracked events",
          },
          {
            label: "Unique Sessions",
            value: fmtNum(stats?.uniqueSessions ?? 0),
            sub: "browser sessions",
          },
          {
            label: "Unique Users",
            value: fmtNum(stats?.uniqueUsers ?? 0),
            sub: "distinct visitors",
          },
        ].map((kpi) => (
          <StaggerItem key={kpi.label}>
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {overview.isLoading ? (
                    <Skeleton className="mx-auto h-7 w-16" />
                  ) : (
                    kpi.value
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {kpi.sub}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Top Events + Top Pages */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Events</CardTitle>
          </CardHeader>
          <CardContent>
            {topEvents.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={MousePointerClick}
                title="No events yet"
                description="Integrate the tracker SDK to start capturing events."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((event) => {
                  const max = events[0]?.count ?? 1;
                  return (
                    <div key={event.eventName} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-foreground">
                          {event.eventName}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {fmtNum(event.count)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{
                            width: `${Math.max((event.count / max) * 100, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {topPages.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : pages.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No page views yet"
                description="Page views will appear here once tracked."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {pages.map((page) => {
                  const max = pages[0]?.views ?? 1;
                  return (
                    <div key={page.pagePath} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-foreground truncate max-w-[200px]">
                          {page.pagePath}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {fmtNum(page.views)} views / {fmtNum(page.sessions)}{" "}
                          sessions
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max((page.views / max) * 100, 2)}%`,
                            background: "hsl(var(--chart-2))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device + Browser Breakdown */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceBreakdown.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : devices.length === 0 ? (
              <EmptyState
                icon={Smartphone}
                title="No device data"
                description="Device breakdown will appear once events are tracked."
                className="py-6"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {devices.map((d) => (
                  <div
                    key={d.value}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize text-foreground">
                      {d.value || "Unknown"}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {fmtNum(d.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            {browserBreakdown.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : browsers.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No browser data"
                description="Browser breakdown will appear once events are tracked."
                className="py-6"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {browsers.map((b) => (
                  <div
                    key={b.value}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{b.value || "Unknown"}</span>
                    <span className="font-mono text-muted-foreground">
                      {fmtNum(b.count)}
                    </span>
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
          <CardTitle>Event Timeline</CardTitle>
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
              description="No events recorded in this period."
              className="py-8"
            />
          ) : (
            <div className="relative flex h-40 items-end gap-[2px] overflow-x-auto pb-6">
              {timelineData.map((day) => (
                <div
                  key={day.day}
                  className="flex h-full min-w-[24px] flex-1 flex-col items-center"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="min-h-[2px] w-full rounded-t-sm bg-primary transition-all duration-300"
                      style={{
                        height: `${(day.total / timelineMax) * 100}%`,
                      }}
                      title={`${day.total} events`}
                    />
                  </div>
                  <span className="absolute bottom-0 text-[9px] text-muted-foreground whitespace-nowrap mt-1">
                    {fmtDay(day.day)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
