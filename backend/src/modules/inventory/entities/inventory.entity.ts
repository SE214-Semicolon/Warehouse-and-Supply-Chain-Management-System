import { ApiProperty } from '@nestjs/swagger';

export class InventoryEntity {
  @ApiProperty({
    description: 'Unique identifier for the inventory record',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Product batch ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  productBatchId!: string;

  @ApiProperty({
    description: 'Location ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  locationId!: string;

  @ApiProperty({
    description: 'Available quantity',
    example: 100,
  })
  availableQty!: number;

  @ApiProperty({
    description: 'Reserved quantity',
    example: 20,
  })
  reservedQty!: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-04T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Soft delete timestamp',
    example: null,
    required: false,
    nullable: true,
  })
  deletedAt?: Date | null;
}
