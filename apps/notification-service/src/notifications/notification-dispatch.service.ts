import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NOTIFICATION_PROVIDER_RESOLVER,
} from "./notification.tokens.js";
import type { NotificationDeliveryRepository } from "./notification-delivery.repository.js";
import {
  NotificationStatus,
  type NotificationChannelValue,
  type NotificationDeliveryRecord,
  type NotificationProviderResolverPort,
} from "./notification.types.js";

export interface DispatchNotificationInput {
  eventId: string;
  eventType: string;
  channel: NotificationChannelValue;
  recipient: string;
  content: string;
}

@Injectable()
export class NotificationDispatchService {
  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveryRepository: NotificationDeliveryRepository,
    @Inject(NOTIFICATION_PROVIDER_RESOLVER)
    private readonly providerResolver: NotificationProviderResolverPort,
  ) {}

  async dispatch(
    input: DispatchNotificationInput,
  ): Promise<NotificationDeliveryRecord> {
    const provider = this.providerResolver.resolve(input.channel);
    const delivery = await this.deliveryRepository.create({
      eventId: input.eventId,
      eventType: input.eventType,
      channel: input.channel,
      recipient: input.recipient,
      content: input.content,
      status: NotificationStatus.Pending,
      provider: provider.name,
    });

    try {
      await provider.send(delivery);
      return this.deliveryRepository.updateStatus(
        delivery.id,
        NotificationStatus.Sent,
        new Date(),
      );
    } catch (error) {
      await this.deliveryRepository.updateStatus(
        delivery.id,
        NotificationStatus.Failed,
      );
      throw error;
    }
  }
}
