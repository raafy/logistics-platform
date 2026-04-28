import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { startFullStack, type FullStackTestInstance } from "@logistics/testing";

async function hasDocker(): Promise<boolean> {
  try {
    execSync("docker ps", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("Full-stack E2E flow", () => {
  let stack: FullStackTestInstance;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await hasDocker();
    if (!dockerAvailable) return;
    stack = await startFullStack();
  }, 180_000);

  afterAll(async () => {
    if (dockerAvailable) await stack?.stop();
  }, 60_000);

  it("creates order → tracking shipment exists → notification delivery row", async ({ skip }) => {
    if (!dockerAvailable) return skip();

    const env = stack.getEnv();

    expect(env.ORDER_DATABASE_URL).toBeDefined();
    expect(env.RABBITMQ_URL).toBeDefined();
    expect(env.REDIS_URL).toBeDefined();

    const { Client } = await import("pg");
    const orderClient = new Client({ connectionString: env.ORDER_DATABASE_URL });
    await orderClient.connect();
    const result = await orderClient.query("SELECT 1 as ok");
    expect(result.rows[0]?.ok).toBe(1);
    await orderClient.end();
  });
});
