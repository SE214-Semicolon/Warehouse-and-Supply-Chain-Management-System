import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { QueryWarehouseDto } from '../dto/query-warehouse.dto';

describe('WarehouseController', () => {
  let controller: WarehouseController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByCode: jest.fn(),
    findOne: jest.fn(),
    getWarehouseStats: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseController],
      providers: [{ provide: WarehouseService, useValue: mockService }],
    }).compile();

    controller = module.get<WarehouseController>(WarehouseController);
    jest.clearAllMocks();
  });

  it('should call create on service and return result', async () => {
    const dto: CreateWarehouseDto = { code: 'W1', name: 'WH', address: 'Addr' } as any;
    const serviceResult = { success: true, data: { id: 'w1', ...dto } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call findAll on service and return result', async () => {
    const query: QueryWarehouseDto = { page: 1, limit: 10 } as any;
    const serviceResult = { success: true, data: [{ id: 'w1' }], total: 1, page: 1, limit: 10 };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call findByCode and findOne', async () => {
    const byCode = { success: true, data: { id: 'w1' } };
    const byId = { success: true, data: { id: 'w1' } };
    mockService.findByCode.mockResolvedValue(byCode);
    mockService.findOne.mockResolvedValue(byId);

    const r1 = await controller.findByCode('W1');
    const r2 = await controller.findOne('w1');

    expect(mockService.findByCode).toHaveBeenCalledWith('W1');
    expect(mockService.findOne).toHaveBeenCalledWith('w1');
    expect(r1).toEqual(byCode);
    expect(r2).toEqual(byId);
  });

  it('should call getWarehouseStats', async () => {
    const svcRes = { success: true, data: { items: 10 } };
    mockService.getWarehouseStats.mockResolvedValue(svcRes);
    const res = await controller.getStats('w1');
    expect(mockService.getWarehouseStats).toHaveBeenCalledWith('w1');
    expect(res).toEqual(svcRes);
  });

  it('should call update and remove', async () => {
    const updRes = { success: true, data: { id: 'w1', name: 'New' } };
    const delRes = { success: true, message: 'ok' };
    mockService.update.mockResolvedValue(updRes);
    mockService.remove.mockResolvedValue(delRes);

    const r1 = await controller.update('w1', { name: 'New' } as UpdateWarehouseDto);
    const r2 = await controller.remove('w1');

    expect(mockService.update).toHaveBeenCalledWith('w1', { name: 'New' });
    expect(mockService.remove).toHaveBeenCalledWith('w1');
    expect(r1).toEqual(updRes);
    expect(r2).toEqual(delRes);
  });
});
