"use client";

import { useState } from "react";
import { useTRPC } from "~/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@glassbox/api";
import { useActiveProject } from "../project_context";
import {
  Check,
  CheckCircle,
  Lightbulb,
  MessageSquare,
  Save,
  ShieldAlert,
  Sigma,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { StatusDot } from "~/components/ui/status-dot";
import { cn } from "~/lib/utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ScoringFunction = RouterOutputs["scoring"]["list"][number];
// Shape of a Mentor validation issue (from the agents' CodeValidationResult).
// Defined explicitly rather than via Extract<> on the tRPC union, which the
// inferred discriminated-union output does not narrow reliably.
type ValidationIssue = {
  type: "math" | "security" | "performance";
  severity: "error" | "warning" | "info";
  message: string;
  socraticQuestion: string;
  line?: number | null;
};
type IssueCategory = ValidationIssue["type"];

/** Stored snapshot of the Mentor's review, captured from the commit mutation. */
interface MentorReview {
  approved: boolean;
  dialogue: string[];
  issues: ValidationIssue[];
  summary?: string;
}

const ISSUE_CATEGORIES: Array<{
  type: IssueCategory;
  label: string;
  Icon: typeof Sigma;
}> = [
  { type: "math", label: "Mathematical soundness", Icon: Sigma },
  { type: "security", label: "Security", Icon: ShieldAlert },
  { type: "performance", label: "Performance", Icon: Zap },
];

const SEVERITY_STYLES: Record<
  ValidationIssue["severity"],
  { label: string; chip: string; row: string }
> = {
  error: {
    label: "Error",
    chip: "bg-destructive-subtle text-destructive",
    row: "border-destructive/30 bg-destructive-subtle",
  },
  warning: {
    label: "Warning",
    chip: "bg-warning-subtle text-warning",
    row: "border-warning/30 bg-warning-subtle",
  },
  info: {
    label: "Info",
    chip: "bg-info-subtle text-info",
    row: "border-info/30 bg-info-subtle",
  },
};

const SEVERITY_ORDER: ValidationIssue["severity"][] = [
  "error",
  "warning",
  "info",
];

const DEFAULT_CODE = `// GlassBox Scoring Function
// Available context: { product, sliders, similarity, categoryDiversity, userHistory, maxViews }

function score(ctx) {
  const { product, sliders } = ctx;

  // Base relevance from embedding similarity
  let score = ctx.similarity * sliders.relevance;

  // Diversity bonus for underrepresented categories
  score += ctx.categoryDiversity * sliders.diversity * 0.3;

  // Novelty: boost items the user hasn't seen
  if (!ctx.userHistory.includes(product.id)) {
    score += sliders.novelty * 0.2;
  }

  // Popularity signal
  score += (product.viewCount / ctx.maxViews) * sliders.popularity * 0.15;

  return Math.min(score, 1.0);
}`;

export default function EditorPage() {
  const projectContext = useActiveProject();

  return (
    <EditorPageContent
      key={projectContext.activeProjectId ?? "no-project"}
      activeProject={projectContext.activeProject}
      activeProjectId={projectContext.activeProjectId}
      refreshProjectState={projectContext.refreshProjectState}
    />
  );
}

function EditorPageContent({
  activeProject,
  activeProjectId,
  refreshProjectState,
}: Pick<
  ReturnType<typeof useActiveProject>,
  "activeProject" | "activeProjectId" | "refreshProjectState"
>) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mentorOpen, setMentorOpen] = useState(true);
  const [mentorReview, setMentorReview] = useState<MentorReview | null>(null);
  const [commitBlocked, setCommitBlocked] = useState(false);
  const [functionId, setFunctionId] = useState<string | null>(null);
  const [functionName, setFunctionName] = useState("Default Scorer");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const trpc = useTRPC();

  const scoringFunctions = useQuery(
    trpc.scoring.list.queryOptions({ projectId: activeProjectId })
  );

  const createFn = useMutation(
    trpc.scoring.create.mutationOptions({
      onSuccess: (data) => {
        setFunctionId(data?.id ?? null);
        setHasUnsavedChanges(false);
        setActionError(null);
        scoringFunctions.refetch();
        refreshProjectState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const updateCode = useMutation(
    trpc.scoring.updateCode.mutationOptions({
      onSuccess: () => {
        setHasUnsavedChanges(false);
        setActionError(null);
        scoringFunctions.refetch();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const commitFn = useMutation(
    trpc.scoring.commit.mutationOptions({
      onSuccess: (data) => {
        if (data.blocked) {
          setCommitBlocked(true);
          setMentorReview({
            approved: false,
            dialogue: data.dialogue ?? ["Review required."],
            issues: data.validation?.issues ?? [],
            summary: data.validation?.summary,
          });
          setMentorOpen(true);
        } else {
          setCommitBlocked(false);
          setMentorReview({
            approved: true,
            dialogue: data.dialogue ?? ["Committed successfully."],
            issues: [],
          });
          setMentorOpen(true);
          setHasUnsavedChanges(false);
          setActionError(null);
          scoringFunctions.refetch();
          refreshProjectState();
        }
      },
      onError: (error) => {
        setActionError(error.message);
        setMentorOpen(true);
      },
    })
  );

  const validateFunction = () => {
    if (!functionName.trim()) { setActionError("Add a function name before saving."); return false; }
    if (!code.trim()) { setActionError("Add scoring code before saving."); return false; }
    return true;
  };

  const handleSave = () => {
    setActionError(null);
    if (!validateFunction()) return;
    if (!functionId) {
      createFn.mutate({ projectId: activeProjectId, name: functionName.trim(), code });
    } else {
      updateCode.mutate({ id: functionId, name: functionName.trim(), code });
    }
  };

  const handleCommit = () => {
    setActionError(null);
    if (!validateFunction()) return;
    if (!functionId) {
      createFn.mutate(
        { projectId: activeProjectId, name: functionName.trim(), code },
        { onSuccess: (data) => { if (data?.id) commitFn.mutate({ id: data.id }); } }
      );
    } else {
      updateCode.mutate(
        { id: functionId, name: functionName.trim(), code },
        { onSuccess: () => commitFn.mutate({ id: functionId }) }
      );
    }
  };

  const loadFunction = (fn: ScoringFunction) => {
    setFunctionId(fn.id);
    setFunctionName(fn.name);
    setCode(fn.code);
    setMentorReview(null);
    setCommitBlocked(false);
    setHasUnsavedChanges(false);
    setActionError(null);
  };

  return (
    <div>
      <PageHeader
        title="Scoring Editor"
        description={`Write and test scoring functions for ${activeProject?.name ?? "the active project"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMentorOpen(!mentorOpen)}>
              <MessageSquare size={14} />
              Mentor
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={updateCode.isPending || createFn.isPending}
            >
              {(updateCode.isPending || createFn.isPending) ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save size={14} />
              )}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={commitFn.isPending || updateCode.isPending || createFn.isPending}
            >
              {commitFn.isPending ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Check size={14} />
              )}
              Commit
            </Button>
          </div>
        }
      />

      <div
        className="grid gap-4 items-start"
        style={{ gridTemplateColumns: mentorOpen ? "1fr 360px" : "1fr" }}
      >
        <div className="min-w-0">
          {actionError && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive">
              <StatusDot status="danger" className="mt-1" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Function tabs */}
          {scoringFunctions.data && scoringFunctions.data.length > 0 && (
            <div className="mb-3 flex gap-1 overflow-x-auto">
              {scoringFunctions.data.map((fn) => (
                <button
                  key={fn.id}
                  onClick={() => loadFunction(fn)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs transition-colors",
                    functionId === fn.id
                      ? "border-primary bg-primary-subtle text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                  )}
                >
                  <span className="font-medium">{fn.name}</span>
                  <span className={cn(
                    "rounded-sm px-1.5 py-px font-mono text-[10px]",
                    fn.isCommitted ? "bg-success-subtle text-success" : "bg-surface-raised text-muted-foreground"
                  )}>
                    {fn.isCommitted ? `v${fn.version}` : "Draft"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Code Editor */}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Input
                  value={functionName}
                  onChange={(e) => { setFunctionName(e.target.value); setHasUnsavedChanges(true); }}
                  className="h-8 w-[200px] text-sm"
                  placeholder="Function name"
                />
                <Badge variant={commitBlocked ? "destructive" : "secondary"}>
                  {commitBlocked ? "Blocked" : hasUnsavedChanges ? "Unsaved" : functionId ? "Saved" : "New"}
                </Badge>
              </div>
              <span className="font-mono text-xs text-muted-foreground">scoring_function.js</span>
            </div>
            <div className="flex min-h-[480px]">
              <div className="select-none border-r border-border py-4">
                {code.split("\n").map((_, i) => (
                  <div key={i} className="pr-3 text-right font-mono text-xs leading-[1.7] text-text-disabled" style={{ minWidth: 48 }}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => { setCode(e.target.value); setHasUnsavedChanges(true); }}
                spellCheck={false}
                className="flex-1 resize-none border-none bg-background p-4 font-mono text-sm leading-[1.7] text-foreground outline-none"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        </div>

        {/* Mentor Panel */}
        {mentorOpen && (
          <div className="animate-slide-in-right">
            <div className="sticky top-4 rounded-lg border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <MessageSquare size={14} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Socratic Mentor</div>
                  <div className="text-xs text-muted-foreground">Powered by Gemini 2.5 Flash</div>
                </div>
              </div>

              <Separator className="my-3" />

              {commitFn.isPending && (
                <div className="flex items-center gap-3 py-4">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "200ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "400ms" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Reviewing your code...</span>
                </div>
              )}

              {!commitFn.isPending && mentorReview ? (
                <MentorReviewView review={mentorReview} />
              ) : !commitFn.isPending ? (
                <div className="pt-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    I&apos;ll review your scoring function when you hit <strong className="text-foreground">Commit</strong>.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">I check for:</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sigma size={14} className="text-muted-foreground" /> Mathematical soundness
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldAlert size={14} className="text-muted-foreground" /> Security &amp; injection risks
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap size={14} className="text-muted-foreground" /> Performance anti-patterns
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders a completed Mentor review: verdict, grouped issues, and Socratic dialogue. */
function MentorReviewView({ review }: { review: MentorReview }) {
  const { approved, dialogue, issues, summary } = review;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto pr-0.5">
      {/* Verdict banner */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border p-3",
          approved
            ? "border-success/30 bg-success-subtle"
            : "border-destructive/30 bg-destructive-subtle"
        )}
      >
        <div className="mt-0.5 shrink-0">
          {approved ? (
            <CheckCircle size={18} className="text-success" />
          ) : (
            <XCircle size={18} className="text-destructive" />
          )}
        </div>
        <div className="min-w-0">
          <div
            className={cn(
              "text-sm font-semibold",
              approved ? "text-success" : "text-destructive"
            )}
          >
            {approved ? "Approved — committed" : "Commit blocked"}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {approved
              ? summary?.trim()
                ? summary
                : "This scorer is deterministic, auditable, and safe to ship."
              : `Resolve ${errorCount > 0 ? `${errorCount} error${errorCount === 1 ? "" : "s"}` : "the flagged issues"}${
                  warningCount > 0
                    ? ` and review ${warningCount} warning${warningCount === 1 ? "" : "s"}`
                    : ""
                } below, then commit again.`}
          </p>
        </div>
      </div>

      {/* Validation issues grouped by category, then severity */}
      {issues.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What to fix
          </div>
          {ISSUE_CATEGORIES.map(({ type, label, Icon }) => {
            const categoryIssues = issues
              .filter((issue) => issue.type === type)
              .sort(
                (a, b) =>
                  SEVERITY_ORDER.indexOf(a.severity) -
                  SEVERITY_ORDER.indexOf(b.severity)
              );
            if (categoryIssues.length === 0) return null;

            return (
              <div key={type} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Icon size={14} className="text-muted-foreground" />
                  <span>{label}</span>
                  <span className="rounded-sm bg-surface-raised px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                    {categoryIssues.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {categoryIssues.map((issue, idx) => {
                    const sev = SEVERITY_STYLES[issue.severity];
                    return (
                      <div
                        key={`${type}-${idx}`}
                        className={cn("rounded-md border p-2.5", sev.row)}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-sm px-1.5 py-px text-[10px] font-semibold uppercase",
                              sev.chip
                            )}
                          >
                            {sev.label}
                          </span>
                          {typeof issue.line === "number" && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              line {issue.line}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">
                          {issue.message}
                        </p>
                        {issue.socraticQuestion?.trim() && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-sm italic leading-relaxed text-primary">
                            <Lightbulb size={13} className="mt-0.5 shrink-0" />
                            <span>{issue.socraticQuestion}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Socratic dialogue transcript */}
      {dialogue.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mentor notes
          </div>
          {dialogue
            .filter((msg) => msg.trim().length > 0)
            .map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap rounded-md border p-2.5 text-sm leading-relaxed",
                  msg.startsWith("\u{1F534}") &&
                    "border-destructive/30 bg-destructive-subtle text-destructive",
                  msg.startsWith("\u{1F7E1}") &&
                    "border-warning/30 bg-warning-subtle text-foreground",
                  msg.startsWith("\u{1F4A1}") &&
                    "border-info/30 bg-info-subtle text-foreground",
                  msg.startsWith("✅") &&
                    "border-success/30 bg-success-subtle text-success",
                  msg.trimStart().startsWith("→") &&
                    "border-l-[3px] border-l-primary bg-background italic text-primary",
                  !msg.startsWith("\u{1F534}") &&
                    !msg.startsWith("\u{1F7E1}") &&
                    !msg.startsWith("\u{1F4A1}") &&
                    !msg.startsWith("✅") &&
                    !msg.trimStart().startsWith("→") &&
                    "border-border bg-background text-muted-foreground"
                )}
              >
                {msg}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
