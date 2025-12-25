import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

export class ReportQueryDto {
  @ApiProperty({ example: 'loc-uuid', description: 'Filter by location', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ example: 'product-uuid', description: 'Filter by product', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: '2025-01-01', description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31', description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Items per page', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @ApiProperty({ example: 'createdAt', description: 'Sort field', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort order', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class StockLevelReportDto extends ReportQueryDto {
  @ApiProperty({
    example: 'category',
    description: 'Group by field: category, location, product',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupBy?: 'category' | 'location' | 'product' = 'location';
}

export class MovementReportDto extends ReportQueryDto {
  @ApiProperty({
    example: 'purchase_receipt',
    description: "Filter by movement type (supports 'transfer' which groups transfer_in/out)",
    required: false,
    // expose available options including grouped 'transfer'
    enum: [...Object.values(StockMovementType), 'transfer'],
  })
  @IsOptional()
  @IsString()
  movementType?: string;
}

export class ValuationReportDto extends ReportQueryDto {
  @ApiProperty({
    example: 'FIFO',
    description: 'Valuation method: FIFO, LIFO, AVERAGE',
    required: false,
  })
  @IsOptional()
  @IsString()
  method?: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE';
}
