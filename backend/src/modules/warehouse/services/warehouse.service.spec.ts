import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseService } from './warehouse.service';
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
