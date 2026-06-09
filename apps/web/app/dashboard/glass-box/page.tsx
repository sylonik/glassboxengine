"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ScanEye, X } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { ConfidenceRing } from "~/components/ui/confidence-ring";
import { StaggerContainer, StaggerItem } from "~/components/motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  reasoning: string | null;
  agentName: string | null;
  traceId: string | null;
  confidenceScore: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

const AGENT_COLORS: Record<string, string> = {
  Coordinator: "text-primary border-primary/30 bg-primary-subtle",
  Architect: "text-success border-success/30 bg-success-subtle",
  Reasoner: "text-warning border-warning/30 bg-warning-subtle",
  PersonaSimulator: "text-info border-info/30 bg-info-subtle",
  Engineer: "text-muted-foreground border-border bg-surface-raised",
  Mentor: "text-destructive border-destructive/30 bg-destructive-subtle",
};

const AGENT_DOT_COLORS: Record<string, string> = {
  Coordinator: "bg-primary",
  Architect: "bg-success",
  Reasoner: "bg-warning",
  PersonaSimulator: "bg-info",
  Engineer: "bg-muted-foreground",
  Mentor: "bg-destructive",
};

function getAgentClasses(agentName: string | null): string {
  return AGENT_COLORS[agentName ?? ""] ?? "text-muted-foreground border-border bg-surface-raised";
}

function getAgentDotColor(agentName: string | null): string {
  return AGENT_DOT_COLORS[agentName ?? ""] ?? "bg-muted-foreground";
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function GlassBoxPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const logs = useQuery(
    trpc.glassBox.recentLogs.queryOptions({
      limit: pageSize,
      offset: page * pageSize,
      action: filterAction || undefined,
      agentName: filterAgent || undefined,
      projectId: activeProjectId,
    })
  );

  const actionTypes = useQuery(
    trpc.glassBox.actionTypes.queryOptions({ projectId: activeProjectId })
  );

  const agentNames = useQuery(
    trpc.glassBox.agentNames.queryOptions({ projectId: activeProjectId })
  );

  const traceChain = useQuery({
    ...trpc.glassBox.getReasoningChain.queryOptions({
      traceId: expandedTrace ?? "",
      projectId: activeProjectId,
    }),
    enabled: !!expandedTrace,
  });

  const logEntries = (logs.data ?? []) as AuditLog[];
  const traceIds = [...new Set(logEntries.map((l) => l.traceId).filter(Boolean))] as string[];
  const hasFilters = !!(filterAction || filterAgent);

  return (
    <div>
      <PageHeader
        title="Glass Box"
        description={`Full reasoning trace audit trail for ${activeProject?.name ?? "the active project"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {logEntries.length} entries
            </Badge>
            {traceIds.length > 0 && (
              <Badge variant="default">{traceIds.length} traces</Badge>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Agent</span>
          <Select
            value={filterAgent || "all"}
            onValueChange={(v) => { setFilterAgent(v === "all" ? "" : v); setPage(0); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {(agentNames.data ?? []).map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Action</span>
          <Select
            value={filterAction || "all"}
            onValueChange={(v) => { setFilterAction(v === "all" ? "" : v); setPage(0); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(actionTypes.data ?? []).map((action) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterAction(""); setFilterAgent(""); setPage(0); }}
          >
            <X size={14} />
            Clear
          </Button>
        )}
      </div>

      {/* Timeline */}
      {logs.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : logEntries.length === 0 ? (
        <EmptyState
          icon={ScanEye}
          title="No audit logs yet"
          description="Run the alignment pipeline or simulate a persona to generate reasoning traces."
        />
      ) : (
        <>
          <StaggerContainer className="flex flex-col" staggerDelay={0.04}>
            {logEntries.map((log) => {
              const isTraceStart = log.action.endsWith(".start") || log.action === "simulation.start";
              const hasTrace = !!log.traceId;
              const isTraceExpanded = expandedTrace === log.traceId;

              return (
                <StaggerItem key={log.id}>
                  <div
                    className={cn(
                      "flex gap-3",
                      isTraceStart && "mt-4 first:mt-0"
                    )}
                  >
                    {/* Timeline dot & line */}
                    <div className="flex flex-col items-center w-5 shrink-0 pt-3">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0 z-[1]",
                          getAgentDotColor(log.agentName)
                        )}
                      />
                      <div className="w-0.5 flex-1 bg-border mt-1" />
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        "flex-1 min-w-0 mb-2 rounded-lg border bg-card p-3 transition-all duration-fast",
                        isTraceExpanded
                          ? "border-primary shadow-glow"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold",
                              getAgentClasses(log.agentName)
                            )}
                          >
                            {log.agentName ?? "System"}
                          </span>
                          <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {log.action}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.confidenceScore !== null && (
                            <ConfidenceRing value={log.confidenceScore} size={24} strokeWidth={2} showLabel={false} />
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      {log.reasoning && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {log.reasoning}
                        </p>
                      )}

                      {/* Trace expand button */}
                      {hasTrace && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedTrace(isTraceExpanded ? null : log.traceId)}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-primary-subtle px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            <ScanEye size={12} />
                            <span className="font-mono">{log.traceId}</span>
                            <ChevronDown
                              size={10}
                              className={cn("transition-transform", isTraceExpanded && "rotate-180")}
                            />
                          </button>
                        </div>
                      )}

                      {/* Expanded trace chain */}
                      <AnimatePresence>
                        {isTraceExpanded && traceChain.data && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 rounded-md border border-border bg-background p-3">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                  Reasoning Chain ({traceChain.data.length} steps)
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDate(log.createdAt)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {(traceChain.data as AuditLog[]).map((step, i) => (
                                  <div
                                    key={step.id}
                                    className="flex gap-3 rounded-md border border-border bg-card p-2.5"
                                  >
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-muted-foreground">
                                      {i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold",
                                            getAgentClasses(step.agentName)
                                          )}
                                        >
                                          {step.agentName}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                          {step.action}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          {formatTime(step.createdAt)}
                                        </span>
                                      </div>
                                      {step.reasoning && (
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                          {step.reasoning}
                                        </p>
                                      )}
                                      {step.metadata && Object.keys(step.metadata).length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {Object.entries(step.metadata).map(([key, value]) => (
                                            <span
                                              key={key}
                                              className="max-w-[320px] truncate rounded-sm bg-surface-raised px-1.5 py-0.5 text-[11px]"
                                            >
                                              <span className="text-muted-foreground">{key}:</span>{" "}
                                              <span className="font-mono text-foreground">
                                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                              </span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-4 py-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={logEntries.length < pageSize}
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
