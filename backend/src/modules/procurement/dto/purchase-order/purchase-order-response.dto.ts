import { ApiProperty } from '@nestjs/swagger';
import type { PurchaseOrder } from '@prisma/client';

export class PurchaseOrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: PurchaseOrder;

  @ApiProperty({ example: 'Purchase order created successfully' })
  message: string;
}

export class PurchaseOrderListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [Object] })
  data: PurchaseOrder[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 'Purchase orders retrieved successfully' })
  message: string;
}

export class PurchaseOrderDeleteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Purchase order deleted successfully' })
  message: string;
}
