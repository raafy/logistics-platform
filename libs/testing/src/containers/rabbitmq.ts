import {
  RabbitMQContainer,
  type StartedRabbitMQContainer,
} from "@testcontainers/rabbitmq";
import type { Channel, ChannelModel } from "amqplib";
import { connect } from "amqplib";

export interface RabbitMQTestInstance {
  container: StartedRabbitMQContainer;
  connectionString: string;
  managementUrl: string;
  stop(): Promise<void>;
  createChannel(): Promise<Channel>;
  assertExchange(name: string, type: string): Promise<void>;
  assertQueue(name: string, options?: { deadLetterExchange?: string; deadLetterRoutingKey?: string }): Promise<void>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
  purgeQueue(queue: string): Promise<void>;
}

export async function startRabbitMQ(): Promise<RabbitMQTestInstance> {
  const container = await new RabbitMQContainer("rabbitmq:3.13-alpine")
    .withExposedPorts(5672, 15672)
    .start();

  const amqpPort = container.getMappedPort(5672);
  const connectionString = `amqp://guest:guest@${container.getHost()}:${amqpPort}`;
  const managementUrl = `http://${container.getHost()}:${container.getMappedPort(15672)}`;

  let connection: ChannelModel | null = null;

  const getConnection = async (): Promise<ChannelModel> => {
    if (!connection) {
      connection = await connect(connectionString);
    }
    return connection;
  };

  const createChannel = async (): Promise<Channel> => {
    const conn = await getConnection();
    return conn.createChannel();
  };

  const assertExchange = async (name: string, type: string): Promise<void> => {
    const ch = await createChannel();
    try {
      await ch.assertExchange(name, type, { durable: true });
    } finally {
      await ch.close();
    }
  };

  const assertQueue = async (
    name: string,
    options?: { deadLetterExchange?: string; deadLetterRoutingKey?: string },
  ): Promise<void> => {
    const ch = await createChannel();
    try {
      const args: Record<string, unknown> = {};
      if (options?.deadLetterExchange) {
        args["x-dead-letter-exchange"] = options.deadLetterExchange;
      }
      if (options?.deadLetterRoutingKey) {
        args["x-dead-letter-routing-key"] = options.deadLetterRoutingKey;
      }
      await ch.assertQueue(name, { durable: true, arguments: Object.keys(args).length > 0 ? args : undefined });
    } finally {
      await ch.close();
    }
  };

  const bindQueue = async (
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<void> => {
    const ch = await createChannel();
    try {
      await ch.bindQueue(queue, exchange, routingKey);
    } finally {
      await ch.close();
    }
  };

  const purgeQueue = async (queue: string): Promise<void> => {
    const ch = await createChannel();
    try {
      await ch.purgeQueue(queue);
    } finally {
      await ch.close();
    }
  };

  const stop = async (): Promise<void> => {
    if (connection) {
      await connection.close();
      connection = null;
    }
    await container.stop();
  };

  return {
    container,
    connectionString,
    managementUrl,
    stop,
    createChannel,
    assertExchange,
    assertQueue,
    bindQueue,
    purgeQueue,
  };
}
