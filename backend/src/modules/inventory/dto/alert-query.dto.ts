import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class AlertQueryDto {
  @ApiProperty({ example: 10, description: 'Low stock threshold', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  threshold?: number = 10;

  @ApiProperty({ example: 'loc-uuid', description: 'Filter by location', required: false })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ example: 'product-uuid', description: 'Filter by product', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Items per page', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @ApiProperty({ example: 'availableQty', description: 'Sort field', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'availableQty';

  @ApiProperty({ example: 'asc', description: 'Sort order', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
