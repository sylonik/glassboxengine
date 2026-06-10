/**
 * MCP (Model Context Protocol) endpoint — Streamable HTTP, stateless mode.
 *
 * Every request creates a fresh McpServer + WebStandardStreamableHTTPServerTransport.
 * Auth is enforced at the HTTP layer (initialize/tools/list included) AND inside
 * each tool handler as defense-in-depth via the apiKeyProcedure middleware.
 *
 * Supported method: POST (JSON-RPC). GET and DELETE return 405.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "~/lib/mcp/server";
import { validateApiKey } from "@glassbox/api";
import { db } from "@glassbox/database/client";

export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024; // 256 KB

async function handleMcp(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");

  // FIX 3b — authenticate before touching the MCP pipeline
  const auth = await validateApiKey(db, authHeader);
  if (!auth) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: valid 'Authorization: Bearer <api_key>' required" },
        id: null,
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // FIX 4 — body size cap
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Request body too large" },
        id: null,
      }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  const server = createMcpServer(authHeader);

  const transport = new WebStandardStreamableHTTPServerTransport({
    // stateless mode — no session ID
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  await server.close();

  return response;
}

export async function POST(req: Request): Promise<Response> {
  return handleMcp(req);
}

// FIX 6 — GET and DELETE are not valid in stateless MCP mode
const METHOD_NOT_ALLOWED = new Response(
  JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32600, message: "Method Not Allowed: use POST" },
    id: null,
  }),
  { status: 405, headers: { "Content-Type": "application/json", Allow: "POST" } }
);

export function GET(): Response {
  return METHOD_NOT_ALLOWED;
}

export function DELETE(): Response {
  return METHOD_NOT_ALLOWED;
}
