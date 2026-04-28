import { RabbitMQModule } from "@logistics/messaging";
import {
  CorrelationIdMiddleware,
  buildLoggerConfig,
} from "@logistics/observability";
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { CancelOrderHandler } from "./application/cancel-order.handler.js";
import { CreateOrderHandler } from "./application/create-order.handler.js";
import { GetOrderHandler } from "./application/get-order.handler.js";
import { GetShipmentForOrderHandler } from "./application/queries/get-shipment-for-order.handler.js";
import { CircuitBreakerFactory } from "./infrastructure/resilience/circuit-breaker.factory.js";
import { PrismaOutboxStore } from "./infrastructure/prisma/prisma-outbox.store.js";
import {
  OrderRepositoryProvider,
  PrismaOrderRepository,
} from "./infrastructure/prisma/prisma-order.repository.js";
import { PrismaService } from "./infrastructure/prisma/prisma.service.js";
import { RmqOrderEventPublisher } from "./infrastructure/events/rmq-order-event.publisher.js";
import { OutboxRelayService } from "./infrastructure/outbox/outbox-relay.service.js";
import { OrdersController } from "./interfaces/http/orders.controller.js";

@Module({
  imports: [
    LoggerModule.forRoot(
      buildLoggerConfig({
        serviceName: "order-service",
      }),
    ),
    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
      exchange: process.env.RABBITMQ_EXCHANGE ?? "logistics.events",
      appName: "order-service",
    }),
  ],
  controllers: [OrdersController],
  providers: [
    PrismaService,
    PrismaOutboxStore,
    RmqOrderEventPublisher,
    PrismaOrderRepository,
    OrderRepositoryProvider,
    CreateOrderHandler,
    CancelOrderHandler,
    GetOrderHandler,
    OutboxRelayService,
    CircuitBreakerFactory,
    GetShipmentForOrderHandler,
    {
      provide: "TRACKING_SERVICE_URL",
      useValue: process.env.TRACKING_SERVICE_URL ?? "http://localhost:3002",
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
