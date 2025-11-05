import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductCategoryEntity {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}
