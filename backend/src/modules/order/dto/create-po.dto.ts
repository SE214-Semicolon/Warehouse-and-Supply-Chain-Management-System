import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsDateAfterOrEqual } from '../../../common/validators/date-comparison.validator';

export class CreatePOItemDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  @IsString()
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Số lượng đặt hàng', minimum: 1 })
  @IsInt()
  @Min(1)
  qtyOrdered!: number;

  @ApiPropertyOptional({ description: 'Đơn giá' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Ghi chú cho dòng sản phẩm' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'ID nhà cung cấp' })
  @IsOptional()
  @IsString()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Ngày đặt hàng' })
  @IsOptional()
  @IsDateString()
  placedAt?: string;

  @ApiPropertyOptional({ description: 'Ngày dự kiến nhận hàng' })
  @IsOptional()
  @IsDateString()
  @IsDateAfterOrEqual('placedAt', {
    message: 'Expected arrival date must be after or equal to placed date',
  })
  expectedArrival?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: [CreatePOItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOItemDto)
  items?: CreatePOItemDto[];
}
