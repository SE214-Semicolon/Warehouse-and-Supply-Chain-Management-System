import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryByProductBatchDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID to query inventory for' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ example: 1, description: 'Page number for pagination', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Number of items per page', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ example: 'locationId', description: 'Sort field', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'locationId';

  @ApiProperty({ example: 'asc', description: 'Sort order (asc or desc)', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
