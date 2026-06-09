"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Edit2, Play, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge, type BadgeProps } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { EmptyState } from "~/components/ui/empty-state";
import { StatusDot } from "~/components/ui/status-dot";
import { ConfidenceRing } from "~/components/ui/confidence-ring";
import { StaggerContainer, StaggerItem } from "~/components/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

interface BehaviorConfig {
  browsingPatterns?: string[];
  priceRange?: { min?: number; max?: number };
  categoryPreferences?: string[];
  engagementLevel?: string;
}

interface SimulationResults {
  traceId?: string;
  interactionCount?: number;
  simulatedAt?: string;
  summary?: string;
}

interface SimulatedInteraction {
  productId: string;
  productName: string;
  interactionType: string;
  confidence: number;
  reasoning: string;
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const INTERACTION_COLORS: Record<string, BadgeVariant> = {
  purchase: "default",
  cart_add: "default",
  click: "secondary",
  view: "outline",
};

const INTERACTION_LABELS: Record<string, string> = {
  purchase: "Purchase",
  cart_add: "Cart Add",
  click: "Click",
  view: "View",
};

export default function PersonasPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId, refreshProjectState } = useActiveProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [simulationData, setSimulationData] = useState<Record<string, SimulatedInteraction[]>>({});
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const personas = useQuery(
    trpc.personas.list.queryOptions({ projectId: activeProjectId })
  );

  const createPersona = useMutation(
    trpc.personas.create.mutationOptions({
      onSuccess: () => {
        setName("");
        setDescription("");
        setShowForm(false);
        setActionError(null);
        personas.refetch();
        refreshProjectState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const updatePersona = useMutation(
    trpc.personas.update.mutationOptions({
      onSuccess: () => {
        setEditingId(null);
        setActionError(null);
        personas.refetch();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const deletePersona = useMutation(
    trpc.personas.delete.mutationOptions({
      onSuccess: () => {
        setActionError(null);
        personas.refetch();
        refreshProjectState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const simulatePersona = useMutation(
    trpc.personas.simulate.mutationOptions({
      onSuccess: (data, variables) => {
        setSimulatingId(null);
        setActionError(null);
        if (data?.interactions) {
          setSimulationData((prev) => ({
            ...prev,
            [variables.personaId]: data.interactions,
          }));
        }
        setExpandedPersona(variables.personaId);
        personas.refetch();
      },
      onError: (error) => {
        setSimulatingId(null);
        setActionError(error.message);
      },
    })
  );

  const handleSimulate = (personaId: string) => {
    setActionError(null);
    setSimulatingId(personaId);
    simulatePersona.mutate({ personaId, projectId: activeProjectId });
  };

  const handleDelete = (personaId: string) => {
    setActionError(null);
    deletePersona.mutate({ id: personaId });
  };

  const startEdit = (persona: { id: string; name: string; description: string | null }) => {
    setEditingId(persona.id);
    setEditName(persona.name);
    setEditDescription(persona.description ?? "");
  };

  const handleEdit = () => {
    if (!editingId || !editName.trim()) return;
    updatePersona.mutate({
      id: editingId,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Persona Lab"
        description={`Generate synthetic audiences to pre-warm recommendations for ${activeProject?.name ?? "the active project"}`}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Create Persona
          </Button>
        }
      />

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive">
          <StatusDot status="danger" className="mt-1" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Persona</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setActionError(null);
              if (!name.trim()) {
                setActionError("Add a persona name before creating it.");
                return;
              }
              createPersona.mutate({
                projectId: activeProjectId,
                name: name.trim(),
                description: description.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="persona-name">Name</Label>
              <Input
                id="persona-name"
                className="mt-1.5"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Budget-conscious parent"
              />
            </div>
            <div>
              <Label htmlFor="persona-desc">Description</Label>
              <textarea
                id="persona-desc"
                className="mt-1.5 flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the persona's behavior and intent. AI will generate a structured behavior config from your description."
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave blank for default config, or describe the persona and AI will generate browsing patterns, price range, and category preferences.
              </p>
            </div>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPersona.isPending || !name.trim()}>
                {createPersona.isPending ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className="mt-1.5"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <textarea
                id="edit-desc"
                className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updatePersona.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {personas.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : personas.data && personas.data.length > 0 ? (
        <StaggerContainer className="flex flex-col gap-4">
          {personas.data.map((persona) => {
            const behavior = (persona.behaviorConfig ?? {}) as BehaviorConfig;
            const simResults = (persona.simulationResults ?? {}) as SimulationResults;
            const patterns = behavior.browsingPatterns ?? [];
            const priceRange = behavior.priceRange;
            const engagement = behavior.engagementLevel ?? "medium";
            const isExpanded = expandedPersona === persona.id;
            const isSimulating = simulatingId === persona.id;
            const interactions = simulationData[persona.id];
            const hasSimulated = !!simResults.simulatedAt;

            return (
              <StaggerItem key={persona.id}>
                <div
                  className={cn(
                    "rounded-lg border bg-card p-5 transition-all duration-fast",
                    isExpanded
                      ? "border-primary shadow-glow"
                      : "border-border hover:border-border-hover"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                        {persona.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {persona.name}
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {persona.description || "Synthetic audience segment"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={hasSimulated ? "default" : "secondary"}>
                      {hasSimulated
                        ? `${simResults.interactionCount} interactions`
                        : `${engagement} intent`}
                    </Badge>
                  </div>

                  {/* Behavior chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {patterns.slice(0, 3).map((pattern) => (
                      <Badge key={pattern} variant="secondary" className="text-[11px]">
                        {pattern}
                      </Badge>
                    ))}
                    {behavior.categoryPreferences?.slice(0, 2).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-[11px] border-primary/30 text-primary">
                        {cat}
                      </Badge>
                    ))}
                    {priceRange && (
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        ${priceRange.min ?? 0}-${priceRange.max ?? 0}
                      </Badge>
                    )}
                  </div>

                  {/* Simulation progress */}
                  {isSimulating && (
                    <div className="mt-4">
                      <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div className="absolute inset-y-0 left-[-40%] w-[40%] animate-[sim-slide_1.2s_ease_infinite] rounded-full bg-primary" />
                      </div>
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Generating synthetic interactions...
                      </p>
                    </div>
                  )}

                  {/* Simulation results */}
                  <AnimatePresence>
                    {isExpanded && interactions && interactions.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator className="my-4" />
                        <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Simulated Interactions
                        </h4>
                        <div className="flex flex-col gap-2">
                          {interactions.map((interaction, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-md border border-border bg-background p-2.5"
                            >
                              <Badge
                                variant={INTERACTION_COLORS[interaction.interactionType] ?? "secondary"}
                                className="min-w-[72px] justify-center text-[11px]"
                              >
                                {INTERACTION_LABELS[interaction.interactionType] ?? interaction.interactionType}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground">
                                  {interaction.productName}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {interaction.reasoning}
                                </div>
                              </div>
                              <ConfidenceRing value={interaction.confidence} size={28} strokeWidth={2.5} />
                            </div>
                          ))}
                        </div>
                        {simResults.traceId && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-primary-subtle px-2 py-1 font-mono text-xs text-primary">
                            {simResults.traceId}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSimulate(persona.id)}
                        disabled={isSimulating}
                      >
                        {isSimulating ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            {hasSimulated ? "Re-simulate" : "Simulate"}
                          </>
                        )}
                      </Button>
                      {interactions && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setExpandedPersona(isExpanded ? null : persona.id)}
                        >
                          <ChevronDown
                            size={12}
                            className={cn("transition-transform", isExpanded && "rotate-180")}
                          />
                          {isExpanded ? "Collapse" : "Results"}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(persona)}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive-subtle hover:text-destructive"
                        onClick={() => handleDelete(persona.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      ) : (
        <EmptyState
          icon={Users}
          title="No personas yet"
          description="Create personas to generate synthetic audiences and pre-warm the recommendation engine for cold-start scenarios."
          action={
            <Button onClick={() => setShowForm(true)}>Create First Persona</Button>
          }
        />
      )}

      <style>{`
        @keyframes sim-slide { 0% { left: -40%; } 100% { left: 100%; } }
      `}</style>
    </div>
  );
}
