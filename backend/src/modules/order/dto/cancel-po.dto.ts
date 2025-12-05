import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CancelPurchaseOrderDto {
  @ApiProperty({ description: 'User ID who is cancelling the PO' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Reason for cancellation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
