import { Test, TestingModule } from '@nestjs/testing';
import { DemandPlanningController } from './demand-planning.controller';
import { DemandPlanningService } from '../services/demand-planning.service';
import { CreateForecastDto } from '../dto/create-forecast.dto';
import { UpdateForecastDto } from '../dto/update-forecast.dto';
import { QueryForecastDto } from '../dto/query-forecast.dto';
import { RunAlgorithmDto } from '../dto/run-algorithm.dto';

describe('DemandPlanningController', () => {
  let controller: DemandPlanningController;

  const mockService = {
    createForecast: jest.fn(),
    getForecastById: jest.fn(),
    queryForecasts: jest.fn(),
    updateForecast: jest.fn(),
    deleteForecast: jest.fn(),
    runAlgorithm: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemandPlanningController],
      providers: [{ provide: DemandPlanningService, useValue: mockService }],
    }).compile();

    controller = module.get<DemandPlanningController>(DemandPlanningController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create forecast', async () => {
    const dto: CreateForecastDto = {
      productId: 'p1',
      forecastDate: new Date('2024-01-01'),
      qtyForecast: 100,
    } as any;
    const serviceResult = { success: true, data: { id: 'f1', productId: 'p1' } };
    mockService.createForecast.mockResolvedValue(serviceResult);

    const res = await controller.createForecast(dto);

    expect(mockService.createForecast).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should get forecast by id', async () => {
    const serviceResult = { success: true, data: { id: 'f1', productId: 'p1' } };
    mockService.getForecastById.mockResolvedValue(serviceResult);

    const res = await controller.getForecast('f1');

    expect(mockService.getForecastById).toHaveBeenCalledWith('f1');
    expect(res).toEqual(serviceResult);
  });

  it('should query forecasts', async () => {
    const query: QueryForecastDto = { productId: 'p1' };
    const serviceResult = {
      success: true,
      data: [{ id: 'f1', productId: 'p1' }],
      total: 1,
    };
    mockService.queryForecasts.mockResolvedValue(serviceResult);

    const res = await controller.queryForecasts(query);

    expect(mockService.queryForecasts).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should update forecast', async () => {
    const dto: UpdateForecastDto = { qtyActual: 95 } as any;
    const serviceResult = { success: true, message: 'Forecast updated' };
    mockService.updateForecast.mockResolvedValue(serviceResult);

    const res = await controller.updateForecast('f1', dto);

    expect(mockService.updateForecast).toHaveBeenCalledWith('f1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should run forecasting algorithm', async () => {
    const dto: RunAlgorithmDto = {
      algorithm: 'moving_average' as any,
      windowDays: 30,
      forecastDays: 90,
    };
    const serviceResult = {
      success: true,
      data: [{ forecastDate: '2024-01-01', qtyForecast: 100 }],
    };
    mockService.runAlgorithm.mockResolvedValue(serviceResult);

    const res = await controller.runAlgorithm('p1', dto);

    expect(mockService.runAlgorithm).toHaveBeenCalledWith('p1', dto);
    expect(res).toEqual(serviceResult);
  });
});
