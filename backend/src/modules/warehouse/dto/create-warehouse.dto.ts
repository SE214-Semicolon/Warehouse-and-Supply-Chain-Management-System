import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({
    example: 'WH-001',
    description: 'Unique warehouse code',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    example: 'Main Warehouse - District 1',
    description: 'Warehouse name',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: '123 Main Street, District 1, Ho Chi Minh City',
    description: 'Warehouse address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: {
      totalArea: '5000 sqm',
      type: 'Cold Storage',
      manager: 'John Doe',
      phone: '+84-123-456-789',
    },
    description: 'Additional warehouse metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
