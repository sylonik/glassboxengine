import type { Content } from "@google/genai";
import {
  BasePlugin,
  type BaseAgent,
  type CallbackContext,
  type InvocationContext,
  type BaseTool,
  type ToolContext,
  type LlmRequest,
  type LlmResponse,
} from "@google/adk";
import { db } from "@glassbox/database/client";
import { auditLogs } from "@glassbox/database/schema";
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("adk-observability");

/**
 * Unified observability plugin for all Glassbox ADK agents.
 * Replaces scattered db.insert(auditLogs) calls with systematic lifecycle hooks.
 *
 * Reads temp:trace_id, temp:user_id, temp:project_id from session state
 * to correlate all audit entries for a single request.
 */
export class GlassboxObservabilityPlugin extends BasePlugin {
  private agentTimers = new Map<string, number>();

  constructor() {
    super("glassbox_observability");
  }

  override async beforeAgentCallback(params: {
    agent: BaseAgent;
    callbackContext: CallbackContext;
  }): Promise<Content | undefined> {
    const { agent, callbackContext } = params;
    const traceId = callbackContext.state.get<string>("temp:trace_id");
    const userId = callbackContext.state.get<string>("temp:user_id");
    const projectId = callbackContext.state.get<string>("temp:project_id");

    this.agentTimers.set(agent.name, Date.now());

    if (traceId && userId) {
      try {
        await db.insert(auditLogs).values({
          userId,
          projectId,
          action: `${agent.name}.start`,
          agentName: agent.name,
          reasoning: `Agent "${agent.name}" started`,
          traceId,
          metadata: { description: agent.description },
        });
      } catch (err) {
        logger.error({ err, agent: agent.name }, "Failed to log agent start");
      }
    }

    return undefined;
  }

  override async afterAgentCallback(params: {
    agent: BaseAgent;
    callbackContext: CallbackContext;
  }): Promise<Content | undefined> {
    const { agent, callbackContext } = params;
    const traceId = callbackContext.state.get<string>("temp:trace_id");
    const userId = callbackContext.state.get<string>("temp:user_id");
    const projectId = callbackContext.state.get<string>("temp:project_id");

    const startTime = this.agentTimers.get(agent.name);
    const latencyMs = startTime ? Date.now() - startTime : undefined;
    this.agentTimers.delete(agent.name);

    if (traceId && userId) {
      try {
        await db.insert(auditLogs).values({
          userId,
          projectId,
          action: `${agent.name}.complete`,
          agentName: agent.name,
          reasoning: `Agent "${agent.name}" completed${latencyMs ? ` in ${latencyMs}ms` : ""}`,
          traceId,
          metadata: { latencyMs },
        });
      } catch (err) {
        logger.error({ err, agent: agent.name }, "Failed to log agent complete");
      }
    }

    return undefined;
  }

  override async beforeToolCallback(params: {
    tool: BaseTool;
    toolArgs: Record<string, unknown>;
    toolContext: ToolContext;
  }): Promise<Record<string, unknown> | undefined> {
    const { tool, toolArgs, toolContext } = params;
    const traceId = toolContext.state.get<string>("temp:trace_id");
    const userId = toolContext.state.get<string>("temp:user_id");
    const projectId = toolContext.state.get<string>("temp:project_id");

    if (traceId && userId) {
      try {
        await db.insert(auditLogs).values({
          userId,
          projectId,
          action: `tool.${tool.name}.invoke`,
          agentName: toolContext.agentName,
          reasoning: `Tool "${tool.name}" invoked`,
          traceId,
          metadata: { toolArgs },
        });
      } catch (err) {
        logger.error({ err, tool: tool.name }, "Failed to log tool invocation");
      }
    }

    return undefined;
  }

  override async afterToolCallback(params: {
    tool: BaseTool;
    toolArgs: Record<string, unknown>;
    toolContext: ToolContext;
    result: Record<string, unknown>;
  }): Promise<Record<string, unknown> | undefined> {
    const { tool, toolContext, result } = params;
    const traceId = toolContext.state.get<string>("temp:trace_id");
    const userId = toolContext.state.get<string>("temp:user_id");
    const projectId = toolContext.state.get<string>("temp:project_id");

    if (traceId && userId) {
      try {
        await db.insert(auditLogs).values({
          userId,
          projectId,
          action: `tool.${tool.name}.result`,
          agentName: toolContext.agentName,
          reasoning: `Tool "${tool.name}" completed`,
          traceId,
          metadata: { result },
        });
      } catch (err) {
        logger.error({ err, tool: tool.name }, "Failed to log tool result");
      }
    }

    return undefined;
  }

  override async beforeModelCallback(params: {
    callbackContext: CallbackContext;
    llmRequest: LlmRequest;
  }): Promise<LlmResponse | undefined> {
    logger.debug(
      { agent: params.callbackContext.agentName },
      "LLM request starting"
    );
    return undefined;
  }

  override async afterModelCallback(params: {
    callbackContext: CallbackContext;
    llmResponse: LlmResponse;
  }): Promise<LlmResponse | undefined> {
    logger.debug(
      { agent: params.callbackContext.agentName },
      "LLM response received"
    );
    return undefined;
  }
}

/** Singleton plugin instance shared across all runners. */
export const observabilityPlugin = new GlassboxObservabilityPlugin();
