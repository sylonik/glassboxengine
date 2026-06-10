/**
 * Glassbox MCP server definition.
 *
 * Creates a new McpServer with all five tools registered. Call
 * `createMcpServer(authHeader)` once per request (stateless mode).
 * Auth is enforced inside each tool handler by building a tRPC caller
 * with the Authorization header — the existing apiKeyProcedure middleware
 * resolves and validates the key.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { appRouter } from "@glassbox/api";
import { db } from "@glassbox/database/client";
import { getRedis } from "~/lib/redis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCaller(authHeader: string | null) {
  return appRouter.createCaller({
    db,
    redis: getRedis(),
    user: null,
    authHeader,
  });
}

/**
 * Map a TRPCError to an MCP tool-error string so callers get a structured
 * explanation rather than an opaque exception.
 */
function trpcErrorMessage(err: unknown): string {
  if (err instanceof TRPCError) return `[${err.code}] ${err.message}`;
  console.error("[mcp] internal tool error:", err);
  return "Internal error";
}

// ---------------------------------------------------------------------------
// translate_sliders — pure math, no DB
// ---------------------------------------------------------------------------

const slidersShape = {
  relevance: z.number().min(0).max(1).describe("Relevance weight [0-1]"),
  diversity: z.number().min(0).max(1).describe("Diversity weight [0-1]"),
  novelty: z.number().min(0).max(1).describe("Novelty weight [0-1]"),
  popularity: z.number().min(0).max(1).describe("Popularity weight [0-1]"),
};

/**
 * Translate four slider values into Glassbox query parameters.
 *
 * Mirrors the formulas in packages/agents/src/sql-builder.ts#buildSearchParams.
 * Kept inline here to avoid adding @glassbox/agents as a direct dep of apps/web,
 * since that package imports Google ADK which is a heavyweight server-only dep.
 */
function clampWeight(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function translateSliders(input: {
  relevance: number;
  diversity: number;
  novelty: number;
  popularity: number;
}) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const sliders = {
    relevance: clamp(input.relevance),
    diversity: clamp(input.diversity),
    novelty: clamp(input.novelty),
    popularity: clamp(input.popularity),
  };

  const similarityThreshold =
    Math.round((0.18 + sliders.relevance * 0.37) * 10000) / 10000;
  const candidateLimit = Math.round(10 + sliders.diversity * 40);
  const weights = {
    similarity: clampWeight(0.45 + sliders.relevance * 0.55),
    diversity: clampWeight(0.15 + sliders.diversity * 0.35),
    novelty: clampWeight(0.1 + sliders.novelty * 0.3),
    popularity: clampWeight(0.08 + sliders.popularity * 0.22),
  };

  return { sliders, similarityThreshold, candidateLimit, weights };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createMcpServer(authHeader: string | null): McpServer {
  const server = new McpServer(
    { name: "glassbox", version: "1.0.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Glassbox MCP server. Every tool requires a valid project API key sent as 'Authorization: Bearer <key>'.",
    }
  );

  // -------------------------------------------------------------------------
  // Tool: get_feed
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_feed",
    {
      description:
        "Return ranked product recommendations for a user. Wraps the Glassbox recommendation engine with full score breakdowns.",
      inputSchema: {
        userId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "End-user ID to personalise for (defaults to 'mcp-agent' for anonymous probes)"
          ),
        queryText: z
          .string()
          .optional()
          .describe("Natural-language query (default: 'personalized product recommendations')"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max items to return (1-100)"),
        category: z.string().optional().describe("Filter to a specific product category"),
        sliders: z
          .object({
            relevance: z.number().min(0).max(1).optional(),
            diversity: z.number().min(0).max(1).optional(),
            novelty: z.number().min(0).max(1).optional(),
            popularity: z.number().min(0).max(1).optional(),
          })
          .optional()
          .describe("Override ranking weights (each 0-1)"),
      },
    },
    async (args) => {
      try {
        const caller = makeCaller(authHeader);
        const result = await caller.glassBox.recommend({
          endUserId: args.userId ?? "mcp-agent",
          queryText: args.queryText ?? "personalized product recommendations",
          limit: args.limit,
          category: args.category,
          sliders: args.sliders,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: trpcErrorMessage(err) }],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // Tool: get_catalog
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_catalog",
    {
      description:
        "Return the product catalog for the authenticated project. Items include id, externalId, title, category, and metadata.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max items to return (default 50, max 100)"),
        category: z.string().optional().describe("Filter to a specific category"),
      },
    },
    async (args) => {
      try {
        const caller = makeCaller(authHeader);
        const result = await caller.catalog.sdkList({
          limit: args.limit ?? 50,
          category: args.category,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: trpcErrorMessage(err) }],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // Tool: get_scoring_config
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_scoring_config",
    {
      description:
        "Return the project's current scoring configuration: the committed scoring function (if any) and the active intent profile slider defaults.",
      inputSchema: {},
    },
    async () => {
      try {
        const caller = makeCaller(authHeader);
        const result = await caller.scoring.sdkGetConfig({});
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: trpcErrorMessage(err) }],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // Tool: track_events
  // -------------------------------------------------------------------------
  server.registerTool(
    "track_events",
    {
      description:
        "Write one or more user interaction events (view / click / cart_add / purchase) into the Glassbox feedback pipeline.",
      inputSchema: {
        events: z
          .array(
            z.object({
              userId: z.string().min(1).describe("End-user ID"),
              type: z
                .enum(["view", "click", "cart_add", "purchase"])
                .describe("Event type"),
              itemId: z
                .string()
                .uuid()
                .describe("Product UUID (matches catalog product id)"),
              metadata: z
                .record(z.unknown())
                .refine((m) => JSON.stringify(m).length <= 8192, "metadata too large")
                .optional()
                .describe("Arbitrary extra fields (serialized JSON must be ≤ 8 KB)"),
            })
          )
          .min(1)
          .max(100)
          .describe("Batch of events (1-100)"),
      },
    },
    async (args) => {
      try {
        const caller = makeCaller(authHeader);
        const result = await caller.feedback.sdkTrackBatch({
          events: args.events.map((e) => ({
            endUserId: e.userId,
            productId: e.itemId,
            eventType: e.type,
            metadata: e.metadata,
          })),
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: trpcErrorMessage(err) }],
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // Tool: translate_sliders
  // -------------------------------------------------------------------------
  server.registerTool(
    "translate_sliders",
    {
      description:
        "Pure-function utility: translate four slider values (0-1 each) into the internal Glassbox query parameters (similarityThreshold, candidateLimit, weights). No database access required.",
      inputSchema: slidersShape,
    },
    async (args) => {
      try {
        const result = translateSliders(args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: trpcErrorMessage(err) }],
        };
      }
    }
  );

  return server;
}

// Export for tests
export { translateSliders };
