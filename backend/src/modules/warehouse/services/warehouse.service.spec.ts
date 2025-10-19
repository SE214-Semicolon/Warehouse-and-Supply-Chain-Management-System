import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repository: jest.Mocked<WarehouseRepository>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: WarehouseRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    repository = module.get(WarehouseRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a warehouse successfully', async () => {
      const createDto = {
        code: 'WH-001',
        name: 'Main Warehouse',
        address: '123 Main Street',
        metadata: { type: 'Cold Storage' },
      };

      repository.checkCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockWarehouse);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.warehouse).toEqual(mockWarehouse);
      expect(repository.checkCodeExists).toHaveBeenCalledWith(createDto.code);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const createDto = {
        code: 'WH-001',
        name: 'Main Warehouse',
      };

      repository.checkCodeExists.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated warehouses', async () => {
      const query = {
        search: 'Main',
        limit: 10,
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
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a warehouse by ID', async () => {
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
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a warehouse successfully', async () => {
      const updateDto = {
        name: 'Updated Warehouse',
      };

      repository.findOne.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({ ...mockWarehouse, name: 'Updated Warehouse' });

      const result = await service.update('warehouse-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.warehouse.name).toBe('Updated Warehouse');
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

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
  });

  describe('remove', () => {
    it('should delete a warehouse successfully', async () => {
      repository.findOne.mockResolvedValue({ ...mockWarehouse, locations: [] });
      repository.delete.mockResolvedValue(mockWarehouse);

      const result = await service.remove('warehouse-uuid-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Warehouse deleted successfully');
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if warehouse has locations', async () => {
      repository.findOne.mockResolvedValue({
        ...mockWarehouse,
        locations: [{ id: 'loc-1' }],
      });

      await expect(service.remove('warehouse-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
