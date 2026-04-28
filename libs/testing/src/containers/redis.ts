import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";

export interface RedisTestInstance {
  container: StartedRedisContainer;
  connectionString: string;
  stop(): Promise<void>;
  client(): Promise<RedisClientType>;
  flushAll(): Promise<void>;
}

export async function startRedis(): Promise<RedisTestInstance> {
  const container = await new RedisContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start();

  const connectionString = container.getConnectionUrl();
  let client: RedisClientType | null = null;

  const getClient = async (): Promise<RedisClientType> => {
    if (!client) {
      client = createClient({ url: connectionString });
      await client.connect();
    }
    return client;
  };

  const flushAll = async (): Promise<void> => {
    const c = await getClient();
    await c.flushAll();
  };

  const stop = async (): Promise<void> => {
    if (client) {
      await client.quit();
      client = null;
    }
    await container.stop();
  };

  return {
    container,
    connectionString,
    stop,
    client: getClient,
    flushAll,
  };
}
