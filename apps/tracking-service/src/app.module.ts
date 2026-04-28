import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { RabbitMQModule } from "@logistics/messaging";
import {
  buildLoggerConfig,
  CorrelationIdMiddleware,
} from "@logistics/observability";
import { LoggerModule } from "nestjs-pino";
import { getTrackingServiceConfig } from "./config/app-config.js";
import { TrackingOrderCreatedConsumer } from "./consumers/tracking-order-created.consumer.js";
import { OrdersController } from "./http/orders.controller.js";
import { ShipmentsController } from "./http/shipments.controller.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { OutboxRepository } from "./repositories/outbox.repository.js";
import { PrismaTransactionHost } from "./repositories/prisma-transaction-host.js";
import { ProcessedMessageRepository } from "./repositories/processed-message.repository.js";
import { TrackingEventsRepository } from "./repositories/tracking-events.repository.js";
import { TrackingRepository } from "./repositories/tracking.repository.js";
import { ShipmentStatusOutboxRelay } from "./relays/shipment-status-outbox.relay.js";
import { ShipmentsService } from "./services/shipments.service.js";

const config = getTrackingServiceConfig();

@Module({
  imports: [
    LoggerModule.forRoot(
      buildLoggerConfig({
        serviceName: config.serviceName,
      }),
    ),
    RabbitMQModule.forRoot({
      url: config.rabbitmqUrl,
      exchange: config.rabbitmqExchange,
      appName: config.serviceName,
    }),
  ],
  controllers: [ShipmentsController, OrdersController],
  providers: [
    PrismaService,
    PrismaTransactionHost,
    TrackingRepository,
    TrackingEventsRepository,
    OutboxRepository,
    ProcessedMessageRepository,
    ShipmentsService,
    ShipmentStatusOutboxRelay,
    TrackingOrderCreatedConsumer,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
