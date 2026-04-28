import { randomUUID } from "node:crypto";
import { OrderCreatedEvent, type ShippingAddress } from "./order-created.event.js";
import { OrderItem, type OrderItemProps } from "./order-item.value-object.js";
import { OrderStatus } from "./order-status.enum.js";

export interface PlaceOrderProps {
  id?: string;
  customerId: string;
  currency: string;
  items: OrderItemProps[];
  shippingAddress: ShippingAddress;
  placedAt?: Date;
}

export interface RehydrateOrderProps {
  id: string;
  customerId: string;
  status: OrderStatus;
  currency: string;
  items: OrderItemProps[];
  placedAt: Date;
  shippingAddress?: ShippingAddress;
}

export class Order {
  private readonly itemsValue: OrderItem[];
  private readonly domainEvents: OrderCreatedEvent[] = [];

  private constructor(
    private readonly idValue: string,
    private readonly customerIdValue: string,
    private statusValue: OrderStatus,
    private readonly currencyValue: string,
    items: OrderItem[],
    private readonly placedAtValue: Date,
    private readonly shippingAddressValue?: ShippingAddress,
  ) {
    if (!this.customerIdValue.trim()) {
      throw new Error("Customer ID is required");
    }
    if (!this.currencyValue.trim() || this.currencyValue.trim().length !== 3) {
      throw new Error("Currency must be a 3-letter code");
    }
    if (items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    this.itemsValue = items;
  }

  static place(props: PlaceOrderProps): Order {
    const placedAt = props.placedAt ?? new Date();
    const order = new Order(
      props.id ?? randomUUID(),
      props.customerId,
      OrderStatus.Pending,
      props.currency.toUpperCase(),
      props.items.map((item) => OrderItem.create(item)),
      placedAt,
      {
        ...props.shippingAddress,
        line1: props.shippingAddress.line1.trim(),
        line2: props.shippingAddress.line2?.trim() ?? null,
        city: props.shippingAddress.city.trim(),
        region: props.shippingAddress.region.trim(),
        postalCode: props.shippingAddress.postalCode.trim(),
        country: props.shippingAddress.country.trim().toUpperCase(),
      },
    );

    order.domainEvents.push(
      new OrderCreatedEvent(
        order.id,
        order.customerId,
        order.items.map((item) => item.toPrimitives()),
        order.totalCents,
        order.currency,
        order.shippingAddress,
        order.placedAt,
        placedAt,
      ),
    );

    return order;
  }

  static rehydrate(props: RehydrateOrderProps): Order {
    return new Order(
      props.id,
      props.customerId,
      props.status,
      props.currency,
      props.items.map((item) => OrderItem.create(item)),
      props.placedAt,
      props.shippingAddress,
    );
  }

  get id(): string {
    return this.idValue;
  }

  get customerId(): string {
    return this.customerIdValue;
  }

  get status(): OrderStatus {
    return this.statusValue;
  }

  get currency(): string {
    return this.currencyValue;
  }

  get items(): OrderItem[] {
    return [...this.itemsValue];
  }

  get placedAt(): Date {
    return this.placedAtValue;
  }

  get shippingAddress(): ShippingAddress {
    if (!this.shippingAddressValue) {
      throw new Error("Shipping address is unavailable for this order state");
    }

    return { ...this.shippingAddressValue };
  }

  get totalCents(): number {
    return this.itemsValue.reduce((sum, item) => sum + item.totalCents, 0);
  }

  confirm(): void {
    if (this.statusValue === OrderStatus.Cancelled) {
      throw new Error("Cancelled order cannot be confirmed");
    }
    this.statusValue = OrderStatus.Confirmed;
  }

  cancel(): void {
    if (this.statusValue === OrderStatus.Cancelled) {
      throw new Error("Order is already cancelled");
    }
    if (this.statusValue === OrderStatus.Confirmed) {
      throw new Error("Confirmed order cannot be cancelled");
    }
    this.statusValue = OrderStatus.Cancelled;
  }

  pullDomainEvents(): OrderCreatedEvent[] {
    return this.domainEvents.splice(0, this.domainEvents.length);
  }

  toPersistence(): RehydrateOrderProps {
    return {
      id: this.id,
      customerId: this.customerId,
      status: this.status,
      currency: this.currency,
      items: this.items.map((item) => item.toPrimitives()),
      placedAt: this.placedAt,
      shippingAddress: this.shippingAddressValue,
    };
  }
}
