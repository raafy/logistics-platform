import { describe, expect, it } from "vitest";
import { Order, OrderStatus } from "../src/domain/index.js";

describe("Order aggregate", () => {
  it("creates pending order and emits order created event", () => {
    const order = Order.place({
      customerId: "3ce4685c-c70d-456b-bf10-da6dd4556840",
      currency: "usd",
      items: [
        {
          sku: "SKU-1",
          name: "Widget",
          quantity: 2,
          unitPriceCents: 1500,
        },
      ],
      shippingAddress: {
        line1: "123 Main St",
        line2: null,
        city: "Karachi",
        region: "Sindh",
        postalCode: "75000",
        country: "pk",
      },
    });

    expect(order.status).toBe(OrderStatus.Pending);
    expect(order.currency).toBe("USD");
    expect(order.totalCents).toBe(3000);

    const [createdEvent] = order.pullDomainEvents();
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.orderId).toBe(order.id);
    expect(createdEvent?.currency).toBe("USD");
    expect(order.pullDomainEvents()).toEqual([]);
  });

  it("prevents cancellation after confirmation", () => {
    const order = Order.rehydrate({
      id: "f21978e5-00cb-4947-b459-c2d65db3c0a0",
      customerId: "3ce4685c-c70d-456b-bf10-da6dd4556840",
      status: OrderStatus.Pending,
      currency: "USD",
      placedAt: new Date("2026-01-01T00:00:00.000Z"),
      items: [
        {
          sku: "SKU-1",
          name: "Widget",
          quantity: 1,
          unitPriceCents: 1000,
        },
      ],
    });

    order.confirm();

    expect(() => order.cancel()).toThrow("Confirmed order cannot be cancelled");
  });

  it("rejects double cancellation", () => {
    const order = Order.rehydrate({
      id: "4b4afc32-1b67-4ca4-a1aa-74be1b16f543",
      customerId: "3ce4685c-c70d-456b-bf10-da6dd4556840",
      status: OrderStatus.Pending,
      currency: "USD",
      placedAt: new Date("2026-01-01T00:00:00.000Z"),
      items: [
        {
          sku: "SKU-1",
          name: "Widget",
          quantity: 1,
          unitPriceCents: 1000,
        },
      ],
    });

    order.cancel();

    expect(() => order.cancel()).toThrow("Order is already cancelled");
  });
});
