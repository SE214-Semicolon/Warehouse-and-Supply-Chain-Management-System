import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'User email (unique)', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (min 8 characters)', example: 'SecurePassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'User full name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'User role', enum: UserRole, example: UserRole.warehouse_staff })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'User active status', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
