import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductBatchDto {
  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Search by batch number',
    example: 'BATCH-2024',
  })
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional({
    description: 'Filter by barcode or QR',
    example: 'QR:ABC123',
  })
  @IsOptional()
  @IsString()
  barcodeOrQr?: string;

  @ApiPropertyOptional({
    description: 'Filter batches expiring before this date',
    example: '2024-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiryBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter batches expiring after this date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiryAfter?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;
}
