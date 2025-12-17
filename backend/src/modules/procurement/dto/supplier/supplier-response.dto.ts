import { ApiProperty } from '@nestjs/swagger';
import type { Supplier } from '@prisma/client';

export class SupplierResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: Supplier;

  @ApiProperty({ example: 'Supplier created successfully' })
  message: string;
}

export class SupplierListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [Object] })
  data: Supplier[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;

  @ApiProperty({ example: 'Suppliers retrieved successfully' })
  message: string;
}

export class SupplierDeleteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Supplier deleted successfully' })
  message: string;
}
