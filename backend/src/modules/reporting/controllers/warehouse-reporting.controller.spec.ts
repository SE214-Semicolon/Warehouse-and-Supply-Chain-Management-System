import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseReportingController } from './warehouse-reporting.controller';
import { WarehouseReportingService } from '../services/warehouse-reporting.service';
import { WarehouseUtilizationReportDto } from '../dto/warehouse-report.dto';

describe('WarehouseReportingController', () => {
  let controller: WarehouseReportingController;

  const mockService = {
    getWarehouseUtilizationReport: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseReportingController],
      providers: [{ provide: WarehouseReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<WarehouseReportingController>(WarehouseReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getWarehouseUtilizationReport on service and return result', async () => {
    const query: WarehouseUtilizationReportDto = { page: 1, limit: 10 };
    const serviceResult = {
      success: true,
      utilizationData: [{ warehouseId: 'wh1', utilizationRate: 75.5 }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    mockService.getWarehouseUtilizationReport.mockResolvedValue(serviceResult);

    const res = await controller.getWarehouseUtilizationReport(query);

    expect(mockService.getWarehouseUtilizationReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });
});
