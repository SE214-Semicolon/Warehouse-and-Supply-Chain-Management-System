import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, IsOptional, IsInt, IsObject, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @ApiProperty({
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
    description: 'Warehouse ID where this location belongs',
  })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({
    example: 'A-01-01',
    description: 'Location code (unique within warehouse)',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({
    example: 'Aisle A, Rack 01, Level 01',
    description: 'Location name/description',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum capacity of this location (number of items/pallets)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({
    example: 'shelf',
    description: 'Location type: shelf, rack, bin, zone, floor, etc.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({
    example: {
      aisle: 'A',
      rack: '01',
      level: '01',
      temperature: '-18°C',
      hazardous: false,
    },
    description: 'Additional location properties',
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
