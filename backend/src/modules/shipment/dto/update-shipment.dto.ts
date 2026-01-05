import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateShipmentDto {
  @ApiPropertyOptional({ description: 'Carrier/Shipping company name', example: 'FedEx' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ description: 'Tracking code', example: 'FDX987654321' })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2025-12-25T15:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
