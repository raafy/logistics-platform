import { describe, expect, it } from "vitest";
import { orderCancelledEventSchema } from "../src/events/order-cancelled.event.js";
import { EventTypes } from "../src/events/event-types.js";

const buildValid = () => ({
  eventId: "01936e4e-8c29-7c5a-9f8b-b4e7a2d1c3f4",
  eventType: EventTypes.OrderCancelled,
  eventVersion: 1,
  occurredAt: "2026-04-28T11:00:00.000Z",
  correlationId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  causationId: null,
  producer: "order-service@0.1.0",
  payload: {
    orderId: "a3f1c2b4-5e6d-4c7b-9a8f-1d2e3c4b5a6f",
    customerId: "b4e2d3c5-6f7e-5d8c-aa9b-2e3f4d5c6b7a",
    reason: "Customer request",
    cancelledAt: "2026-04-28T11:00:00.000Z",
  },
});

describe("OrderCancelledEvent", () => {
  it("accepts a valid cancellation", () => {
    expect(() => orderCancelledEventSchema.parse(buildValid())).not.toThrow();
  });

  it("rejects empty reason", () => {
    const bad = buildValid();
    bad.payload.reason = "";
    expect(() => orderCancelledEventSchema.parse(bad)).toThrow();
  });

  it("rejects reason > 500 chars", () => {
    const bad = buildValid();
    bad.payload.reason = "x".repeat(501);
    expect(() => orderCancelledEventSchema.parse(bad)).toThrow();
  });
});
