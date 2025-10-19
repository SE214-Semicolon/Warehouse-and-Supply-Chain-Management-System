import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: jest.Mocked<ProductRepository>;
  let categoryRepo: jest.Mocked<ProductCategoryRepository>;

  const mockProduct = {
    id: 'product-uuid-1',
    sku: 'SKU-001',
    name: 'Test Product',
    categoryId: 'category-uuid-1',
    unit: 'pcs',
    barcode: '1234567890',
    parameters: { color: 'red' },
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: 'category-uuid-1',
      name: 'Test Category',
      parentId: null,
      metadata: {},
    },
    batches: [],
  };

  const mockCategory = {
    id: 'category-uuid-1',
    name: 'Test Category',
    parentId: null,
    metadata: {},
  };

  beforeEach(async () => {
    const mockProductRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findBySku: jest.fn(),
      findByBarcode: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      checkSkuExists: jest.fn(),
    };

    const mockCategoryRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockProductRepo,
        },
        {
          provide: ProductCategoryRepository,
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get(ProductRepository);
    categoryRepo = module.get(ProductCategoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createDto = {
        sku: 'SKU-001',
        name: 'Test Product',
        categoryId: 'category-uuid-1',
        unit: 'pcs',
        barcode: '1234567890',
        parameters: { color: 'red' },
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      productRepo.create.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(productRepo.checkSkuExists).toHaveBeenCalledWith(createDto.sku);
      expect(categoryRepo.findOne).toHaveBeenCalledWith(createDto.categoryId);
      expect(productRepo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const createDto = {
        sku: 'SKU-001',
        name: 'Test Product',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const createDto = {
        sku: 'SKU-001',
        name: 'Test Product',
        categoryId: 'invalid-category-id',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query = {
        search: 'Test',
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.product).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const updateDto = {
        name: 'Updated Product',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.update.mockResolvedValue({ ...mockProduct, name: 'Updated Product' });

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.product.name).toBe('Updated Product');
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new SKU already exists', async () => {
      const updateDto = {
        sku: 'SKU-002',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(true);

      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct, batches: [] });
      productRepo.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product deleted successfully');
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product has batches', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        batches: [{ id: 'batch-1' }],
      });

      await expect(service.remove('product-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
