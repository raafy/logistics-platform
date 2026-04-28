export { buildEventEnvelope } from "./envelope/envelope-builder.js";
export type { BuildEnvelopeInput } from "./envelope/envelope-builder.js";

export {
  RabbitMQClient,
  RABBITMQ_OPTIONS,
} from "./rabbitmq/rabbitmq.client.js";
export type {
  RabbitMQClientOptions,
  PublishArgs,
  MessageHandler,
} from "./rabbitmq/rabbitmq.client.js";
export { RabbitMQModule } from "./rabbitmq/rabbitmq.module.js";

export { BaseOutboxRelay } from "./outbox/outbox-relay.service.js";
export type { OutboxRelayOptions } from "./outbox/outbox-relay.service.js";
export type { OutboxRecord, OutboxStore } from "./outbox/outbox.types.js";

export { IdempotentConsumer } from "./consumer/idempotent-consumer.base.js";
export type { ConsumerOptions } from "./consumer/idempotent-consumer.base.js";
export type {
  ProcessedMessageStore,
  ProcessResult,
} from "./consumer/processed-message-store.js";
