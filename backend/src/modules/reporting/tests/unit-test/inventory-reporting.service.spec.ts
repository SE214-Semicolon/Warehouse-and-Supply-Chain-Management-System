import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReportingService } from '../../services/inventory-reporting.service';
import { InventoryService } from '../../../inventory/services/inventory.service';
import { CacheService } from '../../../../cache/cache.service';

describe('InventoryReportingService', () => {
  let service: InventoryReportingService;
  let inventoryService: jest.Mocked<InventoryService>;
  let _cacheService: jest.Mocked<CacheService>;

  const mockInventoryService = {
    getLowStockAlerts: jest.fn(),
    getExpiryAlerts: jest.fn(),
    getStockLevelReport: jest.fn(),
    getMovementReport: jest.fn(),
    getValuationReport: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReportingService,
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<InventoryReportingService>(InventoryReportingService);
    inventoryService = module.get(InventoryService);
    _cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLowStockReport', () => {
    const mockQuery = {
      warehouseId: 'warehouse-1',
      locationId: 'location-1',
      threshold: 10,
      page: 1,
      limit: 20,
    };

    const mockResult = {
      data: [
        {
          id: 'inventory-1',
          productBatchId: 'batch-1',
          locationId: 'location-1',
          quantity: 5,
          reorderPoint: 10,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return cached data if available', async () => {
      mockCacheService.getOrSet.mockImplementation(async (_key, _factory) => mockResult);

      const result = await service.getLowStockReport(mockQuery);

      expect(mockCacheService.getOrSet).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should fetch from InventoryService and cache if not cached', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getLowStockAlerts.mockResolvedValue(mockResult);

      const result = await service.getLowStockReport(mockQuery);

      expect(mockCacheService.getOrSet).toHaveBeenCalled();
      expect(inventoryService.getLowStockAlerts).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty warehouseId', async () => {
      const queryWithoutWarehouse = { ...mockQuery, warehouseId: undefined };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getLowStockAlerts.mockResolvedValue(mockResult);

      await service.getLowStockReport(queryWithoutWarehouse);

      expect(inventoryService.getLowStockAlerts).toHaveBeenCalledWith(queryWithoutWarehouse);
    });
  });

  describe('getExpiryReport', () => {
    const mockQuery = {
      warehouseId: 'warehouse-1',
      locationId: 'location-1',
      daysAhead: 30,
      page: 1,
      limit: 20,
    };

    const mockResult = {
      data: [
        {
          id: 'inventory-1',
          productBatchId: 'batch-1',
          locationId: 'location-1',
          quantity: 100,
          expiryDate: new Date('2025-01-09'),
          daysUntilExpiry: 30,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should fetch expiry alerts and cache result', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getExpiryAlerts.mockResolvedValue(mockResult);

      const result = await service.getExpiryReport(mockQuery);

      expect(inventoryService.getExpiryAlerts).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getStockLevelReport', () => {
    const mockQuery = {
      warehouseId: 'warehouse-1',
      groupBy: 'product' as const,
      page: 1,
      limit: 20,
    };

    const mockResult = {
      data: [
        {
          productId: 'product-1',
          productName: 'Test Product',
          totalQuantity: 500,
          locations: 3,
          warehouses: 2,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should fetch and cache stock level report', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getStockLevelReport.mockResolvedValue(mockResult);

      const result = await service.getStockLevelReport(mockQuery);

      expect(inventoryService.getStockLevelReport).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockResult);
    });

    it('should support location grouping', async () => {
      const locationQuery = { ...mockQuery, groupBy: 'location' as const };
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getStockLevelReport.mockResolvedValue(mockResult);

      await service.getStockLevelReport(locationQuery);

      expect(inventoryService.getStockLevelReport).toHaveBeenCalledWith(locationQuery);
    });
  });

  describe('getMovementReport', () => {
    const mockQuery = {
      warehouseId: 'warehouse-1',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      movementType: 'receipt' as const,
      page: 1,
      limit: 20,
    };

    const mockResult = {
      data: [
        {
          id: 'movement-1',
          type: 'receipt',
          productBatchId: 'batch-1',
          quantity: 100,
          fromLocationId: null,
          toLocationId: 'location-1',
          createdAt: new Date('2025-01-15'),
        },
      ],
      summary: {
        totalMovements: 50,
        totalQuantity: 5000,
        byType: {
          receipt: 20,
          issue: 15,
          transfer: 10,
          adjustment: 5,
        },
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    };

    it('should fetch and cache movement report', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getMovementReport.mockResolvedValue(mockResult);

      const result = await service.getMovementReport(mockQuery);

      expect(inventoryService.getMovementReport).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockResult);
    });

    it('should handle different movement types', async () => {
      const issueQuery = { ...mockQuery, movementType: 'issue' as const };
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getMovementReport.mockResolvedValue(mockResult);

      await service.getMovementReport(issueQuery);

      expect(inventoryService.getMovementReport).toHaveBeenCalledWith(issueQuery);
    });
  });

  describe('getValuationReport', () => {
    const mockQuery = {
      warehouseId: 'warehouse-1',
      locationId: 'location-1',
      page: 1,
      limit: 20,
    };

    const mockResult = {
      data: [
        {
          productBatchId: 'batch-1',
          productName: 'Test Product',
          quantity: 100,
          unitPrice: 50.0,
          totalValue: 5000.0,
          locationId: 'location-1',
          warehouseId: 'warehouse-1',
        },
      ],
      summary: {
        totalItems: 150,
        totalValue: 75000.0,
        averageUnitPrice: 500.0,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
      },
    };

    it('should fetch and cache valuation report', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getValuationReport.mockResolvedValue(mockResult);

      const result = await service.getValuationReport(mockQuery);

      expect(inventoryService.getValuationReport).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockResult);
    });

    it('should handle query without locationId', async () => {
      const queryWithoutLocation = { ...mockQuery, locationId: undefined };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getValuationReport.mockResolvedValue(mockResult);

      await service.getValuationReport(queryWithoutLocation);

      expect(inventoryService.getValuationReport).toHaveBeenCalledWith(queryWithoutLocation);
    });
  });

  describe('Cache key generation', () => {
    it('should generate unique cache keys for different queries', async () => {
      const query1 = { threshold: 10, page: 1, limit: 20 };
      const query2 = { threshold: 20, page: 1, limit: 20 };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockInventoryService.getLowStockAlerts.mockResolvedValue({ data: [], pagination: {} } as any);

      await service.getLowStockReport(query1);
      await service.getLowStockReport(query2);

      const calls = mockCacheService.getOrSet.mock.calls;
      expect(calls[0][0]).not.toEqual(calls[1][0]);
    });
  });
});
