import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogEntryDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the audit log entry',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Timestamp when the action occurred',
    example: '2025-12-06T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Correlation ID for tracing requests',
    example: 'req-123-abc-456',
  })
  correlationId?: string;

  @ApiProperty({
    description: 'Type of entity being audited',
    example: 'Product',
    enum: [
      'Product',
      'ProductBatch',
      'ProductCategory',
      'Inventory',
      'Warehouse',
      'Location',
      'StockMovement',
    ],
  })
  entityType: string;

  @ApiProperty({
    description: 'UUID of the entity being audited',
    example: 'a2a7d3e8-9a6c-4b5d-9a1e-7a9b4a3c2b1d',
  })
  entityId: string;

  @ApiProperty({
    description: 'Action performed on the entity',
    example: 'CREATE',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
  })
  action: string;

  @ApiPropertyOptional({
    description: 'UUID of the user who performed the action',
    example: 'b3b8e4f9-0a7d-4c6e-0b2f-8a0c5b4d3c2e',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Email of the user who performed the action',
    example: 'admin@example.com',
  })
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'IP address of the client',
    example: '192.168.1.100',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'HTTP method of the request',
    example: 'POST',
  })
  method?: string;

  @ApiPropertyOptional({
    description: 'API endpoint path',
    example: '/api/products',
  })
  path?: string;

  @ApiPropertyOptional({
    description: 'Entity state before the change (for UPDATE/DELETE)',
    example: { sku: 'OLD-SKU', name: 'Old Product Name' },
  })
  before?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Entity state after the change (for CREATE/UPDATE)',
    example: { sku: 'NEW-SKU', name: 'New Product Name' },
  })
  after?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Additional metadata about the operation',
    example: { operation: 'create', args: {} },
  })
  metadata?: Record<string, any>;
}

export class AuditLogListResponseDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of audit log entries matching the query',
    example: 1234,
  })
  total: number;

  @ApiProperty({
    description: 'Array of audit log entries',
    type: [AuditLogEntryDto],
  })
  results: AuditLogEntryDto[];
}
