import { ApiProperty } from "@nestjs/swagger";

export class CreateOrderResponseDto {
  @ApiProperty({ format: "uuid" })
  orderId!: string;
}
