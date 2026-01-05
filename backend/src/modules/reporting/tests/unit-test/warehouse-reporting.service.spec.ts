import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseReportingService } from '../../services/warehouse-reporting.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CacheService } from '../../../../cache/cache.service';

describe('WarehouseReportingService', () => {
  let service: WarehouseReportingService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _cacheService: jest.Mocked<CacheService>;

  const mockPrismaService = {
    warehouse: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    location: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    inventory: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseReportingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<WarehouseReportingService>(WarehouseReportingService);
    _prismaService = module.get(PrismaService);
    _cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWarehouseUtilizationReport', () => {
    const mockQuery = {
      page: 1,
      limit: 20,
    };

    const mockWarehouses = [
      {
        id: 'warehouse-1',
        name: 'Main Warehouse',
        code: 'WH-001',
        address: '123 Main St',
        locations: [
          {
            id: 'loc-1',
            capacity: 5000,
            inventory: [
              { availableQty: 2000, reservedQty: 500 },
              { availableQty: 1000, reservedQty: 0 },
            ],
          },
          {
            id: 'loc-2',
            capacity: 5000,
            inventory: [{ availableQty: 1500, reservedQty: 500 }],
          },
        ],
      },
    ];

    it('should calculate utilization and occupancy rates correctly', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.warehouse.findMany.mockResolvedValue(mockWarehouses as any);
      mockPrismaService.warehouse.count.mockResolvedValue(1);

      const result = await service.getWarehouseUtilizationReport(mockQuery);

      expect(result.success).toBe(true);
      expect(result.utilizationData[0]).toMatchObject({
        warehouseId: 'warehouse-1',
        warehouseName: 'Main Warehouse',
        warehouseCode: 'WH-001',
        totalCapacity: 10000,
        usedCapacity: 5500,
        availableCapacity: 4500,
        utilizationRate: 55,
        locationCount: 2,
        occupiedLocationCount: 2,
        occupancyRate: 100,
      });
    });

    it('should handle warehouse with empty locations', async () => {
      const emptyWarehouse = {
        id: 'warehouse-2',
        name: 'Empty Warehouse',
        code: 'WH-002',
        address: '456 Empty St',
        locations: [{ id: 'loc-3', capacity: 5000, inventory: [] }],
      };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.warehouse.findMany.mockResolvedValue([emptyWarehouse] as any);
      mockPrismaService.warehouse.count.mockResolvedValue(1);

      const result = await service.getWarehouseUtilizationReport(mockQuery);

      expect(result.utilizationData[0]).toMatchObject({
        totalCapacity: 5000,
        usedCapacity: 0,
        availableCapacity: 5000,
        utilizationRate: 0,
        occupiedLocationCount: 0,
        occupancyRate: 0,
      });
    });

    it('should handle null capacity in locations', async () => {
      const nullCapacityWarehouse = {
        id: 'warehouse-3',
        name: 'Null Warehouse',
        code: 'WH-003',
        address: '789 Null St',
        locations: [
          { id: 'loc-4', capacity: null, inventory: [{ availableQty: 100, reservedQty: 0 }] },
        ],
      };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.warehouse.findMany.mockResolvedValue([nullCapacityWarehouse] as any);
      mockPrismaService.warehouse.count.mockResolvedValue(1);

      const result = await service.getWarehouseUtilizationReport(mockQuery);

      expect(result.utilizationData[0]).toMatchObject({
        totalCapacity: 0,
        usedCapacity: 100,
        utilizationRate: 0,
      });
    });

    it('should handle empty warehouse list', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.warehouse.findMany.mockResolvedValue([]);
      mockPrismaService.warehouse.count.mockResolvedValue(0);

      const result = await service.getWarehouseUtilizationReport(mockQuery);

      expect(result.utilizationData).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });
});
