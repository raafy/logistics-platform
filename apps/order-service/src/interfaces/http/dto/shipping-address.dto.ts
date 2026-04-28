import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length, MinLength } from "class-validator";

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  line1!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  line2?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  city!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  region!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  postalCode!: string;

  @ApiProperty({ minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  country!: string;
}
