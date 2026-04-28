import "reflect-metadata";
import { startOtel } from "@logistics/observability";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";

const SERVICE_NAME = "notification-service";
const SERVICE_VERSION = "0.1.0";

async function bootstrap(): Promise<void> {
  startOtel({
    serviceName: SERVICE_NAME,
    serviceVersion: SERVICE_VERSION,
  });

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const port = Number(process.env.NOTIFICATION_SERVICE_PORT ?? 3003);
  await app.listen(port);
}

void bootstrap();
