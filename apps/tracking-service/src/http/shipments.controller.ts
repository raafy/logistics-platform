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

@ApiTags("shipments")
@Controller("shipments")
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get shipment by shipment id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: "Shipment not found" })
  async getById(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ShipmentDto> {
    const shipment = await this.shipmentsService.getShipmentById(id);
    return toShipmentDto(shipment);
  }
}
