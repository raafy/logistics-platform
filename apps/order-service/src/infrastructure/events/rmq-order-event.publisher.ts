import {
  EVENT_SCHEMA_VERSION,
  EventTypes,
  type OrderCreatedPayload,
} from "@logistics/contracts";
import { buildEventEnvelope } from "@logistics/messaging";
import { correlationContext } from "@logistics/observability";
import { Injectable } from "@nestjs/common";
import type { OrderCreatedEvent } from "../../domain/order-created.event.js";
import type { PendingOutboxMessage } from "../../domain/order.repository.js";

@Injectable()
export class RmqOrderEventPublisher {
  buildOrderCreatedMessage(event: OrderCreatedEvent): PendingOutboxMessage {
    const payload: OrderCreatedPayload = {
      orderId: event.orderId,
      customerId: event.customerId,
      shippingAddress: event.shippingAddress,
      items: event.items,
      totalCents: event.totalCents,
      currency: event.currency,
      placedAt: event.placedAt.toISOString(),
    };

    const envelope = buildEventEnvelope<OrderCreatedPayload>({
      eventType: EventTypes.OrderCreated,
      eventVersion: EVENT_SCHEMA_VERSION,
      producer: "order-service",
      payload,
      occurredAt: event.occurredAt,
    });

    return {
      aggregateType: "order",
      aggregateId: event.orderId,
      eventType: EventTypes.OrderCreated,
      routingKey: EventTypes.OrderCreated,
      payload: envelope,
      headers: {
        correlationId:
          correlationContext.getId() ?? envelope.correlationId,
      },
    };
  }
}
