import { z } from "zod";

export const EVENT_SCHEMA_VERSION = 1 as const;

export const eventEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    eventId: z.string().uuid(),
    eventType: z.string().min(1),
    eventVersion: z.number().int().positive(),
    occurredAt: z.string().datetime({ offset: true }),
    correlationId: z.string().uuid(),
    causationId: z.string().uuid().nullable(),
    producer: z.string().min(1),
    payload: payloadSchema,
  });

export const baseEventEnvelopeSchema = eventEnvelopeSchema(z.unknown());
export type BaseEventEnvelope = z.infer<typeof baseEventEnvelopeSchema>;

export type EventEnvelope<TPayload> = Omit<BaseEventEnvelope, "payload"> & {
  payload: TPayload;
};
