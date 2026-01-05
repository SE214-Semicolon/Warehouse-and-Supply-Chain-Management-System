import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Name of the product category',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^(?!\s*$).+/, { message: 'Name cannot be empty or contain only whitespace' })
  name: string;

  @ApiPropertyOptional({
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
    description: 'Parent category ID for creating a sub-category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
