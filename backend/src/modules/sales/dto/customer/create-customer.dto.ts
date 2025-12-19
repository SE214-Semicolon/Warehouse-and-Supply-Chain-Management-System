import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'Mã khách hàng, unique nếu được cung cấp', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiProperty({ description: 'Tên khách hàng', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional({
    description: 'Thông tin liên hệ dạng JSON (ví dụ: phone, email, contactPerson)',
  })
  @IsOptional()
  contactInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;
}
