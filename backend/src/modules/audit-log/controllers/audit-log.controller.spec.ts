import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../services/audit-log.service';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let service: AuditLogService;

  const mockService = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated audit logs', async () => {
      const query = {
        entityType: 'Product',
        page: 1,
        limit: 50,
      };

      const mockResponse = {
        page: 1,
        limit: 50,
        total: 100,
        results: [
          {
            timestamp: new Date(),
            entityType: 'Product',
            entityId: 'test-id',
            action: 'CREATE',
          },
        ],
      };

      mockService.query.mockResolvedValue(mockResponse);

      const result = await controller.list(query);

      expect(service.query).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty results', async () => {
      const query = {
        entityType: 'Inventory',
        page: 1,
        limit: 50,
      };

      const mockResponse = {
        page: 1,
        limit: 50,
        total: 0,
        results: [],
      };

      mockService.query.mockResolvedValue(mockResponse);

      const result = await controller.list(query);

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
