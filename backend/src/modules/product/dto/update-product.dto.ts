import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'SKU-001-UPDATED',
    description: 'New SKU for the product',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: 'Laptop Dell XPS 15 Updated',
    description: 'New name for the product',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'b3b8d4f9-0a7e-5c6f-8b2a-8a9b4a3c2b1d',
    description: 'New category ID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'box',
    description: 'New unit of measurement',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    example: '9876543210987',
    description: 'New barcode',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    example: { weight: '2.8kg', color: 'black', brand: 'Dell' },
    description: 'Updated product parameters',
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
