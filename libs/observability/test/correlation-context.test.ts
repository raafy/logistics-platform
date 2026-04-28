import { describe, expect, it } from "vitest";
import { correlationContext } from "../src/correlation/correlation-context.js";

describe("correlationContext", () => {
  it("returns undefined outside any context", () => {
    expect(correlationContext.get()).toBeUndefined();
    expect(correlationContext.getId()).toBeUndefined();
  });

  it("propagates context through synchronous calls", () => {
    correlationContext.run(
      { correlationId: "id-1", causationId: null },
      () => {
        expect(correlationContext.getId()).toBe("id-1");
        expect(correlationContext.getCausationId()).toBeNull();
      },
    );
    expect(correlationContext.get()).toBeUndefined();
  });

  it("propagates context across async boundaries", async () => {
    await correlationContext.run(
      { correlationId: "id-async", causationId: "caused-by" },
      async () => {
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));
        expect(correlationContext.getId()).toBe("id-async");
        expect(correlationContext.getCausationId()).toBe("caused-by");
      },
    );
  });

  it("isolates contexts between concurrent runs", async () => {
    const results: string[] = [];

    const task = (id: string) =>
      correlationContext.run(
        { correlationId: id, causationId: null },
        async () => {
          await new Promise((r) => setTimeout(r, 5));
          results.push(`${id}:${correlationContext.getId() ?? "none"}`);
        },
      );

    await Promise.all([task("A"), task("B"), task("C")]);

    expect(results.sort()).toEqual(["A:A", "B:B", "C:C"]);
  });

  it("runWithNewId generates a uuid", () => {
    const captured: string[] = [];
    correlationContext.runWithNewId(() => {
      const id = correlationContext.getId();
      expect(id).toBeDefined();
      captured.push(id!);
    });
    expect(captured[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("newId returns distinct uuids", () => {
    const a = correlationContext.newId();
    const b = correlationContext.newId();
    expect(a).not.toBe(b);
  });
});
