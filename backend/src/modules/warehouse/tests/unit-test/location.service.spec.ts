import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../../services/location.service';
import { LocationRepository } from '../../repositories/location.repository';
import { WarehouseRepository } from '../../repositories/warehouse.repository';
import { CacheService } from '../../../../cache/cache.service';
import { AuditMiddleware } from '../../../../database/middleware/audit.middleware';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('LocationService', () => {
  let service: LocationService;
  let locationRepo: jest.Mocked<LocationRepository>;
  let warehouseRepo: jest.Mocked<WarehouseRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockWarehouse = {
    id: 'warehouse-uuid-1',
    code: 'WH-001',
    name: 'Main Warehouse',
    address: '123 Main Street',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    locations: [],
  };

  const mockLocation = {
    id: 'location-uuid-1',
    warehouseId: 'warehouse-uuid-1',
    code: 'A-01-01',
    name: 'Aisle A, Rack 01, Level 01',
    capacity: 100,
    type: 'shelf',
    properties: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    warehouse: mockWarehouse,
    inventory: [],
  };

  beforeEach(async () => {
    const mockLocationRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCode: jest.fn(),
      findByWarehouse: jest.fn(),
      findAvailableLocations: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      checkCodeExistsInWarehouse: jest.fn(),
      getLocationStats: jest.fn(),
    };

    const mockWarehouseRepo = {
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

    const mockAuditMiddleware = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: LocationRepository,
          useValue: mockLocationRepo,
        },
        {
          provide: WarehouseRepository,
          useValue: mockWarehouseRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AuditMiddleware,
          useValue: mockAuditMiddleware,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    locationRepo = module.get(LocationRepository);
    warehouseRepo = module.get(WarehouseRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // LOC-TC01: Create with valid data
    it('should create a location successfully', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-01',
        name: 'Aisle A, Rack 01, Level 01',
        capacity: 100,
        type: 'shelf',
        properties: {},
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue(mockLocation);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLocation);
      expect(warehouseRepo.findOne).toHaveBeenCalledWith(createDto.warehouseId);
      expect(locationRepo.create).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // LOC-TC02: Duplicate code in same warehouse
    it('should throw ConflictException if location code already exists', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-01',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    // LOC-TC03: Warehouse does not exist
    it('should throw NotFoundException if warehouse does not exist', async () => {
      const createDto = {
        warehouseId: 'invalid-warehouse-id',
        code: 'A-01-01',
      };

      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    // LOC-TC04: Missing required fields tested by DTO validation
    // LOC-TC05: Permission denied tested by guard
    // LOC-TC06: No authentication tested by guard

    // LOC-TC07: Empty string code (tested by DTO)
    // LOC-TC08: Whitespace only name (tested by DTO)
    // LOC-TC09: Negative capacity (tested by DTO)
    // LOC-TC10: Zero capacity
    it('should create location with zero capacity', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-02',
        name: 'Zero Capacity Location',
        capacity: 0,
        type: 'buffer',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue({ ...mockLocation, capacity: 0 });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.capacity).toBe(0);
    });

    // LOC-TC11: Very large capacity
    it('should create location with very large capacity', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-03',
        name: 'Large Capacity Location',
        capacity: 999999,
        type: 'bulk',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue({ ...mockLocation, capacity: 999999 });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.capacity).toBe(999999);
    });

    // LOC-TC12: Code with special characters
    it('should create location with special characters in code', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-01@SPECIAL',
        name: 'Special Location',
        capacity: 100,
        type: 'shelf',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue({ ...mockLocation, code: createDto.code });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe('A-01-01@SPECIAL');
    });

    // LOC-TC13: Very long code (tested by DTO)
    // LOC-TC14: Invalid type value (tested by DTO)

    // LOC-TC15: Duplicate code case insensitive same warehouse
    it('should detect duplicate code case insensitively in same warehouse', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'a-01-01',
        name: 'Test Location',
        capacity: 100,
        type: 'shelf',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    // LOC-TC16: Same code different warehouse
    it('should allow same code in different warehouse', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-2',
        code: 'A-01-01',
        name: 'Same Code Different Warehouse',
        capacity: 100,
        type: 'shelf',
      };

      const warehouse2 = { ...mockWarehouse, id: 'warehouse-uuid-2', code: 'WH-002' };
      warehouseRepo.findOne.mockResolvedValue(warehouse2);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue({ ...mockLocation, warehouseId: 'warehouse-uuid-2' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.warehouseId).toBe('warehouse-uuid-2');
    });

    // LOC-TC17: SQL injection in code (Prisma handles)
    // LOC-TC18: Complex nested properties
    it('should create location with complex nested properties', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-04',
        name: 'Complex Properties Location',
        capacity: 100,
        type: 'cold-storage',
        properties: {
          temperature: { min: -20, max: 5 },
          humidity: { controlled: true, range: [40, 60] },
          certifications: ['FDA', 'HACCP'],
        },
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.create.mockResolvedValue({ ...mockLocation, properties: createDto.properties });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.properties).toEqual(createDto.properties);
    });
  });

  describe('findAll', () => {
    // LOC-TC07: Get all with default pagination
    it('should return paginated locations with default settings', async () => {
      const query = {
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    // LOC-TC08: Filter by warehouse
    it('should filter by warehouse', async () => {
      const query = {
        warehouseId: 'warehouse-uuid-1',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC09: Filter by type
    it('should filter by type', async () => {
      const query = {
        type: 'shelf',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC10: Filter by search
    it('should filter by search query', async () => {
      const query = {
        search: 'A-01',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC11: Pagination page 1
    it('should handle pagination page 1', async () => {
      const query = {
        limit: 10,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 15,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    // LOC-TC12: Pagination page 2
    it('should handle pagination page 2', async () => {
      const query = {
        limit: 10,
        page: 2,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [],
        total: 15,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    // LOC-TC13: No authentication tested by guard

    // LOC-TC26-30: Pagination edge cases (similar to warehouse)
    // LOC-TC31: Search with empty string
    it('should handle search with empty string', async () => {
      const query = {
        search: '',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
    });

    // LOC-TC32: SQL injection attempt
    it('should safely handle SQL injection attempts', async () => {
      const query = {
        search: "'; DROP TABLE locations; --",
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    // LOC-TC33: Filter warehouse + type
    it('should handle combined warehouse and type filters', async () => {
      const query = {
        warehouseId: 'warehouse-uuid-1',
        type: 'shelf',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC34: Filter warehouse + search
    it('should handle combined warehouse and search filters', async () => {
      const query = {
        warehouseId: 'warehouse-uuid-1',
        search: 'A-01',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC35: Filter type + search
    it('should handle combined type and search filters', async () => {
      const query = {
        type: 'shelf',
        search: 'Aisle',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC36: All filters combined
    it('should handle all filters combined', async () => {
      const query = {
        warehouseId: 'warehouse-uuid-1',
        type: 'shelf',
        search: 'A-01',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    // LOC-TC37: Invalid warehouse ID filter
    it('should return empty result for invalid warehouse ID', async () => {
      const query = {
        warehouseId: 'invalid-uuid',
        limit: 20,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [],
        total: 0,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    // LOC-TC38-42: Case insensitive, partial match, sort (Prisma handles)
  });

  describe('findOne', () => {
    // LOC-TC14: Find by valid ID
    it('should return a location by valid ID', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      const result = await service.findOne('location-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLocation);
      expect(result.stats).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // LOC-TC15: Invalid ID (non-existent)
    it('should throw NotFoundException if location not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // LOC-TC16: Invalid ID format tested by DTO validation
    // LOC-TC17: No authentication tested by guard
  });

  describe('findByCode', () => {
    // LOC-TC18: Find by valid code
    it('should return a location by valid code', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findByCode.mockResolvedValue(mockLocation);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      const result = await service.findByCode('warehouse-uuid-1', 'A-01-01');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLocation);
      expect(result.stats).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // LOC-TC19: Invalid code (non-existent)
    it('should throw NotFoundException if location code not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode('warehouse-uuid-1', 'INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    // LOC-TC20: Verify cache usage
    it('should use cache for repeated calls', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findByCode.mockResolvedValue(mockLocation);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      await service.findByCode('warehouse-uuid-1', 'A-01-01');
      await service.findByCode('warehouse-uuid-1', 'A-01-01');

      expect(cacheService.getOrSet).toHaveBeenCalledTimes(2);
    });

    // LOC-TC21: No authentication tested by guard
  });

  describe('findByWarehouse', () => {
    // LOC-TC22: Find by valid warehouse
    it('should return locations by warehouse', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.findByWarehouse.mockResolvedValue([mockLocation]);

      const result = await service.findByWarehouse('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.warehouse).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    // LOC-TC23: Invalid warehouse ID
    it('should throw NotFoundException if warehouse not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.findByWarehouse('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // LOC-TC24: Verify cache usage
    it('should use cache for repeated calls', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.findByWarehouse.mockResolvedValue([mockLocation]);

      await service.findByWarehouse('warehouse-uuid-1');
      await service.findByWarehouse('warehouse-uuid-1');

      expect(cacheService.getOrSet).toHaveBeenCalledTimes(2);
    });

    // LOC-TC25: No authentication tested by guard
  });

  describe('findAvailableLocations', () => {
    // LOC-TC26: Get available locations
    it('should return available locations', async () => {
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.findAvailableLocations.mockResolvedValue([mockLocation]);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      const result = await service.findAvailableLocations('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.warehouseId).toBe('warehouse-uuid-1');
    });

    // LOC-TC27: Filter by min capacity
    it('should filter by minCapacity', async () => {
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.findAvailableLocations.mockResolvedValue([mockLocation]);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      const result = await service.findAvailableLocations('warehouse-uuid-1', 50);

      expect(result.success).toBe(true);
      expect(result.minCapacity).toBe(50);
    });

    // LOC-TC28: Invalid warehouse ID
    it('should throw NotFoundException if warehouse not found', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.findAvailableLocations('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // LOC-TC29: No available locations
    it('should return empty array when no available locations', async () => {
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.findAvailableLocations.mockResolvedValue([mockLocation]);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 100,
        totalReservedQuantity: 0,
        utilizationRate: 100,
      });

      const result = await service.findAvailableLocations('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    // LOC-TC30: No authentication tested by guard
  });

  describe('update', () => {
    // LOC-TC31: Update with valid data
    it('should update a location successfully', async () => {
      const updateDto = {
        name: 'Updated Location',
      };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, name: 'Updated Location' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Location');
    });

    // LOC-TC32: Update with duplicate code
    it('should throw ConflictException if new code already exists', async () => {
      const updateDto = {
        code: 'A-01-02',
      };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(true);

      await expect(service.update('location-uuid-1', updateDto)).rejects.toThrow(ConflictException);
    });

    // LOC-TC33: Update non-existent location
    it('should throw NotFoundException if location not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    // LOC-TC34: Invalid ID format tested by DTO validation
    // LOC-TC35: Permission denied tested by guard
    // LOC-TC36: No authentication tested by guard

    // LOC-TC87: Update only name
    it('should update only the name field', async () => {
      const updateDto = { name: 'New Name Only' };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, name: 'New Name Only' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New Name Only');
      expect(result.data.code).toBe(mockLocation.code);
    });

    // LOC-TC88: Update only code
    it('should update only the code field', async () => {
      const updateDto = { code: 'A-NEW-01' };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.update.mockResolvedValue({ ...mockLocation, code: 'A-NEW-01' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe('A-NEW-01');
    });

    // LOC-TC89: Update only capacity
    it('should update only the capacity field', async () => {
      const updateDto = { capacity: 200 };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, capacity: 200 });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.capacity).toBe(200);
    });

    // LOC-TC90: Update only type
    it('should update only the type field', async () => {
      const updateDto = { type: 'pallet' };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, type: 'pallet' });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('pallet');
    });

    // LOC-TC91: Update only properties
    it('should update only the properties field', async () => {
      const updateDto = { properties: { updated: true } };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, properties: { updated: true } });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.properties).toEqual({ updated: true });
    });

    // LOC-TC92: Update all fields at once
    it('should update all fields simultaneously', async () => {
      const updateDto = {
        code: 'A-UPDATED',
        name: 'Updated Name',
        capacity: 150,
        type: 'bulk',
        properties: { all: 'updated' },
      };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(false);
      locationRepo.update.mockResolvedValue({ ...mockLocation, ...updateDto });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe('A-UPDATED');
      expect(result.data.name).toBe('Updated Name');
      expect(result.data.capacity).toBe(150);
    });

    // LOC-TC93: Update with empty object
    it('should handle update with empty object', async () => {
      const updateDto = {};

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue(mockLocation);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLocation);
    });

    // LOC-TC94: Update code to same value
    it('should allow updating code to same value', async () => {
      const updateDto = { code: 'A-01-01' };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue(mockLocation);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(locationRepo.checkCodeExistsInWarehouse).not.toHaveBeenCalled();
    });

    // LOC-TC95: Update capacity to negative (tested by DTO)
    // LOC-TC96: Update capacity to zero
    it('should allow updating capacity to zero', async () => {
      const updateDto = { capacity: 0 };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, capacity: 0 });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.capacity).toBe(0);
    });

    // LOC-TC97: Update capacity smaller than current usage (business logic not in service)
    // LOC-TC98: Update with empty string name (tested by DTO)
    // LOC-TC99: Update with null values (tested by DTO)
    // LOC-TC100: Update code with special chars

    // LOC-TC101: Duplicate code case insensitive
    it('should detect duplicate code case insensitively on update', async () => {
      const updateDto = { code: 'a-01-02' };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(true);

      await expect(service.update('location-uuid-1', updateDto)).rejects.toThrow(ConflictException);
    });

    // LOC-TC102: Update type to invalid value (tested by DTO)
    // LOC-TC103: Update properties with nested objects (tested above in TC91)
  });

  describe('remove', () => {
    // LOC-TC37: Remove valid location
    it('should delete a location successfully', async () => {
      locationRepo.findOne.mockResolvedValue({ ...mockLocation, inventory: [] } as any);
      locationRepo.delete.mockResolvedValue(mockLocation);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.remove('location-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location deleted successfully');
      expect(locationRepo.delete).toHaveBeenCalledWith('location-uuid-1');
    });

    // LOC-TC38: Remove with inventory
    it('should throw BadRequestException if location has inventory', async () => {
      locationRepo.findOne.mockResolvedValue({
        ...mockLocation,
        inventory: [{ id: 'inv-1', availableQty: 10, reservedQty: 0 }],
      } as any);

      await expect(service.remove('location-uuid-1')).rejects.toThrow(BadRequestException);
    });

    // LOC-TC39: Remove non-existent location
    it('should throw NotFoundException if location not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // LOC-TC40: Permission denied tested by guard
    // LOC-TC41: No authentication tested by guard

    // LOC-TC109: Has inventory with zero qty
    it('should delete location with zero quantity inventory', async () => {
      locationRepo.findOne.mockResolvedValue({
        ...mockLocation,
        inventory: [{ id: 'inv-1', availableQty: 0, reservedQty: 0 }],
      } as any);
      locationRepo.delete.mockResolvedValue(mockLocation);
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.remove('location-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location deleted successfully');
    });

    // LOC-TC110: Has reserved qty only
    it('should throw BadRequestException if location has reserved quantity', async () => {
      locationRepo.findOne.mockResolvedValue({
        ...mockLocation,
        inventory: [{ id: 'inv-1', availableQty: 0, reservedQty: 5 }],
      } as any);

      await expect(service.remove('location-uuid-1')).rejects.toThrow(BadRequestException);
    });

    // LOC-TC111: Empty inventory array (tested in TC37)
    // LOC-TC112: Invalid ID format (tested by DTO/validation)
    // LOC-TC113: Concurrent delete (race condition - handled by repository)
  });

  describe('getLocationStats', () => {
    // LOC-TC42: Get stats for valid location
    it('should return location statistics', async () => {
      locationRepo.findOne.mockResolvedValue({
        ...mockLocation,
        warehouse: mockWarehouse,
      } as any);
      locationRepo.getLocationStats.mockResolvedValue({
        totalInventoryItems: 5,
        totalQuantity: 50,
        totalReservedQuantity: 10,
        utilizationRate: 50,
      });

      const result = await service.getLocationStats('location-uuid-1');

      expect(result.success).toBe(true);
      expect(result.locationId).toBe('location-uuid-1');
      expect(result.locationCode).toBe('A-01-01');
      expect(result.locationName).toBe('Aisle A, Rack 01, Level 01');
      expect(result.warehouseName).toBe('Main Warehouse');
      expect(result.capacity).toBe(100);
      expect(result.totalInventoryItems).toBe(5);
      expect(result.totalQuantity).toBe(50);
      expect(result.totalReservedQuantity).toBe(10);
      expect(result.utilizationRate).toBe(50);
    });

    // LOC-TC43: Get stats for non-existent location
    it('should throw NotFoundException if location not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.getLocationStats('invalid-id')).rejects.toThrow(NotFoundException);
    });

    // LOC-TC44: No authentication tested by guard
  });
});
