const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface TrackingServiceConfig {
  serviceName: string;
  serviceVersion: string;
  port: number;
  rabbitmqUrl: string;
  rabbitmqExchange: string;
  outboxPollIntervalMs: number;
  outboxBatchSize: number;
  outboxMaxAttempts: number;
}

export const getTrackingServiceConfig = (): TrackingServiceConfig => ({
  serviceName: "tracking-service",
  serviceVersion: "0.1.0",
  port: toNumber(process.env.TRACKING_SERVICE_PORT, 3002),
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE ?? "logistics.events",
  outboxPollIntervalMs: toNumber(process.env.OUTBOX_POLL_INTERVAL_MS, 500),
  outboxBatchSize: toNumber(process.env.OUTBOX_BATCH_SIZE, 50),
  outboxMaxAttempts: toNumber(process.env.OUTBOX_MAX_ATTEMPTS, 10),
});
