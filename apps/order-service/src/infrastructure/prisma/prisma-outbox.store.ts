import { Injectable } from "@nestjs/common";
import type { OutboxRecord, OutboxStore } from "@logistics/messaging";
import type { Prisma, Outbox as PrismaOutbox } from "../../generated/prisma";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class PrismaOutboxStore implements OutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async claimBatch(limit: number): Promise<OutboxRecord[]> {
    const rows: PrismaOutbox[] = await this.prisma.outbox.findMany({
      where: {
        publishedAt: null,
        deadAt: null,
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return rows.map((row: PrismaOutbox) => ({
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      routingKey: row.routingKey,
      payload: row.payload,
      headers: this.toHeaders(row.headers),
      attempts: row.attempts,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
      deadAt: row.deadAt,
      lastError: row.lastError,
    }));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outbox.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        attempts: { increment: 1 },
        lastError: null,
      },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error,
      },
    });
  }

  async markDead(id: string, error: string): Promise<void> {
    await this.prisma.outbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        deadAt: new Date(),
        lastError: error,
      },
    });
  }

  async hasPending(): Promise<boolean> {
    const count = await this.prisma.outbox.count({
      where: {
        publishedAt: null,
        deadAt: null,
      },
    });

    return count > 0;
  }

  private toHeaders(
    value: Prisma.JsonValue | null,
  ): Record<string, string | number> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return Object.entries(value).reduce<Record<string, string | number>>(
      (acc, [key, headerValue]) => {
        if (typeof headerValue === "string" || typeof headerValue === "number") {
          acc[key] = headerValue;
        }
        return acc;
      },
      {},
    );
  }
}
