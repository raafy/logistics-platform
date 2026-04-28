import {
  EventTypes,
  shipmentStatusChangedEventSchema,
  type BaseEventEnvelope,
  type ShipmentStatusChangedEvent,
} from "@logistics/contracts";
import {
  IdempotentConsumer,
  RabbitMQClient,
} from "@logistics/messaging";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaProcessedMessageStore } from "../infrastructure/prisma/prisma-processed-message.store.js";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service.js";
import { NotificationChannel } from "../notifications/notification.types.js";

@Injectable()
export class ShipmentStatusChangedConsumer
  extends IdempotentConsumer<typeof shipmentStatusChangedEventSchema>
  implements OnModuleInit
{
  constructor(
    rmq: RabbitMQClient,
    store: PrismaProcessedMessageStore,
    private readonly dispatchService: NotificationDispatchService,
  ) {
    super(rmq, store, {
      consumerName: "notification-service.shipment-status-changed",
      queue: "notification.shipment.status_changed",
      eventSchema: shipmentStatusChangedEventSchema,
      retryOnError: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  protected async handleEvent(
    event: ShipmentStatusChangedEvent,
    _raw: BaseEventEnvelope,
  ): Promise<void> {
    await this.dispatchService.dispatch({
      eventId: event.eventId,
      eventType: EventTypes.ShipmentStatusChanged,
      channel: NotificationChannel.Sms,
      recipient: `order:${event.payload.orderId}`,
      content: `Shipment ${event.payload.shipmentId} status changed to ${event.payload.currentStatus}.`,
    });
  }
}
