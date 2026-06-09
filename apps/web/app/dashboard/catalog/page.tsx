"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTRPC } from "~/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useActiveProject } from "../project_context";
import {
  BookOpen,
  CheckCircle2,
  Database,
  Globe,
  Layers3,
  Link2,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { StatusDot } from "~/components/ui/status-dot";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

type ImportMode = "upload" | "remote" | "manual";

interface CatalogSource {
  id: string;
  label: string;
  type: "csv" | "json" | "url";
  origin?: string;
  importedAt: string;
  productCount: number;
  format: "csv" | "json";
  metadata?: {
    autoEmbed?: boolean;
    syncStatus?: "idle" | "running" | "success" | "failed";
    syncMessage?: string;
    lastSyncedAt?: string;
  };
}

export default function CatalogPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("upload");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [sourceLabel, setSourceLabel] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileFormat, setFileFormat] = useState<"csv" | "json">("csv");
  const [autoEmbed, setAutoEmbed] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const trpc = useTRPC();
  const {
    activeProject,
    activeProjectId,
    seedDemoProject,
    isSeedingDemo,
    refreshProjectState,
  } = useActiveProject();

  const productsQuery = useQuery(
    trpc.catalog.list.queryOptions({
      limit: 50,
      offset: 0,
      search: search || undefined,
      category: categoryFilter || undefined,
      projectId: activeProjectId,
    })
  );
  const embeddingStatus = useQuery(
    trpc.catalog.embeddingStatus.queryOptions({ projectId: activeProjectId })
  );
  const categories = useQuery(
    trpc.catalog.categories.queryOptions({ projectId: activeProjectId })
  );
  const sources = useQuery(
    trpc.catalog.getSources.queryOptions({ projectId: activeProjectId })
  );

  const createProduct = useMutation(
    trpc.catalog.create.mutationOptions({
      onSuccess: () => {
        resetManualForm();
        setShowAddForm(false);
        void refreshCatalogState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const generateEmbeddings = useMutation(
    trpc.catalog.generateEmbeddings.mutationOptions({
      onSuccess: () => void refreshCatalogState(),
      onError: (error) => setActionError(error.message),
    })
  );

  const importFeed = useMutation(
    trpc.catalog.importFeed.mutationOptions({
      onSuccess: () => {
        resetImportForm();
        setShowImportDialog(false);
        void refreshCatalogState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const syncSource = useMutation(
    trpc.catalog.syncSource.mutationOptions({
      onSuccess: () => {
        void refreshCatalogState();
      },
      onError: (error) => setActionError(error.message),
    })
  );

  const statusData = embeddingStatus.data;
  const progress = statusData ? statusData.percentage : 0;
  const sourceItems = (sources.data ?? []) as CatalogSource[];

  const importCards = useMemo(
    () => [
      {
        mode: "upload" as const,
        icon: Upload,
        title: "Upload catalog file",
        description: "Bring a CSV or JSON catalog and let GlassBox ingest it in one step.",
      },
      {
        mode: "remote" as const,
        icon: Globe,
        title: "Connect remote feed",
        description: "Pull a hosted CSV or JSON feed from a URL and keep the source visible.",
      },
      {
        mode: "manual" as const,
        icon: Plus,
        title: "Add products manually",
        description: "Good for early testing or filling gaps after a larger import.",
      },
    ],
    []
  );

  const refreshCatalogState = async () => {
    await Promise.all([
      productsQuery.refetch(),
      embeddingStatus.refetch(),
      categories.refetch(),
      sources.refetch(),
    ]);
    refreshProjectState();
  };

  // Clear the native file input whenever the selected file name is reset.
  // Reading fileInputRef.current here (an effect) keeps the ref access out of
  // render-reachable callbacks, satisfying the react-hooks/refs rule.
  useEffect(() => {
    if (!selectedFileName && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFileName]);

  const resetImportForm = () => {
    setSourceLabel("");
    setRemoteUrl("");
    setSelectedFileName("");
    setFileContent("");
    setFileFormat("csv");
    setAutoEmbed(true);
  };

  const resetManualForm = () => {
    setProductName("");
    setProductDesc("");
    setProductCategory("");
  };

  const openImportDialog = (mode: ImportMode) => {
    setImportMode(mode);
    setActionError(null);
    setShowImportDialog(true);
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setSourceLabel(file.name.replace(/\.[^.]+$/, ""));
    const text = await file.text();
    setFileContent(text);
    setFileFormat(file.name.toLowerCase().endsWith(".json") ? "json" : "csv");
  };

  const handleImport = async () => {
    setActionError(null);
    if (importMode === "upload") {
      if (!fileContent.trim()) {
        setActionError("Choose a CSV or JSON file first.");
        return;
      }
      await importFeed.mutateAsync({
        projectId: activeProjectId,
        sourceLabel: sourceLabel.trim() || selectedFileName || "Catalog upload",
        sourceType: fileFormat,
        content: fileContent,
        format: fileFormat,
        autoEmbed,
      });
      return;
    }

    if (importMode === "remote") {
      if (!remoteUrl.trim()) {
        setActionError("Paste a remote feed URL first.");
        return;
      }
      await importFeed.mutateAsync({
        projectId: activeProjectId,
        sourceLabel: sourceLabel.trim() || "Remote catalog feed",
        sourceType: "url",
        url: remoteUrl.trim(),
        autoEmbed,
      });
      return;
    }
  };

  return (
    <div>
      <PageHeader
        title="Catalog Studio"
        description={`Connect product data for ${activeProject?.name ?? "the active project"} and prepare it for ranking.`}
        actions={
          statusData && statusData.total > 0 ? (
            <Badge variant="default" className="gap-1.5">
              <StatusDot status="success" pulse />
              {statusData.total} products live
            </Badge>
          ) : undefined
        }
      />

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive-subtle p-3 text-sm text-destructive">
          <StatusDot status="danger" className="mt-1" />
          <span>{actionError}</span>
        </div>
      )}

      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Database size={12} />
              Catalog onboarding
            </div>
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground">
              Bring in a real catalog, not just demo rows.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              GlassBox works best when the first step is obvious: upload a catalog,
              connect a remote feed, generate embeddings, and move straight into
              alignment. This workspace keeps those steps in one place.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {importCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.mode}
                    type="button"
                    onClick={() => {
                      if (card.mode === "manual") setShowAddForm(true);
                      else openImportDialog(card.mode);
                    }}
                    className="group rounded-xl border border-border bg-background p-4 text-left transition-all duration-fast hover:border-primary/40 hover:shadow-glow"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                      <Icon size={18} />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-foreground">
                      {card.title}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Import health</h3>
              {statusData && statusData.total > 0 && (
                <Badge variant="secondary" className="font-mono">
                  {statusData.withEmbeddings}/{statusData.total}
                </Badge>
              )}
            </div>
            {statusData && statusData.total > 0 ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Embeddings ready</span>
                  <span className="font-mono text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{statusData.total} products</Badge>
                  <Badge variant="outline">{statusData.withoutEmbeddings} pending</Badge>
                  <Badge variant="outline">{(categories.data ?? []).length} categories</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  {progress < 100 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        generateEmbeddings.mutate({
                          projectId: activeProjectId,
                          batchSize: 50,
                        })
                      }
                      disabled={generateEmbeddings.isPending}
                    >
                      <Sparkles size={14} />
                      {generateEmbeddings.isPending ? "Generating..." : "Generate embeddings"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openImportDialog("remote")}
                  >
                    <Link2 size={14} />
                    Add another source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background p-5">
                <p className="text-sm text-muted-foreground">
                  No catalog connected yet. Upload a CSV/JSON file, point GlassBox
                  at a hosted feed, or seed a demo project to explore the full workflow.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openImportDialog("upload")}>
                    <Upload size={14} />
                    Upload catalog
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openImportDialog("remote")}>
                    <Globe size={14} />
                    Connect feed URL
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={seedDemoProject}
                    disabled={isSeedingDemo}
                  >
                    <Layers3 size={14} />
                    {isSeedingDemo ? "Seeding..." : "Launch demo"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-[240px] pl-9"
                />
              </div>
              <Select
                value={categoryFilter || "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openImportDialog("upload")}>
                <Upload size={14} />
                Import
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus size={14} />
                Add product
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Embedding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productsQuery.isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading products...
                      </div>
                    </td>
                  </tr>
                )}
                {!productsQuery.isLoading &&
                  (!productsQuery.data?.items || productsQuery.data.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12">
                        <EmptyState
                          icon={BookOpen}
                          title="No products yet"
                          description="Import a CSV or JSON catalog, connect a feed URL, or add products manually."
                        />
                      </td>
                    </tr>
                  )}
                {(productsQuery.data?.items ?? []).map((product) => (
                  <tr key={product.id} className="bg-card">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{product.name}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {product.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <span className="line-clamp-2">
                        {product.description ?? "No description"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Badge
                        variant={product.embedding ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {product.embedding ? (
                          <>
                            <CheckCircle2 size={12} />
                            Ready
                          </>
                        ) : (
                          "Pending"
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Connected sources</h3>
            <Badge variant="secondary">{sourceItems.length}</Badge>
          </div>
          {sources.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : sourceItems.length > 0 ? (
            <div className="space-y-3">
              {sourceItems.map((source) => (
                <div key={source.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{source.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {source.type === "url" ? source.origin ?? "Remote feed" : `${source.format.toUpperCase()} upload`}
                      </div>
                    </div>
                    <Badge variant="outline">{source.productCount} items</Badge>
                  </div>
                  {source.metadata?.syncMessage && (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {source.metadata.syncMessage}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <StatusDot
                      status={
                        source.metadata?.syncStatus === "failed"
                          ? "danger"
                          : source.metadata?.syncStatus === "running"
                            ? "active"
                            : "success"
                      }
                    />
                    {source.type === "url" && source.metadata?.lastSyncedAt
                      ? `Last synced ${new Date(source.metadata.lastSyncedAt).toLocaleString()}`
                      : `Imported ${new Date(source.importedAt).toLocaleString()}`}
                  </div>
                  {source.type === "url" && source.origin && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          syncSource.mutate({
                            projectId: activeProjectId,
                            sourceId: source.id,
                            autoEmbed: source.metadata?.autoEmbed ?? true,
                          })
                        }
                        disabled={
                          syncSource.isPending &&
                          syncSource.variables?.sourceId === source.id
                        }
                      >
                        <Globe size={14} />
                        {syncSource.isPending &&
                        syncSource.variables?.sourceId === source.id
                          ? "Refreshing..."
                          : "Refresh feed"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Link2}
              title="No remembered sources"
              description="Every upload or remote import will be listed here so the team can see how the catalog was loaded."
            />
          )}
        </div>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add product manually</DialogTitle>
            <DialogDescription>
              Useful for filling in a few products while you shape the rest of the import workflow.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createProduct.mutate({
                projectId: activeProjectId,
                name: productName,
                description: productDesc || undefined,
                category: productCategory || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1.5"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                required
                placeholder="Product name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1.5"
                value={productDesc}
                onChange={(event) => setProductDesc(event.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                className="mt-1.5"
                value={productCategory}
                onChange={(event) => setProductCategory(event.target.value)}
                placeholder="Category"
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Adding..." : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Import catalog</DialogTitle>
            <DialogDescription>
              Upload a CSV/JSON catalog or connect a remote feed URL. GlassBox will keep the source visible and can generate embeddings immediately after import.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-3">
            {importCards.map((card) => {
              const Icon = card.icon;
              const active = importMode === card.mode;
              return (
                <button
                  key={card.mode}
                  type="button"
                  onClick={() => setImportMode(card.mode)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary-subtle"
                      : "border-border bg-background hover:border-primary/30"
                  )}
                >
                  <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                  <div className="mt-3 text-sm font-medium text-foreground">{card.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.description}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-background p-4">
            <div>
              <Label>Source label</Label>
              <Input
                className="mt-1.5"
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                placeholder="Spring catalog, Shopify export, Merchant feed..."
              />
            </div>

            {importMode === "upload" && (
              <>
                <div>
                  <Label>Catalog file</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,application/json,.json,text/csv"
                    className="mt-1.5 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    onChange={handleFileSelected}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Supported formats: CSV with headers, JSON array, or JSON with an `items` array.
                  </p>
                </div>
                {selectedFileName && (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    Selected file: <span className="font-medium text-foreground">{selectedFileName}</span>
                  </div>
                )}
              </>
            )}

            {importMode === "remote" && (
              <div>
                <Label>Remote feed URL</Label>
                <Input
                  className="mt-1.5"
                  value={remoteUrl}
                  onChange={(event) => setRemoteUrl(event.target.value)}
                  placeholder="https://example.com/catalog.json"
                />
              </div>
            )}

            <label className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={autoEmbed}
                onChange={(event) => setAutoEmbed(event.target.checked)}
              />
              <span>
                Generate embeddings automatically after import so the catalog is ready for alignment.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                resetImportForm();
                setShowImportDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={importMode === "manual" ? () => {
                setShowImportDialog(false);
                setShowAddForm(true);
              } : handleImport}
              disabled={importFeed.isPending}
            >
              {importMode === "manual"
                ? "Open manual form"
                : importFeed.isPending
                  ? "Importing..."
                  : "Import catalog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
