import { NotFoundException } from "@nestjs/common";
import { ShipmentStatus } from "@logistics/contracts";
import { describe, expect, it, vi } from "vitest";
import { ShipmentsService } from "./shipments.service.js";
import type { ShipmentRecord } from "./shipment.types.js";

const withTransaction = <T>(fn: () => Promise<T>): Promise<T> => fn();

const buildShipment = (overrides: Partial<ShipmentRecord> = {}): ShipmentRecord => ({
  id: "658f9a95-457b-49dc-a4aa-c011fa2873e3",
  orderId: "d1c865db-26bc-44ab-b9aa-c0cb1d826aa7",
  status: ShipmentStatus.Pending,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  events: [],
  ...overrides,
});

describe("ShipmentsService", () => {
  it("returns shipment by id", async () => {
    const shipment = buildShipment();
    const service = new ShipmentsService(
      {
        findById: vi.fn().mockResolvedValue(shipment),
        findByOrderId: vi.fn(),
        createShipment: vi.fn(),
        updateStatus: vi.fn(),
      } as never,
      { create: vi.fn() } as never,
      { enqueue: vi.fn() } as never,
      { withTransaction: vi.fn(withTransaction) } as never,
      { wake: vi.fn() } as never,
    );

    await expect(service.getShipmentById(shipment.id)).resolves.toEqual(shipment);
  });

  it("throws when shipment is missing", async () => {
    const service = new ShipmentsService(
      {
        findById: vi.fn().mockResolvedValue(null),
        findByOrderId: vi.fn(),
        createShipment: vi.fn(),
        updateStatus: vi.fn(),
      } as never,
      { create: vi.fn() } as never,
      { enqueue: vi.fn() } as never,
      { withTransaction: vi.fn(withTransaction) } as never,
      { wake: vi.fn() } as never,
    );

    await expect(service.getShipmentById("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("enqueues outbox event and wakes relay when status changes", async () => {
    const current = buildShipment({ events: [{ id: "1", shipmentId: "658f9a95-457b-49dc-a4aa-c011fa2873e3", status: ShipmentStatus.Pending, occurredAt: new Date("2026-01-01T00:00:00.000Z"), location: null }] });
    const updated = buildShipment({
      status: ShipmentStatus.InTransit,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      events: [
        {
          id: "2",
          shipmentId: current.id,
          status: ShipmentStatus.InTransit,
          occurredAt: new Date("2026-01-02T00:00:00.000Z"),
          location: { lat: 1, lng: 2, label: "Hub" },
        },
      ],
    });

    const trackingRepository = {
      findById: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce(updated),
      findByOrderId: vi.fn(),
      createShipment: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(updated),
    };
    const trackingEventsRepository = { create: vi.fn().mockResolvedValue(undefined) };
    const outboxRepository = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const txHost = { withTransaction: vi.fn(withTransaction) };
    const relay = { wake: vi.fn() };

    const service = new ShipmentsService(
      trackingRepository as never,
      trackingEventsRepository as never,
      outboxRepository as never,
      txHost as never,
      relay as never,
    );

    const result = await service.updateShipmentStatus({
      shipmentId: current.id,
      status: ShipmentStatus.InTransit,
      occurredAt: new Date("2026-01-02T00:00:00.000Z"),
      location: { lat: 1, lng: 2, label: "Hub" },
    });

    expect(result.status).toBe(ShipmentStatus.InTransit);
    expect(trackingRepository.updateStatus).toHaveBeenCalledWith({
      shipmentId: current.id,
      status: ShipmentStatus.InTransit,
    });
    expect(outboxRepository.enqueue).toHaveBeenCalledTimes(1);
    expect(relay.wake).toHaveBeenCalledTimes(1);
  });
});
