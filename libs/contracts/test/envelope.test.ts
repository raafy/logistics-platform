import { describe, expect, it } from "vitest";
import { baseEventEnvelopeSchema } from "../src/events/envelope.js";

describe("EventEnvelope", () => {
  const validEnvelope = {
    eventId: "01936e4e-8c29-7c5a-9f8b-b4e7a2d1c3f4",
    eventType: "order.created",
    eventVersion: 1,
    occurredAt: "2026-04-28T10:00:00.000Z",
    correlationId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    causationId: null,
    producer: "order-service@0.1.0",
    payload: { any: "shape" },
  };

  it("accepts a valid envelope", () => {
    expect(() => baseEventEnvelopeSchema.parse(validEnvelope)).not.toThrow();
  });

  it("rejects non-UUID eventId", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({ ...validEnvelope, eventId: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects zero/negative eventVersion", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({ ...validEnvelope, eventVersion: 0 }),
    ).toThrow();
    expect(() =>
      baseEventEnvelopeSchema.parse({ ...validEnvelope, eventVersion: -1 }),
    ).toThrow();
  });

  it("rejects non-ISO datetime", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({
        ...validEnvelope,
        occurredAt: "2026/04/28",
      }),
    ).toThrow();
  });

  it("requires correlationId", () => {
    const { correlationId: _drop, ...rest } = validEnvelope;
    expect(() => baseEventEnvelopeSchema.parse(rest)).toThrow();
  });

  it("accepts causationId=null (root events)", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({ ...validEnvelope, causationId: null }),
    ).not.toThrow();
  });

  it("accepts causationId=uuid (derived events)", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({
        ...validEnvelope,
        causationId: "b3d89c3a-4a9f-4e3b-9e2a-7c6d5e4b3a2f",
      }),
    ).not.toThrow();
  });

  it("rejects empty producer string", () => {
    expect(() =>
      baseEventEnvelopeSchema.parse({ ...validEnvelope, producer: "" }),
    ).toThrow();
  });
});
