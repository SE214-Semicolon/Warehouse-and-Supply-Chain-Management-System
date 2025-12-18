import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/supplier/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/supplier/update-supplier.dto';
import { QuerySupplierDto } from '../dto/supplier/query-supplier.dto';

describe('SupplierController', () => {
  let controller: SupplierController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [{ provide: SupplierService, useValue: mockService }],
    }).compile();

    controller = module.get<SupplierController>(SupplierController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create supplier', async () => {
    const dto: CreateSupplierDto = {
      code: 'SUP-001',
      name: 'Test Supplier',
    } as any;
    const serviceResult = { success: true, data: { id: 's1', code: 'SUP-001' } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should list suppliers', async () => {
    const query: QuerySupplierDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 's1', code: 'SUP-001' }],
      total: 1,
    };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get supplier by id', async () => {
    const serviceResult = { success: true, data: { id: 's1', code: 'SUP-001' } };
    mockService.findOne.mockResolvedValue(serviceResult);

    const res = await controller.findOne('s1');

    expect(mockService.findOne).toHaveBeenCalledWith('s1');
    expect(res).toEqual(serviceResult);
  });

  it('should update supplier', async () => {
    const dto: UpdateSupplierDto = { name: 'Updated Supplier' };
    const serviceResult = { success: true, message: 'Supplier updated' };
    mockService.update.mockResolvedValue(serviceResult);

    const res = await controller.update('s1', dto);

    expect(mockService.update).toHaveBeenCalledWith('s1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should delete supplier', async () => {
    const serviceResult = { success: true, message: 'Supplier deleted' };
    mockService.remove.mockResolvedValue(serviceResult);

    const res = await controller.remove('s1');

    expect(mockService.remove).toHaveBeenCalledWith('s1');
    expect(res).toEqual(serviceResult);
  });
});
