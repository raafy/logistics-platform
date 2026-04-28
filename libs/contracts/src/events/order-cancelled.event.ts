import { z } from "zod";
import { eventEnvelopeSchema } from "./envelope.js";
import { EventTypes } from "./event-types.js";

export const orderCancelledPayloadSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  reason: z.string().min(1).max(500),
  cancelledAt: z.string().datetime({ offset: true }),
});

export const orderCancelledEventSchema = eventEnvelopeSchema(
  orderCancelledPayloadSchema,
).extend({
  eventType: z.literal(EventTypes.OrderCancelled),
});

export type OrderCancelledPayload = z.infer<typeof orderCancelledPayloadSchema>;
export type OrderCancelledEvent = z.infer<typeof orderCancelledEventSchema>;
