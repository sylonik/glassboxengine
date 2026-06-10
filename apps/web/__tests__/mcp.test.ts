/**
 * MCP server tests
 *
 * Covers:
 * 1. translate_sliders — pure math unit tests
 * 2. MCP route auth rejection — no key / invalid key
 * 3. tools/list — returns all five expected tools
 * 4. HTTP-layer auth (Fix 3b): unauthenticated requests return 401
 * 5. trpcErrorMessage (Fix 2): generic Error → "Internal error"; TRPCError → code preserved
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Stub heavy dependencies BEFORE importing the server module
// ---------------------------------------------------------------------------

// Mock @glassbox/database/client so we never open a real DB connection
vi.mock("@glassbox/database/client", () => ({
  db: {},
}));

// Mock @glassbox/api so createCaller and validateApiKey are fully controlled in tests
vi.mock("@glassbox/api", () => ({
  appRouter: {
    createCaller: vi.fn(() => ({})),
  },
  validateApiKey: vi.fn(),
}));

// Mock ~/lib/redis so the MCP server module loads without a real Redis connection
vi.mock("../lib/redis", () => ({
  getRedis: vi.fn(() => undefined),
}));

// Mock the MCP SDK transport so the route module can be imported without native bindings
vi.mock("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js", () => ({
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn(),
  })),
}));

// Note: @glassbox/agents is NOT a direct dep of apps/web.
// The MCP server inlines the slider math so no agent mock is needed here.

// Now import after mocks are in place
import { translateSliders, createMcpServer } from "../lib/mcp/server";
import { appRouter, validateApiKey } from "@glassbox/api";

// ---------------------------------------------------------------------------
// 1. translate_sliders — pure math
// ---------------------------------------------------------------------------

describe("translateSliders", () => {
  it("returns correctly computed values for mid-point sliders", () => {
    const result = translateSliders({
      relevance: 0.5,
      diversity: 0.5,
      novelty: 0.5,
      popularity: 0.5,
    });

    expect(result.sliders).toEqual({
      relevance: 0.5,
      diversity: 0.5,
      novelty: 0.5,
      popularity: 0.5,
    });

    // similarityThreshold: 0.18 + 0.5*0.37 = 0.365 → rounded to 4dp
    expect(result.similarityThreshold).toBeCloseTo(0.365, 4);
    // candidateLimit: round(10 + 0.5*40) = round(30) = 30
    expect(result.candidateLimit).toBe(30);
    // weights
    expect(result.weights.similarity).toBeCloseTo(0.45 + 0.5 * 0.55, 4);
    expect(result.weights.diversity).toBeCloseTo(0.15 + 0.5 * 0.35, 4);
    expect(result.weights.novelty).toBeCloseTo(0.1 + 0.5 * 0.3, 4);
    expect(result.weights.popularity).toBeCloseTo(0.08 + 0.5 * 0.22, 4);
  });

  it("clamps inputs below 0 to 0", () => {
    const result = translateSliders({
      relevance: -1,
      diversity: -0.5,
      novelty: -100,
      popularity: -0.1,
    });
    expect(result.sliders.relevance).toBe(0);
    expect(result.sliders.diversity).toBe(0);
    expect(result.sliders.novelty).toBe(0);
    expect(result.sliders.popularity).toBe(0);
  });

  it("clamps inputs above 1 to 1", () => {
    const result = translateSliders({
      relevance: 2,
      diversity: 1.5,
      novelty: 100,
      popularity: 1.1,
    });
    expect(result.sliders.relevance).toBe(1);
    expect(result.sliders.diversity).toBe(1);
    expect(result.sliders.novelty).toBe(1);
    expect(result.sliders.popularity).toBe(1);
  });

  it("returns minimum candidateLimit=10 when diversity=0", () => {
    const result = translateSliders({
      relevance: 0.5,
      diversity: 0,
      novelty: 0.5,
      popularity: 0.5,
    });
    expect(result.candidateLimit).toBe(10);
  });

  it("returns maximum candidateLimit=50 when diversity=1", () => {
    const result = translateSliders({
      relevance: 0.5,
      diversity: 1,
      novelty: 0.5,
      popularity: 0.5,
    });
    expect(result.candidateLimit).toBe(50);
  });

  it("weights do not exceed 1.0 at maximum slider values", () => {
    const result = translateSliders({
      relevance: 1,
      diversity: 1,
      novelty: 1,
      popularity: 1,
    });
    for (const [key, val] of Object.entries(result.weights)) {
      expect(val, `weight.${key} should be ≤1`).toBeLessThanOrEqual(1);
      expect(val, `weight.${key} should be ≥0`).toBeGreaterThanOrEqual(0);
    }
  });

  it("weights do not go below 0.0 at minimum slider values", () => {
    const result = translateSliders({
      relevance: 0,
      diversity: 0,
      novelty: 0,
      popularity: 0,
    });
    for (const [key, val] of Object.entries(result.weights)) {
      expect(val, `weight.${key} should be ≥0`).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns value rounded to 4 decimal places for similarityThreshold", () => {
    const result = translateSliders({
      relevance: 0.3,
      diversity: 0.7,
      novelty: 0.2,
      popularity: 0.8,
    });
    const str = result.similarityThreshold.toString();
    const decimals = str.includes(".") ? str.split(".")[1]!.length : 0;
    expect(decimals).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// 2. Route auth rejection & 3. tools/list — via McpServer tool introspection
// ---------------------------------------------------------------------------

describe("MCP server tools", () => {
  it("registers exactly the five required tools", () => {
    const server = createMcpServer(null);

    // _registeredTools is a plain object keyed by tool name
    const registeredTools = (server as any)._registeredTools as Record<
      string,
      unknown
    >;

    const toolNames = Object.keys(registeredTools).sort();
    expect(toolNames).toEqual([
      "get_catalog",
      "get_feed",
      "get_scoring_config",
      "track_events",
      "translate_sliders",
    ]);
  });
});

// ---------------------------------------------------------------------------
// 4. Auth enforcement — verifying that no-key requests surface an UNAUTHORIZED
//    error from the tRPC caller (the apiKeyProcedure middleware)
// ---------------------------------------------------------------------------

describe("MCP tool auth enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_feed returns isError when authHeader is null", async () => {
    const { TRPCError } = await import("@trpc/server");

    // Make the caller throw UNAUTHORIZED (same as apiKeyProcedure)
    vi.mocked(appRouter.createCaller).mockReturnValue({
      glassBox: {
        recommend: vi.fn().mockRejectedValue(
          new TRPCError({
            code: "UNAUTHORIZED",
            message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
          })
        ),
      },
    } as any);

    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<string, { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }>;
    const getFeedTool = tools["get_feed"]!;

    const result = await getFeedTool.handler(
      { userId: "u1", queryText: "shoes" },
      {} as any
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("UNAUTHORIZED");
  });

  it("get_catalog returns isError when authHeader is null", async () => {
    const { TRPCError } = await import("@trpc/server");

    vi.mocked(appRouter.createCaller).mockReturnValue({
      catalog: {
        sdkList: vi.fn().mockRejectedValue(
          new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or revoked API key" })
        ),
      },
    } as any);

    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<string, { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }>;
    const tool = tools["get_catalog"]!;

    const result = await tool.handler({ limit: 10 }, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("UNAUTHORIZED");
  });

  it("get_scoring_config returns isError when authHeader is null", async () => {
    const { TRPCError } = await import("@trpc/server");

    vi.mocked(appRouter.createCaller).mockReturnValue({
      scoring: {
        sdkGetConfig: vi.fn().mockRejectedValue(
          new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or revoked API key" })
        ),
      },
    } as any);

    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<string, { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }>;
    const tool = tools["get_scoring_config"]!;

    const result = await tool.handler({}, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("UNAUTHORIZED");
  });

  it("track_events returns isError when authHeader is null", async () => {
    const { TRPCError } = await import("@trpc/server");

    vi.mocked(appRouter.createCaller).mockReturnValue({
      feedback: {
        sdkTrackBatch: vi.fn().mockRejectedValue(
          new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or revoked API key" })
        ),
      },
    } as any);

    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<string, { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }>;
    const tool = tools["track_events"]!;

    const result = await tool.handler(
      {
        events: [
          {
            userId: "u1",
            type: "view",
            itemId: "00000000-0000-0000-0000-000000000001",
          },
        ],
      },
      {} as any
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("UNAUTHORIZED");
  });

  it("translate_sliders succeeds without auth (pure function)", async () => {
    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<string, { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }>;
    const tool = tools["translate_sliders"]!;

    const result = await tool.handler(
      { relevance: 0.5, diversity: 0.5, novelty: 0.5, popularity: 0.5 },
      {} as any
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed).toHaveProperty("sliders");
    expect(parsed).toHaveProperty("similarityThreshold");
    expect(parsed).toHaveProperty("candidateLimit");
    expect(parsed).toHaveProperty("weights");
  });
});

// ---------------------------------------------------------------------------
// 5. HTTP-layer auth (Fix 3b): POST handler rejects unauthenticated requests
// ---------------------------------------------------------------------------

describe("MCP route HTTP auth (Fix 3b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when Authorization header is absent", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null);

    // Dynamically import the route handler AFTER mocks are in place
    const { POST } = await import("../app/api/mcp/route");

    const req = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32001 },
    });
  });

  it("returns 401 when Authorization header has an invalid key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null);

    const { POST } = await import("../app/api/mcp/route");

    const req = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-key",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 6. trpcErrorMessage (Fix 2): generic Error leaks nothing; TRPCError preserves code
// ---------------------------------------------------------------------------

describe("trpcErrorMessage (Fix 2)", () => {
  it("returns 'Internal error' for a generic Error (does not leak message)", async () => {
    // We test the behaviour indirectly: a generic Error thrown inside a tool
    // should surface as "Internal error", not the raw message.
    vi.mocked(appRouter.createCaller).mockReturnValue({
      glassBox: {
        recommend: vi.fn().mockRejectedValue(new Error("secret internal detail")),
      },
    } as any);

    const server = createMcpServer("Bearer test-key");
    const tools = (server as any)._registeredTools as Record<
      string,
      { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }
    >;
    const getFeedTool = tools["get_feed"]!;

    const result = await getFeedTool.handler({ userId: "u1" }, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toBe("Internal error");
    expect(result.content[0]!.text).not.toContain("secret internal detail");
  });

  it("preserves TRPCError code in the message", async () => {
    const { TRPCError } = await import("@trpc/server");

    vi.mocked(appRouter.createCaller).mockReturnValue({
      glassBox: {
        recommend: vi.fn().mockRejectedValue(
          new TRPCError({ code: "UNAUTHORIZED", message: "Missing or invalid Authorization header. Use: Bearer <api_key>" })
        ),
      },
    } as any);

    const server = createMcpServer(null);
    const tools = (server as any)._registeredTools as Record<
      string,
      { handler: (...args: unknown[]) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }> }
    >;
    const getFeedTool = tools["get_feed"]!;

    const result = await getFeedTool.handler({ userId: "u1" }, {} as any);

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("UNAUTHORIZED");
    expect(result.content[0]!.text).toContain("Missing or invalid Authorization header");
  });
});
