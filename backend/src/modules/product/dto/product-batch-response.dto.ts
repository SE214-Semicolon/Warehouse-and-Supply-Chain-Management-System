import { ApiProperty } from '@nestjs/swagger';
import { ProductBatchEntity } from '../entities/product-batch.entity';

export class ProductBatchResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: ProductBatchEntity })
  data: ProductBatchEntity;

  @ApiProperty({ required: false })
  message?: string;
}

export class ProductBatchListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [ProductBatchEntity] })
  data: ProductBatchEntity[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty({ required: false })
  message?: string;
}

export class ProductBatchDeleteResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
