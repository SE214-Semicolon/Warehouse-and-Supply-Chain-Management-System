import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from '../services/location.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { QueryLocationDto } from '../dto/query-location.dto';

describe('LocationController', () => {
  let controller: LocationController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByWarehouse: jest.fn(),
    findAvailableLocations: jest.fn(),
    findByCode: jest.fn(),
    findOne: jest.fn(),
    getLocationStats: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [{ provide: LocationService, useValue: mockService }],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    jest.clearAllMocks();
  });

  it('should call create on service and return result', async () => {
    const dto: CreateLocationDto = { warehouseId: 'w1', code: 'A1', name: 'Rack A1' } as any;
    const serviceResult = { success: true, data: { id: 'l1', ...dto } };
    mockService.create.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should call findAll on service and return result', async () => {
    const query: QueryLocationDto = { page: 1, limit: 10 } as any;
    const serviceResult = { success: true, data: [{ id: 'l1' }], total: 1, page: 1, limit: 10 };
    mockService.findAll.mockResolvedValue(serviceResult);

    const res = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call findByWarehouse / available / code', async () => {
    const byWarehouse = { success: true, data: [{ id: 'l1' }] };
    const available = { success: true, data: [{ id: 'l2' }] };
    const byCode = { success: true, data: { id: 'l3' } };
    mockService.findByWarehouse.mockResolvedValue(byWarehouse);
    mockService.findAvailableLocations.mockResolvedValue(available);
    mockService.findByCode.mockResolvedValue(byCode);

    const r1 = await controller.findByWarehouse('w1');
    const r2 = await controller.findAvailableLocations('w1', 100 as any);
    const r3 = await controller.findByCode('w1', 'A1');

    expect(mockService.findByWarehouse).toHaveBeenCalledWith('w1');
    expect(mockService.findAvailableLocations).toHaveBeenCalledWith('w1', 100);
    expect(mockService.findByCode).toHaveBeenCalledWith('w1', 'A1');
    expect(r1).toEqual(byWarehouse);
    expect(r2).toEqual(available);
    expect(r3).toEqual(byCode);
  });

  it('should call findOne/getStats/update/remove', async () => {
    const one = { success: true, data: { id: 'l1' } };
    const stats = { success: true, data: { utilization: 0.5 } };
    const upd = { success: true, data: { id: 'l1', name: 'New' } };
    const del = { success: true, message: 'ok' };
    mockService.findOne.mockResolvedValue(one);
    mockService.getLocationStats.mockResolvedValue(stats);
    mockService.update.mockResolvedValue(upd);
    mockService.remove.mockResolvedValue(del);

    const r1 = await controller.findOne('l1');
    const r2 = await controller.getStats('l1');
    const r3 = await controller.update('l1', { name: 'New' } as UpdateLocationDto);
    const r4 = await controller.remove('l1');

    expect(mockService.findOne).toHaveBeenCalledWith('l1');
    expect(mockService.getLocationStats).toHaveBeenCalledWith('l1');
    expect(mockService.update).toHaveBeenCalledWith('l1', { name: 'New' });
    expect(mockService.remove).toHaveBeenCalledWith('l1');
    expect(r1).toEqual(one);
    expect(r2).toEqual(stats);
    expect(r3).toEqual(upd);
    expect(r4).toEqual(del);
  });
});
