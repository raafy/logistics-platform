import "reflect-metadata";
import { startOtel } from "@logistics/observability";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";

const SERVICE_NAME = "order-service";
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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Order Service")
    .setDescription("DDD showcase order management microservice")
    .setVersion(SERVICE_VERSION)
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  app.enableShutdownHooks();

  const port = Number(process.env.ORDER_SERVICE_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
