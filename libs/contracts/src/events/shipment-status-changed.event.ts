import { z } from "zod";
import { eventEnvelopeSchema } from "./envelope.js";
import { EventTypes } from "./event-types.js";

export const ShipmentStatus = {
  Pending: "PENDING",
  PickedUp: "PICKED_UP",
  InTransit: "IN_TRANSIT",
  OutForDelivery: "OUT_FOR_DELIVERY",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
  Failed: "FAILED",
} as const;

export type ShipmentStatusValue =
  (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const shipmentStatusSchema = z.nativeEnum(ShipmentStatus);

export const shipmentStatusChangedPayloadSchema = z.object({
  shipmentId: z.string().uuid(),
  orderId: z.string().uuid(),
  previousStatus: shipmentStatusSchema.nullable(),
  currentStatus: shipmentStatusSchema,
  changedAt: z.string().datetime({ offset: true }),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      label: z.string().nullable(),
    })
    .nullable(),
});

export const shipmentStatusChangedEventSchema = eventEnvelopeSchema(
  shipmentStatusChangedPayloadSchema,
).extend({
  eventType: z.literal(EventTypes.ShipmentStatusChanged),
});

export type ShipmentStatusChangedPayload = z.infer<
  typeof shipmentStatusChangedPayloadSchema
>;
export type ShipmentStatusChangedEvent = z.infer<
  typeof shipmentStatusChangedEventSchema
>;
