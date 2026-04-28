import { Injectable, NotFoundException } from "@nestjs/common";
import {
  EventTypes,
  ShipmentStatus,
  shipmentStatusSchema,
  type ShipmentStatusChangedPayload,
} from "@logistics/contracts";
import { buildEventEnvelope } from "@logistics/messaging";
import type {
  CreatePendingShipmentInput,
  ShipmentRecord,
  UpdateShipmentStatusInput,
} from "./shipment.types.js";
import { PrismaTransactionHost } from "../repositories/prisma-transaction-host.js";
import { OutboxRepository } from "../repositories/outbox.repository.js";
import { TrackingEventsRepository } from "../repositories/tracking-events.repository.js";
import { TrackingRepository } from "../repositories/tracking.repository.js";
import { ShipmentStatusOutboxRelay } from "../relays/shipment-status-outbox.relay.js";

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly trackingEventsRepository: TrackingEventsRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly txHost: PrismaTransactionHost,
    private readonly outboxRelay: ShipmentStatusOutboxRelay,
  ) {}

  async getShipmentById(id: string): Promise<ShipmentRecord> {
    const shipment = await this.trackingRepository.findById(id);
    if (!shipment) {
      throw new NotFoundException(`Shipment '${id}' not found`);
    }

    return shipment;
  }

  async getShipmentByOrderId(orderId: string): Promise<ShipmentRecord> {
    const shipment = await this.trackingRepository.findByOrderId(orderId);
    if (!shipment) {
      throw new NotFoundException(`Shipment for order '${orderId}' not found`);
    }

    return shipment;
  }

  async createPendingShipment(
    input: CreatePendingShipmentInput,
  ): Promise<ShipmentRecord> {
    return this.txHost.withTransaction(async () => {
      const existing = await this.trackingRepository.findByOrderId(input.orderId);
      if (existing) {
        return existing;
      }

      const shipment = await this.trackingRepository.createShipment({
        orderId: input.orderId,
        status: ShipmentStatus.Pending,
      });

      await this.trackingEventsRepository.create({
        shipmentId: shipment.id,
        status: ShipmentStatus.Pending,
        occurredAt: input.occurredAt,
        location: null,
      });

      return (await this.trackingRepository.findById(shipment.id)) ?? shipment;
    });
  }

  async updateShipmentStatus(
    input: UpdateShipmentStatusInput,
  ): Promise<ShipmentRecord> {
    const occurredAt = input.occurredAt ?? new Date();
    let shouldWakeRelay = false;

    const shipment = await this.txHost.withTransaction(async () => {
      const current = await this.trackingRepository.findById(input.shipmentId);
      if (!current) {
        throw new NotFoundException(`Shipment '${input.shipmentId}' not found`);
      }

      if (current.status === input.status) {
        return current;
      }

      const updated = await this.trackingRepository.updateStatus({
        shipmentId: input.shipmentId,
        status: input.status,
      });

      await this.trackingEventsRepository.create({
        shipmentId: updated.id,
        status: input.status,
        occurredAt,
        location: input.location ?? null,
      });

      const payload: ShipmentStatusChangedPayload = {
        shipmentId: updated.id,
        orderId: updated.orderId,
        previousStatus: shipmentStatusSchema.parse(current.status),
        currentStatus: shipmentStatusSchema.parse(input.status),
        changedAt: occurredAt.toISOString(),
        location: input.location
          ? {
              latitude: input.location.lat,
              longitude: input.location.lng,
              label: input.location.label,
            }
          : null,
      };

      const envelope = buildEventEnvelope({
        eventType: EventTypes.ShipmentStatusChanged,
        eventVersion: 1,
        producer: "tracking-service",
        payload,
      });

      await this.outboxRepository.enqueue({
        aggregateType: "shipment",
        aggregateId: updated.id,
        eventType: EventTypes.ShipmentStatusChanged,
        routingKey: EventTypes.ShipmentStatusChanged,
        payload: envelope as unknown as Record<string, unknown>,
        headers: {
          eventType: EventTypes.ShipmentStatusChanged,
          correlationId: envelope.correlationId,
        },
      });

      shouldWakeRelay = true;

      return (await this.trackingRepository.findById(updated.id)) ?? updated;
    });

    if (shouldWakeRelay) {
      this.outboxRelay.wake();
    }

    return shipment;
  }
}
