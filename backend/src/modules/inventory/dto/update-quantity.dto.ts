import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateQuantityDto {
  @ApiProperty({ example: 100, description: 'New available quantity' })
  @IsInt()
  @IsPositive()
  availableQty!: number;

  @ApiProperty({ example: 0, description: 'New reserved quantity', required: false })
  @IsInt()
  @IsOptional()
  reservedQty?: number;

  @ApiProperty({ example: 'user-uuid', description: 'User making the update' })
  @IsUUID()
  @IsOptional()
  updatedById?: string;

  @ApiProperty({ example: 'manual_count', description: 'Reason for update' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Physical count adjustment', description: 'Additional notes' })
  @IsString()
  @IsOptional()
  note?: string;
}