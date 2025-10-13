import { IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferInventoryDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID' })
  @IsUUID()
  productBatchId: string;

  @ApiProperty({ example: 'from-loc-uuid', description: 'Source location ID' })
  @IsUUID()
  fromLocationId: string;

  @ApiProperty({ example: 'to-loc-uuid', description: 'Destination location ID' })
  @IsUUID()
  toLocationId: string;

  @ApiProperty({ example: 10, description: 'Quantity to transfer' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'User who performed the transfer' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({
    example: 'transfer-123',
    description: 'Idempotency key for duplicate prevention',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: 'Moving stock to different warehouse section',
    description: 'Transfer notes',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
