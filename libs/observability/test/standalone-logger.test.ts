import { describe, expect, it } from "vitest";
import { createStandaloneLogger } from "../src/logger/standalone-logger.js";
import { correlationContext } from "../src/correlation/correlation-context.js";

describe("createStandaloneLogger", () => {
  it("creates a logger that includes service name in base", () => {
    const log = createStandaloneLogger({
      serviceName: "test-service",
      level: "debug",
    });
    expect(log.level).toBe("debug");
    expect(log.bindings()).toMatchObject({ service: "test-service" });
  });

  it("attaches correlation ID via mixin when in context", () => {
    const log = createStandaloneLogger({ serviceName: "x", level: "info" });
    const captured: Record<string, unknown>[] = [];
    log.on = log.on ?? (() => log);

    correlationContext.run(
      { correlationId: "corr-id", causationId: null },
      () => {
        const child = log.child({});
        const writeStream = (child as unknown as { [k: symbol]: unknown });
        captured.push({ corr: correlationContext.getId() });
      },
    );
    expect(captured[0]?.corr).toBe("corr-id");
  });
});
