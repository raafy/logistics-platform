import { Injectable, Logger } from "@nestjs/common";
import CircuitBreaker from "opossum";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  timeoutMs: number;
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

@Injectable()
export class CircuitBreakerFactory {
  private readonly logger = new Logger(CircuitBreakerFactory.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  create(
    name: string,
    action: (...args: string[]) => Promise<unknown>,
    options: Partial<CircuitBreakerOptions> = {},
  ): CircuitBreaker {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const opts = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeoutMs ?? 30000,
      timeout: options.timeoutMs ?? 5000,
      errorFilter: (error: Error) => {
        // Don't count 4xx errors as failures
        if ("status" in error && typeof error.status === "number") {
          return error.status >= 400 && error.status < 500;
        }
        return false;
      },
    };

    const breaker = new CircuitBreaker(action, opts);

    breaker.on("open", () => {
      this.logger.warn(`Circuit breaker '${name}' opened`);
    });

    breaker.on("halfOpen", () => {
      this.logger.log(`Circuit breaker '${name}' half-open (probing)`);
    });

    breaker.on("close", () => {
      this.logger.log(`Circuit breaker '${name}' closed (healthy)`);
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  getState(name: string): CircuitState | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;
    return breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED";
  }

  getStats(name: string): Record<string, unknown> | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;
    return {
      state: this.getState(name),
      failures: breaker.stats.failures,
      successes: breaker.stats.successes,
      rejects: breaker.stats.rejects,
      fallbacks: breaker.stats.fallbacks,
    };
  }
}
