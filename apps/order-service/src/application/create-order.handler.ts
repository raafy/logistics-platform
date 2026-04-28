import { EventTypes, orderCreatedEventSchema } from "@logistics/contracts";
import { Injectable, Inject } from "@nestjs/common";
import { Order } from "../domain/order.aggregate.js";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../domain/order.repository.js";
import { OutboxRelayService } from "../infrastructure/outbox/outbox-relay.service.js";
import { RmqOrderEventPublisher } from "../infrastructure/events/rmq-order-event.publisher.js";

export interface CreateOrderCommand {
  customerId: string;
  currency: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
}

export interface CreateOrderResult {
  orderId: string;
}

@Injectable()
export class CreateOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: RmqOrderEventPublisher,
    private readonly outboxRelay: OutboxRelayService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    const order = Order.place({
      customerId: command.customerId,
      currency: command.currency,
      items: command.items,
      shippingAddress: command.shippingAddress,
    });

    const [createdEvent] = order.pullDomainEvents();
    if (!createdEvent) {
      throw new Error("Order creation must emit a domain event");
    }

    const message = this.eventPublisher.buildOrderCreatedMessage(createdEvent);
    orderCreatedEventSchema.parse({
      ...message.payload,
      eventType: EventTypes.OrderCreated,
    });

    await this.orderRepository.saveNew(order, message);
    this.outboxRelay.wake();

    return { orderId: order.id };
  }
}
