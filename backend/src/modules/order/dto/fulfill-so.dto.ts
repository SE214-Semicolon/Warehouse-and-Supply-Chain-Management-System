import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FulfillSOItemDto {
  @ApiProperty({ description: 'SO Item ID' })
  @IsUUID()
  soItemId!: string;

  @ApiProperty({ description: 'Product Batch ID' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ description: 'Location ID to dispatch from' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: 'Quantity to fulfill' })
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
