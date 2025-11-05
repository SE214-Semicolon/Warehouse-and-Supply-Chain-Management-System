import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { LocationRepository } from '../repositories/location.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { CacheService } from '../../../cache/cache.service';
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
      expect(result.location).toEqual(mockLocation);
      expect(warehouseRepo.findOne).toHaveBeenCalledWith(createDto.warehouseId);
      expect(locationRepo.create).toHaveBeenCalled();
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    it('should throw NotFoundException if warehouse does not exist', async () => {
      const createDto = {
        warehouseId: 'invalid-warehouse-id',
        code: 'A-01-01',
      };

      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if location code already exists', async () => {
      const createDto = {
        warehouseId: 'warehouse-uuid-1',
        code: 'A-01-01',
      };

      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      locationRepo.checkCodeExistsInWarehouse.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated locations', async () => {
      const query = {
        warehouseId: 'warehouse-uuid-1',
        limit: 10,
        page: 1,
      };

      locationRepo.findAll.mockResolvedValue({
        locations: [mockLocation],
        total: 1,
      });

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.locations).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a location by ID', async () => {
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
      expect(result.location).toEqual(mockLocation);
      expect(result.stats).toBeDefined();
      expect(cacheService.getOrSet).toHaveBeenCalled();
    });

    it('should throw NotFoundException if location not found', async () => {
      cacheService.getOrSet.mockImplementation(async (_key, factory) => {
        return await factory();
      });
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a location successfully', async () => {
      const updateDto = {
        name: 'Updated Location',
      };

      locationRepo.findOne.mockResolvedValue(mockLocation);
      locationRepo.update.mockResolvedValue({ ...mockLocation, name: 'Updated Location' });

      const result = await service.update('location-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.location.name).toBe('Updated Location');
    });

    it('should throw NotFoundException if location not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a location successfully', async () => {
      locationRepo.findOne.mockResolvedValue({ ...mockLocation, inventory: [] } as any);
      locationRepo.delete.mockResolvedValue(mockLocation);

      const result = await service.remove('location-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location deleted successfully');
    });

    it('should throw NotFoundException if location not found', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if location has inventory', async () => {
      locationRepo.findOne.mockResolvedValue({
        ...mockLocation,
        inventory: [{ id: 'inv-1', availableQty: 10, reservedQty: 0 }],
      } as any);

      await expect(service.remove('location-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
