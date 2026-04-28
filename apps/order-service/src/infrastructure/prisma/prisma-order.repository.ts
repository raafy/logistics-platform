import { Injectable } from "@nestjs/common";
import { Order, OrderStatus, type OrderItemProps } from "../../domain/index.js";
import type {
  OrderItem as PrismaOrderItem,
} from "../../generated/prisma";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
  type PendingOutboxMessage,
} from "../../domain/order.repository.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveNew(order: Order, message: PendingOutboxMessage): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.order.create({
        data: {
          id: order.id,
          customerId: order.customerId,
          status: order.status,
          totalCents: order.totalCents,
          currency: order.currency,
          placedAt: order.placedAt,
          items: {
            create: order.items.map((item) => ({
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
            })),
          },
        },
      }),
      this.prisma.outbox.create({
        data: {
          aggregateType: message.aggregateType,
          aggregateId: message.aggregateId,
          eventType: message.eventType,
          routingKey: message.routingKey,
          payload: message.payload,
          headers: message.headers ?? undefined,
        },
      }),
    ]);
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    return Order.rehydrate({
      id: order.id,
      customerId: order.customerId,
      status: order.status as OrderStatus,
      currency: order.currency,
      placedAt: order.placedAt,
      items: order.items.map((item: PrismaOrderItem): OrderItemProps => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
    });
  }

  async update(order: Order): Promise<void> {
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: order.status,
        totalCents: order.totalCents,
        currency: order.currency,
        placedAt: order.placedAt,
      },
    });
  }
}

export const OrderRepositoryProvider = {
  provide: ORDER_REPOSITORY,
  useExisting: PrismaOrderRepository,
};
