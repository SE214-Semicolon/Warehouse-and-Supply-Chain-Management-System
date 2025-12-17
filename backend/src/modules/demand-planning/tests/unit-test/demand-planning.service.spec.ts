import { Test, TestingModule } from '@nestjs/testing';
import { DemandPlanningService } from '../../services/demand-planning.service';
import { DemandPlanningRepository } from '../../repositories/demand-planning.repository';
import { CacheService } from '../../../../cache/cache.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ForecastAlgorithm } from '../../dto/run-algorithm.dto';

describe('DemandPlanningService', () => {
  let service: DemandPlanningService;
  let repository: jest.Mocked<DemandPlanningRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockProduct = {
    id: 'product-uuid-123',
    name: 'Test Product',
    sku: 'SKU-001',
  };

  const mockForecast = {
    id: 'forecast-cuid-123',
    productId: 'product-uuid-123',
    forecastDate: new Date('2025-12-15'),
    forecastedQuantity: 150,
    algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
    createdAt: new Date('2025-12-07T10:00:00Z'),
    updatedAt: new Date('2025-12-07T10:00:00Z'),
    product: mockProduct,
  };

  const mockMovements = [
    { quantity: 100, createdAt: new Date('2025-12-01') },
    { quantity: 150, createdAt: new Date('2025-12-02') },
    { quantity: 200, createdAt: new Date('2025-12-03') },
  ];

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findProduct: jest.fn(),
      getHistoricalMovements: jest.fn(),
      deleteByProductAndDateRange: jest.fn(),
    };

    const mockCache = {
      getOrSet: jest.fn(),
      deleteByPrefix: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandPlanningService,
        { provide: DemandPlanningRepository, useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<DemandPlanningService>(DemandPlanningService);
    repository = module.get(DemandPlanningRepository);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createForecast', () => {
    // DP-TC01: Create forecast with valid data
    it('should create forecast successfully with valid data', async () => {
      const dto = {
        productId: 'product-uuid-123',
        forecastDate: '2025-12-15',
        forecastedQuantity: 150,
        algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.create.mockResolvedValue(mockForecast);

      const result = await service.createForecast(dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockForecast);
      expect(repository.findProduct).toHaveBeenCalledWith(dto.productId);
      expect(repository.create).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // DP-TC02: Product not found
    it('should throw NotFoundException when product does not exist', async () => {
      const dto = {
        productId: 'invalid-product-id',
        forecastDate: '2025-12-15',
        forecastedQuantity: 150,
      };

      repository.findProduct.mockResolvedValue(null);

      await expect(service.createForecast(dto)).rejects.toThrow(NotFoundException);
      expect(repository.findProduct).toHaveBeenCalledWith(dto.productId);
      expect(repository.create).not.toHaveBeenCalled();
    });

    // DP-TC03: Duplicate forecast (unique constraint)
    it('should throw BadRequestException when forecast already exists', async () => {
      const dto = {
        productId: 'product-uuid-123',
        forecastDate: '2025-12-15',
        forecastedQuantity: 150,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.createForecast(dto)).rejects.toThrow(BadRequestException);
      expect(repository.findProduct).toHaveBeenCalled();
    });

    // DP-TC04: Create without algorithmUsed (default value)
    it('should use default algorithm when not specified', async () => {
      const dto = {
        productId: 'product-uuid-123',
        forecastDate: '2025-12-15',
        forecastedQuantity: 150,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.create.mockResolvedValue(mockForecast);

      await service.createForecast(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
        }),
      );
    });
  });

  describe('getForecastById', () => {
    // DP-TC05: Get forecast by valid ID
    it('should get forecast by ID successfully', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findById.mockResolvedValue(mockForecast);

      const result = await service.getForecastById('forecast-cuid-123');

      expect(result).toEqual(mockForecast);
      expect(repository.findById).toHaveBeenCalledWith('forecast-cuid-123');
    });

    // DP-TC06: Forecast not found
    it('should throw NotFoundException when forecast does not exist', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findById.mockResolvedValue(null);

      await expect(service.getForecastById('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // DP-TC07: Cache hit
    it('should return cached forecast when available', async () => {
      cacheService.getOrSet.mockResolvedValue(mockForecast);

      const result = await service.getForecastById('forecast-cuid-123');

      expect(result).toEqual(mockForecast);
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('queryForecasts', () => {
    // DP-TC08: Query all forecasts (no filters)
    it('should query all forecasts without filters', async () => {
      const dto = {};
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findMany.mockResolvedValue([mockForecast]);

      const result = await service.queryForecasts(dto);

      expect(result).toEqual([mockForecast]);
      expect(repository.findMany).toHaveBeenCalledWith({});
    });

    // DP-TC09: Filter by productId
    it('should filter forecasts by productId', async () => {
      const dto = { productId: 'product-uuid-123' };
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findMany.mockResolvedValue([mockForecast]);

      const result = await service.queryForecasts(dto);

      expect(result).toEqual([mockForecast]);
      expect(repository.findMany).toHaveBeenCalledWith({
        productId: 'product-uuid-123',
      });
    });

    // DP-TC10: Filter by date range
    it('should filter forecasts by date range', async () => {
      const dto = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      };
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findMany.mockResolvedValue([mockForecast]);

      await service.queryForecasts(dto);

      expect(repository.findMany).toHaveBeenCalledWith({
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31'),
      });
    });

    // DP-TC11: Filter by algorithm
    it('should filter forecasts by algorithm', async () => {
      const dto = { algorithmUsed: 'SIMPLE_MOVING_AVERAGE' };
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findMany.mockResolvedValue([mockForecast]);

      await service.queryForecasts(dto);

      expect(repository.findMany).toHaveBeenCalledWith({
        algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
      });
    });

    // DP-TC12: Combined filters
    it('should apply multiple filters together', async () => {
      const dto = {
        productId: 'product-uuid-123',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
      };
      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findMany.mockResolvedValue([mockForecast]);

      await service.queryForecasts(dto);

      expect(repository.findMany).toHaveBeenCalledWith({
        productId: 'product-uuid-123',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31'),
        algorithmUsed: 'SIMPLE_MOVING_AVERAGE',
      });
    });
  });

  describe('updateForecast', () => {
    // DP-TC13: Update forecast successfully
    it('should update forecast with valid data', async () => {
      const dto = {
        forecastedQuantity: 200,
        algorithmUsed: 'MANUAL_OVERRIDE',
      };

      repository.findById.mockResolvedValue(mockForecast);
      repository.update.mockResolvedValue({ ...mockForecast, ...dto });

      const result = await service.updateForecast('forecast-cuid-123', dto);

      expect(result.success).toBe(true);
      expect(result.data.forecastedQuantity).toBe(200);
      expect(repository.update).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // DP-TC14: Update non-existent forecast
    it('should throw NotFoundException when forecast does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateForecast('invalid-id', {})).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    // DP-TC15: Update productId to invalid product
    it('should throw NotFoundException when changing to invalid product', async () => {
      const dto = { productId: 'invalid-product-id' };

      repository.findById.mockResolvedValue(mockForecast);
      repository.findProduct.mockResolvedValue(null);

      await expect(service.updateForecast('forecast-cuid-123', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    // DP-TC16: Update creates duplicate forecast
    it('should throw BadRequestException on duplicate constraint', async () => {
      const dto = { forecastDate: '2025-12-20' };

      repository.findById.mockResolvedValue(mockForecast);
      repository.update.mockRejectedValue({ code: 'P2002' });

      await expect(service.updateForecast('forecast-cuid-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteForecast', () => {
    // DP-TC17: Delete forecast successfully
    it('should delete forecast successfully', async () => {
      repository.findById.mockResolvedValue(mockForecast);
      repository.delete.mockResolvedValue(mockForecast);

      const result = await service.deleteForecast('forecast-cuid-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Forecast deleted successfully');
      expect(repository.delete).toHaveBeenCalledWith('forecast-cuid-123');
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // DP-TC18: Delete non-existent forecast
    it('should throw NotFoundException when forecast does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteForecast('invalid-id')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('runAlgorithm - Simple Moving Average', () => {
    // DP-TC19: Run SMA with valid data
    it('should generate forecasts using Simple Moving Average', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 3,
        forecastDays: 7,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(mockMovements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 0 });
      repository.createMany.mockResolvedValue({ count: 7 });

      const result = await service.runAlgorithm('product-uuid-123', dto);

      expect(result.success).toBe(true);
      expect(result.forecastsCreated).toBe(7);
      expect(result.avgDailyDemand).toBe(150); // (100 + 150 + 200) / 3
      expect(repository.getHistoricalMovements).toHaveBeenCalled();
      expect(repository.createMany).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // DP-TC20: Product not found
    it('should throw NotFoundException when product does not exist', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 30,
        forecastDays: 30,
      };

      repository.findProduct.mockResolvedValue(null);

      await expect(service.runAlgorithm('invalid-product-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    // DP-TC21: No historical data
    it('should return zero forecasts when no historical data exists', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 30,
        forecastDays: 30,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue([]);

      const result = await service.runAlgorithm('product-uuid-123', dto);

      expect(result.success).toBe(true);
      expect(result.forecastsCreated).toBe(0);
      expect(result.avgDailyDemand).toBe(0);
      expect(repository.createMany).not.toHaveBeenCalled();
    });

    // DP-TC22: Calculate correct average
    it('should calculate correct average daily demand', async () => {
      const movements = [
        { quantity: 100, createdAt: new Date() },
        { quantity: 200, createdAt: new Date() },
        { quantity: 300, createdAt: new Date() },
      ];

      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 3,
        forecastDays: 5,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(movements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 0 });
      repository.createMany.mockResolvedValue({ count: 5 });

      const result = await service.runAlgorithm('product-uuid-123', dto);

      expect(result.avgDailyDemand).toBe(200); // (100 + 200 + 300) / 3 = 200
    });

    // DP-TC23: Delete existing forecasts before creation
    it('should delete existing forecasts in range before creating new ones', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 7,
        forecastDays: 30,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(mockMovements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 5 });
      repository.createMany.mockResolvedValue({ count: 30 });

      await service.runAlgorithm('product-uuid-123', dto);

      expect(repository.deleteByProductAndDateRange).toHaveBeenCalled();
      expect(repository.createMany).toHaveBeenCalled();
    });

    // DP-TC24: Custom start date
    it('should use custom start date when provided', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 7,
        forecastDays: 14,
        startDate: '2025-12-20',
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(mockMovements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 0 });
      repository.createMany.mockResolvedValue({ count: 14 });

      await service.runAlgorithm('product-uuid-123', dto);

      // Verify that start date is used
      const createManyCall = repository.createMany.mock.calls[0][0];
      const firstForecastDate = createManyCall[0].forecastDate;
      expect(firstForecastDate instanceof Date).toBe(true);
      expect((firstForecastDate as Date).toISOString().startsWith('2025-12-21')).toBe(true);
    });

    // DP-TC25: Minimum windowDays (7)
    it('should work with minimum window days', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 7,
        forecastDays: 1,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(mockMovements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 0 });
      repository.createMany.mockResolvedValue({ count: 1 });

      const result = await service.runAlgorithm('product-uuid-123', dto);

      expect(result.success).toBe(true);
    });

    // DP-TC26: Maximum forecastDays (90)
    it('should work with maximum forecast days', async () => {
      const dto = {
        algorithm: ForecastAlgorithm.SIMPLE_MOVING_AVERAGE,
        windowDays: 30,
        forecastDays: 90,
      };

      repository.findProduct.mockResolvedValue(mockProduct);
      repository.getHistoricalMovements.mockResolvedValue(mockMovements);
      repository.deleteByProductAndDateRange.mockResolvedValue({ count: 0 });
      repository.createMany.mockResolvedValue({ count: 90 });

      const result = await service.runAlgorithm('product-uuid-123', dto);

      expect(result.forecastsCreated).toBe(90);
    });
  });
});
