import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CancelOrderHandler } from "../../application/cancel-order.handler.js";
import { CreateOrderHandler } from "../../application/create-order.handler.js";
import { GetOrderHandler } from "../../application/get-order.handler.js";
import { GetShipmentForOrderHandler } from "../../application/queries/get-shipment-for-order.handler.js";
import { CreateOrderDto } from "./dto/create-order.dto.js";
import { CreateOrderResponseDto } from "./dto/create-order.response.dto.js";
import { OrderResponseDto } from "./dto/order.response.dto.js";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly createOrderHandler: CreateOrderHandler,
    private readonly getOrderHandler: GetOrderHandler,
    private readonly cancelOrderHandler: CancelOrderHandler,
    private readonly getShipmentHandler: GetShipmentForOrderHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new order" })
  @ApiCreatedResponse({ type: CreateOrderResponseDto })
  async create(@Body() dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    return this.createOrderHandler.execute({
      customerId: dto.customerId,
      currency: dto.currency,
      items: dto.items,
      shippingAddress: {
        line1: dto.shippingAddress.line1,
        line2: dto.shippingAddress.line2 ?? null,
        city: dto.shippingAddress.city,
        region: dto.shippingAddress.region,
        postalCode: dto.shippingAddress.postalCode,
        country: dto.shippingAddress.country,
      },
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an order by ID" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: OrderResponseDto })
  async getById(@Param("id") id: string): Promise<OrderResponseDto> {
    return this.getOrderHandler.execute({ orderId: id });
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: OrderResponseDto, description: "Current order state" })
  async cancel(@Param("id") id: string): Promise<OrderResponseDto> {
    await this.cancelOrderHandler.execute({ orderId: id });
    return this.getOrderHandler.execute({ orderId: id });
  }

  @Get(":id/shipment")
  @ApiOperation({ summary: "Get shipment status for an order (circuit breaker demo)" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Shipment info or fallback if Tracking is down" })
  async getShipment(@Param("id") id: string): Promise<unknown> {
    return this.getShipmentHandler.execute(id);
  }
}
