import { Controller, Get, Header, ServiceUnavailableException } from "@nestjs/common";
import { ReadinessService } from "./readiness.service.js";

@Controller()
export class HealthController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get("health")
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async getReady(): Promise<{
    status: "ok";
    checks: { database: true; rabbitmq: true };
  }> {
    const result = await this.readinessService.check();
    if (!result.ready) {
      throw new ServiceUnavailableException({
        status: "error",
        checks: result.checks,
      });
    }

    return {
      status: "ok",
      checks: {
        database: true,
        rabbitmq: true,
      },
    };
  }

  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4; charset=utf-8")
  getMetrics(): string {
    return "# notification-service metrics stub\n";
  }
}
