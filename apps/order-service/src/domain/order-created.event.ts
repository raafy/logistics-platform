import type { OrderItemProps } from "./order-item.value-object.js";

export interface ShippingAddress {
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: OrderItemProps[],
    public readonly totalCents: number,
    public readonly currency: string,
    public readonly shippingAddress: ShippingAddress,
    public readonly placedAt: Date,
    public readonly occurredAt: Date,
  ) {}
}
