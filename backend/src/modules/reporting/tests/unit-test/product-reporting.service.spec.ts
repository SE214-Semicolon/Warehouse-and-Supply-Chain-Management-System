import { Test, TestingModule } from '@nestjs/testing';
import { ProductReportingService } from '../../services/product-reporting.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CacheService } from '../../../../cache/cache.service';

describe('ProductReportingService', () => {
  let service: ProductReportingService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _cacheService: jest.Mocked<CacheService>;

  const mockPrismaService = {
    stockMovement: {
      groupBy: jest.fn(),
    },
    productBatch: {
      findUnique: jest.fn(),
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
        ProductReportingService,
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

    service = module.get<ProductReportingService>(ProductReportingService);
    _prismaService = module.get(PrismaService);
    _cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductPerformanceReport', () => {
    const mockQuery = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      page: 1,
      limit: 20,
      sortBy: 'turnoverRate' as const,
      sortOrder: 'desc' as const,
    };

    const mockAggregations = [
      {
        productBatchId: 'batch-1',
        _count: { id: 10 },
        _sum: { quantity: 500 },
      },
    ];

    const mockProductBatch = {
      id: 'batch-1',
      batchNumber: 'BATCH-001',
      productId: 'product-1',
      product: {
        id: 'product-1',
        name: 'Test Product 1',
        sku: 'SKU-001',
        categoryId: 'category-1',
        category: {
          id: 'category-1',
          name: 'Electronics',
        },
      },
    };

    it('should calculate turnover rate and movement frequency correctly', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.stockMovement.groupBy.mockResolvedValue(mockAggregations);
      mockPrismaService.productBatch.findUnique.mockResolvedValue(mockProductBatch as any);

      const result = await service.getProductPerformanceReport(mockQuery);

      const startDate = new Date(mockQuery.startDate);
      const endDate = new Date(mockQuery.endDate);
      const daysInPeriod = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(result.success).toBe(true);
      expect(result.performanceData).toHaveLength(1);
      expect(result.performanceData[0]).toMatchObject({
        productId: 'product-1',
        productName: 'Test Product 1',
        productSku: 'SKU-001',
        categoryName: 'Electronics',
        totalMovements: 10,
        totalQuantity: 500,
      });
      expect(result.performanceData[0].turnoverRate).toBeCloseTo(500 / daysInPeriod, 2);
      expect(result.performanceData[0].movementFrequency).toBeCloseTo(10 / daysInPeriod, 2);
    });

    it('should filter out entries with null productBatchId', async () => {
      const aggregationsWithNull = [
        ...mockAggregations,
        {
          productBatchId: null,
          _count: { id: 3 },
          _sum: { quantity: 100 },
        },
      ];

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.stockMovement.groupBy.mockResolvedValue(aggregationsWithNull);
      mockPrismaService.productBatch.findUnique.mockResolvedValue(mockProductBatch as any);

      const result = await service.getProductPerformanceReport(mockQuery);

      expect(result.performanceData).toHaveLength(1);
      expect(result.performanceData.every((item) => item.productId)).toBe(true);
    });

    it('should handle empty aggregation results', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.stockMovement.groupBy.mockResolvedValue([]);

      const result = await service.getProductPerformanceReport(mockQuery);

      expect(result.performanceData).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle products without category', async () => {
      const batchWithoutCategory = {
        ...mockProductBatch,
        product: {
          ...mockProductBatch.product,
          categoryId: null,
          category: null,
        },
      };

      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.stockMovement.groupBy.mockResolvedValue(mockAggregations);
      mockPrismaService.productBatch.findUnique.mockResolvedValue(batchWithoutCategory as any);

      const result = await service.getProductPerformanceReport(mockQuery);

      expect(result.performanceData[0].categoryName).toBe('Uncategorized');
    });
  });
});
