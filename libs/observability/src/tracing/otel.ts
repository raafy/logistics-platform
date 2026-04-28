import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface OtelOptions {
  serviceName: string;
  serviceVersion: string;
  endpoint?: string;
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

export function startOtel(opts: OtelOptions): NodeSDK | null {
  const enabled = opts.enabled ?? process.env.OTEL_ENABLED === "true";
  if (!enabled) {
    return null;
  }

  const endpoint =
    opts.endpoint ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    "http://localhost:4318";

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: opts.serviceName,
      [ATTR_SERVICE_VERSION]: opts.serviceVersion,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    void sdk?.shutdown().finally(() => process.exit(0));
  });

  return sdk;
}

export async function shutdownOtel(): Promise<void> {
  await sdk?.shutdown();
  sdk = null;
}
