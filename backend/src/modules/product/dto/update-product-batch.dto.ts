import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductBatchDto {
  @ApiPropertyOptional({
    example: 'BATCH-2024-001-UPDATED',
    description: 'Updated batch number',
  })
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional({
    example: 150,
    description: 'Updated quantity',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({
    example: '2024-01-20T00:00:00.000Z',
    description: 'Updated manufacture date',
  })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiPropertyOptional({
    example: '2025-06-15T00:00:00.000Z',
    description: 'Updated expiry date',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    example: 'QR:XYZ789ABC',
    description: 'Updated barcode or QR code',
  })
  @IsOptional()
  @IsString()
  barcodeOrQr?: string;

  @ApiPropertyOptional({
    example: 'receipt-uuid-456',
    description: 'Updated inbound receipt ID',
  })
  @IsOptional()
  @IsString()
  inboundReceiptId?: string;
}
