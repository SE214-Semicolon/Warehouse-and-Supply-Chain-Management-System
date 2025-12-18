import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Supplier code',
    example: 'SUP001',
    nullable: true,
  })
  code?: string | null;

  @ApiProperty({
    description: 'Supplier name',
    example: 'ABC Supplies Ltd.',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Contact information (email, phone, etc.)',
    example: { email: 'contact@abcsupplies.com', phone: '+1234567890' },
    nullable: true,
  })
  contactInfo?: any;

  @ApiPropertyOptional({
    description: 'Supplier address',
    example: '456 Supply St, Industrial Area',
    nullable: true,
  })
  address?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Soft delete timestamp',
    example: '2025-12-04T10:00:00.000Z',
    nullable: true,
  })
  deletedAt?: Date | null;
}
