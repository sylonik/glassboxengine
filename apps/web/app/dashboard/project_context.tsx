"use client";

import Link from "next/link";
import {
  Check,
  Circle,
  Folder,
  Plus,
  Rocket,
} from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@glassbox/api";
import { Dropdown } from "~/components/ui/dropdown";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Project = RouterOutputs["projects"]["list"][number];
type SetupState = RouterOutputs["projects"]["getSetupState"];
const EMPTY_PROJECTS: Project[] = [];

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | undefined;
  setupState: SetupState | undefined;
  isLoading: boolean;
  isCreatingProject: boolean;
  isSeedingDemo: boolean;
  error: string | null;
  setActiveProject: (projectId: string) => void;
  createProject: (name: string) => void;
  seedDemoProject: () => void;
  refreshProjectState: () => void;
  dismissError: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const setupSteps = [
  { key: "project", label: "Select project", href: "/dashboard" },
  { key: "catalog", label: "Connect catalog", href: "/dashboard/catalog" },
  { key: "embeddings", label: "Prepare embeddings", href: "/dashboard/catalog" },
  { key: "scorer", label: "Commit scorer", href: "/dashboard/editor" },
  { key: "alignment", label: "Run alignment", href: "/dashboard/alignment" },
  { key: "personas", label: "Review personas", href: "/dashboard/personas" },
  { key: "deploy", label: "Generate API key", href: "/dashboard/deploy" },
  { key: "feedback", label: "Track feedback", href: "/dashboard/feedback" },
  { key: "analytics", label: "Review analytics", href: "/dashboard/analytics" },
] as const;

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>();
  const [pendingProject, setPendingProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projectsQuery = useQuery(trpc.projects.list.queryOptions());
  const activeProjectQuery = useQuery(trpc.projects.getActive.queryOptions());
  const activeProjectId = pendingProjectId ?? activeProjectQuery.data?.id;
  const setupStateQuery = useQuery(
    trpc.projects.getSetupState.queryOptions({ projectId: activeProjectId })
  );

  const refreshProjectState = useCallback(() => {
    void projectsQuery.refetch();
    void activeProjectQuery.refetch();
    void setupStateQuery.refetch();
  }, [activeProjectQuery, projectsQuery, setupStateQuery]);

  const setActive = useMutation(
    trpc.projects.setActive.mutationOptions({
      onSuccess: (project) => {
        setError(null);
        setPendingProjectId(project.id);
        setPendingProject(project);
        refreshProjectState();
      },
      onError: (err) => {
        // Roll back the optimistic switch to the server's truth.
        setPendingProjectId(undefined);
        setPendingProject(null);
        setError(err.message || "Couldn't switch project.");
      },
    })
  );

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (project) => {
        setError(null);
        if (project?.id) {
          setPendingProjectId(project.id);
          setPendingProject(project);
        }
        refreshProjectState();
      },
      onError: (err) => setError(err.message || "Couldn't create project."),
    })
  );

  const seedDemo = useMutation(
    trpc.projects.seedDemo.mutationOptions({
      onSuccess: (result) => {
        setError(null);
        if (result.project?.id) {
          setPendingProjectId(result.project.id);
          setPendingProject(result.project);
        }
        refreshProjectState();
      },
      onError: (err) => setError(err.message || "Couldn't launch demo project."),
    })
  );

  const projects = projectsQuery.data ?? EMPTY_PROJECTS;
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ??
    (pendingProject?.id === activeProjectId ? pendingProject : null) ??
    activeProjectQuery.data ??
    null;

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject,
      activeProjectId: activeProject?.id,
      setupState: setupStateQuery.data,
      isLoading:
        projectsQuery.isLoading ||
        activeProjectQuery.isLoading ||
        setupStateQuery.isLoading,
      isCreatingProject: createProject.isPending,
      isSeedingDemo: seedDemo.isPending,
      error,
      setActiveProject: (projectId) => {
        setError(null);
        setPendingProjectId(projectId);
        setActive.mutate({ projectId });
      },
      createProject: (name) => {
        const trimmed = name.trim();
        if (!trimmed) {
          setError("Project name is required.");
          return;
        }
        setError(null);
        createProject.mutate({ name: trimmed });
      },
      seedDemoProject: () => {
        setError(null);
        seedDemo.mutate({ projectId: activeProject?.id ?? undefined });
      },
      refreshProjectState,
      dismissError: () => setError(null),
    }),
    [
      activeProject,
      activeProjectQuery.isLoading,
      createProject,
      error,
      projects,
      projectsQuery.isLoading,
      refreshProjectState,
      seedDemo,
      setActive,
      setupStateQuery.data,
      setupStateQuery.isLoading,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  const value = useContext(ProjectContext);
  if (!value) {
    throw new Error("useActiveProject must be used inside ProjectProvider");
  }
  return value;
}

