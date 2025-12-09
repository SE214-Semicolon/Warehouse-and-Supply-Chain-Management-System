import { IsString, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ForecastAlgorithm {
  SIMPLE_MOVING_AVERAGE = 'SIMPLE_MOVING_AVERAGE',
}

export class RunAlgorithmDto {
  @ApiProperty({
    description: 'Forecasting algorithm to use',
    enum: ForecastAlgorithm,
    example: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
  })
  @IsEnum(ForecastAlgorithm)
  algorithm: ForecastAlgorithm;

  @ApiProperty({
    description: 'Number of historical days to analyze (7-365)',
    example: 30,
    minimum: 7,
    maximum: 365,
  })
  @IsInt()
  @Min(7)
  @Max(365)
  windowDays: number;

  @ApiProperty({
    description: 'Number of days to forecast into the future (1-90)',
    example: 30,
    minimum: 1,
    maximum: 90,
  })
  @IsInt()
  @Min(1)
  @Max(90)
  forecastDays: number;

  @ApiPropertyOptional({
    description: 'Starting date for forecast (defaults to tomorrow)',
    example: '2025-12-10',
  })
  @IsString()
  @IsOptional()
  startDate?: string;
}
