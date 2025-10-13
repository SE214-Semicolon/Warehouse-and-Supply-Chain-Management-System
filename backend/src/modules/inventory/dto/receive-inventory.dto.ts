import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';

export class ReceiveInventoryDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID' })
  @IsUUID()
  productBatchId!: string;

  @ApiProperty({ example: 'loc-uuid', description: 'Location ID' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 10, description: 'Quantity to receive' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    example: 'user-uuid',
    description: 'User who created the receipt',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiProperty({
    example: 'receive-123',
    description: 'Idempotency key for request deduplication',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
