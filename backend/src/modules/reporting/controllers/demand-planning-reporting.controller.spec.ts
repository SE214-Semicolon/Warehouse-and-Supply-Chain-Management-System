import { Test, TestingModule } from '@nestjs/testing';
import { DemandPlanningReportingController } from './demand-planning-reporting.controller';
import { DemandPlanningReportingService } from '../services/demand-planning-reporting.service';
import { DemandForecastAccuracyReportDto } from '../dto/demand-planning-report.dto';

describe('DemandPlanningReportingController', () => {
  let controller: DemandPlanningReportingController;

  const mockService = {
    getDemandForecastAccuracyReport: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemandPlanningReportingController],
      providers: [{ provide: DemandPlanningReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<DemandPlanningReportingController>(DemandPlanningReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getDemandForecastAccuracyReport on service and return result', async () => {
    const query: DemandForecastAccuracyReportDto = { page: 1, limit: 10 };
    const serviceResult = {
      success: true,
      accuracyData: [{ forecastId: 'fc1', accuracy: 95.5 }],
      summaryStats: { avgAccuracy: 95.5, avgMAE: 10, avgMAPE: 4.5 },
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    mockService.getDemandForecastAccuracyReport.mockResolvedValue(serviceResult);

    const res = await controller.getDemandForecastAccuracyReport(query);

    expect(mockService.getDemandForecastAccuracyReport).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });
});
