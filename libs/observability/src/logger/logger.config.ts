import type { Params } from "nestjs-pino";
import { correlationContext } from "../correlation/correlation-context.js";

export interface LoggerOptions {
  serviceName: string;
  level?: string;
  pretty?: boolean;
}

export function buildLoggerConfig(opts: LoggerOptions): Params {
  const level = opts.level ?? process.env.LOG_LEVEL ?? "info";
  const isPretty =
    opts.pretty ??
    (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test");

  return {
    pinoHttp: {
      level,
      base: { service: opts.serviceName, pid: process.pid },
      mixin: () => {
        const ctx = correlationContext.get();
        return ctx
          ? { correlationId: ctx.correlationId, causationId: ctx.causationId }
          : {};
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      transport: isPretty
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              singleLine: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname,service",
              messageFormat: "[{service}] {msg}",
            },
          }
        : undefined,
      autoLogging: {
        ignore: (req) => {
          const url = (req as { url?: string }).url ?? "";
          return url.startsWith("/health") || url.startsWith("/metrics");
        },
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      serializers: {
        req: (req: { method?: string; url?: string }) => ({
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode?: number }) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
}
