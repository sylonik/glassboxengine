import { metrics, type Meter, type Counter, type Histogram } from "@opentelemetry/api";

const METER_NAME = "glassbox-engine";

export function getMeter(name: string = METER_NAME): Meter {
  return metrics.getMeter(name);
}

/** Pre-defined custom metrics for GlassBox Engine */
export function createGlassBoxMetrics() {
  const meter = getMeter();

  return {
    /** Count of agent invocations by agent name */
    agentInvocations: meter.createCounter("glassbox.agent.invocations", {
      description: "Number of agent invocations",
      unit: "invocations",
    }) as Counter,

    /** Latency of agent operations */
    agentLatency: meter.createHistogram("glassbox.agent.latency", {
      description: "Agent operation latency in milliseconds",
      unit: "ms",
    }) as Histogram,

    /** Count of pgvector searches */
    searchCount: meter.createCounter("glassbox.search.count", {
      description: "Number of pgvector similarity searches",
      unit: "searches",
    }) as Counter,

    /** Search latency */
    searchLatency: meter.createHistogram("glassbox.search.latency", {
      description: "pgvector search latency in milliseconds",
      unit: "ms",
    }) as Histogram,

    /** Embedding generation count */
    embeddingCount: meter.createCounter("glassbox.embedding.count", {
      description: "Number of embeddings generated",
      unit: "embeddings",
    }) as Counter,
  };
}
