import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryShipmentDto {
  @ApiPropertyOptional({ description: 'Filter by shipment number', example: 'SHIP-202512-ABC123' })
  @IsOptional()
  @IsString()
  shipmentNo?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Filter by carrier', example: 'DHL' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ description: 'Filter by tracking code', example: 'DHL123456' })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional({ description: 'Date from (shippedAt)', example: '2025-12-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (shippedAt)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'shippedAt:desc',
    default: 'shippedAt:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
