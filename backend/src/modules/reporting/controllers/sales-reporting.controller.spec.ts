import { Test, TestingModule } from '@nestjs/testing';
import { SalesReportingController } from './sales-reporting.controller';
import { SalesReportingService } from '../services/sales-reporting.service';
import { SOPerformanceReportDto, SalesTrendsReportDto } from '../dto/sales-report.dto';

describe('SalesReportingController', () => {
  let controller: SalesReportingController;

  const mockService = {
    getSOPerformance: jest.fn(),
    getSalesTrends: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesReportingController],
      providers: [{ provide: SalesReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<SalesReportingController>(SalesReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get SO performance report', async () => {
    const dto: SOPerformanceReportDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      page: 1,
      limit: 20,
    } as any;
    const serviceResult = {
      success: true,
      data: {
        totalSOs: 100,
        avgFulfillmentTime: 3,
        fulfillmentRate: 0.97,
        statusBreakdown: { draft: 10, submitted: 20, approved: 30, fulfilled: 40 },
      },
    };
    mockService.getSOPerformance.mockResolvedValue(serviceResult);

    const res = await controller.getSOPerformance(dto);

    expect(mockService.getSOPerformance).toHaveBeenCalledWith({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      customerId: dto.customerId,
      status: dto.status,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
    expect(res).toEqual(serviceResult);
  });

  it('should get sales trends report', async () => {
    const dto: SalesTrendsReportDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      groupBy: 'month' as any,
    };
    const serviceResult = {
      success: true,
      data: [
        {
          period: '2024-01',
          orderCount: 25,
          totalRevenue: 50000,
          avgOrderValue: 2000,
        },
      ],
    };
    mockService.getSalesTrends.mockResolvedValue(serviceResult);

    const res = await controller.getSalesTrends(dto);

    expect(mockService.getSalesTrends).toHaveBeenCalledWith({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      groupBy: dto.groupBy,
      customerId: undefined,
      productId: undefined,
    });
    expect(res).toEqual(serviceResult);
  });
});
