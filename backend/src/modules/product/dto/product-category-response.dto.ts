import { ApiProperty } from '@nestjs/swagger';
import { ProductCategoryEntity } from '../entities/product-category.entity';

export class ProductCategoryResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: ProductCategoryEntity })
  data: ProductCategoryEntity;

  @ApiProperty({ required: false })
  message?: string;
}

export class ProductCategoryListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [ProductCategoryEntity] })
  data: ProductCategoryEntity[];

  @ApiProperty()
  total: number;
}

export class ProductCategoryDeleteResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
