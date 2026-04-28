import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient, type Prisma } from "@prisma/client";

export interface NotificationPrismaExecutor {
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]): Promise<T>;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly transactionContext =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.NOTIFICATION_DATABASE_URL ??
            "postgresql://notification_svc:notification_pw@localhost:5432/notification_db?schema=public",
        },
      },
    });
  }

  get client(): NotificationPrismaExecutor {
    return this.transactionContext.getStore() ?? this;
  }

  async withTransaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) =>
      this.transactionContext.run(tx, () => handler()),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
