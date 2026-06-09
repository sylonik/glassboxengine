import pino from "pino";
import { trace, context } from "@opentelemetry/api";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Create a structured logger with automatic trace correlation.
 * In development: pretty-printed output.
 * In production: JSON output with traceId attached.
 */
export function createLogger(name: string) {
  const logger = pino({
    name,
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    ...(isDev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
    }),
    mixin() {
      const span = trace.getSpan(context.active());
      if (span) {
        const spanContext = span.spanContext();
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      }
      return {};
    },
  });

  return logger;
}
