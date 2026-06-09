"use client";

import { useState, useCallback } from "react";
import { useTRPC } from "~/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useActiveProject } from "../project_context";
import { Play, Save, ScanEye, Users } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { IntentSlider } from "~/components/alignment/intent-slider";
import { FeedCard } from "~/components/alignment/feed-card";
import { PipelineIndicator } from "~/components/alignment/pipeline-indicator";
import { EmptyState } from "~/components/ui/empty-state";
import { StatusDot } from "~/components/ui/status-dot";
import { StaggerContainer, StaggerItem } from "~/components/motion";
import Link from "next/link";

interface SliderState {
  relevance: number;
  diversity: number;
  novelty: number;
  popularity: number;
}

const SLIDER_LABELS: Record<keyof SliderState, { label: string; description: string; color: string }> = {
  relevance: { label: "Relevance", description: "How closely items match user preferences", color: "var(--color-accent)" },
  diversity: { label: "Diversity", description: "Variety across categories and types", color: "var(--color-success)" },
  novelty: { label: "Novelty", description: "Preference for new and undiscovered items", color: "var(--color-warning)" },
  popularity: { label: "Popularity", description: "Weight given to trending items", color: "var(--color-info)" },
};

const DEFAULT_SLIDERS: SliderState = {
  relevance: 0.7,
  diversity: 0.4,
  novelty: 0.3,
  popularity: 0.6,
};

interface ScoreContribution {
  name: string;
  weight: number;
  rawValue: number;
  weightedValue: number;
  contribution: string;
}

interface FeedItem {
  id: string;
  itemId: string;
  name: string;
  description: string | null;
  category: string | null;
  similarity: number;
  score: number;
  reasoning: string;
  confidenceScore: number;
  scoreBreakdown: ScoreContribution[];
  matchedSignals: string[];
}

interface ReasoningLabel {
  itemId: string;
  shortLabel: string;
  detailedReasoning: string;
  factors: Array<{ name: string; weight: number; contribution: string }>;
}

interface PersonaRef {
  id: string;
  name: string;
}

export default function AlignmentPage() {
  const projectContext = useActiveProject();

  return (
    <AlignmentPageContent
      key={projectContext.activeProjectId ?? "no-project"}
      activeProject={projectContext.activeProject}
      activeProjectId={projectContext.activeProjectId}
      refreshProjectState={projectContext.refreshProjectState}
    />
  );
}

