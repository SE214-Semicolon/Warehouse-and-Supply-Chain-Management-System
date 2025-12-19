import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySupplierDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm chung theo tên/mã nhà cung cấp', maxLength: 300 })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Mã nhà cung cấp' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Tên nhà cung cấp' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại trong trường contactInfo.phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Chuỗi sắp xếp, ví dụ: createdAt:desc,name:asc' })
  @IsOptional()
  @IsString()
  sort?: string;
}
