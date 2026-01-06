import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitSalesOrderDto {
  @ApiPropertyOptional({ description: 'Optional notes for submission' })
  @IsOptional()
  @IsString()
  notes?: string;
}
