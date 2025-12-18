import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/customer/create-customer.dto';
import { UpdateCustomerDto } from '../dto/customer/update-customer.dto';
import { QueryCustomerDto } from '../dto/customer/query-customer.dto';

describe('CustomerController', () => {
  let controller: CustomerController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [{ provide: CustomerService, useValue: mockService }],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create customer', async () => {
    const dto: CreateCustomerDto = {
      code: 'CUST-001',
      name: 'Test Customer',
      email: 'test@example.com',
    } as any;
    const serviceResult = { success: true, data: { id: 'c1', code: 'CUST-001' } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should list customers', async () => {
    const query: QueryCustomerDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'c1', code: 'CUST-001' }],
      total: 1,
    };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get customer by id', async () => {
    const serviceResult = { success: true, data: { id: 'c1', code: 'CUST-001' } };
    mockService.findById.mockResolvedValue(serviceResult);

    const res = await controller.findOne('c1');

    expect(mockService.findById).toHaveBeenCalledWith('c1');
    expect(res).toEqual(serviceResult);
  });

  it('should update customer', async () => {
    const dto: UpdateCustomerDto = { name: 'Updated Name' };
    const serviceResult = { success: true, message: 'Customer updated' };
    mockService.update.mockResolvedValue(serviceResult);

    const res = await controller.update('c1', dto);

    expect(mockService.update).toHaveBeenCalledWith('c1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should delete customer', async () => {
    const serviceResult = { success: true, message: 'Customer deleted' };
    mockService.softDelete.mockResolvedValue(serviceResult);

    const res = await controller.remove('c1');

    expect(mockService.softDelete).toHaveBeenCalledWith('c1');
    expect(res).toEqual(serviceResult);
  });
});
