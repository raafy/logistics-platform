import { Injectable } from "@nestjs/common";
import type { TrackingEventRecord, ShipmentLocation } from "../services/shipment.types.js";
import { PrismaTransactionHost } from "./prisma-transaction-host.js";
import { trackingLocationToJson } from "./tracking.repository.js";

@Injectable()
export class TrackingEventsRepository {
  constructor(private readonly txHost: PrismaTransactionHost) {}

  async create(input: {
    shipmentId: string;
    status: string;
    occurredAt: Date;
    location?: ShipmentLocation | null;
  }): Promise<TrackingEventRecord> {
    const event = await this.txHost.getClient().trackingEvent.create({
      data: {
        shipmentId: input.shipmentId,
        status: input.status,
        occurredAt: input.occurredAt,
        ...(input.location ? { location: trackingLocationToJson(input.location) } : {}),
      },
    });

    return {
      id: event.id,
      shipmentId: event.shipmentId,
      status: event.status,
      occurredAt: event.occurredAt,
      location: input.location ?? null,
    };
  }
}
