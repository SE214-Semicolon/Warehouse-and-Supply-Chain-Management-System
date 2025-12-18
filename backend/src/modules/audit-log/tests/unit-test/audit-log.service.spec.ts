import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
import { QueryAuditLogDto } from '../../dto/query-audit-log.dto';

describe('AuditLogService - Unit Tests', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;

  const mockAuditEntry = {
    timestamp: new Date('2025-12-06T10:00:00Z'),
    correlationId: 'test-corr-123',
    entityType: 'Product',
    entityId: 'product-uuid-123',
    action: 'CREATE',
    userId: 'user-uuid-456',
    userEmail: 'admin@test.com',
    ipAddress: '192.168.1.100',
    method: 'POST',
    path: '/api/products',
    before: null,
    after: { sku: 'SKU-001', name: 'Test Product' },
    metadata: { operation: 'create' },
  };

  beforeEach(async () => {
    const mockRepository = {
      insert: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(AuditLogRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('write', () => {
    // AUDIT-UNIT-01: Successfully write audit log
    it('should write audit log entry successfully', async () => {
      repository.insert.mockResolvedValue(undefined);

      await service.write(mockAuditEntry);

      expect(repository.insert).toHaveBeenCalledTimes(1);
      expect(repository.insert).toHaveBeenCalledWith(mockAuditEntry);
    });

    // AUDIT-UNIT-02: Should not throw error when write fails
    it('should not throw error when repository insert fails', async () => {
      const error = new Error('MongoDB connection failed');
      repository.insert.mockRejectedValue(error);

      // Should NOT throw - audit logging failure should not break business logic
      await expect(service.write(mockAuditEntry)).resolves.toBeUndefined();

      expect(repository.insert).toHaveBeenCalledTimes(1);
    });

    // AUDIT-UNIT-03: Should handle null/undefined entry gracefully
    it('should handle null entry gracefully', async () => {
      repository.insert.mockResolvedValue(undefined);

      await service.write(null as any);

      expect(repository.insert).toHaveBeenCalledWith(null);
    });

    // AUDIT-UNIT-04: Should write entry with minimal fields
    it('should write audit log with minimal required fields', async () => {
      const minimalEntry = {
        timestamp: new Date(),
        entityType: 'Inventory',
        entityId: 'inv-123',
        action: 'UPDATE',
      };

      repository.insert.mockResolvedValue(undefined);

      await service.write(minimalEntry as any);

      expect(repository.insert).toHaveBeenCalledWith(minimalEntry);
    });

    // AUDIT-UNIT-05: Should write entry with complete metadata
    it('should write audit log with complete metadata', async () => {
      const completeEntry = {
        ...mockAuditEntry,
        before: { sku: 'OLD-SKU', name: 'Old Name' },
        metadata: {
          operation: 'update',
          args: { where: { id: 'product-uuid-123' }, data: { name: 'New Name' } },
          reason: 'Correcting product information',
        },
      };

      repository.insert.mockResolvedValue(undefined);

      await service.write(completeEntry);

      expect(repository.insert).toHaveBeenCalledWith(completeEntry);
    });
  });

  describe('query', () => {
    const mockQueryResult = {
      page: 1,
      limit: 50,
      total: 100,
      results: [
        {
          _id: '507f1f77bcf86cd799439011',
          ...mockAuditEntry,
        },
      ],
    };

    // AUDIT-UNIT-06: Successfully query audit logs
    it('should query audit logs with filters', async () => {
      const queryDto: QueryAuditLogDto = {
        entityType: 'Product',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledTimes(1);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-07: Query with entityId filter
    it('should query audit logs for specific entity', async () => {
      const queryDto: QueryAuditLogDto = {
        entityType: 'Product',
        entityId: 'product-uuid-123',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-08: Query with action filter
    it('should query audit logs by action type', async () => {
      const queryDto: QueryAuditLogDto = {
        action: 'CREATE',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-09: Query with userId filter
    it('should query audit logs by user', async () => {
      const queryDto: QueryAuditLogDto = {
        userId: 'user-uuid-456',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-10: Query with date range
    it('should query audit logs with date range', async () => {
      const queryDto: QueryAuditLogDto = {
        startDate: new Date('2025-12-01T00:00:00Z'),
        endDate: new Date('2025-12-31T23:59:59Z'),
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-11: Query with search parameter
    it('should query audit logs with search text', async () => {
      const queryDto: QueryAuditLogDto = {
        search: 'SKU-001',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(result).toEqual(mockQueryResult);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-12: Query with pagination
    it('should query audit logs with custom pagination', async () => {
      const queryDto: QueryAuditLogDto = {
        page: 2,
        limit: 20,
      };

      const expectedResult = {
        page: 2,
        limit: 20,
        total: 100,
        results: [],
      };

      repository.query.mockResolvedValue(expectedResult);

      const result = await service.query(queryDto);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(repository.query).toHaveBeenCalledWith(queryDto);
    });

    // AUDIT-UNIT-13: Query returns empty results
    it('should return empty results when no matches found', async () => {
      const queryDto: QueryAuditLogDto = {
        entityId: 'non-existent-id',
        page: 1,
        limit: 50,
      };

      const emptyResult = {
        page: 1,
        limit: 50,
        total: 0,
        results: [],
      };

      repository.query.mockResolvedValue(emptyResult);

      const result = await service.query(queryDto);

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    // AUDIT-UNIT-14: Query with all filters combined
    it('should query audit logs with multiple filters', async () => {
      const queryDto: QueryAuditLogDto = {
        entityType: 'Product',
        entityId: 'product-uuid-123',
        action: 'UPDATE',
        userId: 'user-uuid-456',
        startDate: new Date('2025-12-01T00:00:00Z'),
        endDate: new Date('2025-12-31T23:59:59Z'),
        search: 'SKU',
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.query(queryDto);

      expect(repository.query).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(mockQueryResult);
    });

    // AUDIT-UNIT-15: Should handle repository query failure
    it('should propagate error when repository query fails', async () => {
      const queryDto: QueryAuditLogDto = {
        page: 1,
        limit: 50,
      };

      const error = new Error('MongoDB query failed');
      repository.query.mockRejectedValue(error);

      // Query failures SHOULD propagate (unlike write failures)
      await expect(service.query(queryDto)).rejects.toThrow('MongoDB query failed');
    });
  });

  // NEW: Test audit logging for expanded entities
  describe('Expanded Entity Support (PO, SO, Shipment)', () => {
    it('should log PurchaseOrder creation', async () => {
      const poAuditEntry = {
        ...mockAuditEntry,
        entityType: 'PurchaseOrder',
        entityId: 'po-uuid-001',
        path: '/api/procurement/purchase-orders',
        after: { poNo: 'PO-2025-001', status: 'draft', supplierId: 'supplier-uuid' },
      };

      repository.insert.mockResolvedValue(undefined);

      await service.write(poAuditEntry);

      expect(repository.insert).toHaveBeenCalledWith(poAuditEntry);
    });

    it('should log SalesOrder updates', async () => {
      const soAuditEntry = {
        ...mockAuditEntry,
        entityType: 'SalesOrder',
        entityId: 'so-uuid-001',
        action: 'UPDATE',
        path: '/api/sales/sales-orders/so-uuid-001',
        before: { status: 'draft' },
        after: { status: 'submitted' },
      };

      repository.insert.mockResolvedValue(undefined);

      await service.write(soAuditEntry);

      expect(repository.insert).toHaveBeenCalledWith(soAuditEntry);
    });

    it('should log Shipment status changes', async () => {
      const shipmentAuditEntry = {
        ...mockAuditEntry,
        entityType: 'Shipment',
        entityId: 'shipment-uuid-001',
        action: 'UPDATE',
        path: '/api/shipments/shipment-uuid-001',
        before: { status: 'pending' },
        after: { status: 'in_transit', trackingNumber: 'TRACK-001' },
      };

      repository.insert.mockResolvedValue(undefined);

      await service.write(shipmentAuditEntry);

      expect(repository.insert).toHaveBeenCalledWith(shipmentAuditEntry);
    });

    it('should query audit logs for PurchaseOrder entity', async () => {
      const poLogs = {
        results: [
          {
            ...mockAuditEntry,
            entityType: 'PurchaseOrder',
            entityId: 'po-uuid-001',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      };

      repository.query.mockResolvedValue(poLogs);

      const result = await service.query({ entityType: 'PurchaseOrder', page: 1, limit: 50 });

      expect(result).toEqual(poLogs);
      expect(repository.query).toHaveBeenCalledWith({
        entityType: 'PurchaseOrder',
        page: 1,
        limit: 50,
      });
    });
  });
});