function AlignmentPageContent({
  activeProject,
  activeProjectId,
  refreshProjectState,
}: Pick<
  ReturnType<typeof useActiveProject>,
  "activeProject" | "activeProjectId" | "refreshProjectState"
>) {
  const [draftSliders, setDraftSliders] = useState<SliderState | null>(null);
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [reasoning, setReasoning] = useState<ReasoningLabel[]>([]);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<string>("");
  const [searchExplanation, setSearchExplanation] = useState("");
  const [queryText, setQueryText] = useState("general product recommendations");
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [appliedPersona, setAppliedPersona] = useState<PersonaRef | null>(null);

  const trpc = useTRPC();

  const activeProfile = useQuery(
    trpc.alignment.getActive.queryOptions({ projectId: activeProjectId })
  );
  const catalogStatus = useQuery(
    trpc.catalog.embeddingStatus.queryOptions({ projectId: activeProjectId })
  );
  const personasQuery = useQuery(
    trpc.personas.list.queryOptions({ projectId: activeProjectId })
  );
  const profileId = createdProfileId ?? activeProfile.data?.id ?? null;
  const activeSliders = activeProfile.data?.sliders as SliderState | undefined;
  const sliders = draftSliders ?? activeSliders ?? DEFAULT_SLIDERS;
  const statusData = catalogStatus.data;

  const createProfile = useMutation(
    trpc.alignment.create.mutationOptions({
      onSuccess: (data) => {
        setCreatedProfileId(data?.id ?? null);
        activeProfile.refetch();
        refreshProjectState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const updateSliders = useMutation(
    trpc.alignment.updateSliders.mutationOptions({
      onSuccess: (data) => {
        setActionError(data?.pipelineError?.message ?? null);
        if (data?.feed) setFeed(data.feed);
        if (data?.reasoning) setReasoning(data.reasoning);
        setTraceId(data?.traceId ?? null);
        setPolicyVersion(data?.policy?.version ?? null);
        setRunSummary(data?.summary ?? "");
        if (data?.searchExplanation) setSearchExplanation(data.searchExplanation);
        setAppliedPersona(data?.persona ?? null);
        refreshProjectState();
      },
      onError: (error) => setActionError(error.message),
    })
  );
  const isBusy = createProfile.isPending || updateSliders.isPending;

  const handleSliderChange = useCallback((key: keyof SliderState, value: number) => {
    setDraftSliders((prev) => ({ ...(prev ?? sliders), [key]: value }));
  }, [sliders]);

  const handleSave = async () => {
    setActionError(null);
    try {
      if (!profileId) {
        await createProfile.mutateAsync({
          projectId: activeProjectId,
          name: "Default Profile",
          sliders,
        });
      } else {
        await updateSliders.mutateAsync({
          profileId,
          sliders,
          queryText: queryText.trim() || undefined,
          personaId: selectedPersonaId || undefined,
        });
      }
    } catch {}
  };

  const handleRunAlignment = async () => {
    setActionError(null);
    try {
      let targetProfileId = profileId;
      if (!targetProfileId) {
        const created = await createProfile.mutateAsync({
          projectId: activeProjectId,
          name: "Default Profile",
          sliders,
        });
        targetProfileId = created?.id ?? null;
      }
      if (!targetProfileId) {
        setActionError("Could not create an alignment profile.");
        return;
      }
      await updateSliders.mutateAsync({
        profileId: targetProfileId,
        sliders,
        queryText: queryText.trim() || undefined,
        personaId: selectedPersonaId || undefined,
      });
    } catch {}
  };

  const getReasoningForItem = (itemId: string) => reasoning.find((r) => r.itemId === itemId);

  return (
    <div>
      <PageHeader
        title="Alignment Studio"
        description={`Adjust intent sliders for ${activeProject?.name ?? "the active project"}`}
        actions={
          profileId ? (
            <Badge variant="outline" className="gap-1.5">
              <StatusDot status="success" pulse />
              Active
            </Badge>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] items-start">
        {/* Left: Controls */}
        <div className="flex flex-col gap-4">
          {/* Intent Sliders Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-5">
              Intent Sliders
            </h2>

            {(Object.keys(SLIDER_LABELS) as Array<keyof SliderState>).map((key) => (
              <IntentSlider
                key={key}
                name={key}
                value={sliders[key]}
                onChange={(v) => handleSliderChange(key, v)}
                label={SLIDER_LABELS[key].label}
                description={SLIDER_LABELS[key].description}
                color={SLIDER_LABELS[key].color}
              />
            ))}

            <Separator className="my-4" />

            {/* Query field */}
            <div className="mb-4">
              <Label htmlFor="alignment-query">Recommendation query</Label>
              <Input
                id="alignment-query"
                className="mt-1.5"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="general product recommendations"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Used by the Architect when translating slider weights into ranked products.
              </p>
            </div>

            {/* Persona selector — cold-start personalization */}
            <div className="mb-4">
              <Label htmlFor="alignment-persona" className="flex items-center gap-1.5">
                <Users size={13} className="text-muted-foreground" />
                Persona pre-warm
              </Label>
              <select
                id="alignment-persona"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPersonaId}
                onChange={(event) => setSelectedPersonaId(event.target.value)}
                disabled={isBusy}
              >
                <option value="">None — query-only ranking</option>
                {(personasQuery.data ?? []).map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Biases ranking by the persona&apos;s learned preference vector for cold-start runs.
              </p>
            </div>

            {actionError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive">
                <StatusDot status="danger" className="mt-1" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isBusy}
                className="flex-1"
              >
                {createProfile.isPending ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Save size={14} />
                )}
                {profileId ? "Save Profile" : "Create Profile"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRunAlignment}
                disabled={isBusy}
              >
                {updateSliders.isPending ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Play size={14} />
                )}
                {profileId ? "Run" : "Create & Run"}
              </Button>
            </div>
          </div>

          {/* Weight Distribution Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Weight Distribution
            </h3>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(SLIDER_LABELS) as Array<keyof SliderState>).map((key) => (
                <div
                  key={key}
                  className="relative h-2 overflow-hidden rounded-full bg-surface-raised"
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${sliders[key] * 100}%`, background: SLIDER_LABELS[key].color, opacity: 0.8 }}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[6px] font-bold uppercase text-foreground">
                    {SLIDER_LABELS[key].label[0]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Badge variant="secondary">{statusData?.total ?? 0} products</Badge>
              <Badge variant={statusData?.withEmbeddings ? "default" : "destructive"}>
                {statusData?.withEmbeddings ?? 0} embedded
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Feed Preview */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-foreground">Feed Preview</h2>
              <div className="flex items-center gap-2">
                {appliedPersona && (
                  <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
                    <Users size={11} />
                    Personalized for: {appliedPersona.name}
                  </Badge>
                )}
                {feed.length > 0 && (
                  <Badge variant="secondary" className="font-mono">
                    {feed.length} items
                  </Badge>
                )}
              </div>
            </div>

            {updateSliders.isPending && <PipelineIndicator isRunning />}

            {!updateSliders.isPending && feed.length === 0 && (
              <EmptyState
                icon={ScanEye}
                title={!profileId ? "No profile yet" : "No results"}
                description={
                  !profileId
                    ? "Create a profile or run alignment once to save these slider weights."
                    : statusData?.total === 0
                      ? "Add products in Catalog before running the alignment pipeline."
                      : "Try a broader query or adjust the slider weights and run again."
                }
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/catalog">Go to Catalog</Link>
                  </Button>
                }
              />
            )}

            {!updateSliders.isPending && feed.length > 0 && (
              <StaggerContainer className="flex flex-col gap-2" staggerDelay={0.03}>
                {feed.map((item, index) => {
                  const label = getReasoningForItem(item.id);
                  return (
                    <StaggerItem key={item.id}>
                      <FeedCard
                        rank={index + 1}
                        name={item.name}
                        category={item.category}
                        confidenceScore={item.confidenceScore}
                        shortLabel={label?.shortLabel}
                        detailedReasoning={label?.detailedReasoning}
                        factors={label?.factors}
                        scoreBreakdown={item.scoreBreakdown}
                        matchedSignals={item.matchedSignals}
                        isExpanded={expandedItem === item.id}
                        onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      />
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </div>

          {/* Glass Box Panel */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ScanEye size={16} className="text-primary" />
              <h2 className="text-base font-semibold text-foreground">Glass Box</h2>
              {traceId && (
                <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
                  {traceId}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <GlassBoxRow
                label="QUERY WEIGHTS"
                value={`R:${sliders.relevance.toFixed(2)} D:${sliders.diversity.toFixed(2)} N:${sliders.novelty.toFixed(2)} P:${sliders.popularity.toFixed(2)}`}
              />
              <GlassBoxRow
                label="AGENT"
                value={
                  updateSliders.isPending
                    ? "Processing\u2026"
                    : searchExplanation || "Waiting for alignment run\u2026"
                }
                loading={updateSliders.isPending}
              />
              <GlassBoxRow
                label="RESULTS"
                value={feed.length > 0 ? `${feed.length} items ranked` : "\u2014"}
              />
              <GlassBoxRow
                label="POLICY"
                value={policyVersion ?? "\u2014"}
              />
              <GlassBoxRow
                label="SUMMARY"
                value={runSummary || "Waiting for alignment run\u2026"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassBoxRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        {loading && (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
        )}
        {value}
      </span>
    </div>
  );
}
