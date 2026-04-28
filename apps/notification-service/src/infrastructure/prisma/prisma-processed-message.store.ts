import { Injectable } from "@nestjs/common";
import type {
  ProcessResult,
  ProcessedMessageStore,
} from "@logistics/messaging";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class PrismaProcessedMessageStore implements ProcessedMessageStore {
  constructor(private readonly prisma: PrismaService) {}

  async markProcessed(
    consumerName: string,
    eventId: string,
    eventType: string,
    handler: () => Promise<void>,
  ): Promise<ProcessResult> {
    try {
      await this.prisma.withTransaction(async () => {
        const inserted = await this.prisma.client.$queryRaw<Array<{ id: string }>>`
          INSERT INTO processed_messages (
            id,
            consumer_name,
            event_id,
            event_type,
            processed_at
          )
          VALUES (
            gen_random_uuid()::text,
            ${consumerName},
            ${eventId},
            ${eventType},
            NOW()
          )
          ON CONFLICT (consumer_name, event_id) DO NOTHING
          RETURNING id
        `;

        if (inserted.length === 0) {
          throw new Error("DUPLICATE_MESSAGE");
        }

        await handler();
      });

      return { status: "processed" };
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_MESSAGE") {
        return { status: "duplicate" };
      }

      return {
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
