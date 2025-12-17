import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PoStatus } from '@prisma/client';

export class QueryPurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poNo?: string;

  @ApiPropertyOptional({ enum: PoStatus })
  @IsOptional()
  @IsEnum(PoStatus)
  status?: PoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Chuỗi sắp xếp, ví dụ: placedAt:desc,poNo:asc' })
  @IsOptional()
  @IsString()
  sort?: string;
}
