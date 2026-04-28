import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { shutdownOtel, startOtel } from "@logistics/observability";
import { AppModule } from "./app.module.js";
import { getTrackingServiceConfig } from "./config/app-config.js";

async function bootstrap(): Promise<void> {
  const config = getTrackingServiceConfig();

  startOtel({
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Tracking Service")
      .setDescription("Shipment lookup APIs and shipment event publishing")
      .setVersion(config.serviceVersion)
      .build(),
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(config.port);
}

void bootstrap();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdownOtel();
  });
}
