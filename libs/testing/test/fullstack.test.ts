import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { startFullStack } from "../src/index.js";
import type { FullStackTestInstance } from "../src/index.js";

async function hasDocker(): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("docker ps", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("FullStack (Testcontainers)", () => {
  let stack: FullStackTestInstance;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await hasDocker();
    if (!dockerAvailable) {
      console.log("Docker not available — skipping Testcontainers tests");
      return;
    }
    stack = await startFullStack();
  }, 120_000);

  afterAll(async () => {
    if (dockerAvailable) {
      await stack?.stop();
    }
  }, 30_000);

  it("exposes postgres with multiple databases", async ({ skip }) => {
    if (!dockerAvailable) return skip();
    const env = stack.getEnv();
    expect(env.ORDER_DATABASE_URL).toContain("/order_db");
    expect(env.TRACKING_DATABASE_URL).toContain("/tracking_db");
    expect(env.NOTIFICATION_DATABASE_URL).toContain("/notification_db");

    const { Client } = await import("pg");
    const client = new Client({ connectionString: env.ORDER_DATABASE_URL });
    await client.connect();
    const result = await client.query("SELECT 1 as one");
    expect(result.rows[0]?.one).toBe(1);
    await client.end();
  });

  it("exposes rabbitmq with working channel", async ({ skip }) => {
    if (!dockerAvailable) return skip();
    const env = stack.getEnv();
    const { connect } = await import("amqplib");
    const conn = await connect(env.RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange("test.ex", "topic", { durable: false });
    await ch.close();
    await conn.close();
  });

  it("exposes redis", async ({ skip }) => {
    if (!dockerAvailable) return skip();
    const env = stack.getEnv();
    const { createClient } = await import("redis");
    const client = createClient({ url: env.REDIS_URL });
    await client.connect();
    await client.set("test-key", "test-value");
    const value = await client.get("test-key");
    expect(value).toBe("test-value");
    await client.quit();
  });
});
