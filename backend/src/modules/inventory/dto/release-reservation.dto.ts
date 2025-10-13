import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ReleaseReservationDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ example: 'loc-uuid', description: 'Location ID' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 'order-uuid', description: 'Order ID to release reservation for' })
  @IsString()
  orderId!: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity to release (optional, releases all if not specified)',
  })
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    example: 'user-uuid',
    description: 'User who released the reservation',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiProperty({ example: 'release-123', description: 'Idempotency key for request deduplication' })
  @IsString()
  idempotencyKey!: string;

  @ApiProperty({ example: 'Order cancelled, releasing reserved stock', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
