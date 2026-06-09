import { trace, type Tracer } from "@opentelemetry/api";

const TRACER_NAME = "glassbox-engine";

/**
 * Get a tracer instance for instrumenting custom spans.
 * Usage:
 *   const tracer = getTracer();
 *   tracer.startActiveSpan('my-operation', async (span) => { ... });
 */
export function getTracer(name: string = TRACER_NAME): Tracer {
  return trace.getTracer(name);
}

/**
 * Wrap an async function with an OpenTelemetry span.
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }
      }
      const result = await fn();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
