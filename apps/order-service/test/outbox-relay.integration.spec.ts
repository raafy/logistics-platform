import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { connect } from "amqplib";
import { startPostgresWithDatabases, startRabbitMQ } from "@logistics/testing";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service.js";

function hasContainerRuntime(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function waitForMessage(queue: string, amqpUrl: string): Promise<unknown> {
  const connection = await connect(amqpUrl);
  const channel = await connection.createChannel();

  try {
    while (true) {
      const message = await channel.get(queue, { noAck: false });
      if (message) {
        const parsed = JSON.parse(message.content.toString("utf8"));
        channel.ack(message);
        return parsed;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } finally {
    await channel.close();
    await connection.close();
  }
}

describe.skipIf(!hasContainerRuntime())("Outbox relay integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let postgres: Awaited<ReturnType<typeof startPostgresWithDatabases>>;
  let rabbitmq: Awaited<ReturnType<typeof startRabbitMQ>>;

  beforeAll(async () => {
    postgres = await startPostgresWithDatabases(["order_db"]);
    rabbitmq = await startRabbitMQ();

    process.env.ORDER_DATABASE_URL = postgres.connectionString.replace(
      "/test_db",
      "/order_db",
    );
    process.env.RABBITMQ_URL = rabbitmq.connectionString;
    process.env.RABBITMQ_EXCHANGE = "logistics.events";
    process.env.OUTBOX_POLL_INTERVAL_MS = "50";
    process.env.OUTBOX_BATCH_SIZE = "10";
    process.env.OUTBOX_MAX_ATTEMPTS = "5";
    process.env.LOG_LEVEL = "silent";

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        "customerId" TEXT NOT NULL,
        status TEXT NOT NULL,
        "totalCents" INTEGER NOT NULL,
        currency TEXT NOT NULL,
        "placedAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY,
        "orderId" UUID NOT NULL REFERENCES orders(id),
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        "unitPriceCents" INTEGER NOT NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS outbox (
        id UUID PRIMARY KEY,
        "aggregateType" TEXT NOT NULL,
        "aggregateId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "routingKey" TEXT NOT NULL,
        payload JSONB NOT NULL,
        headers JSONB,
        attempts INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "publishedAt" TIMESTAMPTZ,
        "deadAt" TIMESTAMPTZ,
        "lastError" TEXT
      );
    `);
    await rabbitmq.assertExchange("logistics.events", "topic");
    await rabbitmq.assertQueue("order.created.integration");
    await rabbitmq.bindQueue(
      "order.created.integration",
      "logistics.events",
      "order.created",
    );
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await rabbitmq?.stop();
    await postgres?.stop();
  }, 120_000);

  it("writes outbox row and relays order.created event", async () => {
    const customerId = randomUUID();

    const response = await request(app.getHttpServer())
      .post("/orders")
      .send({
        customerId,
        currency: "USD",
        items: [
          {
            sku: "SKU-100",
            name: "Showcase Widget",
            quantity: 2,
            unitPriceCents: 1250,
          },
        ],
        shippingAddress: {
          line1: "221B Baker Street",
          line2: null,
          city: "London",
          region: "London",
          postalCode: "NW16XE",
          country: "GB",
        },
      })
      .expect(201);

    expect(response.body.orderId).toBeDefined();

    const event = await waitForMessage(
      "order.created.integration",
      rabbitmq.connectionString,
    );

    expect(event).toMatchObject({
      eventType: "order.created",
      payload: {
        orderId: response.body.orderId,
        customerId,
        totalCents: 2500,
      },
    });

    const outboxRows = await prisma.outbox.findMany({
      where: { aggregateId: response.body.orderId },
    });

    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]?.publishedAt).not.toBeNull();
  });
});
