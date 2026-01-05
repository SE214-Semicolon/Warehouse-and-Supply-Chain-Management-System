import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementReportingController } from './procurement-reporting.controller';
import { ProcurementReportingService } from '../services/procurement-reporting.service';
import {
  POPerformanceReportDto,
  SupplierPerformanceReportDto,
} from '../dto/procurement-report.dto';

describe('ProcurementReportingController', () => {
  let controller: ProcurementReportingController;

  const mockService = {
    getPOPerformance: jest.fn(),
    getSupplierPerformance: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcurementReportingController],
      providers: [{ provide: ProcurementReportingService, useValue: mockService }],
    }).compile();

    controller = module.get<ProcurementReportingController>(ProcurementReportingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get PO performance report', async () => {
    const dto: POPerformanceReportDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      page: 1,
      limit: 20,
    } as any;
    const serviceResult = {
      success: true,
      data: {
        totalPOs: 50,
        avgLeadTime: 7,
        fulfillmentRate: 0.95,
        statusBreakdown: { pending: 10, approved: 30, received: 10 },
      },
    };
    mockService.getPOPerformance.mockResolvedValue(serviceResult);

    const res = await controller.getPOPerformance(dto);

    expect(mockService.getPOPerformance).toHaveBeenCalledWith({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      supplierId: dto.supplierId,
      status: dto.status,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
    expect(res).toEqual(serviceResult);
  });

  it('should get supplier performance report', async () => {
    const dto: SupplierPerformanceReportDto = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      page: 1,
      limit: 20,
    } as any;
    const serviceResult = {
      success: true,
      data: [
        {
          supplierId: 's1',
          supplierName: 'Supplier A',
          orderVolume: 20,
          avgLeadTime: 5,
          onTimeRate: 0.9,
        },
      ],
    };
    mockService.getSupplierPerformance.mockResolvedValue(serviceResult);

    const res = await controller.getSupplierPerformance(dto);

    expect(mockService.getSupplierPerformance).toHaveBeenCalledWith({
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      supplierId: undefined,
      minOrders: undefined,
      page: dto.page,
      limit: dto.limit,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(res).toEqual(serviceResult);
  });
});
