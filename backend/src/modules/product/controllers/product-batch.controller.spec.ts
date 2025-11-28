import { Test, TestingModule } from '@nestjs/testing';
import { ProductBatchController } from './product-batch.controller';
import { ProductBatchService } from '../services/product-batch.service';
import { CreateProductBatchDto } from '../dto/create-product-batch.dto';
import { UpdateProductBatchDto } from '../dto/update-product-batch.dto';
import { QueryProductBatchDto } from '../dto/query-product-batch.dto';

describe('ProductBatchController', () => {
  let controller: ProductBatchController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findExpiring: jest.fn(),
    findByProduct: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBatchController],
      providers: [{ provide: ProductBatchService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductBatchController>(ProductBatchController);
    jest.clearAllMocks();
  });

  it('should call create on service and return result', async () => {
    const dto: CreateProductBatchDto = {
      productId: 'p1',
      batchNo: 'B1',
      quantity: 10,
    } as any;
    const serviceResult = { success: true, data: { id: 'b1', ...dto } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call findAll on service and return result', async () => {
    const query: QueryProductBatchDto = { page: 1, limit: 5 } as any;
    const serviceResult = { success: true, data: [{ id: 'b1' }], total: 1, page: 1, limit: 5 };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call findExpiring on service and return result', async () => {
    const serviceResult = { success: true, data: [{ id: 'b1' }], message: 'in 30 days' };
    mockService.findExpiring.mockResolvedValue(serviceResult);

    const res = await controller.findExpiring(30 as any, 1 as any, 20 as any);

    expect(mockService.findExpiring).toHaveBeenCalledWith(30, 1, 20);
    expect(res).toEqual(serviceResult);
  });

  it('should call findByProduct', async () => {
    const serviceResult = { success: true, data: [{ id: 'b1' }] };
    mockService.findByProduct.mockResolvedValue(serviceResult);

    const res = await controller.findByProduct('p1');

    expect(mockService.findByProduct).toHaveBeenCalledWith('p1');
    expect(res).toEqual(serviceResult);
  });

  it('should call findOne/update/remove', async () => {
    const one = { success: true, data: { id: 'b1' } };
    const upd = { success: true, data: { id: 'b1', quantity: 20 } };
    const del = { success: true, message: 'deleted' };
    mockService.findOne.mockResolvedValue(one);
    mockService.update.mockResolvedValue(upd);
    mockService.remove.mockResolvedValue(del);

    const r1 = await controller.findOne('b1');
    const r2 = await controller.update('b1', { quantity: 20 } as UpdateProductBatchDto);
    const r3 = await controller.remove('b1');

    expect(mockService.findOne).toHaveBeenCalledWith('b1');
    expect(mockService.update).toHaveBeenCalledWith('b1', { quantity: 20 });
    expect(mockService.remove).toHaveBeenCalledWith('b1');
    expect(r1).toEqual(one);
    expect(r2).toEqual(upd);
    expect(r3).toEqual(del);
  });
});
