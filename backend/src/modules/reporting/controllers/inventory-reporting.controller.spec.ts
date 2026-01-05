import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReportingController } from './inventory-reporting.controller';
import { InventoryReportingService } from '../services/inventory-reporting.service';
import { BaseInventoryReportDto } from '../dto/inventory-report.dto';

describe('InventoryReportingController', () => {
  let controller: InventoryReportingController;

  const mockService = {
    getLowStockReport: jest.fn(),
    getExpiryReport: jest.fn(),
    getStockLevelReport: jest.fn(),
    getMovementReport: jest.fn(),
    getValuationReport: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryReportingController],
      providers: [{ provide: InventoryReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<InventoryReportingController>(InventoryReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getLowStockReport on service and return result', async () => {
    const query: BaseInventoryReportDto = { page: 1, limit: 10 };
    const serviceResult = { success: true, data: [{ id: 'inv1' }], total: 1, page: 1, limit: 10 };
    mockService.getLowStockReport.mockResolvedValue(serviceResult);

    const res = await controller.getLowStockReport(query);

    expect(mockService.getLowStockReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call getExpiryReport on service and return result', async () => {
    const query: BaseInventoryReportDto = { page: 1, limit: 10 };
    const serviceResult = { success: true, data: [{ id: 'inv2' }], total: 1, page: 1, limit: 10 };
    mockService.getExpiryReport.mockResolvedValue(serviceResult);

    const res = await controller.getExpiryReport(query);

    expect(mockService.getExpiryReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call getStockLevelReport on service and return result', async () => {
    const query: BaseInventoryReportDto = { page: 1, limit: 10 };
    const serviceResult = { success: true, data: [{ id: 'inv3' }], total: 1, page: 1, limit: 10 };
    mockService.getStockLevelReport.mockResolvedValue(serviceResult);

    const res = await controller.getStockLevelReport(query);

    expect(mockService.getStockLevelReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call getMovementReport on service and return result', async () => {
    const query: BaseInventoryReportDto = { page: 1, limit: 10 };
    const serviceResult = { success: true, data: [{ id: 'inv4' }], total: 1, page: 1, limit: 10 };
    mockService.getMovementReport.mockResolvedValue(serviceResult);

    const res = await controller.getMovementReport(query);

    expect(mockService.getMovementReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should call getValuationReport on service and return result', async () => {
    const query: BaseInventoryReportDto = { page: 1, limit: 10 };
    const serviceResult = { success: true, data: [{ id: 'inv5' }], total: 1, page: 1, limit: 10 };
    mockService.getValuationReport.mockResolvedValue(serviceResult);

    const res = await controller.getValuationReport(query);

    expect(mockService.getValuationReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });
});
