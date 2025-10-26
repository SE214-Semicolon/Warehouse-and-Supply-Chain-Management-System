import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class POItemToAddDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Quantity to order' })
  @IsNumber()
  qtyOrdered!: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ description: 'Remark', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class AddPurchaseOrderItemsDto {
  @ApiProperty({ type: [POItemToAddDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POItemToAddDto)
  items!: POItemToAddDto[];
}

