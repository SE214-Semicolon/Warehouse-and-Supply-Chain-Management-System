import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'SKU-001',
    description: 'Stock Keeping Unit - unique identifier for the product',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    example: 'Laptop Dell XPS 15',
    description: 'Name of the product',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
    description: 'Category ID of the product',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: 'pcs',
    description: 'Unit of measurement (e.g., pcs, kg, liter)',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({
    example: '1234567890123',
    description: 'Barcode of the product',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    example: { weight: '2.5kg', color: 'silver', brand: 'Dell' },
    description: 'Additional product parameters/specifications',
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
