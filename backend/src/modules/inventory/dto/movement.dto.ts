import { ApiProperty } from '@nestjs/swagger';

export class MovementDto {
  @ApiProperty({ example: 'move-uuid' })
  id!: string;

  @ApiProperty({ example: 'transfer' })
  movementType!: string;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({ example: 'loc-uuid', required: false })
  toLocationId?: string | null;

  @ApiProperty({ example: 'loc-uuid', required: false })
  fromLocationId?: string | null;

  @ApiProperty({ example: { id: 'loc-uuid', code: 'A-01', name: 'Zone A' }, required: false })
  toLocation?: Record<string, any> | null;

  @ApiProperty({ example: { id: 'loc-uuid', code: 'B-01', name: 'Zone B' }, required: false })
  fromLocation?: Record<string, any> | null;

  @ApiProperty({ example: 'user-uuid', required: false })
  createdById?: string | null;

  @ApiProperty({ example: 'transfer-group-uuid', required: false })
  transferGroupId?: string | null;

  @ApiProperty({ example: '2025-10-06T00:00:00.000Z' })
  createdAt!: Date | string;
}
