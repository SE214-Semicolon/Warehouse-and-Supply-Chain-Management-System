import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateSOItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Product Batch ID', required: false })
  @IsOptional()
  @IsUUID()
  productBatchId?: string;

  @ApiProperty({ description: 'Quantity to order' })
  @IsNumber()
  qty!: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Customer ID', required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ description: 'Placed date', required: false })
  @IsOptional()
  @IsDateString()
  placedAt?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateSOItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSOItemDto)
  items?: CreateSOItemDto[];
}

