import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @ApiProperty({ example: 'loc-uuid', description: 'Filter by location', required: false })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ example: 'product-uuid', description: 'Filter by product', required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: '2025-01-01', description: 'Start date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31', description: 'End date (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Items per page', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ example: 'createdAt', description: 'Sort field', required: false })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort order', required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class StockLevelReportDto extends ReportQueryDto {
  @ApiProperty({ example: 'category', description: 'Group by field: category, location, product', required: false })
  @IsString()
  @IsOptional()
  groupBy?: 'category' | 'location' | 'product' = 'location';
}

export class MovementReportDto extends ReportQueryDto {
  @ApiProperty({ example: 'purchase_receipt', description: 'Filter by movement type', required: false })
  @IsString()
  @IsOptional()
  movementType?: string;
}

export class ValuationReportDto extends ReportQueryDto {
  @ApiProperty({ example: 'FIFO', description: 'Valuation method: FIFO, LIFO, AVERAGE', required: false })
  @IsString()
  @IsOptional()
  method?: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE';
}