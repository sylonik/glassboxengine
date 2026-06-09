"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { Filter, Plus, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { StaggerContainer, StaggerItem } from "~/components/motion";

interface StepInput {
  label: string;
  matchField: "event_name" | "page_path";
  matchValue: string;
  stepOrder: number;
}

export default function FunnelsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { activeProject, activeProjectId } = useActiveProject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([
    { label: "", matchField: "page_path", matchValue: "", stepOrder: 1 },
    { label: "", matchField: "page_path", matchValue: "", stepOrder: 2 },
  ]);

  const funnelsList = useQuery(
    trpc.funnels.list.queryOptions({ projectId: activeProjectId })
  );

  const createMutation = useMutation(
    trpc.funnels.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.funnels.list.queryKey() });
        setDialogOpen(false);
        resetForm();
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.funnels.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.funnels.list.queryKey() });
      },
    })
  );

  function resetForm() {
    setName("");
    setDescription("");
    setSteps([
      { label: "", matchField: "page_path", matchValue: "", stepOrder: 1 },
      { label: "", matchField: "page_path", matchValue: "", stepOrder: 2 },
    ]);
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        label: "",
        matchField: "page_path" as const,
        matchValue: "",
        stepOrder: prev.length + 1,
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 2) return;
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepOrder: i + 1 }))
    );
  }

  function updateStep(index: number, field: keyof StepInput, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function handleCreate() {
    createMutation.mutate({
      projectId: activeProjectId,
      name,
      description: description || undefined,
      steps,
    });
  }

  const funnelsData = funnelsList.data ?? [];

  return (
    <div>
      <PageHeader
        title="Funnels"
        description={`Conversion funnels for ${activeProject?.name ?? "the active project"}`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={16} className="mr-1.5" />
                Create Funnel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Funnel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="funnel-name">Name</Label>
                  <Input
                    id="funnel-name"
                    placeholder="Signup Funnel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="funnel-desc">Description (optional)</Label>
                  <Input
                    id="funnel-desc"
                    placeholder="Tracks user journey from landing to signup"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Steps</Label>
                  <div className="mt-2 space-y-3">
                    {steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-border p-3"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Step label, e.g. Landing Page"
                            value={step.label}
                            onChange={(e) =>
                              updateStep(i, "label", e.target.value)
                            }
                          />
                          <div className="flex gap-2">
                            <Select
                              value={step.matchField}
                              onValueChange={(v) =>
                                updateStep(
                                  i,
                                  "matchField",
                                  v as "event_name" | "page_path"
                                )
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="page_path">
                                  Page Path
                                </SelectItem>
                                <SelectItem value="event_name">
                                  Event Name
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className="flex-1"
                              placeholder={
                                step.matchField === "page_path"
                                  ? "/pricing"
                                  : "signup_submit"
                              }
                              value={step.matchValue}
                              onChange={(e) =>
                                updateStep(i, "matchValue", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        {steps.length > 2 && (
                          <button
                            onClick={() => removeStep(i)}
                            className="mt-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {steps.length < 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={addStep}
                    >
                      <Plus size={14} className="mr-1" />
                      Add Step
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !name ||
                    steps.some((s) => !s.label || !s.matchValue) ||
                    createMutation.isPending
                  }
                  className="w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create Funnel"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {funnelsList.isLoading ? (
        <StaggerContainer className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <StaggerItem key={i}>
              <Skeleton className="h-32 w-full rounded-xl" />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : funnelsData.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No funnels configured"
          description="Create a funnel to track conversion paths on your website."
          className="py-16"
        />
      ) : (
        <StaggerContainer className="grid gap-4 md:grid-cols-2">
          {funnelsData.map((funnel) => (
            <StaggerItem key={funnel.id}>
              <Card className="group relative transition-shadow hover:shadow-md">
                <Link
                  href={`/dashboard/funnels/${funnel.id}`}
                  className="absolute inset-0 z-10"
                />
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{funnel.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {funnel.steps.length} steps
                    </Badge>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {funnel.description && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {funnel.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {funnel.steps.map((step, i) => (
                      <span key={step.id} className="flex items-center gap-1.5">
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">
                          {step.label}
                        </span>
                        {i < funnel.steps.length - 1 && (
                          <ChevronRight size={12} />
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <div className="absolute right-3 bottom-3 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteMutation.mutate({ id: funnel.id });
                    }}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive-subtle hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
