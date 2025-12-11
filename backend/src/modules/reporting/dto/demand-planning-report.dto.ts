import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Demand Forecast Accuracy Report
 * GET /reports/demand-planning/accuracy
 */
export class DemandForecastAccuracyReportDto {
  @ApiPropertyOptional({
    example: 'prod-uuid',
    description: 'Filter by product ID',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date for accuracy analysis (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'End date for accuracy analysis (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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
    example: 'accuracy',
    description: 'Sort by: accuracy, mae, mape (default: accuracy)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'accuracy';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order: asc or desc (default: desc)',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
