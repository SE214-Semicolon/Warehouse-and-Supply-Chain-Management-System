import { ApiProperty } from '@nestjs/swagger';

export class InventoryDto {
  @ApiProperty({ example: 'inv-uuid' })
  id!: string;

  @ApiProperty({ example: 'pb-uuid' })
  productBatchId!: string;

  @ApiProperty({ example: 'loc-uuid' })
  locationId!: string;

  @ApiProperty({ example: 100 })
  availableQty!: number;

  @ApiProperty({ example: 0 })
  reservedQty!: number;

  @ApiProperty({ example: '2025-10-06T00:00:00.000Z' })
  updatedAt!: Date | string;
}
