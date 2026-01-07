import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerService } from '../../services/customer.service';
import { CustomerRepository } from '../../repositories/customer.repository';
import { Customer } from '@prisma/client';

describe('CustomerService - Unit Tests', () => {
  let service: CustomerService;
  let repo: jest.Mocked<CustomerRepository>;

  const mockCustomer: Customer = {
    id: 'customer-uuid-1',
    code: 'CUST-001',
    name: 'Test Customer',
    contactInfo: {
      phone: '0901234567',
      email: 'test@customer.com',
      contactPerson: 'Jane Smith',
    },
    address: '456 Customer Street',
    createdAt: new Date(),
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
      countActiveSalesOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repo = module.get(CustomerRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // CUST-TC01: Create with valid data
    it('should create a customer successfully with valid data', async () => {
      const createDto = {
        code: 'CUST-001',
        name: 'Test Customer',
        contactInfo: {
          phone: '0901234567',
          email: 'test@customer.com',
          contactPerson: 'Jane Smith',
        },
        address: '456 Customer Street',
      };

      repo.findUnique.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(result.message).toBe('Customer created successfully');
      expect(repo.findUnique).toHaveBeenCalledWith({ code: createDto.code });
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // CUST-TC02: Duplicate code
    it('should throw BadRequestException if code already exists', async () => {
      const createDto = {
        code: 'CUST-001',
        name: 'Test Customer',
      };

      repo.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Customer code already exists');
      expect(repo.create).not.toHaveBeenCalled();
    });

    // CUST-TC03: Create without code
    it('should create a customer successfully without code', async () => {
      const createDto = {
        name: 'Test Customer',
        contactInfo: {
          phone: '0901234567',
          email: 'test@customer.com',
        },
      };

      const customerWithoutCode = { ...mockCustomer, code: null };
      repo.create.mockResolvedValue(customerWithoutCode);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(customerWithoutCode);
      expect(repo.findUnique).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(createDto);
    });

    // CUST-TC05: Missing optional field contactInfo
    it('should create a customer successfully without contactInfo', async () => {
      const createDto = {
        name: 'Test Customer',
      };

      const customerWithoutContact = { ...mockCustomer, contactInfo: null };
      repo.create.mockResolvedValue(customerWithoutContact);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.contactInfo).toBeNull();
    });

    // CUST-TC06: Missing optional field address
    it('should create a customer successfully without address', async () => {
      const createDto = {
        name: 'Test Customer',
      };

      const customerWithoutAddress = { ...mockCustomer, address: null };
      repo.create.mockResolvedValue(customerWithoutAddress);

      const result = await service.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.address).toBeNull();
    });
  });

  describe('findAll', () => {
    // CUST-TC11: Get all customers (pagination disabled)
    it('should return all customers without pagination', async () => {
      const query = {};

      repo.findMany.mockResolvedValue([mockCustomer]);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCustomer]);
      expect(result.total).toBe(1);
    });

    // CUST-TC12: Filter by name
    it('should filter customers by name', async () => {
      const query = {
        name: 'Test',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCustomer]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Test', mode: 'insensitive' },
          }),
        }),
      );
    });

    // CUST-TC13: Filter by code
    it('should filter customers by code', async () => {
      const query = {
        code: 'CUST-001',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: { contains: 'CUST-001', mode: 'insensitive' },
          }),
        }),
      );
    });

    // CUST-TC14: Filter by phone
    it('should filter customers by phone', async () => {
      const query = {
        phone: '0901234567',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactInfo: {
              path: ['phone'],
              string_contains: '0901234567',
            },
          }),
        }),
      );
    });

    // CUST-TC15: Filter by search query
    it('should search customers by q param', async () => {
      const query = {
        q: 'test',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    // CUST-TC16: Pagination disabled - returns all records
    it('should return all customers regardless of page/pageSize params', async () => {
      const query = {
        page: 1,
        pageSize: 10,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockCustomer]);
      expect(result.total).toBe(1);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          orderBy: expect.any(Array),
        }),
      );
      expect(repo.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expect.anything(),
          take: expect.anything(),
        }),
      );
    });

    // CUST-TC18: Sort by name asc
    it('should sort customers by name ascending', async () => {
      const query = {
        sort: 'name:asc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }],
        }),
      );
    });

    // CUST-TC19: Sort by name desc
    it('should sort customers by name descending', async () => {
      const query = {
        sort: 'name:desc',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockCustomer]);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'desc' }],
        }),
      );
    });

    // CUST-TC23: Combine multiple filters
    it('should combine multiple filters', async () => {
      const query = {
        name: 'Test',
        code: 'CUST',
        page: 1,
        pageSize: 20,
      };

      repo.findMany.mockResolvedValue([mockCustomer]);
      repo.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.success).toBe(true);
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Test', mode: 'insensitive' },
            code: { contains: 'CUST', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    // CUST-TC29: Find by valid ID
    it('should return a customer by ID', async () => {
      repo.findById.mockResolvedValue(mockCustomer);

      const result = await service.findOne('customer-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(repo.findById).toHaveBeenCalledWith('customer-uuid-1');
    });

    // CUST-TC30: Customer not found
    it('should throw NotFoundException if customer not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow('Customer not found');
    });
  });

  describe('update', () => {
    // CUST-TC33: Update name successfully
    it('should update customer name successfully', async () => {
      const updateDto = {
        name: 'Updated Customer',
      };

      const updatedCustomer = { ...mockCustomer, name: 'Updated Customer' };

      repo.findById.mockResolvedValue(mockCustomer);
      repo.update.mockResolvedValue(updatedCustomer);

      const result = await service.update('customer-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Customer');
      expect(result.message).toBe('Customer updated successfully');
    });

    // CUST-TC34: Update code successfully
    it('should update customer code successfully', async () => {
      const updateDto = {
        code: 'CUST-002',
      };

      const updatedCustomer = { ...mockCustomer, code: 'CUST-002' };

      repo.findById.mockResolvedValue(mockCustomer);
      repo.findUnique.mockResolvedValue(null);
      repo.update.mockResolvedValue(updatedCustomer);

      const result = await service.update('customer-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe('CUST-002');
    });

    // CUST-TC35: Update code with duplicate value
    it('should throw BadRequestException if updated code already exists', async () => {
      const updateDto = {
        code: 'CUST-002',
      };

      const anotherCustomer = { ...mockCustomer, id: 'customer-uuid-2', code: 'CUST-002' };

      repo.findById.mockResolvedValue(mockCustomer);
      repo.findUnique.mockResolvedValue(anotherCustomer);

      await expect(service.update('customer-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('customer-uuid-1', updateDto)).rejects.toThrow(
        'Customer code already exists',
      );
    });

    // CUST-TC39: Update non-existent customer
    it('should throw NotFoundException if customer does not exist', async () => {
      const updateDto = {
        name: 'Updated Customer',
      };

      repo.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('nonexistent-uuid', updateDto)).rejects.toThrow(
        'Customer not found',
      );
    });

    // CUST-TC40: Update with empty body
    it('should handle update with empty body', async () => {
      const updateDto = {};

      repo.findById.mockResolvedValue(mockCustomer);
      repo.update.mockResolvedValue(mockCustomer);

      const result = await service.update('customer-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
    });
  });

  describe('remove', () => {
    // CUST-TC43: Delete customer successfully
    it('should delete a customer successfully', async () => {
      repo.findById.mockResolvedValue(mockCustomer);
      repo.countActiveSalesOrders.mockResolvedValue(0);
      repo.remove.mockResolvedValue(mockCustomer);

      await service.remove('customer-uuid-1');

      expect(repo.findById).toHaveBeenCalledWith('customer-uuid-1');
      expect(repo.countActiveSalesOrders).toHaveBeenCalledWith('customer-uuid-1');
      expect(repo.remove).toHaveBeenCalledWith('customer-uuid-1');
    });

    // CUST-TC44: Customer not found
    it('should throw NotFoundException if customer not found for deletion', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent-uuid')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent-uuid')).rejects.toThrow('Customer not found');
      expect(repo.remove).not.toHaveBeenCalled();
    });

    // CUST-TC45: Delete customer with active sales orders
    it('should throw BadRequestException if customer has active sales orders', async () => {
      repo.findById.mockResolvedValue(mockCustomer);
      repo.countActiveSalesOrders.mockResolvedValue(3);

      await expect(service.remove('customer-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('customer-uuid-1')).rejects.toThrow(
        'Cannot delete customer. There are 3 active sales order(s) associated with this customer.',
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
