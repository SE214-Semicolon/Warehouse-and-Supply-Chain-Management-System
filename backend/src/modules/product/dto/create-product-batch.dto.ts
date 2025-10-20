import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductBatchDto {
  @ApiProperty({
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
    description: 'Product ID for this batch',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    example: 'BATCH-2024-001',
    description: 'Batch number/code',
  })
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiProperty({
    example: 100,
    description: 'Initial quantity for this batch',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity?: number = 0;

  @ApiPropertyOptional({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Manufacture date of the batch',
  })
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiPropertyOptional({
    example: '2025-01-15T00:00:00.000Z',
    description: 'Expiry date of the batch',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    example: 'QR:ABC123XYZ',
    description: 'Barcode or QR code for the batch',
  })
  @IsOptional()
  @IsString()
  barcodeOrQr?: string;

  @ApiPropertyOptional({
    example: 'receipt-uuid-123',
    description: 'Inbound receipt ID reference',
  })
  @IsOptional()
  @IsString()
  inboundReceiptId?: string;
}
