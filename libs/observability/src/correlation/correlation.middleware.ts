import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import {
  CORRELATION_HEADER,
  CAUSATION_HEADER,
  correlationContext,
} from "./correlation-context.js";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingCorrelationId = req.header(CORRELATION_HEADER);
    const incomingCausationId = req.header(CAUSATION_HEADER) ?? null;

    const correlationId =
      incomingCorrelationId && this.isUuid(incomingCorrelationId)
        ? incomingCorrelationId
        : correlationContext.newId();

    res.setHeader(CORRELATION_HEADER, correlationId);

    correlationContext.run(
      {
        correlationId,
        causationId:
          incomingCausationId && this.isUuid(incomingCausationId)
            ? incomingCausationId
            : null,
      },
      () => next(),
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
