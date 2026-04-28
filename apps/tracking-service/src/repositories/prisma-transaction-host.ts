import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

export type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrismaTransactionHost {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  getClient(): PrismaClientLike {
    return this.storage.getStore() ?? this.prisma;
  }

  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const active = this.storage.getStore();
    if (active) {
      return operation();
    }

    return this.prisma.$transaction((tx: Prisma.TransactionClient) =>
      this.storage.run(tx, operation),
    );
  }

  runWithClient<T>(tx: Prisma.TransactionClient, operation: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, operation);
  }
}
