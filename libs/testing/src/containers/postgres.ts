import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

export interface PostgresTestInstance {
  container: StartedPostgreSqlContainer;
  connectionString: string;
  stop(): Promise<void>;
  execute(sql: string): Promise<void>;
}

export async function startPostgres(): Promise<PostgresTestInstance> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test_user")
    .withPassword("test_password")
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();

  const execute = async (sql: string): Promise<void> => {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  };

  const stop = async (): Promise<void> => {
    await container.stop();
  };

  return { container, connectionString, stop, execute };
}

export async function startPostgresWithDatabases(
  dbNames: string[],
): Promise<PostgresTestInstance> {
  const instance = await startPostgres();

  for (const dbName of dbNames) {
    await instance.execute(`CREATE DATABASE "${dbName}";`);
  }

  return instance;
}
