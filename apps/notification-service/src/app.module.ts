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
import { HealthController } from "./health/health.controller.js";
import { ReadinessService } from "./health/readiness.service.js";
import { OrderCreatedConsumer } from "./consumers/order-created.consumer.js";
import { ShipmentStatusChangedConsumer } from "./consumers/shipment-status-changed.consumer.js";
import { PrismaNotificationDeliveryRepository } from "./infrastructure/prisma/prisma-notification-delivery.repository.js";
import { PrismaProcessedMessageStore } from "./infrastructure/prisma/prisma-processed-message.store.js";
import { PrismaService } from "./infrastructure/prisma/prisma.service.js";
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NOTIFICATION_PROVIDER_RESOLVER,
} from "./notifications/notification.tokens.js";
import { NotificationDispatchService } from "./notifications/notification-dispatch.service.js";
import { NotificationProviderResolver } from "./notifications/notification-provider.resolver.js";
import { ConsoleProvider } from "./notifications/providers/console.provider.js";
import { SendGridProvider } from "./notifications/providers/sendgrid.provider.js";
import { TwilioProvider } from "./notifications/providers/twilio.provider.js";

@Module({
  imports: [
    LoggerModule.forRoot(
      buildLoggerConfig({
        serviceName: "notification-service",
      }),
    ),
    RabbitMQModule.forRoot({
      url: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
      exchange: process.env.RABBITMQ_EXCHANGE ?? "logistics.events",
      appName: "notification-service",
    }),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    ReadinessService,
    PrismaProcessedMessageStore,
    PrismaNotificationDeliveryRepository,
    {
      provide: NOTIFICATION_DELIVERY_REPOSITORY,
      useExisting: PrismaNotificationDeliveryRepository,
    },
    ConsoleProvider,
    SendGridProvider,
    TwilioProvider,
    NotificationProviderResolver,
    {
      provide: NOTIFICATION_PROVIDER_RESOLVER,
      useExisting: NotificationProviderResolver,
    },
    NotificationDispatchService,
    OrderCreatedConsumer,
    ShipmentStatusChangedConsumer,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
