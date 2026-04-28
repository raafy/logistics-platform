import { Injectable } from "@nestjs/common";
import { CircuitBreakerFactory } from "../../infrastructure/resilience/circuit-breaker.factory.js";

export interface ShipmentInfo {
  shipmentId: string;
  orderId: string;
  status: string;
  lastUpdated: string;
}

@Injectable()
export class GetShipmentForOrderHandler {
  private readonly breaker;

  constructor(
    private readonly cbFactory: CircuitBreakerFactory,
    private readonly trackingServiceUrl: string,
  ) {
    this.breaker = this.cbFactory.create(
      "tracking.getShipment",
      this.fetchShipment.bind(this),
      {
        failureThreshold: 3,
        resetTimeoutMs: 10000,
        timeoutMs: 3000,
      },
    );

    // Fallback returns cached/placeholder when circuit is open
    this.breaker.fallback(() => ({
      shipmentId: "fallback",
      orderId: "unknown",
      status: "UNKNOWN",
      lastUpdated: new Date().toISOString(),
      _fallback: true,
    }));
  }

  async execute(orderId: string): Promise<ShipmentInfo | { _fallback: true }> {
    return this.breaker.fire(orderId) as Promise<ShipmentInfo | { _fallback: true }>;
  }

  private async fetchShipment(orderId: string): Promise<ShipmentInfo> {
    const response = await fetch(
      `${this.trackingServiceUrl}/orders/${orderId}/shipment`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const error = new Error(`Tracking service returned ${response.status}`);
      (error as Error & { status: number }).status = response.status;
      throw error;
    }

    return response.json() as Promise<ShipmentInfo>;
  }
}
