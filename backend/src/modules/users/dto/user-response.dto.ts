import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiPropertyOptional({ description: 'User email' })
  email?: string;

  @ApiPropertyOptional({ description: 'User full name' })
  fullName?: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'User active status' })
  active: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  // Explicitly exclude passwordHash from response
  // This DTO ensures passwordHash is never sent to client
}
