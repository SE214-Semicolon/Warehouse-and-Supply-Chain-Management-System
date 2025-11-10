import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockRepository = {
    insert: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('write', () => {
    it('should call repository.insert with audit entry', async () => {
      const entry = {
        timestamp: new Date(),
        entityType: 'Product',
        entityId: 'test-id',
        action: 'CREATE',
        userId: 'user-123',
        userEmail: 'test@example.com',
      };

      mockRepository.insert.mockResolvedValue(undefined);

      await service.write(entry);

      expect(mockRepository.insert).toHaveBeenCalledWith(entry);
      expect(mockRepository.insert).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors gracefully', async () => {
      const entry = {
        timestamp: new Date(),
        entityType: 'Product',
        entityId: 'test-id',
        action: 'CREATE',
      };

      mockRepository.insert.mockRejectedValue(new Error('MongoDB connection failed'));

      // Should not throw
      await expect(service.write(entry)).resolves.toBeUndefined();
    });
  });

  describe('query', () => {
    it('should call repository.query with filter params', async () => {
      const query = {
        entityType: 'Product',
        entityId: 'test-id',
        page: 1,
        limit: 50,
      };

      const mockResult = {
        page: 1,
        limit: 50,
        total: 10,
        results: [
          {
            timestamp: new Date(),
            entityType: 'Product',
            entityId: 'test-id',
            action: 'CREATE',
          },
        ],
      };

      mockRepository.query.mockResolvedValue(mockResult);

      const result = await service.query(query);

      expect(mockRepository.query).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('should support filtering by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const query = {
        startDate,
        endDate,
        page: 1,
        limit: 50,
      };

      mockRepository.query.mockResolvedValue({
        page: 1,
        limit: 50,
        total: 5,
        results: [],
      });

      await service.query(query);

      expect(mockRepository.query).toHaveBeenCalledWith(query);
    });

    it('should support filtering by user', async () => {
      const query = {
        userId: 'user-123',
        page: 1,
        limit: 50,
      };

      mockRepository.query.mockResolvedValue({
        page: 1,
        limit: 50,
        total: 3,
        results: [],
      });

      await service.query(query);

      expect(mockRepository.query).toHaveBeenCalledWith(query);
    });
  });
});
