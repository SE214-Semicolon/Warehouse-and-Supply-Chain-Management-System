import { IsEnum, IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '../schemas/alert.schema';

class RelatedEntityDto {
  @ApiProperty({
    example: 'Product',
    description: 'Entity type',
    enum: ['Product', 'Inventory', 'PurchaseOrder', 'SalesOrder'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'Product' | 'Inventory' | 'PurchaseOrder' | 'SalesOrder';

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Entity ID (UUID from PostgreSQL)',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class CreateAlertDto {
  @ApiProperty({
    example: AlertType.LOW_STOCK,
    description: 'Alert type',
    enum: AlertType,
  })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({
    example: AlertSeverity.WARNING,
    description: 'Alert severity',
    enum: AlertSeverity,
  })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({
    example: 'Product XYZ has low stock: 5 units remaining (threshold: 10)',
    description: 'Human-readable alert message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Related entity information',
    type: RelatedEntityDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RelatedEntityDto)
  relatedEntity?: RelatedEntityDto;
}
