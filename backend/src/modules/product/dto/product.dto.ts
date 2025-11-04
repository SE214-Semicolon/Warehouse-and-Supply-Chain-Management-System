import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { BaseProductDto } from './base-product.dto';

export class CreateProductDto extends BaseProductDto {
  @ApiProperty({ description: 'Initial stock quantity' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialStock?: number;
}

export class UpdateProductDto extends PartialType(OmitType(BaseProductDto, [] as const)) {}
