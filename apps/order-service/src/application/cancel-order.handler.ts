import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../domain/order.repository.js";
import { OrderStatus } from "../domain/order-status.enum.js";

export interface CancelOrderCommand {
  orderId: string;
}

export interface CancelOrderResult {
  orderId: string;
  status: OrderStatus;
}

@Injectable()
export class CancelOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(command: CancelOrderCommand): Promise<CancelOrderResult> {
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${command.orderId} not found`);
    }

    order.cancel();
    await this.orderRepository.update(order);

    return {
      orderId: order.id,
      status: order.status,
    };
  }
}
