import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { ShipmentsService } from "../services/shipments.service.js";
import { ShipmentDto, toShipmentDto } from "./dto/shipment.dto.js";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get(":orderId/shipment")
  @ApiOperation({ summary: "Get shipment by order id" })
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiOkResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: "Shipment not found for order" })
  async getByOrderId(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
  ): Promise<ShipmentDto> {
    const shipment = await this.shipmentsService.getShipmentByOrderId(orderId);
    return toShipmentDto(shipment);
  }
}
