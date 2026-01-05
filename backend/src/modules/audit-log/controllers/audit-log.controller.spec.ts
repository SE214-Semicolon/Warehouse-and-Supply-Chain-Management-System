import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../services/audit-log.service';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';

describe('AuditLogController', () => {
  let controller: AuditLogController;

  const mockService = {
    query: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: mockService }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should query audit logs', async () => {
    const query: QueryAuditLogDto = {
      entityType: 'Product',
      page: 1,
      limit: 20,
    };
    const serviceResult = {
      success: true,
      data: [{ id: '1', entityType: 'Product', action: 'CREATE' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockService.query.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.query).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should handle query with filters', async () => {
    const query: QueryAuditLogDto = {
      entityType: 'SalesOrder',
      action: 'UPDATE',
      userId: 'user123',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    };
    const serviceResult = {
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
    mockService.query.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.query).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });
});
