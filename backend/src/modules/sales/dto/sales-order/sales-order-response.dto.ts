import { ApiProperty } from '@nestjs/swagger';
import type { SalesOrder } from '@prisma/client';

export class SalesOrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: SalesOrder;

  @ApiProperty({ example: 'Sales order created successfully' })
  message: string;
}

export class SalesOrderListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [Object] })
  data: SalesOrder[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 'Sales orders retrieved successfully' })
  message: string;
}

export class SalesOrderDeleteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Sales order deleted successfully' })
  message: string;
}
