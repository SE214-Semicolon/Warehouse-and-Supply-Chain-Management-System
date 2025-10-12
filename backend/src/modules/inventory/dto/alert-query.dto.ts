import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class AlertQueryDto {
  @ApiProperty({ example: 10, description: 'Low stock threshold', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  threshold?: number = 10;

  @ApiProperty({ example: 'loc-uuid', description: 'Filter by location', required: false })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ example: 'product-uuid', description: 'Filter by product', required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

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

  @ApiProperty({ example: 'availableQty', description: 'Sort field', required: false })
  @IsString()
  @IsOptional()
  sortBy?: string = 'availableQty';

  @ApiProperty({ example: 'asc', description: 'Sort order', required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}