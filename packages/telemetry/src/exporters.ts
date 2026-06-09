import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";

/**
 * Initialize the OpenTelemetry Node SDK.
 * Call this from your instrumentation.ts register() function.
 */
export function initTelemetry(options?: {
  serviceName?: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
}) {
  const serviceName =
    options?.serviceName || process.env.OTEL_SERVICE_NAME || "glassbox-engine";
  const serviceVersion = options?.serviceVersion || "0.1.0";
  const otlpEndpoint =
    options?.otlpEndpoint ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318";

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000,
    }),
    instrumentations: [new HttpInstrumentation()],
  });

  sdk.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk.shutdown().catch(() => {});
  });

  return sdk;
}
