import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

export class StockMovementEntity {
  @ApiProperty({
    description: 'Unique identifier for the stock movement',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Product batch ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  productBatchId!: string;

  @ApiProperty({
    description: 'Source location ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
    nullable: true,
  })
  fromLocationId?: string | null;

  @ApiProperty({
    description: 'Destination location ID',
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
    nullable: true,
  })
  toLocationId?: string | null;

  @ApiProperty({
    description: 'Movement quantity',
    example: 50,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Type of stock movement',
    enum: StockMovementType,
    example: StockMovementType.purchase_receipt,
  })
  movementType!: StockMovementType;

  @ApiProperty({
    description: 'Reference document number',
    example: 'PO-2025-001',
    required: false,
    nullable: true,
  })
  reference?: string | null;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Received from supplier',
    required: false,
    nullable: true,
  })
  note?: string | null;

  @ApiProperty({
    description: 'User who created this movement',
    example: '550e8400-e29b-41d4-a716-446655440004',
    required: false,
    nullable: true,
  })
  createdById?: string | null;

  @ApiProperty({
    description: 'Idempotency key for duplicate prevention',
    example: 'abc-123-xyz',
    required: false,
    nullable: true,
  })
  idempotencyKey?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt!: Date;
}
