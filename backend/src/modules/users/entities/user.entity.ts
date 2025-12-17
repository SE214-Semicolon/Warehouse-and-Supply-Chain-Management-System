import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Username (unique)',
    example: 'john.doe',
  })
  username: string;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
    nullable: true,
  })
  fullName?: string | null;

  @ApiPropertyOptional({
    description: 'Email address (unique)',
    example: 'john.doe@example.com',
    nullable: true,
  })
  email?: string | null;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: 'warehouse_staff',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  active: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { department: 'Operations', employeeId: 'EMP001' },
    nullable: true,
  })
  metadata?: any;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-04T10:00:00.000Z',
  })
  createdAt: Date;
}
