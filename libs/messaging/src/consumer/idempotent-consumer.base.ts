import { Logger } from "@nestjs/common";
import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import type { z } from "zod";
import {
  baseEventEnvelopeSchema,
  type BaseEventEnvelope,
} from "@logistics/contracts";
import { correlationContext } from "@logistics/observability";
import type { ProcessedMessageStore } from "./processed-message-store.js";
import type { RabbitMQClient } from "../rabbitmq/rabbitmq.client.js";

export interface ConsumerOptions<TSchema extends z.ZodTypeAny> {
  consumerName: string;
  queue: string;
  eventSchema: TSchema;
  retryOnError?: boolean;
}

export abstract class IdempotentConsumer<TSchema extends z.ZodTypeAny> {
  protected readonly logger: Logger;

  protected constructor(
    protected readonly rmq: RabbitMQClient,
    protected readonly store: ProcessedMessageStore,
    protected readonly options: ConsumerOptions<TSchema>,
  ) {
    this.logger = new Logger(`${this.constructor.name}:${options.consumerName}`);
  }

  async start(): Promise<void> {
    await this.rmq.consume(this.options.queue, (msg, ch) =>
      this.handleMessage(msg, ch),
    );
    this.logger.log(
      `Listening on queue='${this.options.queue}' consumer='${this.options.consumerName}'`,
    );
  }

  protected abstract handleEvent(
    event: z.infer<TSchema>,
    raw: BaseEventEnvelope,
  ): Promise<void>;

  private async handleMessage(
    msg: ConsumeMessage,
    channel: ConfirmChannel,
  ): Promise<void> {
    let envelope: BaseEventEnvelope;
    try {
      const parsed = JSON.parse(msg.content.toString("utf8"));
      envelope = baseEventEnvelopeSchema.parse(parsed);
    } catch (err) {
      this.logger.error(
        `Invalid envelope (unparseable) — DLQing: ${err instanceof Error ? err.message : String(err)}`,
      );
      channel.nack(msg, false, false);
      return;
    }

    await correlationContext.run(
      {
        correlationId: envelope.correlationId,
        causationId: envelope.causationId,
      },
      async () => {
        const typed = this.options.eventSchema.safeParse(envelope);
        if (!typed.success) {
          this.logger.error(
            `Event ${envelope.eventId} failed typed-schema validation — DLQing: ${typed.error.message}`,
          );
          channel.nack(msg, false, false);
          return;
        }

        const result = await this.store.markProcessed(
          this.options.consumerName,
          envelope.eventId,
          envelope.eventType,
          async () => {
            await this.handleEvent(
              typed.data as z.infer<TSchema>,
              envelope,
            );
          },
        );

        switch (result.status) {
          case "processed":
            this.logger.debug(
              `Processed event=${envelope.eventType} id=${envelope.eventId}`,
            );
            channel.ack(msg);
            return;
          case "duplicate":
            this.logger.debug(
              `Duplicate event=${envelope.eventType} id=${envelope.eventId} — acking`,
            );
            channel.ack(msg);
            return;
          case "failed": {
            const retry = this.options.retryOnError ?? true;
            this.logger.error(
              `Handler failed event=${envelope.eventType} id=${envelope.eventId}: ${result.error.message}`,
            );
            channel.nack(msg, false, retry);
            return;
          }
        }
      },
    );
  }
}
