import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by entity type (e.g., Product, Inventory)' })
  entityType?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by specific entity id (UUID)' })
  entityId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by action type: CREATE | UPDATE | DELETE' })
  action?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter by user id who performed action' })
  userId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({ description: 'Start date (ISO string)', type: String })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({ description: 'End date (ISO string)', type: String })
  endDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number (min 1)', default: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @ApiPropertyOptional({ description: 'Page size (1-200)', default: 50 })
  limit?: number = 50;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Case-insensitive regex search across before/after/metadata/path',
  })
  search?: string;
}
