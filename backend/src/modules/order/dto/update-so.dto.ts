import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateSOItemDto {
  @ApiProperty({ description: 'SO Item ID', required: false })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Product ID', required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Quantity', required: false })
  @IsOptional()
  @IsNumber()
  qty?: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class UpdateSalesOrderDto {
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

  @ApiProperty({ type: [UpdateSOItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSOItemDto)
  items?: UpdateSOItemDto[];
}

