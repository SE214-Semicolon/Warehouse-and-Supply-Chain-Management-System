import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from '../../services/alert.service';
import { AlertRepository } from '../../repositories/alert.repository';
import { CacheService } from '../../../../cache/cache.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlertType, AlertSeverity } from '../../schemas/alert.schema';

describe('AlertService', () => {
  let service: AlertService;
  let repository: jest.Mocked<AlertRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockAlertDocument = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    type: AlertType.LOW_STOCK,
    severity: AlertSeverity.WARNING,
    message: 'Test alert message',
    isRead: false,
    relatedEntity: {
      type: 'Product',
      id: { toString: () => 'product-uuid-123' },
    },
    createdAt: new Date('2025-12-07T10:00:00Z'),
    updatedAt: new Date('2025-12-07T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockRepo = {
      write: jest.fn(),
      findById: jest.fn(),
      query: jest.fn(),
      markAsRead: jest.fn(),
      delete: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const mockCache = {
      deleteByPrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: AlertRepository, useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    repository = module.get(AlertRepository);
    cacheService = module.get(CacheService);
  });

  describe('createAlert', () => {
    // ALERT-TC01: Create with valid data
    it('should create alert successfully with valid data', async () => {
      const dto = {
        type: AlertType.LOW_STOCK,
        severity: AlertSeverity.WARNING,
        message: 'Low stock alert',
        relatedEntity: {
          type: 'Product' as const,
          id: 'product-uuid-123',
        },
      };

      repository.write.mockResolvedValue(mockAlertDocument);

      const result = await service.createAlert(dto);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('507f1f77bcf86cd799439011');
      expect(result.data.type).toBe(AlertType.LOW_STOCK);
      expect(result.message).toBe('Alert created successfully');
      expect(repository.write).toHaveBeenCalledWith(dto);
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // ALERT-TC02: Create without relatedEntity
    it('should create alert without relatedEntity', async () => {
      const dto = {
        type: AlertType.EXPIRING_SOON,
        severity: AlertSeverity.CRITICAL,
        message: 'Product expiring soon',
      };

      const alertWithoutEntity = { ...mockAlertDocument, relatedEntity: undefined };
      repository.write.mockResolvedValue(alertWithoutEntity);

      const result = await service.createAlert(dto);

      expect(result.success).toBe(true);
      expect(result.data.relatedEntity).toBeUndefined();
      expect(repository.write).toHaveBeenCalledWith(dto);
    });

    // ALERT-TC06: Repository error handling
    it('should throw BadRequestException when repository fails', async () => {
      const dto = {
        type: AlertType.LOW_STOCK,
        severity: AlertSeverity.WARNING,
        message: 'Test message',
      };

      repository.write.mockRejectedValue(new Error('Database error'));

      await expect(service.createAlert(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAlerts', () => {
    // ALERT-TC07: Get all with default pagination
    it('should get alerts with default pagination', async () => {
      const dto = {};
      const mockQueryResult = {
        alerts: [mockAlertDocument],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.getAlerts(dto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    // ALERT-TC08: Filter by type
    it('should filter alerts by type', async () => {
      const dto = { type: AlertType.LOW_STOCK };
      const mockQueryResult = {
        alerts: [mockAlertDocument],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.getAlerts(dto);

      expect(result.success).toBe(true);
      expect(repository.query).toHaveBeenCalledWith(dto);
    });

    // ALERT-TC10: Filter by isRead=false
    it('should filter unread alerts', async () => {
      const dto = { isRead: false };
      const mockQueryResult = {
        alerts: [mockAlertDocument],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.query.mockResolvedValue(mockQueryResult);

      const result = await service.getAlerts(dto);

      expect(result.success).toBe(true);
      expect(repository.query).toHaveBeenCalledWith(dto);
    });

    // ALERT-TC14: Invalid page number
    it('should throw BadRequestException for invalid page number', async () => {
      const dto = { page: 0 };

      await expect(service.getAlerts(dto)).rejects.toThrow(BadRequestException);
      await expect(service.getAlerts(dto)).rejects.toThrow('Page must be greater than 0');
    });

    // ALERT-TC15: Invalid limit
    it('should throw BadRequestException for invalid limit', async () => {
      const dto = { limit: 101 };

      await expect(service.getAlerts(dto)).rejects.toThrow(BadRequestException);
      await expect(service.getAlerts(dto)).rejects.toThrow('Limit must be between 1 and 100');
    });
  });

  describe('getAlertById', () => {
    // ALERT-TC18: Get by valid ID
    it('should get alert by valid ID', async () => {
      const alertId = '507f1f77bcf86cd799439011';

      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findById.mockResolvedValue(mockAlertDocument);

      const result = await service.getAlertById(alertId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(alertId);
      expect(repository.findById).toHaveBeenCalledWith(alertId);
    });

    // ALERT-TC19: Alert not found
    it('should throw NotFoundException when alert not found', async () => {
      const alertId = 'nonexistent-id';

      cacheService.getOrSet.mockImplementation(async (_key, cb) => cb());
      repository.findById.mockResolvedValue(null);

      await expect(service.getAlertById(alertId)).rejects.toThrow(NotFoundException);
      await expect(service.getAlertById(alertId)).rejects.toThrow(
        'Alert not found: nonexistent-id',
      );
    });
  });

  describe('markAsRead', () => {
    // ALERT-TC22: Mark as read successfully
    it('should mark alert as read successfully', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      const readAlert = { ...mockAlertDocument, isRead: true };

      repository.markAsRead.mockResolvedValue(readAlert);

      const result = await service.markAsRead(alertId);

      expect(result.success).toBe(true);
      expect(result.data.isRead).toBe(true);
      expect(result.message).toBe('Alert marked as read');
      expect(repository.markAsRead).toHaveBeenCalledWith(alertId);
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // ALERT-TC23: Alert not found
    it('should throw NotFoundException when marking non-existent alert', async () => {
      const alertId = 'nonexistent-id';

      repository.markAsRead.mockResolvedValue(null);

      await expect(service.markAsRead(alertId)).rejects.toThrow(NotFoundException);
      await expect(service.markAsRead(alertId)).rejects.toThrow('Alert not found: nonexistent-id');
    });
  });

  describe('deleteAlert', () => {
    // ALERT-TC26: Delete successfully
    it('should delete alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439011';

      repository.delete.mockResolvedValue(true);

      const result = await service.deleteAlert(alertId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Alert deleted successfully');
      expect(repository.delete).toHaveBeenCalledWith(alertId);
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // ALERT-TC27: Alert not found
    it('should throw NotFoundException when deleting non-existent alert', async () => {
      const alertId = 'nonexistent-id';

      repository.delete.mockResolvedValue(false);

      await expect(service.deleteAlert(alertId)).rejects.toThrow(NotFoundException);
      await expect(service.deleteAlert(alertId)).rejects.toThrow('Alert not found: nonexistent-id');
    });
  });

  describe('getUnreadCount', () => {
    // ALERT-TC29: Get total unread count
    it('should get total unread count', async () => {
      repository.getUnreadCount.mockResolvedValue(15);

      const result = await service.getUnreadCount();

      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(15);
      expect(repository.getUnreadCount).toHaveBeenCalledWith(undefined);
    });

    // ALERT-TC30: Get unread count by type
    it('should get unread count filtered by type', async () => {
      repository.getUnreadCount.mockResolvedValue(5);

      const result = await service.getUnreadCount({ type: AlertType.LOW_STOCK });

      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(5);
      expect(repository.getUnreadCount).toHaveBeenCalledWith({
        type: AlertType.LOW_STOCK,
      });
    });

    // ALERT-TC31: Get unread count by severity
    it('should get unread count filtered by severity', async () => {
      repository.getUnreadCount.mockResolvedValue(3);

      const result = await service.getUnreadCount({ severity: AlertSeverity.CRITICAL });

      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(3);
      expect(repository.getUnreadCount).toHaveBeenCalledWith({
        severity: AlertSeverity.CRITICAL,
      });
    });
  });
});
