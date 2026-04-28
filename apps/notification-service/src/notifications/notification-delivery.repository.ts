import type { NotificationDeliveryRecord } from "./notification.types.js";

export interface CreateNotificationDeliveryInput {
  eventId: string;
  eventType: string;
  channel: string;
  recipient: string;
  content: string;
  status: string;
  provider: string;
}

export interface NotificationDeliveryRepository {
  create(data: CreateNotificationDeliveryInput): Promise<NotificationDeliveryRecord>;
  updateStatus(
    id: string,
    status: NotificationDeliveryRecord["status"],
    sentAt?: Date,
  ): Promise<NotificationDeliveryRecord>;
}
