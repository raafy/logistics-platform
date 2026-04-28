import { Injectable } from "@nestjs/common";
import { BaseOutboxRelay, RabbitMQClient } from "@logistics/messaging";
import { getTrackingServiceConfig } from "../config/app-config.js";
import { OutboxRepository } from "../repositories/outbox.repository.js";

@Injectable()
export class ShipmentStatusOutboxRelay extends BaseOutboxRelay {
  constructor(outbox: OutboxRepository, rmq: RabbitMQClient) {
    const config = getTrackingServiceConfig();
    super(outbox, rmq, {
      serviceName: config.serviceName,
      pollIntervalMs: config.outboxPollIntervalMs,
      batchSize: config.outboxBatchSize,
      maxAttempts: config.outboxMaxAttempts,
    });
  }
}
