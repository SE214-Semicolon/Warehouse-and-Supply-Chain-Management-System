import { IsUUID, IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdjustmentReason {
  DAMAGE = 'damage',
  EXPIRY = 'expiry',
  THEFT = 'theft',
  COUNT_ERROR = 'count_error',
  OTHER = 'other',
}

export class AdjustInventoryDto {
  @ApiProperty({ example: 'pb-uuid', description: 'Product batch ID' })
  @IsUUID()
  productBatchId: string;

  @ApiProperty({ example: 'loc-uuid', description: 'Location ID' })
  @IsUUID()
  locationId: string;

  @ApiProperty({
    example: 5,
    description: 'Adjustment quantity (positive for increase, negative for decrease)',
  })
  @IsInt()
  adjustmentQuantity: number;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'User who performed the adjustment' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({
    example: 'adjust-123',
    description: 'Idempotency key for duplicate prevention',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: 'count_error',
    description: 'Reason for adjustment',
    enum: AdjustmentReason,
  })
  @IsOptional()
  @IsEnum(AdjustmentReason)
  reason?: AdjustmentReason;

  @ApiPropertyOptional({
    example: 'Found 5 extra items during physical count',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
