import { Test, TestingModule } from '@nestjs/testing';
import { ProductReportingController } from './product-reporting.controller';
import { ProductReportingService } from '../services/product-reporting.service';
import { ProductPerformanceReportDto } from '../dto/product-report.dto';

describe('ProductReportingController', () => {
  let controller: ProductReportingController;

  const mockService = {
    getProductPerformanceReport: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductReportingController],
      providers: [{ provide: ProductReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductReportingController>(ProductReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getProductPerformanceReport on service and return result', async () => {
    const query: ProductPerformanceReportDto = { page: 1, limit: 10 };
    const serviceResult = {
      success: true,
      performanceData: [{ productBatchId: 'batch1', turnoverRate: 10.5 }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      period: '30d',
    };
    mockService.getProductPerformanceReport.mockResolvedValue(serviceResult);

    const res = await controller.getProductPerformanceReport(query);

    expect(mockService.getProductPerformanceReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });
});
