"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { Activity, Eye, MousePointer, ShoppingCart, Check, User, X } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

interface FeedbackEntry {
  id: string;
  endUserId: string;
  productId: string | null;
  productName: string | null;
  productCategory: string | null;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  view: { label: "View", color: "hsl(var(--chart-1))", icon: Eye },
  click: { label: "Click", color: "hsl(var(--chart-2))", icon: MousePointer },
  cart_add: { label: "Cart", color: "hsl(var(--chart-3))", icon: ShoppingCart },
  purchase: { label: "Purchase", color: "hsl(var(--chart-4))", icon: Check },
};

function getEventConfig(type: string) {
  return EVENT_CONFIG[type] ?? { label: type, color: "hsl(var(--muted-foreground))", icon: Activity };
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function FeedbackPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();
  const [filterEventType, setFilterEventType] = useState<string>("");
  const [filterEndUser, setFilterEndUser] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const events = useQuery(
    trpc.feedback.recent.queryOptions({
      projectId: activeProjectId,
      limit: pageSize,
      offset: page * pageSize,
      eventType: (filterEventType as "view" | "click" | "cart_add" | "purchase") || undefined,
      endUserId: filterEndUser || undefined,
    })
  );

  const endUsers = useQuery(
    trpc.feedback.endUsers.queryOptions({ projectId: activeProjectId })
  );

  const eventTypes = useQuery(
    trpc.feedback.eventTypes.queryOptions({ projectId: activeProjectId })
  );

  const entries = (events.data ?? []) as FeedbackEntry[];
  const endUserList = (endUsers.data ?? []) as string[];
  const eventTypeList = (eventTypes.data ?? []) as string[];

  // Group by end user for summary
  const userCounts = new Map<string, number>();
  for (const entry of entries) {
    userCounts.set(entry.endUserId, (userCounts.get(entry.endUserId) ?? 0) + 1);
  }

  // Event type counts
  const typeCounts: Record<string, number> = {};
  for (const entry of entries) {
    typeCounts[entry.eventType] = (typeCounts[entry.eventType] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        title="Feedback"
        description={`Real-time user interaction tracking for ${activeProject?.name ?? "the active project"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{entries.length} events</Badge>
            <Badge variant="default">{userCounts.size} users</Badge>
          </div>
        }
      />

      {/* Event type summary chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["view", "click", "cart_add", "purchase"] as const).map((type) => {
          const cfg = getEventConfig(type);
          const count = typeCounts[type] ?? 0;
          const Icon = cfg.icon;
          const isActive = filterEventType === type;
          return (
            <button
              key={type}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
              onClick={() => {
                setFilterEventType(filterEventType === type ? "" : type);
                setPage(0);
              }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
              <span>{cfg.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">End User</Label>
            <Select
              value={filterEndUser || "all"}
              onValueChange={(v) => { setFilterEndUser(v === "all" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {endUserList.map((id) => (
                  <SelectItem key={id} value={id}>{id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Event Type</Label>
            <Select
              value={filterEventType || "all"}
              onValueChange={(v) => { setFilterEventType(v === "all" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {eventTypeList.map((type) => (
                  <SelectItem key={type} value={type}>{getEventConfig(type).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filterEventType || filterEndUser) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterEventType(""); setFilterEndUser(""); setPage(0); }}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Event feed */}
      {events.isLoading ? (
        <div className="space-y-3 py-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Activity}
              title="No feedback events yet"
              description="Integrate the @glassbox/sdk in your app and call trackEvent() to see live interaction data here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const cfg = getEventConfig(entry.eventType);
              const Icon = cfg.icon;
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3 px-4 transition-colors hover:border-primary/30"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] bg-card"
                    style={{ borderColor: cfg.color }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-sm border px-2 py-0.5 text-xs font-semibold"
                        style={{ color: cfg.color, borderColor: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {entry.productName ?? "Unknown product"}
                      </span>
                      {entry.productCategory && (
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.productCategory}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <User className="h-2.5 w-2.5" />
                        {entry.endUserId}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(entry.createdAt)}</span>
                    </div>
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(entry.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="max-w-[320px] truncate rounded-sm bg-secondary px-2 py-0.5 text-xs"
                          >
                            <span className="text-muted-foreground">{key}:</span>{" "}
                            <span className="font-mono text-secondary-foreground">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={entries.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
