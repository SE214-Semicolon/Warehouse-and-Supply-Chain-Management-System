import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AddTrackingEventDto {
  @ApiProperty({ description: 'Event timestamp', example: '2025-12-15T08:30:00Z' })
  @IsDateString()
  eventTime: string;

  @ApiPropertyOptional({ description: 'Event location', example: 'Ho Chi Minh City, Vietnam' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Status description', example: 'Package received at facility' })
  @IsString()
  @IsNotEmpty()
  statusText: string;

  @ApiPropertyOptional({
    description: 'Raw payload from carrier API',
    example: { eventCode: 'RCV', facilityId: 'HCM001' },
  })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, any>;
}
