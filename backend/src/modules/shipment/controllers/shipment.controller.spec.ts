import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from '../services/shipment.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { UpdateShipmentDto } from '../dto/update-shipment.dto';
import { UpdateShipmentStatusDto } from '../dto/update-shipment-status.dto';
import { AddTrackingEventDto } from '../dto/add-tracking-event.dto';
import { QueryShipmentDto } from '../dto/query-shipment.dto';

describe('ShipmentController', () => {
  let controller: ShipmentController;

  const mockService = {
    createShipment: jest.fn(),
    list: jest.fn(),
    trackByCode: jest.fn(),
    findById: jest.fn(),
    updateShipment: jest.fn(),
    updateStatus: jest.fn(),
    addTrackingEvent: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShipmentController],
      providers: [{ provide: ShipmentService, useValue: mockService }],
    }).compile();

    controller = module.get<ShipmentController>(ShipmentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create shipment', async () => {
    const dto: CreateShipmentDto = {
      salesOrderId: 'so1',
      carrier: 'DHL',
      shipToAddress: '123 Main St',
    } as any;
    const serviceResult = { success: true, data: { id: 'sh1', trackingCode: 'TRACK-001' } };
    mockService.createShipment.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.createShipment).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should list shipments', async () => {
    const query: QueryShipmentDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'sh1', trackingCode: 'TRACK-001' }],
      total: 1,
    };
    mockService.list.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should track shipment by code', async () => {
    const serviceResult = {
      success: true,
      data: { id: 'sh1', trackingCode: 'TRACK-001', events: [] },
    };
    mockService.trackByCode.mockResolvedValue(serviceResult);

    const res = await controller.trackByCode('TRACK-001');

    expect(mockService.trackByCode).toHaveBeenCalledWith('TRACK-001');
    expect(res).toEqual(serviceResult);
  });

  it('should update shipment status', async () => {
    const dto: UpdateShipmentStatusDto = { status: 'delivered' as any, notes: 'Delivered' };
    const serviceResult = { success: true, message: 'Status updated' };
    mockService.updateStatus.mockResolvedValue(serviceResult);

    const res = await controller.updateStatus('sh1', dto);

    expect(mockService.updateStatus).toHaveBeenCalledWith('sh1', dto);
    expect(res).toEqual(serviceResult);
  });

  it('should add tracking event', async () => {
    const dto: AddTrackingEventDto = {
      location: 'Warehouse A',
      notes: 'Departed',
    } as any;
    const serviceResult = { success: true, message: 'Event added' };
    mockService.addTrackingEvent.mockResolvedValue(serviceResult);

    const res = await controller.addTrackingEvent('sh1', dto);

    expect(mockService.addTrackingEvent).toHaveBeenCalledWith('sh1', dto);
    expect(res).toEqual(serviceResult);
  });
});
