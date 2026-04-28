import { Injectable } from "@nestjs/common";
import type { OutboxRecord, OutboxStore } from "@logistics/messaging";
import { PrismaTransactionHost } from "./prisma-transaction-host.js";

type OutboxRow = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  routingKey: string;
  payload: unknown;
  headers: unknown;
  attempts: number;
  createdAt: Date;
  publishedAt: Date | null;
  deadAt: Date | null;
  lastError: string | null;
};

const toHeaders = (
  value: unknown,
): Record<string, string | number> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const headers: Record<string, string | number> = {};
  for (const [key, headerValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof headerValue === "string" || typeof headerValue === "number") {
      headers[key] = headerValue;
    }
  }

  return Object.keys(headers).length > 0 ? headers : null;
};

const mapOutbox = (record: OutboxRow): OutboxRecord => ({
  id: record.id,
  aggregateType: record.aggregateType,
  aggregateId: record.aggregateId,
  eventType: record.eventType,
  routingKey: record.routingKey,
  payload: record.payload,
  headers: toHeaders(record.headers),
  attempts: record.attempts,
  createdAt: record.createdAt,
  publishedAt: record.publishedAt,
  deadAt: record.deadAt,
  lastError: record.lastError,
});

@Injectable()
export class OutboxRepository implements OutboxStore {
  constructor(private readonly txHost: PrismaTransactionHost) {}

  async enqueue(record: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    routingKey: string;
    payload: Record<string, unknown>;
    headers?: Record<string, string | number> | null;
  }): Promise<void> {
    await this.txHost.getClient().outbox.create({
      data: {
        aggregateType: record.aggregateType,
        aggregateId: record.aggregateId,
        eventType: record.eventType,
        routingKey: record.routingKey,
        payload: record.payload as never,
        ...(record.headers ? { headers: record.headers as never } : {}),
      },
    });
  }

  async claimBatch(limit: number): Promise<OutboxRecord[]> {
    return this.txHost.withTransaction(async () => {
      const db = this.txHost.getClient();
      const records = await db.outbox.findMany({
        where: {
          publishedAt: null,
          deadAt: null,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      const claimed: OutboxRecord[] = [];
      for (const record of records) {
        const updated = await db.outbox.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
        claimed.push(mapOutbox(updated));
      }

      return claimed;
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.txHost.getClient().outbox.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.txHost.getClient().outbox.update({
      where: { id },
      data: {
        lastError: error,
      },
    });
  }

  async markDead(id: string, error: string): Promise<void> {
    await this.txHost.getClient().outbox.update({
      where: { id },
      data: {
        deadAt: new Date(),
        lastError: error,
      },
    });
  }

  async hasPending(): Promise<boolean> {
    const count = await this.txHost.getClient().outbox.count({
      where: {
        publishedAt: null,
        deadAt: null,
      },
    });

    return count > 0;
  }
}
