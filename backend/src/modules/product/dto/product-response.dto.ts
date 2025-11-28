import { ApiProperty } from '@nestjs/swagger';
import { ProductEntity } from '../entities/product.entity';

export class ProductResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: ProductEntity })
  data: ProductEntity;

  @ApiProperty({ required: false })
  message?: string;
}

export class ProductListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [ProductEntity] })
  data: ProductEntity[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ProductDeleteResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
