import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base DTO for inventory reports with common query parameters
 */
export class BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: 'loc-uuid',
    description: 'Filter by location ID',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: 'prod-uuid',
    description: 'Filter by product ID',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

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
}

/**
 * DTO for Low Stock Report
 * GET /reports/inventory/low-stock
 */
export class LowStockReportDto extends BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Threshold for low stock (default: 10)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threshold?: number = 10;
}

/**
 * DTO for Expiry Report
 * GET /reports/inventory/expiry
 */
export class ExpiryReportDto extends BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: 30,
    description: 'Days ahead to check for expiring products (default: 30)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  daysAhead?: number = 30;
}

/**
 * DTO for Stock Level Report
 * GET /reports/inventory/stock-levels
 */
export class StockLevelReportDto extends BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: 'location',
    description: 'Group by: category, location, or product (default: location)',
  })
  @IsOptional()
  @IsString()
  groupBy?: 'category' | 'location' | 'product' = 'location';
}

/**
 * DTO for Movement Report
 * GET /reports/inventory/movements
 */
export class MovementReportDto extends BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'End date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'purchase_receipt',
    description: 'Filter by movement type',
  })
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sort by field (default: createdAt)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order: asc or desc (default: desc)',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * DTO for Valuation Report
 * GET /reports/inventory/valuation
 */
export class ValuationReportDto extends BaseInventoryReportDto {
  @ApiPropertyOptional({
    example: 'AVERAGE',
    description: 'Valuation method: FIFO, LIFO, or AVERAGE (default: AVERAGE)',
  })
  @IsOptional()
  @IsString()
  method?: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE';
}
