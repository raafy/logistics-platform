import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import amqp, {
  type AmqpConnectionManager,
  type ChannelWrapper,
} from "amqp-connection-manager";
import type { ConfirmChannel, ConsumeMessage, Options } from "amqplib";

export const RABBITMQ_OPTIONS = Symbol("RABBITMQ_OPTIONS");

export interface RabbitMQClientOptions {
  url: string;
  exchange: string;
  appName: string;
  prefetch?: number;
}

export interface PublishArgs {
  routingKey: string;
  body: Buffer;
  headers?: Record<string, string | number>;
  messageId: string;
  correlationId?: string;
  contentType?: string;
  timestamp?: number;
}

export type MessageHandler = (
  msg: ConsumeMessage,
  channel: ConfirmChannel,
) => Promise<void>;

@Injectable()
export class RabbitMQClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQClient.name);
  private connection: AmqpConnectionManager | null = null;
  private pubChannel: ChannelWrapper | null = null;
  private readonly consumerChannels: ChannelWrapper[] = [];

  constructor(
    @Inject(RABBITMQ_OPTIONS)
    private readonly opts: RabbitMQClientOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async connect(): Promise<void> {
    if (this.connection) return;
    this.connection = amqp.connect([this.opts.url], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 5,
    });
    this.connection.on("connect", () =>
      this.logger.log(`RabbitMQ connected (app=${this.opts.appName})`),
    );
    this.connection.on("disconnect", ({ err }) =>
      this.logger.warn(
        `RabbitMQ disconnected: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    this.pubChannel = this.connection.createChannel({
      json: false,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.opts.exchange, "topic", {
          durable: true,
        });
      },
    });
    await this.pubChannel.waitForConnect();
  }

  async close(): Promise<void> {
    for (const ch of this.consumerChannels) {
      await ch.close().catch(() => undefined);
    }
    this.consumerChannels.length = 0;
    await this.pubChannel?.close().catch(() => undefined);
    this.pubChannel = null;
    await this.connection?.close().catch(() => undefined);
    this.connection = null;
  }

  async publish(args: PublishArgs): Promise<void> {
    if (!this.pubChannel) {
      throw new Error("RabbitMQ publisher channel not initialized");
    }
    const options: Options.Publish = {
      persistent: true,
      messageId: args.messageId,
      contentType: args.contentType ?? "application/json",
      timestamp: args.timestamp ?? Date.now(),
      appId: this.opts.appName,
    };
    if (args.correlationId !== undefined) {
      options.correlationId = args.correlationId;
    }
    if (args.headers !== undefined) {
      options.headers = args.headers;
    }

    await this.pubChannel.publish(
      this.opts.exchange,
      args.routingKey,
      args.body,
      options,
    );
  }

  async consume(queue: string, handler: MessageHandler): Promise<void> {
    if (!this.connection) {
      throw new Error("RabbitMQ client not connected");
    }
    const prefetch = this.opts.prefetch ?? 10;
    const channel = this.connection.createChannel({
      json: false,
      setup: async (ch: ConfirmChannel) => {
        await ch.prefetch(prefetch);
        await ch.consume(
          queue,
          async (msg) => {
            if (!msg) return;
            try {
              await handler(msg, ch);
            } catch (err) {
              this.logger.error(
                `Handler threw for queue=${queue}: ${err instanceof Error ? err.message : String(err)}`,
              );
              ch.nack(msg, false, false);
            }
          },
          { noAck: false },
        );
      },
    });
    this.consumerChannels.push(channel);
    await channel.waitForConnect();
  }

  isHealthy(): boolean {
    return this.connection?.isConnected() ?? false;
  }
}
