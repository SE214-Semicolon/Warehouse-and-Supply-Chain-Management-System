import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class QueryInviteDto {
  @ApiProperty({ required: false, description: 'Filter by email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false, description: 'Filter by used status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  used?: boolean;

  @ApiProperty({ required: false, description: 'Filter by expired status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  expired?: boolean;

  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number;

  @ApiProperty({ required: false, example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  pageSize?: number;
}

