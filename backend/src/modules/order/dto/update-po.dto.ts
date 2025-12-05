import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class UpdatePOItemDto {
  @ApiProperty({ description: 'PO Item ID để update', required: false })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Product ID', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Quantity ordered', required: false })
  @IsOptional()
  qtyOrdered?: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  placedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedArrival?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [UpdatePOItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePOItemDto)
  items?: UpdatePOItemDto[];
}

