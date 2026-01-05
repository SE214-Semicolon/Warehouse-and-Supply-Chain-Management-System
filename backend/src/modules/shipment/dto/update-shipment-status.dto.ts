import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateShipmentStatusDto {
  @ApiProperty({
    description: 'New shipment status',
    enum: ShipmentStatus,
    example: ShipmentStatus.in_transit,
  })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Status update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
