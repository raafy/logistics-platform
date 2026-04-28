import { Injectable } from "@nestjs/common";
import type {
  ShipmentLocation,
  ShipmentRecord,
  TrackingEventRecord,
} from "../services/shipment.types.js";
import { PrismaTransactionHost } from "./prisma-transaction-host.js";

type TrackingEventRow = {
  id: string;
  shipmentId: string;
  status: string;
  occurredAt: Date;
  location: unknown;
};

type ShipmentWithEvents = {
  id: string;
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  events: TrackingEventRow[];
};

const toLocation = (value: unknown): ShipmentLocation | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const lat = record.lat;
  const lng = record.lng;
  const label = record.label;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return {
    lat,
    lng,
    label: typeof label === "string" ? label : null,
  };
};

const mapTrackingEvent = (event: TrackingEventRow): TrackingEventRecord => ({
  id: event.id,
  shipmentId: event.shipmentId,
  status: event.status,
  occurredAt: event.occurredAt,
  location: toLocation(event.location),
});

const mapShipment = (shipment: ShipmentWithEvents): ShipmentRecord => ({
  id: shipment.id,
  orderId: shipment.orderId,
  status: shipment.status,
  createdAt: shipment.createdAt,
  updatedAt: shipment.updatedAt,
  events: shipment.events.map(mapTrackingEvent),
});

@Injectable()
export class TrackingRepository {
  constructor(private readonly txHost: PrismaTransactionHost) {}

  async findById(id: string): Promise<ShipmentRecord | null> {
    const shipment = await this.txHost.getClient().shipment.findUnique({
      where: { id },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    });

    return shipment ? mapShipment(shipment) : null;
  }

  async findByOrderId(orderId: string): Promise<ShipmentRecord | null> {
    const shipment = await this.txHost.getClient().shipment.findUnique({
      where: { orderId },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    });

    return shipment ? mapShipment(shipment) : null;
  }

  async createShipment(input: {
    orderId: string;
    status: string;
  }): Promise<ShipmentRecord> {
    const shipment = await this.txHost.getClient().shipment.create({
      data: {
        orderId: input.orderId,
        status: input.status,
      },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    });

    return mapShipment(shipment);
  }

  async updateStatus(input: {
    shipmentId: string;
    status: string;
  }): Promise<ShipmentRecord> {
    const shipment = await this.txHost.getClient().shipment.update({
      where: { id: input.shipmentId },
      data: { status: input.status },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    });

    return mapShipment(shipment);
  }
}

export const trackingLocationToJson = (
  location: ShipmentLocation,
): Record<string, number | string | null> => ({
  lat: location.lat,
  lng: location.lng,
  label: location.label,
});
