import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class ReserveInventoryDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ example: 'loc-uuid', description: 'Location ID' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 10, description: 'Quantity to reserve' })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'order-uuid', description: 'Order ID that requires the reservation' })
  @IsString()
  orderId!: string;

  @ApiProperty({
    example: 'user-uuid',
    description: 'User who created the reservation',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiProperty({ example: 'reserve-123', description: 'Idempotency key for request deduplication' })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({ example: 'Reserving stock for order #12345', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
