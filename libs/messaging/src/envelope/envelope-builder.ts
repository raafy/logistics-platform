import { randomUUID } from "node:crypto";
import type { EventEnvelope } from "@logistics/contracts";
import { correlationContext } from "@logistics/observability";

export interface BuildEnvelopeInput<TPayload> {
  eventType: string;
  eventVersion: number;
  producer: string;
  payload: TPayload;
  correlationId?: string;
  causationId?: string | null;
  eventId?: string;
  occurredAt?: Date;
}

export function buildEventEnvelope<TPayload>(
  input: BuildEnvelopeInput<TPayload>,
): EventEnvelope<TPayload> {
  const ctx = correlationContext.get();
  return {
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType,
    eventVersion: input.eventVersion,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
    correlationId:
      input.correlationId ?? ctx?.correlationId ?? randomUUID(),
    causationId: input.causationId ?? ctx?.causationId ?? null,
    producer: input.producer,
    payload: input.payload,
  };
}
