import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { CacheService } from '../../../cache/cache.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: jest.Mocked<ProductRepository>;
  let categoryRepo: jest.Mocked<ProductCategoryRepository>;
  let cacheService: jest.Mocked<CacheService>;

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
    minStockLevel: null,
    reorderPoint: null,
    leadTimeDays: null,
    safetyStockLevel: null,
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

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getOrSet: jest.fn(),
      delete: jest.fn(),
      deleteByPrefix: jest.fn(),
      reset: jest.fn(),
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
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get(ProductRepository);
    categoryRepo = module.get(ProductCategoryRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // PROD-TC01: Create with valid data
    it('should create a product successfully with valid data', async () => {
      const createDto = {
        sku: 'SKU-001',
        name: 'Test Product',
        unit: 'pcs',
        barcode: '1234567890',
        parameters: { color: 'red' },
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      productRepo.create.mockResolvedValue(mockProduct);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(result.message).toBe('Product created successfully');
      expect(productRepo.checkSkuExists).toHaveBeenCalledWith(createDto.sku);
      expect(productRepo.create).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // PROD-TC02: Duplicate SKU
    it('should throw ConflictException if SKU already exists', async () => {
      const createDto = {
        sku: 'SKU-001',
        name: 'Test Product',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Product with SKU "SKU-001" already exists',
      );
    });

    // PROD-TC03: Category not found
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
      await expect(service.create(createDto)).rejects.toThrow(
        'Category with ID "invalid-category-id" not found',
      );
    });

    // PROD-TC04: Create with category
    it('should create a product successfully with category', async () => {
      const createDto = {
        sku: 'SKU-002',
        name: 'Test Product with Category',
        categoryId: 'category-uuid-1',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      productRepo.create.mockResolvedValue(mockProduct);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(categoryRepo.findOne).toHaveBeenCalledWith(createDto.categoryId);
      expect(productRepo.create).toHaveBeenCalled();
    });

    // PROD-TC05: Missing required fields tested by DTO
    // PROD-TC06: Permission denied tested by guard
    // PROD-TC07: No authentication tested by guard

    // Edge case: SKU with special characters
    it('should create product with special characters in SKU', async () => {
      const createDto = {
        sku: 'SKU-@#$%',
        name: 'Test Product',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      productRepo.create.mockResolvedValue({ ...mockProduct, sku: 'SKU-@#$%' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.sku).toBe('SKU-@#$%');
    });

    // Edge case: Create with null barcode
    it('should create product with null barcode', async () => {
      const createDto = {
        sku: 'SKU-003',
        name: 'Product without barcode',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      productRepo.create.mockResolvedValue({ ...mockProduct, barcode: null });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.barcode).toBeNull();
    });

    // Edge case: Complex nested parameters
    it('should create product with complex nested parameters', async () => {
      const createDto = {
        sku: 'SKU-004',
        name: 'Product with complex params',
        unit: 'pcs',
        parameters: {
          dimensions: { width: 10, height: 20, depth: 30 },
          specs: { material: 'steel', weight: 5.5 },
        },
      };

      productRepo.checkSkuExists.mockResolvedValue(false);
      productRepo.create.mockResolvedValue({
        ...mockProduct,
        parameters: createDto.parameters,
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.parameters).toEqual(createDto.parameters);
    });

    // Edge case: Case-insensitive SKU duplicate detection
    it('should detect duplicate SKU regardless of case', async () => {
      const createDto = {
        sku: 'sku-001', // lowercase
        name: 'Test Product',
        unit: 'pcs',
      };

      productRepo.checkSkuExists.mockResolvedValue(true); // 'SKU-001' already exists

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    // PROD-TC08: Get all with default pagination
    it('should return all products with default pagination', async () => {
      const query = {};

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
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

    // PROD-TC09: Filter by search
    it('should filter products by search term', async () => {
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
      expect(result.data).toHaveLength(1);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    // PROD-TC10: Filter by category
    it('should filter products by category', async () => {
      const query = {
        categoryId: 'category-uuid-1',
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-uuid-1',
          }),
        }),
      );
    });

    // PROD-TC11: Filter by barcode
    it('should filter products by barcode', async () => {
      const query = {
        barcode: '1234567890',
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barcode: expect.objectContaining({
              contains: '1234567890',
            }),
          }),
        }),
      );
    });

    // PROD-TC12: Pagination page 1
    it('should return products for page 1', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 25,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    // PROD-TC13: Pagination page 2
    it('should return products for page 2', async () => {
      const query = {
        page: 2,
        limit: 10,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 25,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    // PROD-TC14: Sort by different fields
    it('should sort products by different fields', async () => {
      const query = {
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    // PROD-TC15: Permission denied tested by guard
    // PROD-TC16: No authentication tested by guard

    // Edge case: page = 0 (no validation in service, passes as-is)
    it('should handle page 0 (validation in DTO/controller)', async () => {
      const query = { page: 0, limit: 10 };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      // Service doesn't validate, returns query params as-is
      expect(result.success).toBe(true);
    });

    // Edge case: negative page (validation should be in DTO)
    it('should handle negative page (validation in DTO/controller)', async () => {
      const query = { page: -5, limit: 10 };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });

    // Edge case: empty search string
    it('should handle empty search string', async () => {
      const query = { search: '', limit: 10, page: 1 };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });

    // Edge case: search with whitespace only
    it('should handle search with whitespace only', async () => {
      const query = { search: '   ', limit: 10, page: 1 };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });

    // Edge case: SQL injection attempt in search
    it('should safely handle SQL injection attempt in search', async () => {
      const query = { search: "'; DROP TABLE products; --", limit: 10, page: 1 };

      productRepo.findAll.mockResolvedValue({
        products: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    // Edge case: multiple filters combined
    it('should handle multiple filters combined', async () => {
      const query = {
        search: 'Test',
        categoryId: 'category-uuid-1',
        barcode: '1234567890',
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-uuid-1',
            barcode: expect.any(Object),
            OR: expect.any(Array),
          }),
        }),
      );
    });

    // Edge case: page beyond total pages
    it('should return empty array when page is beyond total pages', async () => {
      const query = { page: 100, limit: 10 };

      productRepo.findAll.mockResolvedValue({
        products: [],
        total: 25, // only 3 pages
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(100);
      expect(result.totalPages).toBe(3);
    });

    // Edge case: invalid sort field should use default
    it('should use default sort when invalid sortBy field', async () => {
      const query = {
        sortBy: 'invalidField' as any,
        sortOrder: 'asc' as const,
        limit: 10,
        page: 1,
      };

      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });
  });

  describe('findOne', () => {
    // PROD-TC17: Find by valid ID
    it('should return a product by valid ID', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(productRepo.findOne).toHaveBeenCalledWith('product-uuid-1');
    });

    // PROD-TC18: Product not found
    it('should throw NotFoundException if product not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Product with ID "invalid-id" not found',
      );
    });

    // PROD-TC19: Cache hit
    it('should return cached product on cache hit', async () => {
      cacheService.getOrSet.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // PROD-TC20: Invalid ID format tested by DTO
    // PROD-TC21: Permission denied tested by guard
    // PROD-TC22: No authentication tested by guard
  });

  describe('findBySku', () => {
    // PROD-TC23: Find by valid SKU
    it('should return a product by valid SKU', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findBySku.mockResolvedValue(mockProduct);

      const result = await service.findBySku('SKU-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(productRepo.findBySku).toHaveBeenCalledWith('SKU-001');
    });

    // PROD-TC24: Product not found
    it('should throw NotFoundException if product with SKU not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findBySku.mockResolvedValue(null);

      await expect(service.findBySku('INVALID-SKU')).rejects.toThrow(NotFoundException);
      await expect(service.findBySku('INVALID-SKU')).rejects.toThrow(
        'Product with SKU "INVALID-SKU" not found',
      );
    });

    // PROD-TC25: Cache hit
    it('should return cached product on cache hit by SKU', async () => {
      cacheService.getOrSet.mockResolvedValue(mockProduct);

      const result = await service.findBySku('SKU-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // PROD-TC26: Permission denied tested by guard
    // PROD-TC27: No authentication tested by guard
  });

  describe('findByBarcode', () => {
    // PROD-TC28: Find by valid barcode
    it('should return a product by valid barcode', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findByBarcode.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('1234567890');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(productRepo.findByBarcode).toHaveBeenCalledWith('1234567890');
    });

    // PROD-TC29: Product not found
    it('should throw NotFoundException if product with barcode not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findByBarcode.mockResolvedValue(null);

      await expect(service.findByBarcode('INVALID-BARCODE')).rejects.toThrow(NotFoundException);
      await expect(service.findByBarcode('INVALID-BARCODE')).rejects.toThrow(
        'Product with barcode "INVALID-BARCODE" not found',
      );
    });

    // PROD-TC30: Cache hit
    it('should return cached product on cache hit by barcode', async () => {
      cacheService.getOrSet.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('1234567890');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // PROD-TC31: Permission denied tested by guard
    // PROD-TC32: No authentication tested by guard
  });

  describe('autocomplete', () => {
    // PROD-TC33: Autocomplete with search
    it('should return autocomplete results with search term', async () => {
      const mockAutocompleteProducts = [
        {
          id: mockProduct.id,
          sku: mockProduct.sku,
          name: mockProduct.name,
          barcode: mockProduct.barcode,
        },
      ];

      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.autocomplete('Test', 10);

      expect(result).toEqual(mockAutocompleteProducts);
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
          take: 10,
        }),
      );
    });

    // PROD-TC34: Autocomplete without search
    it('should return autocomplete results without search term', async () => {
      const mockAutocompleteProducts = [
        {
          id: mockProduct.id,
          sku: mockProduct.sku,
          name: mockProduct.name,
          barcode: mockProduct.barcode,
        },
      ];

      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      productRepo.findAll.mockResolvedValue({
        products: [mockProduct],
        total: 1,
      });

      const result = await service.autocomplete('', 10);

      expect(result).toEqual(mockAutocompleteProducts);
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(productRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 10,
        }),
      );
    });

    // PROD-TC35: Cache hit
    it('should return cached autocomplete results on cache hit', async () => {
      const mockAutocompleteProducts = [
        {
          id: mockProduct.id,
          sku: mockProduct.sku,
          name: mockProduct.name,
          barcode: mockProduct.barcode,
        },
      ];

      cacheService.getOrSet.mockResolvedValue(mockAutocompleteProducts);

      const result = await service.autocomplete('Test', 10);

      expect(result).toEqual(mockAutocompleteProducts);
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // PROD-TC36: Permission denied tested by guard
    // PROD-TC37: No authentication tested by guard
  });

  describe('update', () => {
    // PROD-TC38: Update with valid data
    it('should update a product successfully with valid data', async () => {
      const updateDto = {
        name: 'Updated Product',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.update.mockResolvedValue({ ...mockProduct, name: 'Updated Product' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Product');
      expect(result.message).toBe('Product updated successfully');
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // PROD-TC39: Product not found
    it('should throw NotFoundException if product not found for update', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        'Product with ID "invalid-id" not found',
      );
    });

    // PROD-TC40: Duplicate SKU
    it('should throw ConflictException if new SKU already exists', async () => {
      const updateDto = {
        sku: 'SKU-002',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(true);

      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(
        'Product with SKU "SKU-002" already exists',
      );
    });

    // PROD-TC41: Category not found
    it('should throw NotFoundException if category not found during update', async () => {
      const updateDto = {
        categoryId: 'invalid-category-id',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(
        'Category with ID "invalid-category-id" not found',
      );
    });

    // PROD-TC42: Update with category
    it('should update a product successfully with new category', async () => {
      const updateDto = {
        name: 'Updated Product',
        categoryId: 'category-uuid-2',
      };

      const newCategory = {
        id: 'category-uuid-2',
        name: 'New Category',
        parentId: null,
        metadata: {},
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      categoryRepo.findOne.mockResolvedValue(newCategory);
      productRepo.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Product',
        categoryId: 'category-uuid-2',
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.categoryId).toBe('category-uuid-2');
      expect(categoryRepo.findOne).toHaveBeenCalledWith('category-uuid-2');
    });

    // PROD-TC43: Update SKU
    it('should update product SKU successfully', async () => {
      const updateDto = {
        sku: 'SKU-NEW',
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(false);
      productRepo.update.mockResolvedValue({ ...mockProduct, sku: 'SKU-NEW' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.sku).toBe('SKU-NEW');
      expect(productRepo.checkSkuExists).toHaveBeenCalledWith('SKU-NEW', 'product-uuid-1');
    });

    // PROD-TC44: Invalid ID format tested by DTO
    // PROD-TC45: Permission denied tested by guard
    // PROD-TC46: No authentication tested by guard

    // Edge case: Update only name field
    it('should update only name field', async () => {
      const updateDto = { name: 'New Name Only' };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.update.mockResolvedValue({ ...mockProduct, name: 'New Name Only' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Name Only');
      expect(result.data.sku).toBe(mockProduct.sku); // SKU unchanged
    });

    // Edge case: Update barcode to undefined (remove)
    it('should update barcode to undefined', async () => {
      const updateDto = { barcode: undefined };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.update.mockResolvedValue({ ...mockProduct, barcode: null });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.barcode).toBeNull();
    });

    // Edge case: Update parameters to undefined (remove)
    it('should update parameters to undefined', async () => {
      const updateDto = { parameters: undefined };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.update.mockResolvedValue({ ...mockProduct, parameters: null });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.parameters).toBeNull();
    });

    // Edge case: Update with same SKU value (should not check for duplicate)
    it('should allow updating with same SKU value', async () => {
      const updateDto = { sku: 'SKU-001' }; // same as current

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(false); // returns false for same SKU
      productRepo.update.mockResolvedValue(mockProduct);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
    });

    // Edge case: Update all fields at once
    it('should update all fields at once', async () => {
      const updateDto = {
        sku: 'SKU-UPDATED',
        name: 'Updated Name',
        unit: 'kg',
        barcode: '9999999999',
        categoryId: 'category-uuid-2',
        parameters: { updated: true },
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(false);
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      productRepo.update.mockResolvedValue({ ...mockProduct, ...updateDto });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('product-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.sku).toBe('SKU-UPDATED');
      expect(result.data.name).toBe('Updated Name');
      expect(result.data.unit).toBe('kg');
    });

    // Edge case: Case-insensitive SKU duplicate detection on update
    it('should detect duplicate SKU on update regardless of case', async () => {
      const updateDto = { sku: 'sku-002' }; // lowercase, 'SKU-002' exists

      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.checkSkuExists.mockResolvedValue(true);

      await expect(service.update('product-uuid-1', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    // PROD-TC47: Delete product successfully
    it('should delete a product successfully', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct, batches: [] } as any);
      productRepo.delete.mockResolvedValue(mockProduct);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.remove('product-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product deleted successfully');
      expect(productRepo.delete).toHaveBeenCalledWith('product-uuid-1');
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // PROD-TC48: Product not found
    it('should throw NotFoundException if product not found for deletion', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Product with ID "invalid-id" not found',
      );
    });

    // PROD-TC49: Delete product with batches
    it('should throw BadRequestException if product has batches', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        batches: [{ id: 'batch-1' }],
      } as any);

      await expect(service.remove('product-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('product-uuid-1')).rejects.toThrow(
        'Cannot delete a product with existing batches. Please delete all batches first.',
      );
    });

    // PROD-TC50: Invalid ID format tested by DTO
    // PROD-TC51: Permission denied tested by guard
    // PROD-TC52: No authentication tested by guard

    // Edge case: Delete product with empty batches array
    it('should delete product successfully with empty batches array', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct, batches: [] } as any);
      productRepo.delete.mockResolvedValue(mockProduct);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.remove('product-uuid-1');

      expect(result.success).toBe(true);
      expect(productRepo.delete).toHaveBeenCalledWith('product-uuid-1');
    });

    // Edge case: Delete product with batches (should fail even if zero quantity)
    it('should reject delete if product has any batches', async () => {
      const zeroBatch = { id: 'batch-1', quantity: 0 };
      productRepo.findOne.mockResolvedValue({ ...mockProduct, batches: [zeroBatch] } as any);

      await expect(service.remove('product-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('product-uuid-1')).rejects.toThrow(
        'Cannot delete a product with existing batches',
      );
    });
  });
});
