import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({
    example: 'WH-001-UPDATED',
    description: 'Updated warehouse code',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    example: 'Updated Main Warehouse',
    description: 'Updated warehouse name',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: '456 New Street, District 2, Ho Chi Minh City',
    description: 'Updated warehouse address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: {
      totalArea: '6000 sqm',
      type: 'Cold Storage',
      manager: 'Jane Smith',
      phone: '+84-987-654-321',
    },
    description: 'Updated warehouse metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
