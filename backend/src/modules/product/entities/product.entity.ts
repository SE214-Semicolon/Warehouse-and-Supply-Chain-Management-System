import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductEntity {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Stock Keeping Unit' })
  sku: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: string | null;

  @ApiProperty({ description: 'Unit of measurement' })
  unit: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  barcode?: string | null;

  @ApiPropertyOptional({ description: 'Additional product parameters' })
  parameters?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
