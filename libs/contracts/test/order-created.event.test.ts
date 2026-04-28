import { describe, expect, it } from "vitest";
import { orderCreatedEventSchema } from "../src/events/order-created.event.js";
import { EventTypes } from "../src/events/event-types.js";

const buildValidEvent = () => ({
  eventId: "01936e4e-8c29-7c5a-9f8b-b4e7a2d1c3f4",
  eventType: EventTypes.OrderCreated,
  eventVersion: 1,
  occurredAt: "2026-04-28T10:00:00.000Z",
  correlationId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  causationId: null,
  producer: "order-service@0.1.0",
  payload: {
    orderId: "a3f1c2b4-5e6d-4c7b-9a8f-1d2e3c4b5a6f",
    customerId: "b4e2d3c5-6f7e-5d8c-aa9b-2e3f4d5c6b7a",
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
        quantity: 2,
        unitPriceCents: 1999,
      },
    ],
    totalCents: 3998,
    currency: "USD",
    placedAt: "2026-04-28T10:00:00.000Z",
  },
});

describe("OrderCreatedEvent", () => {
  it("accepts a valid order.created event", () => {
    expect(() => orderCreatedEventSchema.parse(buildValidEvent())).not.toThrow();
  });

  it("rejects wrong eventType literal", () => {
    const bad = { ...buildValidEvent(), eventType: "order.updated" };
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });

  it("rejects empty items array", () => {
    const bad = buildValidEvent();
    bad.payload.items = [];
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });

  it("rejects non-ISO 3166 country codes", () => {
    const bad = buildValidEvent();
    bad.payload.shippingAddress.country = "USA";
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });

  it("rejects non-ISO 4217 currency codes", () => {
    const bad = buildValidEvent();
    bad.payload.currency = "DOLLAR";
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });

  it("rejects non-integer quantity", () => {
    const bad = buildValidEvent();
    bad.payload.items[0]!.quantity = 1.5;
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });

  it("rejects negative unit price", () => {
    const bad = buildValidEvent();
    bad.payload.items[0]!.unitPriceCents = -1;
    expect(() => orderCreatedEventSchema.parse(bad)).toThrow();
  });
});
