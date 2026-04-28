import { randomUUID } from "node:crypto";
import type {
  OrderCreatedEvent,
  OrderCancelledEvent,
  ShipmentStatusChangedEvent,
} from "@logistics/contracts";
import { EventTypes, ShipmentStatus } from "@logistics/contracts";

export function buildOrderCreatedEvent(
  overrides: Partial<OrderCreatedEvent["payload"]> = {},
): OrderCreatedEvent {
  const orderId = overrides.orderId ?? randomUUID();
  return {
    eventId: randomUUID(),
    eventType: EventTypes.OrderCreated,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    causationId: null,
    producer: "order-service@0.1.0",
    payload: {
      orderId,
      customerId: randomUUID(),
      shippingAddress: {
        line1: "1 Market St",
        line2: null,
        city: "San Francisco",
        region: "CA",
        postalCode: "94103",
        country: "US",
      },
      items: [
        {
          sku: "SKU-001",
          name: "Widget",
          quantity: 1,
          unitPriceCents: 1999,
        },
      ],
      totalCents: 1999,
      currency: "USD",
      placedAt: new Date().toISOString(),
      ...overrides,
    },
  };
}

export function buildOrderCancelledEvent(
  overrides: Partial<OrderCancelledEvent["payload"]> = {},
): OrderCancelledEvent {
  return {
    eventId: randomUUID(),
    eventType: EventTypes.OrderCancelled,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    causationId: null,
    producer: "order-service@0.1.0",
    payload: {
      orderId: randomUUID(),
      customerId: randomUUID(),
      reason: "Customer request",
      cancelledAt: new Date().toISOString(),
      ...overrides,
    },
  };
}

export function buildShipmentStatusChangedEvent(
  overrides: Partial<ShipmentStatusChangedEvent["payload"]> = {},
): ShipmentStatusChangedEvent {
  return {
    eventId: randomUUID(),
    eventType: EventTypes.ShipmentStatusChanged,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    correlationId: randomUUID(),
    causationId: randomUUID(),
    producer: "tracking-service@0.1.0",
    payload: {
      shipmentId: randomUUID(),
      orderId: randomUUID(),
      previousStatus: null,
      currentStatus: ShipmentStatus.Pending,
      changedAt: new Date().toISOString(),
      location: null,
      ...overrides,
    },
  };
}
