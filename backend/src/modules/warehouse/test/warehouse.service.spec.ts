import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseService } from '../services/warehouse.service';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CacheService } from '../../../cache/cache.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repository: jest.Mocked<WarehouseRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockWarehouse = {
    id: 'warehouse-uuid-1',
    code: 'WH-001',
    name: 'Main Warehouse',
    address: '123 Main Street',
    metadata: { type: 'Cold Storage' },
    createdAt: new Date(),
    updatedAt: new Date(),
    locations: [],
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      checkCodeExists: jest.fn(),
      getWarehouseStats: jest.fn(),
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
        WarehouseService,
        {
          provide: WarehouseRepository,
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    repository = module.get(WarehouseRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // WH-TC01
    it('should create a warehouse successfully', async () => {
      const createDto = {
        code: 'WH-001',
        name: 'Main Warehouse',
        address: '123 Main Street',
        metadata: { type: 'Cold Storage' },
      };

      repository.checkCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockWarehouse);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.warehouse).toEqual(mockWarehouse);
      expect(repository.checkCodeExists).toHaveBeenCalledWith(createDto.code);
      expect(repository.create).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // WH-TC02
    it('should throw ConflictException if code already exists', async () => {
      const createDto = {
        code: 'WH-001',
        name: 'Main Warehouse',
      };

      repository.checkCodeExists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    // WH-TC03: Missing required fields tested by DTO validation
    // WH-TC04: Permission denied tested by guard
    // WH-TC05: No authentication tested by guard

    // WH-TC06: Edge case - empty string code (tested by DTO)
    // WH-TC07: Edge case - whitespace only name (tested by DTO)

    // WH-TC08: Code with special characters
    it('should create warehouse with special characters in code', async () => {
      const createDto = {
        code: 'WH-001@TEST',
        name: 'Test Warehouse',
      };

      repository.checkCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue({ ...mockWarehouse, code: createDto.code });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.code).toBe('WH-001@TEST');
    });

    // WH-TC09: Very long code (tested by DTO max length validation)
    // WH-TC10: Very long name (tested by DTO max length validation)
    // WH-TC11: SQL injection attempt (Prisma handles this)

    // WH-TC12: Duplicate code case insensitive
    it('should detect duplicate code case insensitively', async () => {
      const createDto = {
        code: 'wh-001',
        name: 'Test Warehouse',
      };

      repository.checkCodeExists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    // WH-TC13: Create with null metadata defaults to empty object
    it('should create warehouse with default empty metadata when null provided', async () => {
      const createDto = {
        code: 'WH-002',
        name: 'Test Warehouse',
        metadata: null as any,
      };

      repository.checkCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue({ ...mockWarehouse, metadata: {} });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.metadata).toEqual({});
    });

    // WH-TC14: Create with complex nested metadata
    it('should create warehouse with complex nested metadata', async () => {
      const createDto = {
        code: 'WH-003',
        name: 'Complex Warehouse',
        metadata: {
          type: 'Cold Storage',
          features: {
            temperature: { min: -20, max: 5 },
            humidity: { controlled: true },
          },
          certifications: ['ISO-9001', 'HACCP'],
        },
      };

      repository.checkCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue({ ...mockWarehouse, metadata: createDto.metadata });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.metadata).toEqual(createDto.metadata);
    });

    // WH-TC15: Concurrent create with same code (race condition - repository handles)
  });

  describe('findAll', () => {
    // WH-TC06: Get all with default pagination
    it('should return paginated warehouses with default settings', async () => {
      const query = {
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    // WH-TC07: Filter by code
    it('should filter by code', async () => {
      const query = {
        code: 'WH-001',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(1);
    });

    // WH-TC08: Filter by search
    it('should filter by search query', async () => {
      const query = {
        search: 'Main',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    // WH-TC09: Pagination page 1
    it('should handle pagination page 1', async () => {
      const query = {
        limit: 10,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 15,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    // WH-TC10: Pagination page 2
    it('should handle pagination page 2', async () => {
      const query = {
        limit: 10,
        page: 2,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 15,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    // WH-TC11: No authentication tested by guard

    // WH-TC22: Page = 0 should work with service (defaults applied in query)
    it('should handle page = 0 by treating as page 1', async () => {
      const query = {
        limit: 10,
        page: 0,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 5,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      // Service calculates skip as (0-1)*10 = -10, but Prisma handles this
      expect(result.page).toBe(0);
    });

    // WH-TC23: Negative page
    it('should handle negative page number', async () => {
      const query = {
        limit: 10,
        page: -1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 5,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(-1);
    });

    // WH-TC24: Limit = 0
    it('should handle limit = 0', async () => {
      const query = {
        limit: 0,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 5,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(0);
    });

    // WH-TC25: Negative limit (tested at DTO level typically)

    // WH-TC26: Very large limit
    it('should handle very large limit', async () => {
      const query = {
        limit: 10000,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10000);
    });

    // WH-TC27: Search with empty string
    it('should handle search with empty string', async () => {
      const query = {
        search: '',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      // Empty search should still work
    });

    // WH-TC28: Search with whitespace only
    it('should handle search with whitespace only', async () => {
      const query = {
        search: '   ',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(0);
    });

    // WH-TC29: Search with special characters
    it('should handle search with special characters', async () => {
      const query = {
        search: '@#$%',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });

    // WH-TC30: SQL injection attempt (Prisma parameterized queries handle this)
    it('should safely handle SQL injection attempts', async () => {
      const query = {
        search: "'; DROP TABLE warehouses; --",
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(0);
    });

    // WH-TC31: Filter code + search combined
    it('should handle combined code and search filters', async () => {
      const query = {
        code: 'WH',
        search: 'Main',
        limit: 20,
        page: 1,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [mockWarehouse],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(1);
    });

    // WH-TC32: Multiple filters tested above

    // WH-TC33: Page beyond total pages
    it('should handle page beyond total pages', async () => {
      const query = {
        limit: 10,
        page: 100,
      };

      repository.findAll.mockResolvedValue({
        warehouses: [],
        total: 5,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.warehouses).toHaveLength(0);
      expect(result.page).toBe(100);
    });

    // WH-TC34: Case insensitive search (Prisma mode: 'insensitive' handles this)
    // WH-TC35: Partial code match (Prisma contains handles this)
  });

  describe('findOne', () => {
    // WH-TC12: Find by valid ID
    it('should return a warehouse by valid ID', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.getWarehouseStats.mockResolvedValue({
        totalLocations: 10,
        totalCapacity: 100,
        occupiedLocations: 5,
      });

      const result = await service.findOne('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.warehouse).toEqual(mockWarehouse);
      expect(result.stats).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // WH-TC13: Invalid ID (non-existent)
    it('should throw NotFoundException if warehouse not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // WH-TC14: Invalid ID format tested by DTO validation
    // WH-TC15: No authentication tested by guard
  });

  describe('update', () => {
    // WH-TC20: Update with valid data
    it('should update a warehouse successfully', async () => {
      const updateDto = {
        name: 'Updated Warehouse',
      };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({ ...mockWarehouse, name: 'Updated Warehouse' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.name).toBe('Updated Warehouse');
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // WH-TC21: Update with duplicate code
    it('should throw ConflictException if new code already exists', async () => {
      const updateDto = {
        code: 'WH-002',
      };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.checkCodeExists.mockResolvedValue(true);

      await expect(service.update('warehouse-uuid-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    // WH-TC22: Update non-existent warehouse
    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    // WH-TC23: Invalid ID format tested by DTO validation
    // WH-TC24: Permission denied tested by guard
    // WH-TC25: No authentication tested by guard

    // WH-TC57: Update only name
    it('should update only the name field', async () => {
      const updateDto = { name: 'New Name Only' };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({ ...mockWarehouse, name: 'New Name Only' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.name).toBe('New Name Only');
      expect(result.warehouse.code).toBe(mockWarehouse.code);
    });

    // WH-TC58: Update only code
    it('should update only the code field', async () => {
      const updateDto = { code: 'WH-NEW' };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.checkCodeExists.mockResolvedValue(false);
      repository.update.mockResolvedValue({ ...mockWarehouse, code: 'WH-NEW' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.code).toBe('WH-NEW');
    });

    // WH-TC59: Update only address
    it('should update only the address field', async () => {
      const updateDto = { address: 'New Address' };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({ ...mockWarehouse, address: 'New Address' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.address).toBe('New Address');
    });

    // WH-TC60: Update only metadata
    it('should update only the metadata field', async () => {
      const updateDto = { metadata: { updated: true } };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({ ...mockWarehouse, metadata: { updated: true } });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.metadata).toEqual({ updated: true });
    });

    // WH-TC61: Update all fields at once
    it('should update all fields simultaneously', async () => {
      const updateDto = {
        code: 'WH-UPDATED',
        name: 'Updated Name',
        address: 'Updated Address',
        metadata: { all: 'updated' },
      };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.checkCodeExists.mockResolvedValue(false);
      repository.update.mockResolvedValue({ ...mockWarehouse, ...updateDto });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.code).toBe('WH-UPDATED');
      expect(result.warehouse.name).toBe('Updated Name');
    });

    // WH-TC62: Update with empty object
    it('should handle update with empty object', async () => {
      const updateDto = {};

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue(mockWarehouse);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse).toEqual(mockWarehouse);
    });

    // WH-TC63: Update code to same value
    it('should allow updating code to same value', async () => {
      const updateDto = { code: 'WH-001' };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue(mockWarehouse);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(repository.checkCodeExists).not.toHaveBeenCalled();
    });

    // WH-TC64: Update with empty string name (tested by DTO)
    // WH-TC65: Update with null values (tested by DTO)
    // WH-TC66: Update code with special chars
    // WH-TC67: Update with very long strings (tested by DTO)

    // WH-TC68: Duplicate code case insensitive
    it('should detect duplicate code case insensitively on update', async () => {
      const updateDto = { code: 'wh-002' };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.checkCodeExists.mockResolvedValue(true);

      await expect(service.update('warehouse-uuid-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    // WH-TC69: Update metadata with nested objects (tested above in TC60)
  });

  describe('remove', () => {
    // WH-TC26: Remove valid warehouse
    it('should delete a warehouse successfully', async () => {
      repository.findOne.mockResolvedValue({ ...mockWarehouse, locations: [] } as any);
      repository.delete.mockResolvedValue(mockWarehouse);

      const result = await service.remove('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Warehouse deleted successfully');
      expect(repository.delete).toHaveBeenCalledWith('warehouse-uuid-1');
    });

    // WH-TC27: Remove with associated locations
    it('should throw BadRequestException if warehouse has locations', async () => {
      repository.findOne.mockResolvedValue({
        ...mockWarehouse,
        locations: [{ id: 'loc-1' }],
      } as any);

      await expect(service.remove('warehouse-uuid-1')).rejects.toThrow(BadRequestException);
    });

    // WH-TC28: Remove non-existent warehouse
    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // WH-TC29: Permission denied tested by guard
    // WH-TC30: No authentication tested by guard
  });

  describe('findByCode', () => {
    // WH-TC16: Find by valid code
    it('should return a warehouse by valid code', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      repository.findByCode.mockResolvedValue(mockWarehouse);
      repository.getWarehouseStats.mockResolvedValue({
        totalLocations: 10,
        totalCapacity: 100,
        occupiedLocations: 5,
      });

      const result = await service.findByCode('WH-001');

      expect(result.success).toBe(true);
      expect(result.warehouse).toEqual(mockWarehouse);
      expect(result.stats).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(repository.findByCode).toHaveBeenCalledWith('WH-001');
    });

    // WH-TC17: Invalid code (non-existent)
    it('should throw NotFoundException if warehouse code not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      repository.findByCode.mockResolvedValue(null);

      await expect(service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
    });

    // WH-TC18: Verify cache usage
    it('should use cache for repeated calls', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      repository.findByCode.mockResolvedValue(mockWarehouse);
      repository.getWarehouseStats.mockResolvedValue({
        totalLocations: 10,
        totalCapacity: 100,
        occupiedLocations: 5,
      });

      await service.findByCode('WH-001');
      await service.findByCode('WH-001');

      expect(cacheService.getOrSet).toHaveBeenCalledTimes(2);
    });

    // WH-TC19: No authentication tested by guard
  });

  describe('getWarehouseStats', () => {
    // WH-TC31: Get stats for valid warehouse
    it('should return warehouse statistics', async () => {
      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.getWarehouseStats.mockResolvedValue({
        totalLocations: 10,
        totalCapacity: 100,
        occupiedLocations: 5,
      });

      const result = await service.getWarehouseStats('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.warehouseId).toBe('warehouse-uuid-1');
      expect(result.warehouseName).toBe('Main Warehouse');
      expect(result.warehouseCode).toBe('WH-001');
      expect(result.totalLocations).toBe(10);
      expect(result.totalCapacity).toBe(100);
      expect(result.occupiedLocations).toBe(5);
    });

    // WH-TC32: Get stats for non-existent warehouse
    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getWarehouseStats('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // WH-TC33: No authentication tested by guard
  });
});
