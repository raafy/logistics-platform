import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseOutboxRelay } from "../src/outbox/outbox-relay.service.js";
import type {
  OutboxRecord,
  OutboxStore,
} from "../src/outbox/outbox.types.js";
import type { RabbitMQClient } from "../src/rabbitmq/rabbitmq.client.js";

class TestOutboxRelay extends BaseOutboxRelay {
  constructor(store: OutboxStore, rmq: RabbitMQClient) {
    super(store, rmq, {
      pollIntervalMs: 10_000,
      batchSize: 10,
      maxAttempts: 3,
      serviceName: "test",
    });
  }
}

const makeRecord = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  id: "rec-1",
  aggregateType: "Order",
  aggregateId: "order-1",
  eventType: "order.created",
  routingKey: "order.created",
  payload: { eventId: "e-1", payload: { orderId: "o-1" } },
  headers: null,
  attempts: 0,
  createdAt: new Date("2026-04-28T10:00:00.000Z"),
  publishedAt: null,
  deadAt: null,
  lastError: null,
  ...overrides,
});

describe("BaseOutboxRelay", () => {
  let store: OutboxStore;
  let rmq: RabbitMQClient;
  let publish: ReturnType<typeof vi.fn>;
  let markPublished: ReturnType<typeof vi.fn>;
  let markFailed: ReturnType<typeof vi.fn>;
  let markDead: ReturnType<typeof vi.fn>;
  let claimBatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    publish = vi.fn().mockResolvedValue(undefined);
    markPublished = vi.fn().mockResolvedValue(undefined);
    markFailed = vi.fn().mockResolvedValue(undefined);
    markDead = vi.fn().mockResolvedValue(undefined);
    claimBatch = vi.fn();

    store = {
      claimBatch,
      markPublished,
      markFailed,
      markDead,
      hasPending: vi.fn().mockResolvedValue(false),
    };
    rmq = { publish, isHealthy: () => true } as unknown as RabbitMQClient;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes each claimed record and marks published", async () => {
    const records = [
      makeRecord({ id: "r1" }),
      makeRecord({ id: "r2", routingKey: "order.cancelled" }),
    ];
    claimBatch.mockResolvedValueOnce(records);

    const relay = new TestOutboxRelay(store, rmq);
    const n = await relay.tick();

    expect(n).toBe(2);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(markPublished).toHaveBeenCalledWith("r1");
    expect(markPublished).toHaveBeenCalledWith("r2");
    expect(markFailed).not.toHaveBeenCalled();
    expect(markDead).not.toHaveBeenCalled();
  });

  it("marks record failed when publish throws and attempts are below max", async () => {
    const rec = makeRecord({ attempts: 1 });
    claimBatch.mockResolvedValueOnce([rec]);
    publish.mockRejectedValueOnce(new Error("rmq down"));

    const relay = new TestOutboxRelay(store, rmq);
    await relay.tick();

    expect(markFailed).toHaveBeenCalledWith(rec.id, "rmq down");
    expect(markDead).not.toHaveBeenCalled();
    expect(markPublished).not.toHaveBeenCalled();
  });

  it("marks record dead when attempts reach max", async () => {
    const rec = makeRecord({ attempts: 2 });
    claimBatch.mockResolvedValueOnce([rec]);
    publish.mockRejectedValueOnce(new Error("permanent"));

    const relay = new TestOutboxRelay(store, rmq);
    await relay.tick();

    expect(markDead).toHaveBeenCalledWith(rec.id, "permanent");
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("serializes payload to JSON buffer with correct routing key", async () => {
    const rec = makeRecord({
      routingKey: "shipment.status_changed",
      payload: { foo: "bar" },
    });
    claimBatch.mockResolvedValueOnce([rec]);

    const relay = new TestOutboxRelay(store, rmq);
    await relay.tick();

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        routingKey: "shipment.status_changed",
        messageId: rec.id,
        contentType: "application/json",
      }),
    );
    const call = publish.mock.calls[0]?.[0] as { body: Buffer };
    expect(JSON.parse(call.body.toString("utf8"))).toEqual({ foo: "bar" });
  });

  it("is a no-op when a tick is already running (no concurrent ticks)", async () => {
    claimBatch.mockResolvedValue([]);
    const relay = new TestOutboxRelay(store, rmq);
    const first = relay.tick();
    const second = relay.tick();
    await Promise.all([first, second]);
    expect(claimBatch).toHaveBeenCalledTimes(1);
  });

  it("swallows store errors and continues scheduling", async () => {
    claimBatch.mockRejectedValueOnce(new Error("db down"));
    const relay = new TestOutboxRelay(store, rmq);
    await expect(relay.tick()).resolves.toBe(0);
  });
});
