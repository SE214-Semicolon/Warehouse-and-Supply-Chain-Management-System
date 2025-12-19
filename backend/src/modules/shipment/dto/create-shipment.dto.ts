import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateShipmentItemDto {
  @ApiPropertyOptional({ description: 'Sales Order ID (optional reference)' })
  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Product Batch ID' })
  @IsOptional()
  @IsUUID()
  productBatchId?: string;

  @ApiProperty({ description: 'Quantity to ship', example: 10 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateShipmentDto {
  @ApiProperty({
    description: 'Sales Order ID (required)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  salesOrderId: string;

  @ApiProperty({
    description: 'Warehouse ID (required)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Carrier/Shipping company name', example: 'DHL Express' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ description: 'Tracking code', example: 'DHL123456789' })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2025-12-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Shipment items', type: [CreateShipmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentItemDto)
  @IsNotEmpty()
  items: CreateShipmentItemDto[];
}
