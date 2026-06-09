import { Runner } from "@google/adk";
import { engineerAgent } from "../agents/engineer-agent";
import { observabilityPlugin } from "../plugins/observability-plugin";
import { getSessionService, generateTraceId, APP_NAME } from "../session";
import type { CatalogScanResult } from "../../engineer";

/**
 * Runner for the Engineer Agent.
 * Creates a short-lived session, runs the BaseAgent, extracts CatalogScanResult,
 * and cleans up the session.
 *
 * Preserves the same signature as the legacy runEngineerAgent().
 */
export async function runEngineerPipeline(
  batchSize: number = 10,
  userId?: string,
  projectId?: string
): Promise<CatalogScanResult> {
  const sessionService = getSessionService();
  const traceId = generateTraceId("engineer");

  const session = await sessionService.createSession({
    appName: APP_NAME,
    userId: userId ?? "system",
    state: {
      "temp:trace_id": traceId,
      "temp:user_id": userId,
      "temp:project_id": projectId,
      "temp:batch_size": batchSize,
    },
  });

  const runner = new Runner({
    appName: APP_NAME,
    agent: engineerAgent,
    sessionService,
    plugins: [observabilityPlugin],
  });

  try {
    // Exhaust the generator — results are written to session state
    for await (const _event of runner.runAsync({
      userId: userId ?? "system",
      sessionId: session.id,
      newMessage: {
        role: "user",
        parts: [{ text: "Generate embeddings for products missing them" }],
      },
    })) {
      // Events consumed by observability plugin
    }

    const updatedSession = await sessionService.getSession({
      appName: APP_NAME,
      userId: userId ?? "system",
      sessionId: session.id,
    });

    const result = updatedSession?.state["temp:engineer_result"] as
      | CatalogScanResult
      | undefined;

    if (result) return result;

    return {
      totalProducts: 0,
      withEmbeddings: 0,
      withoutEmbeddings: 0,
      categories: [],
      newlyEmbedded: 0,
    };
  } finally {
    await sessionService
      .deleteSession({
        appName: APP_NAME,
        userId: userId ?? "system",
        sessionId: session.id,
      })
      .catch(() => {});
  }
}
