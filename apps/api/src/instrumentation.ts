/**
 * OpenTelemetry Instrumentation (LOG-007)
 *
 * Cloud-agnostic telemetry using OpenTelemetry SDK with OTLP exporters.
 * Loaded via Node.js --import flag to ensure modules are patched before
 * application code imports them.
 *
 * Opt-in: Set OTEL_ENABLED=true to activate.
 *
 * IMPORTANT: This file runs before server.ts loads .env via dotenv.
 * All OTEL_* environment variables must be set at the platform level
 * (Docker env, Kubernetes ConfigMap, Azure App Configuration, etc.),
 * NOT in .env files.
 *
 * Environment variables:
 *   OTEL_ENABLED              - "true" to enable (default: disabled)
 *   OTEL_SERVICE_NAME         - Service name for traces/metrics (default: "aim-api")
 *   OTEL_EXPORTER_OTLP_ENDPOINT - Collector endpoint (default: http://localhost:4318)
 *
 * To use with Azure Monitor, install @azure/monitor-opentelemetry-exporter
 * and configure the endpoint accordingly.
 */

const otelEnabled = process.env.OTEL_ENABLED === 'true'

if (otelEnabled) {
  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
  const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http')
  const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics')
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
  const { resourceFromAttributes } = await import('@opentelemetry/resources')
  const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions')

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'aim-api',
      [ATTR_SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: endpoint ? `${endpoint}/v1/traces` : undefined,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: endpoint ? `${endpoint}/v1/metrics` : undefined,
      }),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation — too noisy for web apps
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })

  try {
    sdk.start()
    console.log('OpenTelemetry instrumentation enabled')
  } catch (err) {
    console.error('Failed to start OpenTelemetry SDK — instrumentation disabled:', err)
  }

  // Graceful shutdown flushes pending spans/metrics
  const shutdown = () => {
    sdk.shutdown().catch((err: unknown) => {
      console.error('OpenTelemetry SDK shutdown error:', err)
    })
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
