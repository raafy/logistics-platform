import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  IdempotentConsumer,
  RabbitMQClient,
} from "@logistics/messaging";
import {
  orderCreatedEventSchema,
  type BaseEventEnvelope,
  type OrderCreatedEvent,
} from "@logistics/contracts";
import { ProcessedMessageRepository } from "../repositories/processed-message.repository.js";
import { ShipmentsService } from "../services/shipments.service.js";

@Injectable()
export class TrackingOrderCreatedConsumer
  extends IdempotentConsumer<typeof orderCreatedEventSchema>
  implements OnModuleInit
{
  constructor(
    rmq: RabbitMQClient,
    store: ProcessedMessageRepository,
    private readonly shipmentsService: ShipmentsService,
  ) {
    super(rmq, store, {
      consumerName: "tracking-order-created",
      queue: "tracking.order.created",
      eventSchema: orderCreatedEventSchema,
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    await this.start();
  }

  protected async handleEvent(
    event: OrderCreatedEvent,
    _raw: BaseEventEnvelope,
  ): Promise<void> {
    await this.shipmentsService.createPendingShipment({
      orderId: event.payload.orderId,
      occurredAt: new Date(event.payload.placedAt),
    });
  }
}
