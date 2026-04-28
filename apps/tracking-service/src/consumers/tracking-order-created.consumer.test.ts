import { describe, expect, it, vi } from "vitest";
import { EventTypes } from "@logistics/contracts";
import { TrackingOrderCreatedConsumer } from "./tracking-order-created.consumer.js";

class TrackingOrderCreatedConsumerHarness extends TrackingOrderCreatedConsumer {
  async invokeHandleEvent(event: Parameters<TrackingOrderCreatedConsumer["handleEvent"]>[0]): Promise<void> {
    await this.handleEvent(event, event);
  }
}

describe("TrackingOrderCreatedConsumer", () => {
  it("creates a pending shipment from order.created", async () => {
    const shipmentsService = {
      createPendingShipment: vi.fn().mockResolvedValue(undefined),
    };

    const consumer = new TrackingOrderCreatedConsumerHarness(
      { consume: vi.fn() } as never,
      { markProcessed: vi.fn() } as never,
      shipmentsService as never,
    );

    await consumer.invokeHandleEvent(
      {
        eventId: "8e1bbf36-cdda-4c32-9ed4-c5de1fd4bc0b",
        eventType: EventTypes.OrderCreated,
        eventVersion: 1,
        occurredAt: "2026-01-01T00:00:00.000Z",
        correlationId: "db944404-e4e0-457d-b7cc-e2b68022dce6",
        causationId: null,
        producer: "order-service",
        payload: {
          orderId: "d1c865db-26bc-44ab-b9aa-c0cb1d826aa7",
          customerId: "8e1bbf36-cdda-4c32-9ed4-c5de1fd4bc0b",
          shippingAddress: {
            line1: "123 Market St",
            line2: null,
            city: "San Francisco",
            region: "CA",
            postalCode: "94105",
            country: "US",
          },
          items: [
            {
              sku: "SKU-1",
              name: "Widget",
              quantity: 1,
              unitPriceCents: 1000,
            },
          ],
          totalCents: 1000,
          currency: "USD",
          placedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    );

    expect(shipmentsService.createPendingShipment).toHaveBeenCalledWith({
      orderId: "d1c865db-26bc-44ab-b9aa-c0cb1d826aa7",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });
});
