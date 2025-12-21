import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShipmentService } from '../../services/shipment.service';
import { ShipmentRepository } from '../../repositories/shipment.repository';
import { WarehouseRepository } from '../../../warehouse/repositories/warehouse.repository';
import { SalesOrderRepository } from '../../../sales/repositories/sales-order.repository';
import { InventoryRepository } from '../../../inventory/repositories/inventory.repository';
import { AuditMiddleware } from '../../../../database/middleware/audit.middleware';
import { ShipmentStatus } from '@prisma/client';

describe('ShipmentService', () => {
  let service: ShipmentService;
  let shipmentRepo: jest.Mocked<ShipmentRepository>;
  let warehouseRepo: jest.Mocked<WarehouseRepository>;
  let salesOrderRepo: jest.Mocked<SalesOrderRepository>;
  let inventoryRepo: jest.Mocked<InventoryRepository>;

  const mockShipment: any = {
    id: 'shipment-uuid-1',
    shipmentNo: 'SHIP-202512-ABC123',
    warehouseId: 'warehouse-uuid-1',
    salesOrderId: 'so-uuid-1',
    carrier: 'Test Carrier',
    trackingCode: 'TRACK123',
    status: ShipmentStatus.preparing,
    shippedAt: null,
    deliveredAt: null,
    estimatedDelivery: new Date('2024-12-25T00:00:00Z'),
    notes: 'Test shipment',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-uuid-1',
        shipmentId: 'shipment-uuid-1',
        salesOrderId: 'so-uuid-1',
        productId: 'product-uuid-1',
        productBatchId: 'batch-uuid-1',
        qty: 10,
      },
    ],
    trackingEvents: [],
  };

  const mockSalesOrder: any = {
    id: 'so-uuid-1',
    soNo: 'SO-202512-ABC',
    customerId: 'customer-uuid-1',
    status: 'pending',
  };

  const mockWarehouse: any = {
    id: 'warehouse-uuid-1',
    code: 'WH-001',
    name: 'Main Warehouse',
    locations: [
      { id: 'location-uuid-1', code: 'LOC-A1' },
      { id: 'location-uuid-2', code: 'LOC-A2' },
    ],
  };

  const mockInventoryRecords: any[] = [
    {
      id: 'inv-uuid-1',
      productId: 'product-uuid-1',
      locationId: 'location-uuid-1',
      availableQty: 15,
      productBatch: {
        product: { name: 'Test Product' },
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentService,
        {
          provide: ShipmentRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByShipmentNo: jest.fn(),
            findByTrackingCode: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            addTrackingEvent: jest.fn(),
          },
        },
        {
          provide: WarehouseRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SalesOrderRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: InventoryRepository,
          useValue: {
            findInventoryByProductAndLocations: jest.fn(),
          },
        },
        {
          provide: AuditMiddleware,
          useValue: {
            logCreate: jest.fn().mockResolvedValue(undefined),
            logUpdate: jest.fn().mockResolvedValue(undefined),
            logDelete: jest.fn().mockResolvedValue(undefined),
            logOperation: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ShipmentService>(ShipmentService);
    shipmentRepo = module.get(ShipmentRepository);
    warehouseRepo = module.get(WarehouseRepository);
    salesOrderRepo = module.get(SalesOrderRepository);
    inventoryRepo = module.get(InventoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShipment', () => {
    const createDto = {
      salesOrderId: 'so-uuid-1',
      warehouseId: 'warehouse-uuid-1',
      carrier: 'Test Carrier',
      trackingCode: 'TRACK123',
      estimatedDelivery: '2024-12-25',
      notes: 'Test shipment',
      items: [
        {
          productId: 'product-uuid-1',
          productBatchId: 'batch-uuid-1',
          qty: 10,
        },
      ],
    };

    it('should create a shipment successfully with valid data', async () => {
      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      inventoryRepo.findInventoryByProductAndLocations.mockResolvedValue(mockInventoryRecords);
      shipmentRepo.create.mockResolvedValue({ id: mockShipment.id } as any);
      shipmentRepo.findById.mockResolvedValue(mockShipment);

      const result = await service.createShipment(createDto);

      expect(result).toEqual(mockShipment);
      expect(salesOrderRepo.findById).toHaveBeenCalledWith('so-uuid-1');
      expect(warehouseRepo.findOne).toHaveBeenCalledWith('warehouse-uuid-1');
      expect(inventoryRepo.findInventoryByProductAndLocations).toHaveBeenCalledWith(
        'product-uuid-1',
        ['location-uuid-1', 'location-uuid-2'],
      );
      expect(shipmentRepo.create).toHaveBeenCalled();
      expect(shipmentRepo.findById).toHaveBeenCalledWith(mockShipment.id);
    });

    it('should throw NotFoundException if sales order not found', async () => {
      salesOrderRepo.findById.mockResolvedValue(null);

      await expect(service.createShipment(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createShipment(createDto)).rejects.toThrow(
        'SalesOrder with ID so-uuid-1 not found',
      );
    });

    it('should throw NotFoundException if warehouse not found', async () => {
      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.createShipment(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createShipment(createDto)).rejects.toThrow(
        'Warehouse with ID warehouse-uuid-1 not found',
      );
    });

    it('should throw BadRequestException if warehouse has no locations', async () => {
      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue({ ...mockWarehouse, locations: [] });

      await expect(service.createShipment(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createShipment(createDto)).rejects.toThrow(
        'Warehouse warehouse-uuid-1 has no locations',
      );
    });

    it('should throw BadRequestException if product ID is missing', async () => {
      const invalidDto = {
        ...createDto,
        items: [{ productBatchId: 'batch-uuid-1', qty: 10 }],
      };

      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);

      await expect(service.createShipment(invalidDto as any)).rejects.toThrow(BadRequestException);
      await expect(service.createShipment(invalidDto as any)).rejects.toThrow(
        'Product ID is required for all shipment items',
      );
    });

    it('should throw BadRequestException if insufficient inventory', async () => {
      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      inventoryRepo.findInventoryByProductAndLocations.mockResolvedValue([
        { ...mockInventoryRecords[0], availableQty: 5 },
      ]);

      await expect(service.createShipment(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createShipment(createDto)).rejects.toThrow(
        'Insufficient inventory for product Test Product',
      );
    });

    it('should create shipment without optional fields', async () => {
      const minimalDto = {
        salesOrderId: 'so-uuid-1',
        warehouseId: 'warehouse-uuid-1',
        items: [{ productId: 'product-uuid-1', qty: 10 }],
      };

      salesOrderRepo.findById.mockResolvedValue(mockSalesOrder);
      warehouseRepo.findOne.mockResolvedValue(mockWarehouse);
      inventoryRepo.findInventoryByProductAndLocations.mockResolvedValue(mockInventoryRecords);
      shipmentRepo.create.mockResolvedValue({ id: mockShipment.id } as any);
      shipmentRepo.findById.mockResolvedValue(mockShipment);

      const result = await service.createShipment(minimalDto as any);

      expect(result).toEqual(mockShipment);
      expect(shipmentRepo.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a shipment by ID', async () => {
      shipmentRepo.findById.mockResolvedValue(mockShipment);

      const result = await service.findById('shipment-uuid-1');

      expect(result).toEqual(mockShipment);
      expect(shipmentRepo.findById).toHaveBeenCalledWith('shipment-uuid-1');
    });

    it('should throw NotFoundException if shipment not found', async () => {
      shipmentRepo.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('Shipment not found');
    });
  });

  describe('findByShipmentNo', () => {
    it('should return a shipment by shipment number', async () => {
      shipmentRepo.findByShipmentNo.mockResolvedValue(mockShipment);

      const result = await service.findByShipmentNo('SHIP-202512-ABC123');

      expect(result).toEqual(mockShipment);
      expect(shipmentRepo.findByShipmentNo).toHaveBeenCalledWith('SHIP-202512-ABC123');
    });

    it('should throw NotFoundException if shipment not found', async () => {
      shipmentRepo.findByShipmentNo.mockResolvedValue(null);

      await expect(service.findByShipmentNo('INVALID-NO')).rejects.toThrow(NotFoundException);
      await expect(service.findByShipmentNo('INVALID-NO')).rejects.toThrow('Shipment not found');
    });
  });

  describe('list', () => {
    it('should return shipments with default pagination', async () => {
      const mockList = {
        data: [mockShipment],
        total: 1,
      };
      shipmentRepo.list.mockResolvedValue(mockList);

      const result = await service.list({});

      expect(result.data).toEqual([mockShipment]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(shipmentRepo.list).toHaveBeenCalled();
    });

    it('should filter shipments by shipmentNo', async () => {
      const mockList = { data: [mockShipment], total: 1 };
      shipmentRepo.list.mockResolvedValue(mockList);

      await service.list({ shipmentNo: 'SHIP-202512' });

      expect(shipmentRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shipmentNo: { contains: 'SHIP-202512', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter shipments by status', async () => {
      const mockList = { data: [mockShipment], total: 1 };
      shipmentRepo.list.mockResolvedValue(mockList);

      await service.list({ status: ShipmentStatus.in_transit });

      expect(shipmentRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ShipmentStatus.in_transit,
          }),
        }),
      );
    });

    it('should support pagination with page and pageSize', async () => {
      const mockList = { data: [mockShipment], total: 50 };
      shipmentRepo.list.mockResolvedValue(mockList);

      const result = await service.list({ page: 2, pageSize: 10 });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(shipmentRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('updateShipment', () => {
    it('should update shipment successfully when status is preparing', async () => {
      const updateDto = {
        carrier: 'Updated Carrier',
        trackingCode: 'NEW-TRACK',
        estimatedDelivery: '2024-12-30',
      };

      shipmentRepo.findById
        .mockResolvedValueOnce(mockShipment)
        .mockResolvedValueOnce({ ...mockShipment, ...updateDto });
      shipmentRepo.update.mockResolvedValue(undefined as any);

      const result = await service.updateShipment('shipment-uuid-1', updateDto);

      expect(result?.carrier).toBe('Updated Carrier');
      expect(shipmentRepo.update).toHaveBeenCalledWith(
        'shipment-uuid-1',
        expect.objectContaining({
          carrier: 'Updated Carrier',
          trackingCode: 'NEW-TRACK',
        }),
      );
    });

    it('should throw NotFoundException if shipment not found', async () => {
      shipmentRepo.findById.mockResolvedValue(null);

      await expect(service.updateShipment('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not preparing', async () => {
      shipmentRepo.findById.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.in_transit,
      });

      await expect(service.updateShipment('shipment-uuid-1', { carrier: 'New' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShipment('shipment-uuid-1', { carrier: 'New' })).rejects.toThrow(
        'Only shipments with status "preparing" can be updated',
      );
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update status from preparing to in_transit', async () => {
      const updateDto = { status: ShipmentStatus.in_transit };

      shipmentRepo.findById.mockResolvedValueOnce(mockShipment).mockResolvedValueOnce({
        ...mockShipment,
        status: ShipmentStatus.in_transit,
        shippedAt: new Date(),
      });
      shipmentRepo.updateStatus.mockResolvedValue(undefined as any);

      const result = await service.updateShipmentStatus('shipment-uuid-1', updateDto);

      expect(result?.status).toBe(ShipmentStatus.in_transit);
      expect(shipmentRepo.updateStatus).toHaveBeenCalledWith(
        'shipment-uuid-1',
        ShipmentStatus.in_transit,
        expect.any(Date),
        undefined,
      );
    });

    it('should update status from in_transit to delivered', async () => {
      const updateDto = { status: ShipmentStatus.delivered };

      shipmentRepo.findById
        .mockResolvedValueOnce({
          ...mockShipment,
          status: ShipmentStatus.in_transit,
          shippedAt: new Date('2024-12-15T00:00:00Z'),
        })
        .mockResolvedValueOnce({
          ...mockShipment,
          status: ShipmentStatus.delivered,
          deliveredAt: new Date(),
        });
      shipmentRepo.updateStatus.mockResolvedValue(undefined as any);

      const result = await service.updateShipmentStatus('shipment-uuid-1', updateDto);

      expect(result?.status).toBe(ShipmentStatus.delivered);
      expect(shipmentRepo.updateStatus).toHaveBeenCalledWith(
        'shipment-uuid-1',
        ShipmentStatus.delivered,
        undefined,
        expect.any(Date),
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const updateDto = { status: ShipmentStatus.delivered };

      shipmentRepo.findById.mockResolvedValue(mockShipment); // status: preparing

      await expect(service.updateShipmentStatus('shipment-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShipmentStatus('shipment-uuid-1', updateDto)).rejects.toThrow(
        'Invalid status transition',
      );
    });

    it('should throw BadRequestException when trying to change delivered shipment status', async () => {
      const updateDto = { status: ShipmentStatus.in_transit };

      shipmentRepo.findById.mockResolvedValue({
        ...mockShipment,
        status: ShipmentStatus.delivered,
      });

      await expect(service.updateShipmentStatus('shipment-uuid-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateShipmentStatus('shipment-uuid-1', updateDto)).rejects.toThrow(
        'Cannot change status of delivered shipment',
      );
    });

    it('should update notes along with status', async () => {
      const updateDto = { status: ShipmentStatus.in_transit, notes: 'Shipment dispatched' };

      shipmentRepo.findById
        .mockResolvedValueOnce(mockShipment)
        .mockResolvedValueOnce({ ...mockShipment, status: ShipmentStatus.in_transit });
      shipmentRepo.update.mockResolvedValue(undefined as any);
      shipmentRepo.updateStatus.mockResolvedValue(undefined as any);

      await service.updateShipmentStatus('shipment-uuid-1', updateDto);

      expect(shipmentRepo.update).toHaveBeenCalledWith('shipment-uuid-1', {
        notes: 'Shipment dispatched',
      });
      expect(shipmentRepo.updateStatus).toHaveBeenCalled();
    });
  });

  describe('addTrackingEvent', () => {
    it('should add tracking event to shipment', async () => {
      const eventDto = {
        eventTime: '2024-12-20T10:00:00Z',
        location: 'Distribution Center',
        statusText: 'Package arrived at facility',
        rawPayload: { carrier: 'DHL' },
      };

      shipmentRepo.findById.mockResolvedValueOnce(mockShipment).mockResolvedValueOnce({
        ...mockShipment,
        trackingEvents: [
          {
            id: 'event-uuid-1',
            shipmentId: 'shipment-uuid-1',
            eventTime: new Date(eventDto.eventTime),
            location: eventDto.location,
            statusText: eventDto.statusText,
            rawPayload: eventDto.rawPayload,
          },
        ],
      });
      shipmentRepo.addTrackingEvent.mockResolvedValue(undefined as any);

      const result = await service.addTrackingEvent('shipment-uuid-1', eventDto);

      expect(result?.trackingEvents).toHaveLength(1);
      expect(shipmentRepo.addTrackingEvent).toHaveBeenCalledWith(
        'shipment-uuid-1',
        expect.objectContaining({
          eventTime: expect.any(Date),
          location: 'Distribution Center',
          statusText: 'Package arrived at facility',
        }),
      );
    });

    it('should throw NotFoundException if shipment not found', async () => {
      shipmentRepo.findById.mockResolvedValue(null);

      await expect(
        service.addTrackingEvent('invalid-id', {
          eventTime: '2024-12-20T10:00:00Z',
          statusText: 'Event',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackByCode', () => {
    it('should return shipment by tracking code', async () => {
      shipmentRepo.findByTrackingCode.mockResolvedValue(mockShipment);

      const result = await service.trackByCode('TRACK123');

      expect(result).toEqual(mockShipment);
      expect(shipmentRepo.findByTrackingCode).toHaveBeenCalledWith('TRACK123');
    });

    it('should throw NotFoundException if tracking code not found', async () => {
      shipmentRepo.findByTrackingCode.mockResolvedValue(null);

      await expect(service.trackByCode('INVALID')).rejects.toThrow(NotFoundException);
      await expect(service.trackByCode('INVALID')).rejects.toThrow(
        'Shipment not found with this tracking code',
      );
    });
  });
});
