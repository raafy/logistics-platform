import { Injectable } from "@nestjs/common";
import { RabbitMQClient } from "@logistics/messaging";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";

interface ReadinessChecks {
  database: boolean;
  rabbitmq: boolean;
}

@Injectable()
export class ReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmq: RabbitMQClient,
  ) {}

  async check(): Promise<{
    ready: boolean;
    checks: ReadinessChecks;
  }> {
    const database = await this.checkDatabase();
    const rabbitmq = this.rmq.isHealthy();

    return {
      ready: database && rabbitmq,
      checks: {
        database,
        rabbitmq,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
