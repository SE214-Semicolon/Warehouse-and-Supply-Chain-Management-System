import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitPurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Ghi chú khi submit' })
  @IsOptional()
  @IsString()
  notes?: string;
}
