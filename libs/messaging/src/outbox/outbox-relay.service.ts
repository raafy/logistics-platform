import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { OutboxStore, OutboxRecord } from "./outbox.types.js";
import type { RabbitMQClient } from "../rabbitmq/rabbitmq.client.js";

export interface OutboxRelayOptions {
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
  serviceName: string;
}

@Injectable()
export abstract class BaseOutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaseOutboxRelay.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private wakeRequested = false;
  private stopped = false;

  protected constructor(
    protected readonly store: OutboxStore,
    protected readonly rmq: RabbitMQClient,
    protected readonly opts: OutboxRelayOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    this.scheduleNextTick(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  wake(): void {
    this.wakeRequested = true;
    if (!this.running) {
      this.scheduleNextTick(0);
    }
  }

  async tick(): Promise<number> {
    if (this.running || this.stopped) return 0;
    this.running = true;
    this.wakeRequested = false;
    let published = 0;

    try {
      const batch = await this.store.claimBatch(this.opts.batchSize);
      for (const record of batch) {
        try {
          await this.publishRecord(record);
          await this.store.markPublished(record.id);
          published += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (record.attempts + 1 >= this.opts.maxAttempts) {
            await this.store.markDead(record.id, msg);
            this.logger.error(
              `Outbox record ${record.id} moved to dead after ${record.attempts + 1} attempts: ${msg}`,
            );
          } else {
            await this.store.markFailed(record.id, msg);
            this.logger.warn(
              `Outbox record ${record.id} publish failed (attempt ${record.attempts + 1}): ${msg}`,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `Outbox relay tick errored: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
      if (!this.stopped) {
        const next = this.wakeRequested ? 0 : this.opts.pollIntervalMs;
        this.scheduleNextTick(next);
      }
    }
    return published;
  }

  private scheduleNextTick(delayMs: number): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.tick();
    }, delayMs);
    this.timer.unref?.();
  }

  private async publishRecord(record: OutboxRecord): Promise<void> {
    const body = Buffer.from(JSON.stringify(record.payload), "utf8");
    await this.rmq.publish({
      routingKey: record.routingKey,
      body,
      messageId: record.id,
      headers: record.headers ?? {},
      contentType: "application/json",
      timestamp: record.createdAt.getTime(),
    });
  }
}
