import { describe, expect, it, vi } from "vitest";
import { ReadinessService } from "../src/health/readiness.service.js";

describe("ReadinessService", () => {
  it("returns ready when db and rmq checks pass", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };
    const rmq = {
      isHealthy: vi.fn().mockReturnValue(true),
    };

    const service = new ReadinessService(prisma as never, rmq as never);

    await expect(service.check()).resolves.toEqual({
      ready: true,
      checks: {
        database: true,
        rabbitmq: true,
      },
    });
  });

  it("returns not ready when database check fails", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error("db down")),
    };
    const rmq = {
      isHealthy: vi.fn().mockReturnValue(true),
    };

    const service = new ReadinessService(prisma as never, rmq as never);

    await expect(service.check()).resolves.toEqual({
      ready: false,
      checks: {
        database: false,
        rabbitmq: true,
      },
    });
  });
});
