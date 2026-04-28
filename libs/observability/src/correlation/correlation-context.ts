import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface CorrelationContext {
  correlationId: string;
  causationId: string | null;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export const CORRELATION_HEADER = "x-correlation-id" as const;
export const CAUSATION_HEADER = "x-causation-id" as const;

export const correlationContext = {
  get(): CorrelationContext | undefined {
    return storage.getStore();
  },

  getId(): string | undefined {
    return storage.getStore()?.correlationId;
  },

  getCausationId(): string | null | undefined {
    return storage.getStore()?.causationId;
  },

  run<T>(ctx: CorrelationContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },

  runWithNewId<T>(fn: () => T): T {
    return storage.run(
      { correlationId: randomUUID(), causationId: null },
      fn,
    );
  },

  newId(): string {
    return randomUUID();
  },
};
