import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Warehouse Utilization Report
 * GET /reports/warehouse/utilization
 */
export class WarehouseUtilizationReportDto {
  @ApiPropertyOptional({
    example: 'wh-uuid',
    description: 'Filter by warehouse ID',
  })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (default: 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (default: 20, max: 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'utilizationRate',
    description: 'Sort by: utilizationRate, totalCapacity, usedCapacity (default: utilizationRate)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'utilizationRate';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order: asc or desc (default: desc)',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
