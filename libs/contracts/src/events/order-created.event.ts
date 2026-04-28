import { z } from "zod";
import { eventEnvelopeSchema } from "./envelope.js";
import { EventTypes } from "./event-types.js";

export const orderItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const orderCreatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().nullable(),
    city: z.string().min(1),
    region: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2),
  }),
  items: z.array(orderItemSchema).min(1),
  totalCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  placedAt: z.string().datetime({ offset: true }),
});

export const orderCreatedEventSchema = eventEnvelopeSchema(
  orderCreatedPayloadSchema,
).extend({
  eventType: z.literal(EventTypes.OrderCreated),
});

export type OrderCreatedPayload = z.infer<typeof orderCreatedPayloadSchema>;
export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;
export type OrderItemPayload = z.infer<typeof orderItemSchema>;
