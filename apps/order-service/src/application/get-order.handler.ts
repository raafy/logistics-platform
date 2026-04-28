import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../domain/order.repository.js";

export interface GetOrderQuery {
  orderId: string;
}

export interface OrderItemView {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderView {
  id: string;
  customerId: string;
  status: string;
  totalCents: number;
  currency: string;
  placedAt: string;
  items: OrderItemView[];
}

@Injectable()
export class GetOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(query: GetOrderQuery): Promise<OrderView> {
    const order = await this.orderRepository.findById(query.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${query.orderId} not found`);
    }

    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      placedAt: order.placedAt.toISOString(),
      items: order.items.map((item) => item.toPrimitives()),
    };
  }
}
