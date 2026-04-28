import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import type {
  NotificationDeliveryRepository,
  CreateNotificationDeliveryInput,
} from "../../notifications/notification-delivery.repository.js";
import type { NotificationDeliveryRecord } from "../../notifications/notification.types.js";

@Injectable()
export class PrismaNotificationDeliveryRepository
  implements NotificationDeliveryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateNotificationDeliveryInput,
  ): Promise<NotificationDeliveryRecord> {
    const [delivery] = await this.prisma.client.$queryRaw<
      NotificationDeliveryRecord[]
    >`
      INSERT INTO notification_deliveries (
        id,
        event_id,
        event_type,
        channel,
        recipient,
        content,
        status,
        provider,
        sent_at,
        created_at
      )
      VALUES (
        gen_random_uuid()::text,
        ${data.eventId},
        ${data.eventType},
        ${data.channel},
        ${data.recipient},
        ${data.content},
        ${data.status},
        ${data.provider},
        NULL,
        NOW()
      )
      RETURNING
        id,
        event_id AS "eventId",
        event_type AS "eventType",
        channel,
        recipient,
        content,
        status,
        provider,
        sent_at AS "sentAt",
        created_at AS "createdAt"
    `;

    if (!delivery) {
      throw new Error("Failed to create notification delivery");
    }

    return delivery;
  }

  async updateStatus(
    id: string,
    status: NotificationDeliveryRecord["status"],
    sentAt?: Date,
  ): Promise<NotificationDeliveryRecord> {
    const [delivery] = await this.prisma.client.$queryRaw<
      NotificationDeliveryRecord[]
    >`
      UPDATE notification_deliveries
      SET
        status = ${status},
        sent_at = ${sentAt ?? null}
      WHERE id = ${id}
      RETURNING
        id,
        event_id AS "eventId",
        event_type AS "eventType",
        channel,
        recipient,
        content,
        status,
        provider,
        sent_at AS "sentAt",
        created_at AS "createdAt"
    `;

    if (!delivery) {
      throw new Error(`Notification delivery not found: ${id}`);
    }

    return delivery;
  }
}
