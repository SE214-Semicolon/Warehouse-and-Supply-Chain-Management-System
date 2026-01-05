import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

const MOVEMENT_TYPE_VALUES = [...Object.values(StockMovementType), 'transfer'];

export class MovementQueryDto {
  @ApiProperty({ example: 'batch-uuid', description: 'Product batch ID to query movements for' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({
    example: 'purchase_receipt',
    description: "Filter by movement type (supports 'transfer' which groups transfer_in/out)",
    required: false,
    enum: MOVEMENT_TYPE_VALUES,
  })
  @IsOptional()
  @IsIn(MOVEMENT_TYPE_VALUES)
  movementType?: string;

  @ApiProperty({ example: 'loc-uuid', description: 'Filter by location', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

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