export function ProjectSwitcher({ className = "" }: { className?: string }) {
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProject,
    createProject,
    seedDemoProject,
    isCreatingProject,
    isSeedingDemo,
    error,
  } = useActiveProject();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const projectOptions = useMemo(
    () =>
      projects.length > 0
        ? projects.map((project) => ({
            value: project.id,
            label: project.name,
            description: project.description || "Project workspace",
            leading: <Folder size={14} strokeWidth={1.8} />,
          }))
        : [
            {
              value: "",
              label: "No projects yet",
              description: "Create or seed a workspace",
              leading: <Folder size={14} strokeWidth={1.8} />,
              disabled: true,
            },
          ],
    [projects]
  );

  return (
    <div className={`project-shell ${className}`}>
      <Dropdown
        label="Project"
        value={activeProjectId ?? ""}
        options={projectOptions}
        placeholder={projects.length > 0 ? "Select project" : "No projects yet"}
        onChange={(projectId) => {
          if (projectId) setActiveProject(projectId);
        }}
      />
      {activeProject?.description && (
        <p className="project-description">{activeProject.description}</p>
      )}
      <div className="project-actions">
        <button
          type="button"
          className="project-action"
          onClick={() => setShowCreate((value) => !value)}
        >
          <Plus size={14} strokeWidth={1.8} />
          New
        </button>
        <button
          type="button"
          className="project-action"
          onClick={seedDemoProject}
          disabled={isSeedingDemo}
        >
          <Rocket size={14} strokeWidth={1.8} />
          {isSeedingDemo ? "Seeding" : "Demo"}
        </button>
      </div>
      {showCreate && (
        <form
          className="project-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            createProject(name);
            setName("");
            setShowCreate(false);
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            required
          />
          <button type="submit" disabled={isCreatingProject}>
            {isCreatingProject ? "..." : "Create"}
          </button>
        </form>
      )}
      {error && (
        <p
          role="alert"
          style={{
            marginTop: "var(--space-2)",
            fontSize: "var(--text-sm)",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function SetupGuide() {
  const {
    setupState,
    activeProject,
    createProject,
    seedDemoProject,
    isCreatingProject,
    isSeedingDemo,
    refreshProjectState,
    error,
  } = useActiveProject();
  const [projectName, setProjectName] = useState("");

  if (setupState?.complete) return null;

  if (!activeProject) {
    return (
      <section className="setup-panel">
        <div>
          <h2>Start a project</h2>
          <p>
            Create a clean workspace or launch a complete demo project to see
            GlassBox working end to end.
          </p>
        </div>
        <form
          className="setup-start"
          onSubmit={(event) => {
            event.preventDefault();
            createProject(projectName);
            setProjectName("");
          }}
        >
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={isCreatingProject}>
            {isCreatingProject ? "Creating..." : "Create project"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={seedDemoProject}
            disabled={isSeedingDemo}
          >
            {isSeedingDemo ? "Seeding..." : "Launch demo project"}
          </button>
        </form>
        {error && (
          <p className="project-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="setup-panel">
      <div className="setup-heading">
        <div>
          <h2>Setup Progress</h2>
          <p>Complete the workflow for {activeProject.name}.</p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={refreshProjectState}>
          Refresh
        </button>
      </div>
      <div className="setup-steps">
        {setupSteps.map((step) => {
          const complete = Boolean(setupState?.steps[step.key]);
          const isCurrent = setupState?.currentStep === step.key;
          const Icon = complete ? Check : Circle;

          return (
            <Link
              key={step.key}
              href={step.href}
              className={`setup-step ${complete ? "setup-step-complete" : ""} ${isCurrent ? "setup-step-current" : ""}`}
            >
              <Icon size={14} strokeWidth={2} />
              <span>{step.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
