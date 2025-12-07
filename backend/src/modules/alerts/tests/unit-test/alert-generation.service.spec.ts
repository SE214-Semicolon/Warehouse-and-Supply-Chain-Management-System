import { Test, TestingModule } from '@nestjs/testing';
import { AlertGenerationService } from '../../services/alert-generation.service';
import { AlertRepository } from '../../repositories/alert.repository';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AlertType, AlertSeverity } from '../../schemas/alert.schema';

describe('AlertGenerationService', () => {
  let service: AlertGenerationService;
  let repository: jest.Mocked<AlertRepository>;
  let prisma: jest.Mocked<PrismaService>;

  const mockProduct = {
    id: 'product-uuid-1',
    sku: 'PROD-001',
    name: 'Test Product',
    minStockLevel: 100,
  };

  const mockBatch = {
    id: 'batch-uuid-1',
    batchNo: 'BATCH-001',
    productId: 'product-uuid-1',
    expiryDate: new Date('2025-12-20'),
    product: mockProduct,
    inventory: [
      {
        location: {
          id: 'loc-uuid-1',
          code: 'LOC-A01',
          name: 'Location A01',
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockRepo = {
      write: jest.fn().mockResolvedValue({}),
    };

    const mockPrisma = {
      productBatch: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertGenerationService,
        { provide: AlertRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertGenerationService>(AlertGenerationService);
    repository = module.get(AlertRepository);
    prisma = module.get(PrismaService);
  });

  describe('checkLowStockAlert', () => {
    // ALERTGEN-TC01: availableQty <= minStockLevel * 0.5 → CRITICAL
    it('should create CRITICAL alert when stock is critically low', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        locationId: 'loc-uuid-1',
        availableQty: 40, // <= 100 * 0.5 = 50
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkLowStockAlert(params);

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
      expect(result.message).toContain('Low stock alert');
      expect(result.message).toContain('40 units remaining');
      expect(repository.write).toHaveBeenCalledWith({
        type: AlertType.LOW_STOCK,
        severity: AlertSeverity.CRITICAL,
        message: expect.stringContaining('Test Product'),
        relatedEntity: {
          type: 'Product',
          id: mockProduct.id,
        },
      });
    });

    // ALERTGEN-TC02: availableQty <= minStockLevel → WARNING
    it('should create WARNING alert when stock is low', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        locationId: 'loc-uuid-1',
        availableQty: 80, // > 50 but <= 100
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkLowStockAlert(params);

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe(AlertSeverity.WARNING);
      expect(repository.write).toHaveBeenCalled();
    });

    // ALERTGEN-TC03: availableQty > minStockLevel → No alert
    it('should not create alert when stock is sufficient', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        locationId: 'loc-uuid-1',
        availableQty: 150, // > 100
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkLowStockAlert(params);

      expect(result.shouldAlert).toBe(false);
      expect(repository.write).not.toHaveBeenCalled();
    });

    // ALERTGEN-TC04: Product without minStockLevel → No alert
    it('should not create alert when product has no minStockLevel', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        locationId: 'loc-uuid-1',
        availableQty: 10,
      };

      const batchWithoutThreshold = {
        ...mockBatch,
        product: { ...mockProduct, minStockLevel: null },
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(batchWithoutThreshold);

      const result = await service.checkLowStockAlert(params);

      expect(result.shouldAlert).toBe(false);
      expect(repository.write).not.toHaveBeenCalled();
    });

    // ALERTGEN-TC05: minStockLevel = 0 → No alert
    it('should not create alert when minStockLevel is 0', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        locationId: 'loc-uuid-1',
        availableQty: 10,
      };

      const batchWithZeroThreshold = {
        ...mockBatch,
        product: { ...mockProduct, minStockLevel: 0 },
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(batchWithZeroThreshold);

      const result = await service.checkLowStockAlert(params);

      expect(result.shouldAlert).toBe(false);
      expect(repository.write).not.toHaveBeenCalled();
    });
  });

  describe('checkExpiryAlert', () => {
    // ALERTGEN-TC06: daysUntilExpiry <= 7 → CRITICAL
    it('should create CRITICAL alert when product expires within 7 days', async () => {
      const now = new Date('2025-12-15');
      jest.useFakeTimers().setSystemTime(now);

      const params = {
        productBatchId: 'batch-uuid-1',
        expiryDate: new Date('2025-12-20'), // 5 days from now
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkExpiryAlert(params);

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
      expect(result.message).toContain('expires in 5 days');
      expect(repository.write).toHaveBeenCalled();

      jest.useRealTimers();
    });

    // ALERTGEN-TC07: daysUntilExpiry <= 30 → WARNING
    it('should create WARNING alert when product expires within 30 days', async () => {
      const now = new Date('2025-12-01');
      jest.useFakeTimers().setSystemTime(now);

      const params = {
        productBatchId: 'batch-uuid-1',
        expiryDate: new Date('2025-12-20'), // 19 days from now
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkExpiryAlert(params);

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe(AlertSeverity.WARNING);
      expect(repository.write).toHaveBeenCalled();

      jest.useRealTimers();
    });

    // ALERTGEN-TC08: daysUntilExpiry > 30 → No alert
    it('should not create alert when product expires in more than 30 days', async () => {
      const now = new Date('2025-11-01');
      jest.useFakeTimers().setSystemTime(now);

      const params = {
        productBatchId: 'batch-uuid-1',
        expiryDate: new Date('2025-12-20'), // 49 days from now
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkExpiryAlert(params);

      expect(result.shouldAlert).toBe(false);
      expect(repository.write).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    // ALERTGEN-TC09: No expiryDate → No alert
    it('should not create alert when product has no expiry date', async () => {
      const params = {
        productBatchId: 'batch-uuid-1',
        expiryDate: null as any,
      };

      const result = await service.checkExpiryAlert(params);

      expect(result.shouldAlert).toBe(false);
      expect(repository.write).not.toHaveBeenCalled();
    });

    // ALERTGEN-TC10: Already expired → CRITICAL
    it('should create CRITICAL alert when product is already expired', async () => {
      const now = new Date('2025-12-25');
      jest.useFakeTimers().setSystemTime(now);

      const params = {
        productBatchId: 'batch-uuid-1',
        expiryDate: new Date('2025-12-20'), // 5 days ago
      };

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(mockBatch);

      const result = await service.checkExpiryAlert(params);

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
      expect(result.message).toContain('EXPIRED');
      expect(repository.write).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
