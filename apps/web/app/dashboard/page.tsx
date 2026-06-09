"use client";

import Link from "next/link";
import { useTRPC } from "~/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useActiveProject } from "./project_context";
import {
  BookOpen,
  Code2,
  Layers3,
  ScanEye,
  SlidersHorizontal,
  Activity,
} from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { KpiCard } from "~/components/dashboard/kpi-card";
import { StaggerContainer, StaggerItem } from "~/components/motion";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { StatusDot } from "~/components/ui/status-dot";

export default function DashboardOverviewPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();

  const embeddingStatus = useQuery(
    trpc.catalog.embeddingStatus.queryOptions({ projectId: activeProjectId })
  );
  const recentLogs = useQuery(
    trpc.glassBox.recentLogs.queryOptions({
      limit: 10,
      offset: 0,
      projectId: activeProjectId,
    })
  );

  const products = embeddingStatus.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          activeProject
            ? `${activeProject.name} at a glance`
            : "Your GlassBox Engine at a glance"
        }
      />

      {/* KPI Grid */}
      <StaggerContainer className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <KpiCard
            title="Products"
            value={products ? products.total : "\u2014"}
            icon={BookOpen}
            description={
              products && products.total > 0
                ? "Catalog connected"
                : "Upload or connect a catalog"
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            title="Embeddings"
            value={products ? `${products.percentage}%` : "0%"}
            icon={ScanEye}
            description={
              products && products.percentage === 100
                ? "All products embedded"
                : products && products.total > 0
                  ? `${products.withoutEmbeddings} remaining`
                  : "No embeddings generated"
            }
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            title="Audit Trail"
            value={recentLogs.data ? recentLogs.data.length : "\u2014"}
            icon={Activity}
            description="Glass Box events"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            title="Agents"
            value={5}
            icon={Layers3}
            description="All agents ready"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-2">
            <QuickAction
              href="/dashboard/catalog"
              icon={BookOpen}
              title={products && products.total > 0 ? "Catalog Studio" : "Connect Catalog"}
              description={products && products.total > 0 ? `${products.total} products indexed and ready to enrich` : "Upload CSV/JSON, connect a remote feed, or launch demo data"}
            />
            <QuickAction
              href="/dashboard/alignment"
              icon={SlidersHorizontal}
              title="Tune Alignment"
              description="Adjust intent sliders"
            />
            <QuickAction
              href="/dashboard/editor"
              icon={Code2}
              title="Write Scorer"
              description="Custom scoring functions"
            />
            <QuickAction
              href="/dashboard/deploy"
              icon={Layers3}
              title="Deploy SDK"
              description="Expose your API"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Glass Box — Recent Activity
          </h2>
          {recentLogs.isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentLogs.data && recentLogs.data.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentLogs.data.map((log) => {
                const reasoning = log.reasoning ?? "";
                return (
                  <div key={log.id} className="flex gap-3">
                    <StatusDot status="active" className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[11px]">
                          {log.agentName || "System"}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.action}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {reasoning.slice(0, 120)}
                        {reasoning.length > 120 ? "\u2026" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={ScanEye}
              title="No activity yet"
              description="Agent decisions and reasoning chains will appear here as you use the engine."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-md border border-border bg-background p-3 no-underline transition-all duration-fast hover:border-primary hover:shadow-glow hover:translate-x-0.5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}
