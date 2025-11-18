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
    // BATCH-TC01: Create with valid data
    it('should create a product batch successfully with valid data', async () => {
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
      expect(result.data).toEqual(mockBatch);
      expect(result.message).toBe('Product batch created successfully');
      expect(productRepo.findOne).toHaveBeenCalledWith(createDto.productId);
      expect(batchRepo.findByBatchNo).toHaveBeenCalledWith(createDto.productId, createDto.batchNo);
      expect(batchRepo.create).toHaveBeenCalled();
    });

    // BATCH-TC02: Product not found
    it('should throw NotFoundException if product does not exist', async () => {
      const createDto = {
        productId: 'invalid-product-id',
        batchNo: 'BATCH-001',
        quantity: 100,
      };

      productRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Product with ID "invalid-product-id" not found',
      );
    });

    // BATCH-TC03: Duplicate batch number
    it('should throw ConflictException if batch number already exists', async () => {
      const createDto = {
        productId: 'product-uuid-1',
        batchNo: 'BATCH-001',
        quantity: 100,
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByBatchNo.mockResolvedValue(mockBatch);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Batch with number "BATCH-001" already exists for this product',
      );
    });

    // BATCH-TC04: Invalid dates (expiry before manufacture)
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
      await expect(service.create(createDto)).rejects.toThrow(
        'Expiry date must be after manufacture date',
      );
    });

    // BATCH-TC05: Create with all optional fields
    it('should create a batch with all optional fields', async () => {
      const createDto = {
        productId: 'product-uuid-1',
        batchNo: 'BATCH-002',
        quantity: 200,
        manufactureDate: '2024-06-01',
        expiryDate: '2025-06-01',
        barcodeOrQr: 'QR:XYZ789',
        inboundReceiptId: 'receipt-uuid-1',
      };

      const batchWithAllFields = {
        ...mockBatch,
        batchNo: 'BATCH-002',
        quantity: 200,
        inboundReceiptId: 'receipt-uuid-1',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByBatchNo.mockResolvedValue(null);
      batchRepo.create.mockResolvedValue(batchWithAllFields);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(batchWithAllFields);
      expect(result.data.inboundReceiptId).toBe('receipt-uuid-1');
    });

    // BATCH-TC06: Missing required fields tested by DTO
    // BATCH-TC07: Permission denied tested by guard
    // BATCH-TC08: No authentication tested by guard
  });

  describe('findAll', () => {
    // BATCH-TC09: Get all with default pagination
    it('should return all batches with default pagination', async () => {
      const query = {};

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    // BATCH-TC10: Filter by product ID
    it('should filter batches by product ID', async () => {
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
      expect(result.data).toHaveLength(1);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-uuid-1',
          }),
        }),
      );
    });

    // BATCH-TC11: Filter by batch number
    it('should filter batches by batch number', async () => {
      const query = {
        batchNo: 'BATCH-001',
        limit: 10,
        page: 1,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batchNo: expect.objectContaining({
              contains: 'BATCH-001',
            }),
          }),
        }),
      );
    });

    // BATCH-TC12: Filter by barcode/QR
    it('should filter batches by barcode or QR code', async () => {
      const query = {
        barcodeOrQr: 'QR:ABC123',
        limit: 10,
        page: 1,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barcodeOrQr: expect.objectContaining({
              contains: 'QR:ABC123',
            }),
          }),
        }),
      );
    });

    // BATCH-TC13: Filter by expiry before
    it('should filter batches by expiry before date', async () => {
      const query = {
        expiryBefore: '2025-12-31',
        limit: 10,
        page: 1,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiryDate: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // BATCH-TC14: Filter by expiry after
    it('should filter batches by expiry after date', async () => {
      const query = {
        expiryAfter: '2024-01-01',
        limit: 10,
        page: 1,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiryDate: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // BATCH-TC15: Pagination page 1
    it('should return batches for page 1', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 25,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    // BATCH-TC16: Pagination page 2
    it('should return batches for page 2', async () => {
      const query = {
        page: 2,
        limit: 10,
      };

      batchRepo.findAll.mockResolvedValue({
        batches: [mockBatch],
        total: 25,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(batchRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    // BATCH-TC17: Permission denied tested by guard
    // BATCH-TC18: No authentication tested by guard
  });

  describe('findOne', () => {
    // BATCH-TC19: Find by valid ID
    it('should return a batch by valid ID', async () => {
      batchRepo.findOne.mockResolvedValue(mockBatch);

      const result = await service.findOne('batch-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBatch);
      expect(batchRepo.findOne).toHaveBeenCalledWith('batch-uuid-1');
    });

    // BATCH-TC20: Batch not found
    it('should throw NotFoundException if batch not found', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Product batch with ID "invalid-id" not found',
      );
    });

    // BATCH-TC21: Invalid ID format tested by DTO
    // BATCH-TC22: Permission denied tested by guard
    // BATCH-TC23: No authentication tested by guard
  });

  describe('findByProduct', () => {
    // BATCH-TC24: Find by valid product ID
    it('should return batches for a valid product ID', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByProduct.mockResolvedValue([mockBatch]);

      const result = await service.findByProduct('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(productRepo.findOne).toHaveBeenCalledWith('product-uuid-1');
      expect(batchRepo.findByProduct).toHaveBeenCalledWith('product-uuid-1');
    });

    // BATCH-TC25: Product not found
    it('should throw NotFoundException if product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findByProduct('invalid-product-id')).rejects.toThrow(NotFoundException);
      await expect(service.findByProduct('invalid-product-id')).rejects.toThrow(
        'Product with ID "invalid-product-id" not found',
      );
    });

    // BATCH-TC26: Empty batches list
    it('should return empty array when product has no batches', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      batchRepo.findByProduct.mockResolvedValue([]);

      const result = await service.findByProduct('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    // BATCH-TC27: Permission denied tested by guard
    // BATCH-TC28: No authentication tested by guard
  });

  describe('findExpiring', () => {
    // BATCH-TC29: Find expiring within default days
    it('should return batches expiring within default 30 days', async () => {
      batchRepo.findExpiring.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findExpiring();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.message).toContain('30 days');
      expect(batchRepo.findExpiring).toHaveBeenCalledWith(
        expect.objectContaining({
          before: expect.any(Date),
          after: expect.any(Date),
          skip: 0,
          take: 20,
        }),
      );
    });

    // BATCH-TC30: Find expiring within custom days
    it('should return batches expiring within custom days', async () => {
      batchRepo.findExpiring.mockResolvedValue({
        batches: [mockBatch],
        total: 1,
      });

      const result = await service.findExpiring(60);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.message).toContain('60 days');
      expect(batchRepo.findExpiring).toHaveBeenCalled();
    });

    // BATCH-TC31: Pagination
    it('should support pagination for expiring batches', async () => {
      batchRepo.findExpiring.mockResolvedValue({
        batches: [mockBatch],
        total: 25,
      });

      const result = await service.findExpiring(30, 2, 10);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(batchRepo.findExpiring).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    // BATCH-TC32: No expiring batches
    it('should return empty array when no batches are expiring', async () => {
      batchRepo.findExpiring.mockResolvedValue({
        batches: [],
        total: 0,
      });

      const result = await service.findExpiring(30);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    // BATCH-TC33: Permission denied tested by guard
    // BATCH-TC34: No authentication tested by guard
  });

  describe('update', () => {
    // BATCH-TC35: Update with valid data
    it('should update a batch successfully with valid data', async () => {
      const updateDto = {
        quantity: 150,
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);
      batchRepo.update.mockResolvedValue({ ...mockBatch, quantity: 150 });

      const result = await service.update('batch-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(150);
      expect(result.message).toBe('Product batch updated successfully');
      expect(batchRepo.update).toHaveBeenCalled();
    });

    // BATCH-TC36: Batch not found
    it('should throw NotFoundException if batch not found for update', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { quantity: 150 })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('invalid-id', { quantity: 150 })).rejects.toThrow(
        'Product batch with ID "invalid-id" not found',
      );
    });

    // BATCH-TC37: Duplicate batch number
    it('should throw ConflictException if new batch number already exists', async () => {
      const updateDto = {
        batchNo: 'BATCH-002',
      };

      const existingBatch = {
        ...mockBatch,
        id: 'batch-uuid-2',
        batchNo: 'BATCH-002',
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);
      batchRepo.findByBatchNo.mockResolvedValue(existingBatch);

      await expect(service.update('batch-uuid-1', updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update('batch-uuid-1', updateDto)).rejects.toThrow(
        'Batch with number "BATCH-002" already exists for this product',
      );
    });

    // BATCH-TC38: Invalid dates (expiry before manufacture)
    it('should throw BadRequestException if updated expiry date is before manufacture date', async () => {
      const updateDto = {
        expiryDate: '2023-01-01',
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);

      await expect(service.update('batch-uuid-1', updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update('batch-uuid-1', updateDto)).rejects.toThrow(
        'Expiry date must be after manufacture date',
      );
    });

    // BATCH-TC39: Update batch number
    it('should update batch number successfully', async () => {
      const updateDto = {
        batchNo: 'BATCH-NEW',
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);
      batchRepo.findByBatchNo.mockResolvedValue(null);
      batchRepo.update.mockResolvedValue({ ...mockBatch, batchNo: 'BATCH-NEW' });

      const result = await service.update('batch-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.batchNo).toBe('BATCH-NEW');
      expect(batchRepo.findByBatchNo).toHaveBeenCalledWith(mockBatch.productId, 'BATCH-NEW');
    });

    // BATCH-TC40: Update quantity
    it('should update quantity successfully', async () => {
      const updateDto = {
        quantity: 200,
      };

      batchRepo.findOne.mockResolvedValue(mockBatch);
      batchRepo.update.mockResolvedValue({ ...mockBatch, quantity: 200 });

      const result = await service.update('batch-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(200);
    });

    // BATCH-TC41: Invalid ID format tested by DTO
    // BATCH-TC42: Permission denied tested by guard
    // BATCH-TC43: No authentication tested by guard
  });

  describe('remove', () => {
    // BATCH-TC44: Delete batch successfully
    it('should delete a batch successfully', async () => {
      batchRepo.findOne.mockResolvedValue({ ...mockBatch, inventory: [] } as any);
      batchRepo.delete.mockResolvedValue(mockBatch);

      const result = await service.remove('batch-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product batch deleted successfully');
      expect(batchRepo.delete).toHaveBeenCalledWith('batch-uuid-1');
    });

    // BATCH-TC45: Batch not found
    it('should throw NotFoundException if batch not found for deletion', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Product batch with ID "invalid-id" not found',
      );
    });

    // BATCH-TC46: Delete batch with inventory
    it('should throw BadRequestException if batch has inventory with stock', async () => {
      batchRepo.findOne.mockResolvedValue({
        ...mockBatch,
        inventory: [{ availableQty: 10, reservedQty: 0 }],
      } as any);

      await expect(service.remove('batch-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('batch-uuid-1')).rejects.toThrow(
        'Cannot delete a batch with existing inventory. Please clear inventory first.',
      );
    });

    // BATCH-TC47: Invalid ID format tested by DTO
    // BATCH-TC48: Permission denied tested by guard
    // BATCH-TC49: No authentication tested by guard
  });
});
