import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupplierService } from '../supplier.service';
import { SupplierRepository } from '../repositories/supplier.repository';
import { Supplier } from '@prisma/client';

describe('SupplierService', () => {
  let service: SupplierService;
  let repo: jest.Mocked<SupplierRepository>;

  const mockSupplier: Supplier = {
    id: 'supplier-uuid-1',
    code: 'SUP-001',
    name: 'Test Supplier',
    contactInfo: {
      phone: '0901234567',
      email: 'test@supplier.com',
      contactPerson: 'John Doe',
    },
    address: '123 Test Street',
    createdAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      countActivePurchaseOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        {
          provide: SupplierRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    repo = module.get(SupplierRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // SUP-TC01: Create with valid data
    it('should create a supplier successfully with valid data', async () => {
      const createDto = {
        code: 'SUP-001',
        name: 'Test Supplier',
        contactInfo: {
          phone: '0901234567',
          email: 'test@supplier.com',
          contactPerson: 'John Doe',
        },
        address: '123 Test Street',
      };

      repo.findUnique.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSupplier);
      expect(repo.findUnique).toHaveBeenCalledWith({ code: createDto.code });
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // SUP-TC02: Duplicate code
    it('should throw BadRequestException if code already exists', async () => {
      const createDto = {
        code: 'SUP-001',
        name: 'Test Supplier',
      };

      repo.findUnique.mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Supplier code already exists');
      expect(repo.create).not.toHaveBeenCalled();
    });

    // SUP-TC03: Create without code
    it('should create a supplier successfully without code', async () => {
      const createDto = {
        name: 'Test Supplier',
        contactInfo: {
          phone: '0901234567',
          email: 'test@supplier.com',
        },
      };

      const supplierWithoutCode = { ...mockSupplier, code: null };
      repo.create.mockResolvedValue(supplierWithoutCode);

      const result = await service.create(createDto);

      expect(result).toEqual(supplierWithoutCode);
      expect(repo.findUnique).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // SUP-TC04: Missing required fields name (tested by DTO)
    // SUP-TC05: Missing optional field contactInfo
    it('should create a supplier without contactInfo', async () => {
      const createDto = {
        code: 'SUP-001',
        name: 'Test Supplier',
        address: '123 Test Street',
      };

      const supplierWithoutContact = { ...mockSupplier, contactInfo: null };
      repo.findUnique.mockResolvedValue(null);
      repo.create.mockResolvedValue(supplierWithoutContact);

      const result = await service.create(createDto);

      expect(result).toEqual(supplierWithoutContact);
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // SUP-TC06: Missing optional field address
    it('should create a supplier without address', async () => {
      const createDto = {
        code: 'SUP-001',
        name: 'Test Supplier',
        contactInfo: {
          phone: '0901234567',
        },
      };

      const supplierWithoutAddress = { ...mockSupplier, address: null };
      repo.findUnique.mockResolvedValue(null);
      repo.create.mockResolvedValue(supplierWithoutAddress);

      const result = await service.create(createDto);

      expect(result).toEqual(supplierWithoutAddress);
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // SUP-TC07: Invalid email format (tested by DTO)
    // SUP-TC08: Invalid phone format (tested by DTO)
    // SUP-TC09: Permission denied (tested by guard)
    // SUP-TC10: No authentication (tested by guard)
  });

  describe('findAll', () => {
    // SUP-TC11: Get all with default pagination
    it('should return all suppliers with default pagination', async () => {
      const query = {};

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    // SUP-TC12: Filter by name
    it('should filter suppliers by name', async () => {
      const query = {
        name: 'Test',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({
              contains: 'Test',
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });

    // SUP-TC13: Filter by code
    it('should filter suppliers by code', async () => {
      const query = {
        code: 'SUP-001',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: expect.objectContaining({
              contains: 'SUP-001',
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });

    // SUP-TC14: Filter by phone
    it('should filter suppliers by phone', async () => {
      const query = {
        phone: '0901',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
    });

    // SUP-TC15: Filter by search query (q param)
    it('should filter suppliers by search query', async () => {
      const query = {
        q: 'Test',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({ contains: 'Test' }),
              }),
              expect.objectContaining({
                code: expect.objectContaining({ contains: 'Test' }),
              }),
            ]),
          }),
        }),
      );
    });

    // SUP-TC16: Pagination page 1
    it('should return suppliers for page 1', async () => {
      const query = {
        page: 1,
        pageSize: 10,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(25);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    // SUP-TC17: Pagination page 2
    it('should return suppliers for page 2', async () => {
      const query = {
        page: 2,
        pageSize: 10,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(25);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    // SUP-TC18: Pagination with pageSize = 0
    // This is an edge case that should be handled by DTO validation

    // SUP-TC19: Sort by name asc
    it('should sort suppliers by name ascending', async () => {
      const query = {
        sort: 'name:asc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }],
        }),
      );
    });

    // SUP-TC20: Sort by name desc
    it('should sort suppliers by name descending', async () => {
      const query = {
        sort: 'name:desc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'desc' }],
        }),
      );
    });

    // SUP-TC21: Sort by code asc
    it('should sort suppliers by code ascending', async () => {
      const query = {
        sort: 'code:asc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ code: 'asc' }],
        }),
      );
    });

    // SUP-TC22: Sort by createdAt desc (default)
    it('should sort suppliers by createdAt descending by default', async () => {
      const query = {
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
    });

    // SUP-TC23: Sort by multiple fields
    it('should sort suppliers by multiple fields', async () => {
      const query = {
        sort: 'name:asc,createdAt:desc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });

    // SUP-TC24: Combine multiple filters
    it('should combine multiple filters', async () => {
      const query = {
        name: 'Test',
        code: 'SUP',
        page: 1,
        pageSize: 10,
      };

      repo.findMany.mockResolvedValue([mockSupplier]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockSupplier]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object),
            code: expect.any(Object),
          }),
        }),
      );
    });

    // SUP-TC25: No authentication (tested by guard)
    // SUP-TC26: SQL injection test (handled by Prisma)
    // SUP-TC27: Pagination with negative page (tested by DTO)
    // SUP-TC28: Pagination with excessive pageSize (tested by DTO)
  });

  describe('findOne', () => {
    // SUP-TC29: Find by valid ID
    it('should return a supplier by valid ID', async () => {
      repo.findById.mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-uuid-1');

      expect(result).toEqual(mockSupplier);
      expect(repo.findById).toHaveBeenCalledWith('supplier-uuid-1');
    });

    // SUP-TC30: Supplier not found
    it('should throw NotFoundException if supplier not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Supplier not found');
    });

    // SUP-TC31: Invalid ID format (should return 400, currently returns 500)
    // SUP-TC32: No authentication (tested by guard)
  });

  describe('update', () => {
    // SUP-TC32: Update name successfully
    it('should update supplier name successfully', async () => {
      const updateDto = {
        name: 'Updated Supplier',
      };

      repo.findById.mockResolvedValue(mockSupplier);
      repo.update.mockResolvedValue({ ...mockSupplier, name: 'Updated Supplier' });

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result.name).toBe('Updated Supplier');
      expect(repo.update).toHaveBeenCalledWith(
        'supplier-uuid-1',
        expect.objectContaining({
          name: 'Updated Supplier',
        }),
      );
    });

    // SUP-TC33: Update code successfully
    it('should update supplier code successfully', async () => {
      const updateDto = {
        code: 'SUP-002',
      };

      repo.findById.mockResolvedValue(mockSupplier);
      repo.findUnique.mockResolvedValue(null);
      repo.update.mockResolvedValue({ ...mockSupplier, code: 'SUP-002' });

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result.code).toBe('SUP-002');
      expect(repo.findUnique).toHaveBeenCalledWith({ code: 'SUP-002' });
    });

    // SUP-TC34: Update code with duplicate value
    it('should throw BadRequestException if new code already exists', async () => {
      const updateDto = {
        code: 'SUP-002',
      };

      const anotherSupplier = { ...mockSupplier, id: 'supplier-uuid-2', code: 'SUP-002' };
      repo.findById.mockResolvedValue(mockSupplier);
      repo.findUnique.mockResolvedValue(anotherSupplier);

      await expect(service.update('supplier-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('supplier-uuid-1', updateDto)).rejects.toThrow(
        'Supplier code already exists',
      );
    });

    // SUP-TC35: Update contactInfo
    it('should update supplier contactInfo successfully', async () => {
      const updateDto = {
        contactInfo: {
          phone: '0999999999',
          email: 'new@email.com',
        },
      };

      repo.findById.mockResolvedValue(mockSupplier);
      repo.update.mockResolvedValue({
        ...mockSupplier,
        contactInfo: updateDto.contactInfo,
      });

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result.contactInfo).toEqual(updateDto.contactInfo);
    });

    // SUP-TC36: Update address
    it('should update supplier address successfully', async () => {
      const updateDto = {
        address: 'New Address',
      };

      repo.findById.mockResolvedValue(mockSupplier);
      repo.update.mockResolvedValue({ ...mockSupplier, address: 'New Address' });

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result.address).toBe('New Address');
    });

    // SUP-TC37: Update multiple fields at once
    it('should update multiple fields at once', async () => {
      const updateDto = {
        code: 'SUP-003',
        name: 'New Supplier Name',
        contactInfo: {
          phone: '0888888888',
        },
        address: 'New Address',
      };

      repo.findById.mockResolvedValue(mockSupplier);
      repo.findUnique.mockResolvedValue(null);
      repo.update.mockResolvedValue({
        ...mockSupplier,
        ...updateDto,
      });

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result.code).toBe('SUP-003');
      expect(result.name).toBe('New Supplier Name');
      expect(result.address).toBe('New Address');
    });

    // SUP-TC38: Update non-existent supplier
    it('should throw NotFoundException if supplier not found for update', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('invalid-id', { name: 'Test' })).rejects.toThrow(
        'Supplier not found',
      );
    });

    // SUP-TC39: Update with empty body
    it('should handle update with empty body', async () => {
      const updateDto = {};

      repo.findById.mockResolvedValue(mockSupplier);
      repo.update.mockResolvedValue(mockSupplier);

      const result = await service.update('supplier-uuid-1', updateDto);

      expect(result).toEqual(mockSupplier);
    });

    // SUP-TC40: Permission denied (tested by guard)
    // SUP-TC41: No authentication (tested by guard)
  });

  describe('remove', () => {
    // SUP-TC41: Delete supplier successfully
    it('should delete a supplier successfully', async () => {
      repo.findById.mockResolvedValue(mockSupplier);
      repo.remove.mockResolvedValue(mockSupplier);

      await service.remove('supplier-uuid-1');

      expect(repo.findById).toHaveBeenCalledWith('supplier-uuid-1');
      expect(repo.remove).toHaveBeenCalledWith('supplier-uuid-1');
    });

    // SUP-TC42: Supplier not found
    it('should throw NotFoundException if supplier not found for deletion', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow('Supplier not found');
    });

    // SUP-TC43: Delete supplier with active POs (TODO in code)
    // This test would require checking Purchase Orders before deletion

    // SUP-TC44: Permission denied role procurement (tested by guard)
    // SUP-TC45: Permission denied role warehouse_staff (tested by guard)
  });
});
