import { ApiProperty } from "@nestjs/swagger";

export class OrderItemResponseDto {
  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPriceCents!: number;
}
