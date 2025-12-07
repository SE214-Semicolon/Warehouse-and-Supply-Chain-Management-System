import { ApiProperty } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '../schemas/alert.schema';

class RelatedEntityResponseDto {
  @ApiProperty({ example: 'Product', description: 'Entity type' })
  type: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Entity ID' })
  id: string;
}

export class AlertResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Alert ID (MongoDB ObjectId)',
  })
  id: string;

  @ApiProperty({
    example: AlertType.LOW_STOCK,
    description: 'Alert type',
    enum: AlertType,
  })
  type: AlertType;

  @ApiProperty({
    example: AlertSeverity.WARNING,
    description: 'Alert severity',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @ApiProperty({
    example: 'Product XYZ has low stock: 5 units remaining (threshold: 10)',
    description: 'Human-readable alert message',
  })
  message: string;

  @ApiProperty({
    example: false,
    description: 'Whether the alert has been acknowledged',
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Related entity information',
    type: RelatedEntityResponseDto,
    required: false,
  })
  relatedEntity?: RelatedEntityResponseDto;

  @ApiProperty({
    example: '2025-12-07T10:00:00.000Z',
    description: 'Alert creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-12-07T10:00:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class AlertListResponseDto {
  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    description: 'List of alerts',
    type: [AlertResponseDto],
  })
  alerts: AlertResponseDto[];

  @ApiProperty({ example: 100, description: 'Total number of alerts' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}

export class AlertSingleResponseDto {
  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({ description: 'Alert data', type: AlertResponseDto })
  alert: AlertResponseDto;

  @ApiProperty({
    example: 'Alert created successfully',
    description: 'Response message',
    required: false,
  })
  message?: string;
}

export class AlertDeleteResponseDto {
  @ApiProperty({ example: true, description: 'Delete success status' })
  success: boolean;

  @ApiProperty({ example: 'Alert deleted successfully', description: 'Response message' })
  message: string;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({ example: 15, description: 'Number of unread alerts' })
  unreadCount: number;
}
