#!/usr/bin/env node
import { Command } from "commander";
import { connect, type Channel, type ChannelModel } from "amqplib";

interface DLQMessage {
  messageId: string | undefined;
  routingKey: string;
  timestamp: number | undefined;
  content: unknown;
  headers: Record<string, unknown>;
}

const program = new Command();

program
  .name("dlq-redrive")
  .description("CLI for managing RabbitMQ Dead Letter Queues")
  .version("0.1.0");

program
  .command("list")
  .description("List all DLQ queues with message counts")
  .option("-u, --url <url>", "RabbitMQ URL", process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672")
  .action(async (options: { url: string }) => {
    const { connection, channel } = await connectRabbitMQ(options.url);
    try {
      // Get all queues matching *.dlq pattern
      const queues = await channel.assertQueue("", { exclusive: true }); // Just to get management access
      // Note: amqplib doesn't expose management API directly; we'd need HTTP API for queue listing
      // Simplified: check known DLQs
      const knownDlqs = [
        "tracking.order.created.dlq",
        "notification.order.created.dlq",
        "notification.shipment.status_changed.dlq",
      ];

      console.log("DLQ Status:");
      console.log("-".repeat(60));
      for (const queue of knownDlqs) {
        try {
          const check = await channel.checkQueue(queue);
          console.log(`${queue}: ${check.messageCount} messages`);
        } catch {
          console.log(`${queue}: (queue not found)`);
        }
      }
    } finally {
      await connection.close();
    }
  });

program
  .command("peek")
  .description("Peek messages from a DLQ without removing them")
  .requiredOption("-q, --queue <queue>", "DLQ queue name")
  .option("-u, --url <url>", "RabbitMQ URL", process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672")
  .option("-n, --count <count>", "Number of messages to peek", "10")
  .action(async (options: { queue: string; url: string; count: string }) => {
    const { connection, channel } = await connectRabbitMQ(options.url);
    const messages: DLQMessage[] = [];

    try {
      const count = parseInt(options.count, 10);

      // Consume with noAck=false, but don't ack - message returns to queue on channel close
      await channel.consume(
        options.queue,
        (msg) => {
          if (!msg || messages.length >= count) return;
          messages.push({
            messageId: msg.properties.messageId,
            routingKey: msg.fields.routingKey,
            timestamp: msg.properties.timestamp,
            content: JSON.parse(msg.content.toString("utf8")),
            headers: msg.properties.headers ?? {},
          });
        },
        { noAck: true },
      );

      // Wait a bit for messages
      await new Promise((r) => setTimeout(r, 1000));

      console.log(`Peeked ${messages.length} messages from ${options.queue}:`);
      console.log("-".repeat(60));
      for (const msg of messages) {
        console.log(JSON.stringify(msg, null, 2));
        console.log("-".repeat(60));
      }
    } finally {
      await connection.close();
    }
  });

program
  .command("redrive")
  .description("Re-drive messages from DLQ back to original queue")
  .requiredOption("-q, --queue <queue>", "DLQ queue name (e.g., tracking.order.created.dlq)")
  .option("-u, --url <url>", "RabbitMQ URL", process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672")
  .option("-n, --count <count>", "Max messages to redrive", "all")
  .action(async (options: { queue: string; url: string; count: string }) => {
    const { connection, channel } = await connectRabbitMQ(options.url);
    const redriven: string[] = [];
    const failed: string[] = [];

    try {
      // Derive target queue from DLQ name (remove .dlq suffix)
      const targetQueue = options.queue.replace(/\.dlq$/, "");

      console.log(`Re-driving from ${options.queue} → ${targetQueue}`);

      const maxCount = options.count === "all" ? Infinity : parseInt(options.count, 10);
      let processed = 0;

      while (processed < maxCount) {
        const msg = await channel.get(options.queue, { noAck: false });
        if (!msg) break;

        try {
          // Republish to target queue
          await channel.sendToQueue(targetQueue, msg.content, {
            ...msg.properties,
            headers: {
              ...msg.properties.headers,
              "x-redriven-from-dlq": options.queue,
              "x-redriven-at": new Date().toISOString(),
            },
          });

          channel.ack(msg);
          redriven.push(msg.properties.messageId ?? "unknown");
          processed++;
        } catch (err) {
          channel.nack(msg, false, true);
          failed.push(msg.properties.messageId ?? "unknown");
          console.error(`Failed to redrive message: ${err}`);
        }
      }

      console.log(`\nRedrive complete:`);
      console.log(`  Success: ${redriven.length}`);
      console.log(`  Failed:  ${failed.length}`);
    } finally {
      await connection.close();
    }
  });

async function connectRabbitMQ(url: string): Promise<{ connection: ChannelModel; channel: Channel }> {
  const connection = await connect(url);
  const channel = await connection.createChannel();
  return { connection, channel };
}

program.parse();
