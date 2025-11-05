import { ApiProperty } from '@nestjs/swagger';

export class LocationEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Warehouse ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  warehouseId!: string;

  @ApiProperty({
    description: 'Location code',
    example: 'A-01-01',
  })
  code!: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Aisle A, Rack 01, Level 01',
    required: false,
    nullable: true,
  })
  name?: string | null;

  @ApiProperty({
    description: 'Storage capacity',
    example: 100,
    required: false,
    nullable: true,
  })
  capacity?: number | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: { zone: 'Cold Storage', type: 'Pallet' },
    required: false,
    nullable: true,
  })
  metadata?: any;

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
}
