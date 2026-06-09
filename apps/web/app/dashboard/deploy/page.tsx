"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { useActiveProject } from "../project_context";
import { AlertTriangle, Check, Copy, Key, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "~/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";

interface ApiKeyEntry {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
}

export default function DeployPage() {
  const trpc = useTRPC();
  const { activeProject, activeProjectId } = useActiveProject();

  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const keys = useQuery(
    trpc.deploy.listKeys.queryOptions({ projectId: activeProjectId })
  );

  const generateKey = useMutation(
    trpc.deploy.generateKey.mutationOptions({
      onSuccess: (data) => {
        setNewKey(data.key);
        setKeyName("");
        setExpiresInDays("");
        setShowCreate(false);
        void keys.refetch();
      },
      onError: (err) => setActionError(err.message),
    })
  );

  const revokeKey = useMutation(
    trpc.deploy.revokeKey.mutationOptions({
      onSuccess: () => void keys.refetch(),
      onError: (err) => setActionError(err.message),
    })
  );

  const deleteKey = useMutation(
    trpc.deploy.deleteKey.mutationOptions({
      onSuccess: () => void keys.refetch(),
      onError: (err) => setActionError(err.message),
    })
  );

  const keyEntries = (keys.data ?? []) as ApiKeyEntry[];
  const activeKeys = keyEntries.filter((k) => !k.revokedAt);
  const revokedKeys = keyEntries.filter((k) => !!k.revokedAt);

  const endpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "https://your-app.com/api";

  const sdkSnippet = `import { GlassBox } from '@glassbox/sdk';

const glassbox = new GlassBox({
  endpoint: '${endpoint}',
  apiKey: process.env.GLASSBOX_API_KEY,
});

// Get personalized feed
const recommendation = await glassbox.getPersonalizedFeed('user_123', {
  limit: 20,
  sliders: { relevance: 0.8, diversity: 0.5 },
});

// Track user interaction
await glassbox.trackEvent({
  endUserId: 'user_123',
  productId: recommendation.items[0].itemId,
  eventType: 'click',
});

// Get reasoning chain for an item
const chain = await glassbox.getReasoningChain(
  'user_123',
  recommendation.items[0].itemId
);`;

  const handleCopyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(sdkSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      <PageHeader
        title="Deploy"
        description={`Manage API keys and integrate ${activeProject?.name ?? "your project"} via the @glassbox/sdk`}
        actions={
          <Badge variant={activeKeys.length > 0 ? "default" : "secondary"}>
            {activeKeys.length} active key{activeKeys.length !== 1 ? "s" : ""}
          </Badge>
        }
      />

      {/* Error alert */}
      {actionError && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{actionError}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* New key reveal banner */}
      {newKey && (
        <Card className="mb-4 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-foreground">
                Copy your API key now — it won&apos;t be shown again
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
              <code className="flex-1 break-all font-mono text-sm">{newKey}</code>
              <Button size="sm" onClick={handleCopyKey}>
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setNewKey(null)}
            >
              I&apos;ve saved it, dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys Section */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate keys to authenticate SDK requests from your application
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              Generate key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create form */}
          {showCreate && (
            <div className="mb-4 rounded-lg border border-border bg-background p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Production, Staging"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Expires in (days)</Label>
                  <Input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="Optional — leave blank for no expiry"
                    min={1}
                    max={365}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!keyName.trim() || generateKey.isPending}
                  onClick={() =>
                    generateKey.mutate({
                      projectId: activeProjectId,
                      name: keyName.trim(),
                      expiresInDays: expiresInDays || undefined,
                    })
                  }
                >
                  {generateKey.isPending ? "Generating..." : "Create"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setKeyName("");
                    setExpiresInDays("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Keys list */}
          {keys.isLoading ? (
            <div className="space-y-3 py-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : keyEntries.length === 0 ? (
            <EmptyState
              icon={Key}
              title="No API keys yet"
              description="Generate one to start using the SDK."
              className="py-8"
            />
          ) : (
            <div className="flex flex-col">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center gap-4 border-b border-border py-3 last:border-b-0"
                >
                  <div className="flex min-w-[200px] items-center gap-3">
                    <span className="font-medium text-foreground">{key.name}</span>
                    <code className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {key.keyPrefix}...
                    </code>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-4 max-sm:flex-col max-sm:gap-1">
                    <span className="text-xs text-muted-foreground">
                      Created {formatDate(key.createdAt)}
                    </span>
                    {key.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires {formatDate(key.expiresAt)}
                      </span>
                    )}
                    {key.lastUsedAt && (
                      <span className="text-xs text-muted-foreground">
                        Last used {formatDate(key.lastUsedAt)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKey.mutate({ id: key.id })}
                    disabled={revokeKey.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
              {revokedKeys.length > 0 && (
                <>
                  <div className="mt-2 border-t border-border pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Revoked
                  </div>
                  {revokedKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex flex-wrap items-center gap-4 border-b border-border py-3 opacity-60 last:border-b-0"
                    >
                      <div className="flex min-w-[200px] items-center gap-3">
                        <span className="text-muted-foreground">{key.name}</span>
                        <code className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground opacity-50">
                          {key.keyPrefix}...
                        </code>
                      </div>
                      <div className="flex flex-1 gap-4">
                        <span className="text-xs text-muted-foreground">
                          Revoked {formatDate(key.revokedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKey.mutate({ id: key.id })}
                        disabled={deleteKey.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install + Configure */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <span className="font-semibold text-foreground">Install SDK</span>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3 font-mono text-sm">
              pnpm add @glassbox/sdk
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <span className="font-semibold text-foreground">Configure Environment</span>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3 font-mono text-sm">
              GLASSBOX_API_KEY={activeKeys[0]?.keyPrefix ?? "gb_live_xxxxx"}...
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration example */}
      <Card className="mb-4 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-foreground">Integration Example</span>
          <Button variant="ghost" size="sm" onClick={handleCopySnippet}>
            {copiedSnippet ? (
              <><Check className="h-3 w-3 text-green-500" /> Copied</>
            ) : (
              <><Copy className="h-3 w-3" /> Copy</>
            )}
          </Button>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed text-muted-foreground">
          {sdkSnippet}
        </pre>
      </Card>

      {/* Response Format */}
      <Card>
        <CardHeader>
          <CardTitle>Response Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Field</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-mono text-primary">itemId</td>
                  <td className="px-4 py-3 text-muted-foreground">string</td>
                  <td className="px-4 py-3">Product ID from your catalog</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-primary">reasoning</td>
                  <td className="px-4 py-3 text-muted-foreground">string</td>
                  <td className="px-4 py-3">Human-readable explanation (Glass Box)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-primary">confidenceScore</td>
                  <td className="px-4 py-3 text-muted-foreground">number</td>
                  <td className="px-4 py-3">0-1 confidence from the scoring function</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
