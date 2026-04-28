import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}
