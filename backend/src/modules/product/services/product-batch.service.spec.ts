import { Test, TestingModule } from '@nestjs/testing';
import { ProductBatchService } from './product-batch.service';
import { ProductBatchRepository } from '../repositories/product-batch.repository';
import { ProductRepository } from '../repositories/product.repository';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('ProductBatchService', () => {
  let service: ProductBatchService;
  let batchRepo: jest.Mocked<ProductBatchRepository>;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockProduct = {
    id: 'product-uuid-1',
    sku: 'SKU-001',
    name: 'Test Product',
    categoryId: 'category-uuid-1',
    unit: 'pcs',
    barcode: '1234567890',
    parameters: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBatch = {
    id: 'batch-uuid-1',
    productId: 'product-uuid-1',
    batchNo: 'BATCH-001',
    quantity: 100,
    manufactureDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    barcodeOrQr: 'QR:ABC123',
    inboundReceiptId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
    inventory: [],
  };

  beforeEach(async () => {
    const mockBatchRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByBatchNo: jest.fn(),
      findByProduct: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findExpiring: jest.fn(),
    };

    const mockProductRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductBatchService,
        {
          provide: ProductBatchRepository,
          useValue: mockBatchRepo,
        },
        {
          provide: ProductRepository,
          useValue: mockProductRepo,
        },
      ],
    }).compile();

    service = module.get<ProductBatchService>(ProductBatchService);
    batchRepo = module.get(ProductBatchRepository);
    productRepo = module.get(ProductRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product batch successfully', async () => {
      const createDto = {
        productId: 'product-uuid-1',
        batchNo: 'BATCH-001',
        quantity: 100,
        manufactureDate: '2024-01-01',
        expiryDate: '2025-01-01',
        barcodeOrQr: 'QR:ABC123',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByBatchNo.mockResolvedValue(null);
      batchRepo.create.mockResolvedValue(mockBatch);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.batch).toEqual(mockBatch);
      expect(productRepo.findOne).toHaveBeenCalledWith(createDto.productId);
      expect(batchRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const createDto = {
        productId: 'invalid-product-id',
        batchNo: 'BATCH-001',
        quantity: 100,
      };

      productRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if batch number already exists', async () => {
      const createDto = {
        productId: 'product-uuid-1',
        batchNo: 'BATCH-001',
        quantity: 100,
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByBatchNo.mockResolvedValue(mockBatch);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if expiry date is before manufacture date', async () => {
      const createDto = {
        productId: 'product-uuid-1',
        batchNo: 'BATCH-001',
        quantity: 100,
        manufactureDate: '2025-01-01',
        expiryDate: '2024-01-01',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByBatchNo.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated batches', async () => {
      const query = {
        productId: 'product-uuid-1',
        limit: 10,
        page: 1,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.batches).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a batch by ID', async () => {
      batchRepo.findOne.mockResolvedValue(mockBatch);

      const result = await service.findOne('batch-uuid-1');

      expect(result.success).toBe(true);
      expect(result.batch).toEqual(mockBatch);
    });

    it('should throw NotFoundException if batch not found', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a batch successfully', async () => {
      const updateDto = {
        quantity: 150,
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);
      batchRepo.update.mockResolvedValue({ ...mockBatch, quantity: 150 });

      const result = await service.update('batch-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.batch.quantity).toBe(150);
    });

    it('should throw NotFoundException if batch not found', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { quantity: 150 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a batch successfully', async () => {
      batchRepo.findOne.mockResolvedValue({ ...mockBatch, inventory: [] });
      batchRepo.delete.mockResolvedValue(mockBatch);

      const result = await service.remove('batch-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product batch deleted successfully');
    });

    it('should throw NotFoundException if batch not found', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if batch has inventory', async () => {
      batchRepo.findOne.mockResolvedValue({
        ...mockBatch,
        inventory: [{ id: 'inv-1', availableQty: 10, reservedQty: 0 }],
      });

      await expect(service.remove('batch-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findExpiring', () => {
    it('should return batches expiring soon', async () => {
      batchRepo.findExpiring.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findExpiring(30, 1, 20);

      expect(result.success).toBe(true);
      expect(result.batches).toHaveLength(1);
      expect(result.message).toContain('30 days');
    });
  });
});
