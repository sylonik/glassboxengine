import { InMemorySessionService } from "@google/adk";

let _sessionService: InMemorySessionService | null = null;

/**
 * Returns a singleton InMemorySessionService instance.
 * Sessions are request-scoped — the durable trace store is audit_logs in PostgreSQL.
 */
export function getSessionService(): InMemorySessionService {
  if (!_sessionService) {
    _sessionService = new InMemorySessionService();
  }
  return _sessionService;
}

/** Generate a trace ID matching the existing format for backward compatibility. */
export function generateTraceId(prefix: string = "trace"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Prepend the provider prefix required by ADK's model registry. */
export function toAdkModel(model: string): string {
  if (model.includes("/")) return model;
  return `gemini/${model}`;
}

/** The ADK app name used for all Glassbox sessions. */
export const APP_NAME = "glassbox";
