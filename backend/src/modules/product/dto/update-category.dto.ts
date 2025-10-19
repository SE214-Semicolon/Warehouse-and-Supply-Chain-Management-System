import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Consumer Electronics',
    description: 'New name for the product category',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'b3b8d4f9-0a7e-5c6f-8b2a-8a9b4a3c2b1d',
    description: 'New parent category ID',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
