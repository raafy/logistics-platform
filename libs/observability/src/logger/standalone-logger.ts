import pino, { type Logger } from "pino";
import { correlationContext } from "../correlation/correlation-context.js";

export interface StandaloneLoggerOptions {
  serviceName: string;
  level?: string;
}

export function createStandaloneLogger(
  opts: StandaloneLoggerOptions,
): Logger {
  return pino({
    level: opts.level ?? process.env.LOG_LEVEL ?? "info",
    base: { service: opts.serviceName, pid: process.pid },
    mixin: () => {
      const ctx = correlationContext.get();
      return ctx
        ? { correlationId: ctx.correlationId, causationId: ctx.causationId }
        : {};
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  });
}
