import { ApiProperty } from "@nestjs/swagger";
import { OrderItemResponseDto } from "./order-item.response.dto.js";

export class OrderResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  customerId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  placedAt!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];
}
