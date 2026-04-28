import { describe, expect, it } from "vitest";
import { buildEventEnvelope } from "../src/envelope/envelope-builder.js";
import { correlationContext } from "@logistics/observability";

describe("buildEventEnvelope", () => {
  it("builds a well-formed envelope with defaults", () => {
    const env = buildEventEnvelope({
      eventType: "order.created",
      eventVersion: 1,
      producer: "order-service@0.1.0",
      payload: { hello: "world" },
    });

    expect(env.eventId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(env.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(env.causationId).toBeNull();
    expect(env.eventType).toBe("order.created");
    expect(env.eventVersion).toBe(1);
    expect(env.producer).toBe("order-service@0.1.0");
    expect(env.payload).toEqual({ hello: "world" });
    expect(new Date(env.occurredAt).toString()).not.toBe("Invalid Date");
  });

  it("inherits correlation and causation from ambient context", () => {
    const corr = "11111111-1111-4111-8111-111111111111";
    const cause = "22222222-2222-4222-8222-222222222222";

    correlationContext.run(
      { correlationId: corr, causationId: cause },
      () => {
        const env = buildEventEnvelope({
          eventType: "test.event",
          eventVersion: 1,
          producer: "svc",
          payload: {},
        });
        expect(env.correlationId).toBe(corr);
        expect(env.causationId).toBe(cause);
      },
    );
  });

  it("explicit correlationId overrides context", () => {
    correlationContext.run(
      {
        correlationId: "11111111-1111-4111-8111-111111111111",
        causationId: null,
      },
      () => {
        const override = "99999999-9999-4999-8999-999999999999";
        const env = buildEventEnvelope({
          eventType: "x",
          eventVersion: 1,
          producer: "svc",
          payload: {},
          correlationId: override,
        });
        expect(env.correlationId).toBe(override);
      },
    );
  });

  it("respects provided eventId and occurredAt", () => {
    const id = "abcdef01-2345-4678-89ab-cdef01234567";
    const when = new Date("2026-01-01T00:00:00.000Z");
    const env = buildEventEnvelope({
      eventType: "x",
      eventVersion: 1,
      producer: "svc",
      payload: {},
      eventId: id,
      occurredAt: when,
    });
    expect(env.eventId).toBe(id);
    expect(env.occurredAt).toBe(when.toISOString());
  });
});
