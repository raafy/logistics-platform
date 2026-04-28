import {
  EventTypes,
  orderCreatedEventSchema,
  type BaseEventEnvelope,
  type OrderCreatedEvent,
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
export class OrderCreatedConsumer
  extends IdempotentConsumer<typeof orderCreatedEventSchema>
  implements OnModuleInit
{
  constructor(
    rmq: RabbitMQClient,
    store: PrismaProcessedMessageStore,
    private readonly dispatchService: NotificationDispatchService,
  ) {
    super(rmq, store, {
      consumerName: "notification-service.order-created",
      queue: "notification.order.created",
      eventSchema: orderCreatedEventSchema,
      retryOnError: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  protected async handleEvent(
    event: OrderCreatedEvent,
    _raw: BaseEventEnvelope,
  ): Promise<void> {
    await this.dispatchService.dispatch({
      eventId: event.eventId,
      eventType: EventTypes.OrderCreated,
      channel: NotificationChannel.Email,
      recipient: `customer:${event.payload.customerId}`,
      content: `Order ${event.payload.orderId} was created with ${event.payload.items.length} item(s) totaling ${event.payload.totalCents} ${event.payload.currency}.`,
    });
  }
}
