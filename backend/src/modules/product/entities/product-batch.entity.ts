import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductBatchEntity {
  @ApiProperty({ description: 'Batch ID' })
  id: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiPropertyOptional({ description: 'Batch number/code' })
  batchNo?: string | null;

  @ApiProperty({ description: 'Quantity in batch' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Manufacture date' })
  manufactureDate?: Date | null;

  @ApiPropertyOptional({ description: 'Expiry date' })
  expiryDate?: Date | null;

  @ApiPropertyOptional({ description: 'Barcode or QR code' })
  barcodeOrQr?: string | null;

  @ApiPropertyOptional({ description: 'Inbound receipt ID' })
  inboundReceiptId?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
