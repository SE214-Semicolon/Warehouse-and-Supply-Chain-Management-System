import { ApiProperty } from '@nestjs/swagger';

export class WarehouseEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Warehouse code',
    example: 'WH001',
  })
  code!: string;

  @ApiProperty({
    description: 'Warehouse name',
    example: 'Main Warehouse',
  })
  name!: string;

  @ApiProperty({
    description: 'Warehouse address',
    example: '123 Storage St, Industrial Area',
    required: false,
    nullable: true,
  })
  address?: string | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: { manager: 'John Doe', phone: '+1234567890' },
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
