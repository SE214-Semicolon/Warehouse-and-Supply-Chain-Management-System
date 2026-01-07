import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FulfillSOItemDto {
  @ApiProperty({ description: 'SO Item ID' })
  @IsUUID()
  soItemId!: string;

  @ApiPropertyOptional({ description: 'Product Batch ID (optional if SO item has reservation)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  productBatchId?: string;

  @ApiPropertyOptional({ description: 'Location ID to dispatch from (optional if SO item has reservation)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ description: 'Quantity to fulfill' })
  @IsNumber()
  @Min(1)
  qtyToFulfill!: number;

  @ApiProperty({ description: 'User ID performing the fulfillment' })
  @IsUUID()
  createdById!: string;

  @ApiProperty({ description: 'Idempotency key for dispatch', required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class FulfillSalesOrderDto {
  @ApiProperty({ type: [FulfillSOItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillSOItemDto)
  items!: FulfillSOItemDto[];

  @ApiProperty({ description: 'Fulfillment note', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
