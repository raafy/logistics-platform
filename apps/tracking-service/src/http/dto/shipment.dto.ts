import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ShipmentRecord } from "../../services/shipment.types.js";

export class ShipmentLocationDto {
  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;
}

export class TrackingEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  shipmentId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiPropertyOptional({ type: ShipmentLocationDto, nullable: true })
  location!: ShipmentLocationDto | null;
}

export class ShipmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [TrackingEventDto] })
  events!: TrackingEventDto[];
}

export const toShipmentDto = (shipment: ShipmentRecord): ShipmentDto => ({
  id: shipment.id,
  orderId: shipment.orderId,
  status: shipment.status,
  createdAt: shipment.createdAt.toISOString(),
  updatedAt: shipment.updatedAt.toISOString(),
  events: shipment.events.map((event) => ({
    id: event.id,
    shipmentId: event.shipmentId,
    status: event.status,
    occurredAt: event.occurredAt.toISOString(),
    location: event.location,
  })),
});
