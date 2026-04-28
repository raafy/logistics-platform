import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  ProcessResult,
  ProcessedMessageStore,
} from "@logistics/messaging";
import { PrismaService } from "../prisma/prisma.service.js";
import { PrismaTransactionHost } from "./prisma-transaction-host.js";

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "P2002";

@Injectable()
export class ProcessedMessageRepository implements ProcessedMessageStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: PrismaTransactionHost,
  ) {}

  async markProcessed(
    consumerName: string,
    eventId: string,
    eventType: string,
    handler: () => Promise<void>,
  ): Promise<ProcessResult> {
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) =>
        this.txHost.runWithClient(tx, async () => {
          await tx.processedMessage.create({
            data: {
              consumerName,
              eventId,
              eventType,
            },
          });

          await handler();
          return { status: "processed" } as const;
        }),
      );
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        return { status: "duplicate" };
      }

      return {
        status: "failed",
        error: toError(error),
      };
    }
  }
}
