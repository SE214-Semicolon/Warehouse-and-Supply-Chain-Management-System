import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductBatchEntity {
  @ApiProperty({ description: 'Batch ID' })
  id: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiPropertyOptional({ description: 'Batch number/code' })
  batchNo?: string | null;

  @ApiProperty({ description: 'Quantity in batch', default: 0 })
  quantity: number;

  // Aggregated inventory fields (computed from Inventory table)
  @ApiProperty({ description: 'Total available quantity across all locations', default: 0 })
  totalAvailableQty?: number;

  @ApiProperty({ description: 'Total reserved quantity across all locations', default: 0 })
  totalReservedQty?: number;

  @ApiProperty({ description: 'Total on-hand quantity (available + reserved)', default: 0 })
  totalOnHand?: number;

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
