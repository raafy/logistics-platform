import { DynamicModule, Global, Module } from "@nestjs/common";
import {
  RABBITMQ_OPTIONS,
  RabbitMQClient,
  type RabbitMQClientOptions,
} from "./rabbitmq.client.js";

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(options: RabbitMQClientOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        { provide: RABBITMQ_OPTIONS, useValue: options },
        RabbitMQClient,
      ],
      exports: [RabbitMQClient],
    };
  }
}
