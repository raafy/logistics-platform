import type { EventEnvelope, OrderCreatedPayload } from "@logistics/contracts";
import type { Order } from "./order.aggregate.js";

export const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");

export interface PendingOutboxMessage {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  routingKey: string;
  payload: EventEnvelope<OrderCreatedPayload>;
  headers?: Record<string, string | number>;
}

export interface OrderRepository {
  saveNew(order: Order, message: PendingOutboxMessage): Promise<void>;
  findById(id: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
}
