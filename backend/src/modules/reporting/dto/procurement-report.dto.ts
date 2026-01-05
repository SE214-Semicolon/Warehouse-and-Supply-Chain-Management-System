import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PoStatus } from '@prisma/client';

export class POPerformanceReportDto {
  @ApiPropertyOptional({ description: 'Filter by start date (ISO format)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO format)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by supplier ID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ enum: PoStatus, description: 'Filter by PO status' })
  @IsOptional()
  @IsEnum(PoStatus)
  status?: PoStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['placedAt', 'expectedArrival', 'totalAmount', 'leadTime'],
    description: 'Sort by field',
  })
  @IsOptional()
  @IsEnum(['placedAt', 'expectedArrival', 'totalAmount', 'leadTime'])
  sortBy?: 'placedAt' | 'expectedArrival' | 'totalAmount' | 'leadTime';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class SupplierPerformanceReportDto {
  @ApiPropertyOptional({ description: 'Filter by start date (ISO format)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO format)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['totalOrders', 'totalValue', 'avgLeadTime', 'onTimeRate'],
    description: 'Sort by field',
  })
  @IsOptional()
  @IsEnum(['totalOrders', 'totalValue', 'avgLeadTime', 'onTimeRate'])
  sortBy?: 'totalOrders' | 'totalValue' | 'avgLeadTime' | 'onTimeRate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
