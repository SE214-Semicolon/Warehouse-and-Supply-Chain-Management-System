import { Test, TestingModule } from '@nestjs/testing';
import { DemandPlanningReportingService } from '../../services/demand-planning-reporting.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CacheService } from '../../../../cache/cache.service';

describe('DemandPlanningReportingService', () => {
  let service: DemandPlanningReportingService;
  let _prismaService: jest.Mocked<PrismaService>;
  let _cacheService: jest.Mocked<CacheService>;

  const mockPrismaService = {
    demandForecast: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    stockMovement: {
      aggregate: jest.fn(),
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
        DemandPlanningReportingService,
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

    service = module.get<DemandPlanningReportingService>(DemandPlanningReportingService);
    _prismaService = module.get(PrismaService);
    _cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDemandForecastAccuracyReport', () => {
    const mockQuery = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      productId: 'product-1',
      method: 'moving_average' as const,
      page: 1,
      limit: 20,
    };

    const mockForecasts = [
      {
        id: 'forecast-1',
        productId: 'product-1',
        forecastDate: new Date('2025-01-15'),
        forecastedQuantity: 100,
        method: 'moving_average',
        product: {
          id: 'product-1',
          name: 'Test Product 1',
          sku: 'SKU-001',
        },
      },
      {
        id: 'forecast-2',
        productId: 'product-1',
        forecastDate: new Date('2025-02-15'),
        forecastedQuantity: 150,
        method: 'moving_average',
        product: {
          id: 'product-1',
          name: 'Test Product 1',
          sku: 'SKU-001',
        },
      },
    ];

    it('should calculate MAE, MAPE, and accuracy correctly', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue(mockForecasts as any);
      mockPrismaService.demandForecast.count.mockResolvedValue(2);
      mockPrismaService.stockMovement.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 90 } }) // forecast-1: actual = 90, error = 10
        .mockResolvedValueOnce({ _sum: { quantity: 160 } }); // forecast-2: actual = 160, error = -10

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      expect(result.success).toBe(true);
      expect(result.accuracyData).toHaveLength(2);

      // Find each forecast in the results (order may vary)
      const forecast1 = result.accuracyData.find((d) => d.forecastId === 'forecast-1');
      const forecast2 = result.accuracyData.find((d) => d.forecastId === 'forecast-2');

      expect(forecast1).toBeDefined();
      expect(forecast1).toMatchObject({
        forecastId: 'forecast-1',
        productId: 'product-1',
        productName: 'Test Product 1',
        forecastedQuantity: 100,
        actualQuantity: 90,
        error: 10,
        absoluteError: 10,
      });
      expect(forecast1!.percentageError).toBeCloseTo(11.11, 1);
      expect(forecast1!.accuracy).toBeCloseTo(88.89, 1);

      expect(forecast2).toBeDefined();
      expect(forecast2).toMatchObject({
        forecastedQuantity: 150,
        actualQuantity: 160,
        error: -10,
        absoluteError: 10,
      });
      expect(forecast2!.percentageError).toBeCloseTo(6.25, 1);
      expect(forecast2!.accuracy).toBeCloseTo(93.75, 1);
    });

    it('should calculate summary statistics correctly', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue(mockForecasts as any);
      mockPrismaService.demandForecast.count.mockResolvedValue(2);
      mockPrismaService.stockMovement.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 90 } })
        .mockResolvedValueOnce({ _sum: { quantity: 160 } });

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      // Average MAE = (10 + 10) / 2 = 10
      expect(result.summaryStats.averageMAE).toBeCloseTo(10, 1);

      // Average MAPE = (11.11 + 6.25) / 2 = 8.68
      expect(result.summaryStats.averageMAPE).toBeCloseTo(8.68, 1);

      expect(result.summaryStats.totalForecasts).toBe(2);
    });

    it('should handle zero actual quantity', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue([mockForecasts[0]] as any);
      mockPrismaService.demandForecast.count.mockResolvedValue(1);
      mockPrismaService.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      expect(result.accuracyData[0]).toMatchObject({
        actualQuantity: 0,
        error: 100,
        absoluteError: 100,
        percentageError: 0,
        accuracy: 100,
      });
    });

    it('should handle null actual quantity from aggregation', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue([mockForecasts[0]] as any);
      mockPrismaService.demandForecast.count.mockResolvedValue(1);
      mockPrismaService.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: null } });

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      expect(result.accuracyData[0]).toMatchObject({
        actualQuantity: 0,
        error: 100,
        absoluteError: 100,
        percentageError: 0,
        accuracy: 100,
      });
    });

    it('should handle empty forecast list', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue([]);
      mockPrismaService.demandForecast.count.mockResolvedValue(0);

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      expect(result.accuracyData).toHaveLength(0);
      expect(result.summaryStats).toMatchObject({
        totalForecasts: 0,
        averageMAE: 0,
        averageMAPE: 0,
      });
    });

    it('should handle perfect forecast (100% accuracy)', async () => {
      mockCacheService.getOrSet.mockImplementation(async (key, factory) => factory());
      mockPrismaService.demandForecast.findMany.mockResolvedValue([mockForecasts[0]] as any);
      mockPrismaService.demandForecast.count.mockResolvedValue(1);
      mockPrismaService.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

      const result = await service.getDemandForecastAccuracyReport(mockQuery);

      expect(result.accuracyData[0]).toMatchObject({
        forecastedQuantity: 100,
        actualQuantity: 100,
        error: 0,
        absoluteError: 0,
        percentageError: 0,
        accuracy: 100,
      });

      expect(result.summaryStats).toMatchObject({
        averageMAE: 0,
        averageMAPE: 0,
      });
    });
  });
});
