"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import {
  MousePointerClick,
  Globe,
  Smartphone,
  BarChart3,
  Users,
  Activity,
  UserRound,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
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
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);
  // "now" is read only from async callbacks (never during render and never
  // synchronously inside the effect body) so it satisfies both the hooks
  // purity rule and the set-state-in-effect rule. A 0ms timeout populates it
  // right after mount; a 30s interval keeps relative timestamps fresh.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = setTimeout(update, 0);
    const id = setInterval(update, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

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

  const usersQuery = useQuery(
    trpc.websiteAnalytics.users.queryOptions({
      projectId: activeProjectId,
      days,
      limit: 50,
    })
  );

  const recentEvents = useQuery(
    trpc.websiteAnalytics.recentEvents.queryOptions(
      {
        projectId: activeProjectId,
        days,
        limit: 50,
        userKey: selectedUserKey ?? undefined,
      },
      { refetchInterval: 5000 }
    )
  );

  const stats = overview.data;
  const timelineData = timeline.data ?? [];
  const events = topEvents.data ?? [];
  const pages = topPages.data ?? [];
  const devices = deviceBreakdown.data ?? [];
  const browsers = browserBreakdown.data ?? [];
  const endUsers = usersQuery.data ?? [];
  const liveEvents = recentEvents.data ?? [];

  const timelineMax = Math.max(...timelineData.map((d) => d.total), 1);

  function fmtNum(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  // ClickHouse returns UTC datetimes as "YYYY-MM-DD HH:MM:SS.sss" with no zone,
  // which JS would parse as local time. Normalize to a real (UTC) Date.
  function parseTs(d: string): Date {
    return new Date(d.includes("T") ? d : `${d.replace(" ", "T")}Z`);
  }

  function fmtDay(d: string) {
    return parseTs(d).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function fmtRelative(d: string) {
    const then = parseTs(d).getTime();
    if (Number.isNaN(then)) return d;
    // `now` is null until the mount effect runs — fall back to a short date.
    if (now === null) {
      return parseTs(d).toLocaleDateString([], { month: "short", day: "numeric" });
    }
    const diff = now - then;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `${Math.max(sec, 0)}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day}d ago`;
    return parseTs(d).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function fmtTime(d: string) {
    const date = parseTs(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function shortUser(key: string) {
    if (!key) return "—";
    if (key.length <= 14) return key;
    return `${key.slice(0, 8)}…${key.slice(-4)}`;
  }

  // Stable colour per event name for the pills.
  const EVENT_PILL_CLASSES = [
    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  ];

  function eventPillClass(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return EVENT_PILL_CLASSES[hash % EVENT_PILL_CLASSES.length];
  }

  function summariseProps(props: Record<string, unknown>) {
    const keys = ["category", "price", "query", "value", "label"];
    const parts: string[] = [];
    for (const k of keys) {
      const v = props[k];
      if (v !== undefined && v !== null && v !== "") {
        parts.push(`${k}: ${String(v)}`);
      }
    }
    return parts.join(" · ");
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

      {/* End users + Live events */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* End users table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              End users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : endUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users yet"
                description="End-users from your demo site will appear here once they trigger events."
                className="py-8"
              />
            ) : (
              <ScrollArea className="h-[340px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">User</th>
                      <th className="px-2 py-2 text-right font-medium">
                        Events
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Sessions
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        Purchases
                      </th>
                      <th className="px-2 py-2 font-medium">Top category</th>
                      <th className="py-2 pl-2 text-right font-medium">
                        Last seen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {endUsers.map((u) => {
                      const active = selectedUserKey === u.userKey;
                      return (
                        <tr
                          key={u.userKey}
                          onClick={() =>
                            setSelectedUserKey(active ? null : u.userKey)
                          }
                          className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                            active ? "bg-muted" : ""
                          }`}
                        >
                          <td className="py-2 pr-2">
                            <span className="flex items-center gap-1.5">
                              {u.identified ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 px-1.5 py-0"
                                >
                                  <UserRound className="size-3" />
                                  id
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 px-1.5 py-0 text-muted-foreground"
                                >
                                  <EyeOff className="size-3" />
                                  anon
                                </Badge>
                              )}
                              <span
                                className="truncate font-mono text-xs text-foreground"
                                title={u.userKey}
                              >
                                {shortUser(u.userKey)}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                            {fmtNum(u.events)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                            {fmtNum(u.sessions)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                            {u.purchases > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {fmtNum(u.purchases)}
                              </span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <span className="truncate capitalize text-muted-foreground">
                              {u.topCategory || "—"}
                            </span>
                          </td>
                          <td className="py-2 pl-2 text-right text-xs text-muted-foreground">
                            {fmtRelative(u.lastSeen)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Live events stream */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Live events
              <span className="relative ml-1 inline-flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedUserKey ? (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => setSelectedUserKey(null)}
                  title="Clear user filter"
                >
                  {shortUser(selectedUserKey)} ✕
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  All users
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => recentEvents.refetch()}
                disabled={recentEvents.isFetching}
                title="Refresh"
              >
                <RefreshCw
                  className={`size-4 ${
                    recentEvents.isFetching ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentEvents.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : liveEvents.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description={
                  selectedUserKey
                    ? "This user has no events in the selected window."
                    : "Events sent by your demo site will stream in here."
                }
                className="py-8"
              />
            ) : (
              <ScrollArea className="h-[340px]">
                <ul className="flex flex-col gap-1.5 pr-2">
                  {liveEvents.map((ev, i) => {
                    const summary = summariseProps(ev.properties);
                    return (
                      <li
                        key={`${ev.createdAt}-${i}`}
                        className="flex flex-col gap-1 rounded-md border bg-card/50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${eventPillClass(
                                ev.eventName
                              )}`}
                            >
                              {ev.eventName}
                            </span>
                            {ev.pagePath ? (
                              <span
                                className="truncate font-mono text-xs text-muted-foreground"
                                title={ev.pagePath}
                              >
                                {ev.pagePath}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {fmtTime(ev.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {ev.identified ? (
                              <UserRound className="size-3 shrink-0" />
                            ) : (
                              <EyeOff className="size-3 shrink-0" />
                            )}
                            <span
                              className="truncate font-mono"
                              title={ev.userKey}
                            >
                              {shortUser(ev.userKey)}
                            </span>
                            <span className="shrink-0 capitalize">
                              {[ev.deviceType, ev.browser]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {summary ? (
                            <span className="truncate text-right font-mono">
                              {summary}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
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
