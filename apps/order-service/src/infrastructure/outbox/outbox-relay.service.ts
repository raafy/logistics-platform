import { BaseOutboxRelay, RabbitMQClient } from "@logistics/messaging";
import { Injectable } from "@nestjs/common";
import { PrismaOutboxStore } from "../prisma/prisma-outbox.store.js";

@Injectable()
export class OutboxRelayService extends BaseOutboxRelay {
  constructor(store: PrismaOutboxStore, rmq: RabbitMQClient) {
    super(store, rmq, {
      pollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 500),
      batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 50),
      maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 10),
      serviceName: "order-service",
    });
  }
}
