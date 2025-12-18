import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoStatus } from '@prisma/client';

export class PurchaseOrderEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Purchase order number',
    example: 'PO-2025-001',
  })
  poNo: string;

  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  supplierId?: string | null;

  @ApiProperty({
    description: 'Purchase order status',
    enum: PoStatus,
    example: 'draft',
  })
  status: PoStatus;

  @ApiPropertyOptional({
    description: 'Order placement timestamp',
    example: '2025-11-04T10:00:00.000Z',
    nullable: true,
  })
  placedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Expected arrival date',
    example: '2025-11-14T10:00:00.000Z',
    nullable: true,
  })
  expectedArrival?: Date | null;

  @ApiPropertyOptional({
    description: 'Total order amount',
    example: 15000.5,
    nullable: true,
  })
  totalAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Urgent delivery required',
    nullable: true,
  })
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Creator user ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  createdById?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-04T12:00:00.000Z',
  })
  updatedAt: Date;
}
