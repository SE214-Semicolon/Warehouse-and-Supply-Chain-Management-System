import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Customer code',
    example: 'CUST001',
    nullable: true,
  })
  code?: string | null;

  @ApiProperty({
    description: 'Customer name',
    example: 'XYZ Corporation',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Contact information (email, phone, etc.)',
    example: { email: 'contact@xyzcorp.com', phone: '+0987654321' },
    nullable: true,
  })
  contactInfo?: any;

  @ApiPropertyOptional({
    description: 'Customer address',
    example: '789 Business Blvd, Commercial District',
    nullable: true,
  })
  address?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt: Date;
}
