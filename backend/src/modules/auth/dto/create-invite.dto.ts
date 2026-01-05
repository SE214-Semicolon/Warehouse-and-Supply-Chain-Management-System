import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInviteDto {
  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Email của người được mời',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.manager,
    description: 'Role sẽ được gán khi user signup',
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({
    required: false,
    example: 7,
    description: 'Số ngày invite có hiệu lực (mặc định 7 ngày)',
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiryDays?: number;
}
