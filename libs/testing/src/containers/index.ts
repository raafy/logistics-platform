import { startPostgresWithDatabases, type PostgresTestInstance } from "./postgres.js";
import { startRabbitMQ, type RabbitMQTestInstance } from "./rabbitmq.js";
import { startRedis, type RedisTestInstance } from "./redis.js";

export interface FullStackTestInstance {
  postgres: PostgresTestInstance;
  rabbitmq: RabbitMQTestInstance;
  redis: RedisTestInstance;
  stop(): Promise<void>;
  getEnv(): Record<string, string>;
}

export async function startFullStack(options?: {
  databases?: string[];
}): Promise<FullStackTestInstance> {
  const [postgres, rabbitmq, redis] = await Promise.all([
    startPostgresWithDatabases(options?.databases ?? ["order_db", "tracking_db", "notification_db"]),
    startRabbitMQ(),
    startRedis(),
  ]);

  const stop = async (): Promise<void> => {
    await Promise.all([postgres.stop(), rabbitmq.stop(), redis.stop()]);
  };

  const getEnv = (): Record<string, string> => ({
    ORDER_DATABASE_URL: postgres.connectionString.replace("/test_db", "/order_db"),
    TRACKING_DATABASE_URL: postgres.connectionString.replace("/test_db", "/tracking_db"),
    NOTIFICATION_DATABASE_URL: postgres.connectionString.replace("/test_db", "/notification_db"),
    RABBITMQ_URL: rabbitmq.connectionString,
    RABBITMQ_EXCHANGE: "logistics.events",
    REDIS_URL: redis.connectionString,
    NODE_ENV: "test",
  });

  return { postgres, rabbitmq, redis, stop, getEnv };
}

export { startPostgresWithDatabases, type PostgresTestInstance } from "./postgres.js";
export { startRabbitMQ, type RabbitMQTestInstance } from "./rabbitmq.js";
export { startRedis, type RedisTestInstance } from "./redis.js";
