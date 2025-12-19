import { Test, TestingModule } from '@nestjs/testing';
import { AlertController } from './alert.controller';
import { AlertService } from '../services/alert.service';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { QueryAlertDto } from '../dto/query-alert.dto';
import { AlertType, AlertSeverity } from '../schemas/alert.schema';

describe('AlertController', () => {
  let controller: AlertController;

  const mockService = {
    createAlert: jest.fn(),
    getAlerts: jest.fn(),
    getAlertById: jest.fn(),
    markAsRead: jest.fn(),
    deleteAlert: jest.fn(),
    getUnreadCount: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertController],
      providers: [{ provide: AlertService, useValue: mockService }],
    }).compile();

    controller = module.get<AlertController>(AlertController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create alert', async () => {
    const dto: CreateAlertDto = {
      type: AlertType.LOW_STOCK,
      severity: AlertSeverity.WARNING,
      message: 'Low stock alert',
    };
    const serviceResult = { success: true, alert: { id: '1', ...dto }, message: 'Created' };
    mockService.createAlert.mockResolvedValue(serviceResult);

    const res = await controller.createAlert(dto);

    expect(mockService.createAlert).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should get all alerts', async () => {
    const query: QueryAlertDto = { page: 1, limit: 20 };
    const serviceResult = {
      success: true,
      alerts: [{ id: '1', type: AlertType.LOW_STOCK }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockService.getAlerts.mockResolvedValue(serviceResult);

    const res = await controller.getAlerts(query);

    expect(mockService.getAlerts).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get alert by id', async () => {
    const serviceResult = { success: true, alert: { id: '1' } };
    mockService.getAlertById.mockResolvedValue(serviceResult);

    const res = await controller.getAlertById('1');

    expect(mockService.getAlertById).toHaveBeenCalledWith('1');
    expect(res).toEqual(serviceResult);
  });

  it('should mark alert as read', async () => {
    const serviceResult = {
      success: true,
      alert: { id: '1', isRead: true },
      message: 'Marked as read',
    };
    mockService.markAsRead.mockResolvedValue(serviceResult);

    const res = await controller.markAsRead('1');

    expect(mockService.markAsRead).toHaveBeenCalledWith('1');
    expect(res).toEqual(serviceResult);
  });

  it('should delete alert', async () => {
    const serviceResult = { success: true, message: 'Deleted' };
    mockService.deleteAlert.mockResolvedValue(serviceResult);

    const res = await controller.deleteAlert('1');

    expect(mockService.deleteAlert).toHaveBeenCalledWith('1');
    expect(res).toEqual(serviceResult);
  });

  it('should get unread count', async () => {
    const serviceResult = { success: true, unreadCount: 5 };
    mockService.getUnreadCount.mockResolvedValue(serviceResult);

    const res = await controller.getUnreadCount();

    expect(mockService.getUnreadCount).toHaveBeenCalled();
    expect(res).toEqual(serviceResult);
  });
});
