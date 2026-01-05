import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class SalesOrderEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Sales order number',
    example: 'SO-2025-001',
  })
  soNo: string;

  @ApiPropertyOptional({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  customerId?: string | null;

  @ApiProperty({
    description: 'Sales order status',
    enum: OrderStatus,
    example: 'pending',
  })
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Order placement timestamp',
    example: '2025-11-04T10:00:00.000Z',
    nullable: true,
  })
  placedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Total order amount',
    example: 25000.75,
    nullable: true,
  })
  totalAmount?: number | null;

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
