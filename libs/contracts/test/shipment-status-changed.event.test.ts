import { describe, expect, it } from "vitest";
import {
  ShipmentStatus,
  shipmentStatusChangedEventSchema,
} from "../src/events/shipment-status-changed.event.js";
import { EventTypes } from "../src/events/event-types.js";

const buildValidEvent = () => ({
  eventId: "01936e4e-8c29-7c5a-9f8b-b4e7a2d1c3f4",
  eventType: EventTypes.ShipmentStatusChanged,
  eventVersion: 1,
  occurredAt: "2026-04-28T10:00:00.000Z",
  correlationId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  causationId: "b3d89c3a-4a9f-4e3b-9e2a-7c6d5e4b3a2f",
  producer: "tracking-service@0.1.0",
  payload: {
    shipmentId: "c4f2d3e5-6f7e-5d8c-aa9b-2e3f4d5c6b7a",
    orderId: "a3f1c2b4-5e6d-4c7b-9a8f-1d2e3c4b5a6f",
    previousStatus: null,
    currentStatus: ShipmentStatus.Pending,
    changedAt: "2026-04-28T10:00:01.000Z",
    location: null,
  },
});

describe("ShipmentStatusChangedEvent", () => {
  it("accepts a valid shipment.status_changed event", () => {
    expect(() =>
      shipmentStatusChangedEventSchema.parse(buildValidEvent()),
    ).not.toThrow();
  });

  it("accepts all declared statuses", () => {
    for (const status of Object.values(ShipmentStatus)) {
      const ev = buildValidEvent();
      ev.payload.currentStatus = status;
      expect(() =>
        shipmentStatusChangedEventSchema.parse(ev),
      ).not.toThrow();
    }
  });

  it("rejects unknown status", () => {
    const bad = buildValidEvent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.payload as any).currentStatus = "TELEPORTED";
    expect(() => shipmentStatusChangedEventSchema.parse(bad)).toThrow();
  });

  it("rejects invalid latitude (> 90)", () => {
    const bad = buildValidEvent();
    bad.payload.location = { latitude: 91, longitude: 0, label: null };
    expect(() => shipmentStatusChangedEventSchema.parse(bad)).toThrow();
  });

  it("rejects invalid longitude (< -180)", () => {
    const bad = buildValidEvent();
    bad.payload.location = { latitude: 0, longitude: -181, label: null };
    expect(() => shipmentStatusChangedEventSchema.parse(bad)).toThrow();
  });
});
