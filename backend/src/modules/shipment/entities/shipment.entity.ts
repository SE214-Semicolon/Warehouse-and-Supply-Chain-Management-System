import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class ShipmentEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Shipment number',
    example: 'SHIP-2025-001',
    nullable: true,
  })
  shipmentNo?: string | null;

  @ApiProperty({
    description: 'Warehouse ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  warehouseId: string;

  @ApiProperty({
    description: 'Sales order ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  salesOrderId: string;

  @ApiPropertyOptional({
    description: 'Carrier name',
    example: 'FedEx',
    nullable: true,
  })
  carrier?: string | null;

  @ApiPropertyOptional({
    description: 'Tracking code',
    example: 'TRACK123456789',
    nullable: true,
  })
  trackingCode?: string | null;

  @ApiProperty({
    description: 'Shipment status',
    enum: ShipmentStatus,
    example: 'preparing',
  })
  status: ShipmentStatus;

  @ApiPropertyOptional({
    description: 'Shipped timestamp',
    example: '2025-11-05T10:00:00.000Z',
    nullable: true,
  })
  shippedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Delivered timestamp',
    example: '2025-11-13T15:30:00.000Z',
    nullable: true,
  })
  deliveredAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2025-11-14T10:00:00.000Z',
    nullable: true,
  })
  estimatedDelivery?: Date | null;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Handle with care - fragile items',
    nullable: true,
  })
  notes?: string | null;
}
