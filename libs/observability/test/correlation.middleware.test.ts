import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { CorrelationIdMiddleware } from "../src/correlation/correlation.middleware.js";
import {
  CORRELATION_HEADER,
  correlationContext,
} from "../src/correlation/correlation-context.js";

const makeReq = (headers: Record<string, string> = {}): Request => {
  return {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
};

const makeRes = () => {
  const headers: Record<string, string> = {};
  return {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    }),
    headers,
  } as unknown as Response & { headers: Record<string, string> };
};

describe("CorrelationIdMiddleware", () => {
  const mw = new CorrelationIdMiddleware();

  it("generates a new correlation ID when missing", () => {
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = vi.fn(() => {
      const id = correlationContext.getId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    mw.use(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as unknown as { setHeader: ReturnType<typeof vi.fn> }).setHeader)
      .toHaveBeenCalledWith(CORRELATION_HEADER, expect.stringMatching(/^[0-9a-f-]{36}$/i));
  });

  it("preserves a valid incoming correlation ID", () => {
    const incoming = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
    const req = makeReq({ [CORRELATION_HEADER]: incoming });
    const res = makeRes();
    const seen: string[] = [];

    mw.use(req, res, () => {
      seen.push(correlationContext.getId() ?? "MISSING");
    });

    expect(seen[0]).toBe(incoming);
  });

  it("rejects malformed incoming correlation ID and generates new one", () => {
    const req = makeReq({ [CORRELATION_HEADER]: "not-a-uuid" });
    const res = makeRes();
    const seen: string[] = [];

    mw.use(req, res, () => {
      seen.push(correlationContext.getId() ?? "MISSING");
    });

    expect(seen[0]).not.toBe("not-a-uuid");
    expect(seen[0]).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("captures incoming causation ID when valid", () => {
    const causation = "b3d89c3a-4a9f-4e3b-9e2a-7c6d5e4b3a2f";
    const req = makeReq({ "x-causation-id": causation });
    const res = makeRes();

    mw.use(req, res, () => {
      expect(correlationContext.getCausationId()).toBe(causation);
    });
  });
});
