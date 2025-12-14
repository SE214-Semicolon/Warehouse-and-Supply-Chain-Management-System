import { IsString, IsDateString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateForecastDto {
  @ApiProperty({
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Forecast date (ISO 8601 format)',
    example: '2025-12-15',
  })
  @IsDateString()
  forecastDate: string;

  @ApiProperty({
    description: 'Forecasted quantity (must be positive)',
    example: 150,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  forecastedQuantity: number;

  @ApiPropertyOptional({
    description: 'Algorithm used for forecast',
    example: 'SIMPLE_MOVING_AVERAGE',
    default: 'SIMPLE_MOVING_AVERAGE',
  })
  @IsString()
  @IsOptional()
  algorithmUsed?: string;
}
