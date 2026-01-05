import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsObject, MaxLength, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationDto {
  @ApiPropertyOptional({
    example: 'A-01-02',
    description: 'Updated location code',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({
    example: 'Aisle A, Rack 01, Level 02',
    description: 'Updated location name',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^(?!\s*$).+/, { message: 'Name cannot be empty or contain only whitespace' })
  name?: string;

  @ApiPropertyOptional({
    example: 150,
    description: 'Updated maximum capacity',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({
    example: 'bin',
    description: 'Updated location type',
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
      level: '02',
      temperature: '-20°C',
      hazardous: false,
    },
    description: 'Updated location properties',
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
