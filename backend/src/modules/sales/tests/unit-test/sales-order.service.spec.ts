import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrderService } from '../../services/sales-order.service';
import { SalesOrderRepository } from '../../repositories/sales-order.repository';
import { InventoryService } from '../../../inventory/services/inventory.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AuditMiddleware } from '../../../../database/middleware/audit.middleware';
import { OrderStatus } from '@prisma/client';

describe('SalesOrderService', () => {
  let service: SalesOrderService;
  let soRepo: jest.Mocked<SalesOrderRepository>;
  let inventorySvc: jest.Mocked<InventoryService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockSalesOrder: any = {
    id: 'so-uuid-1',
    soNo: 'SO-202512-ABC123',
    customerId: 'customer-uuid-1',
    status: OrderStatus.pending,
    placedAt: new Date('2024-01-15T10:00:00Z'),
    totalAmount: 500000,
    createdById: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'so-item-uuid-1',
        salesOrderId: 'so-uuid-1',
        productId: 'product-uuid-1',
        productBatchId: null,
        qty: 10,
        qtyFulfilled: 0,
        unitPrice: 50000,
        lineTotal: 500000,
      },
    ],
    customer: {
      id: 'customer-uuid-1',
      code: 'CUST-001',
      name: 'Test Customer',
      contactInfo: { phone: '0901234567' },
      address: null,
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockSoRepo = {
      findById: jest.fn(),
      findBySoNo: jest.fn(),
      createDraft: jest.fn(),
      updateTotals: jest.fn(),
      submit: jest.fn(),
      findItemsByIds: jest.fn(),
      updateItemFulfilled: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      getItemById: jest.fn(),
      updateItem: jest.fn(),
      cancel: jest.fn(),
    };

    const mockInventorySvc = {
      dispatchInventory: jest.fn(),
      reserveInventory: jest.fn(),
      releaseReservation: jest.fn(),
      getInventoryByBatchAndLocation: jest
        .fn()
        .mockResolvedValue({ availableQty: 100, reservedQty: 0 }),
      getGlobalInventoryByProduct: jest.fn().mockResolvedValue({
        productId: 'product-uuid-1',
        productName: 'Product A',
        totalAvailableQty: 100,
        totalReservedQty: 0,
        batchCount: 1,
      }),
    };

    const mockPrisma = {
      productBatch: {
        findUnique: jest.fn(),
      },
    };

    const mockAuditMiddleware = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        {
          provide: SalesOrderRepository,
          useValue: mockSoRepo,
        },
        {
          provide: InventoryService,
          useValue: mockInventorySvc,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditMiddleware,
          useValue: mockAuditMiddleware,
        },
      ],
    }).compile();

    service = module.get<SalesOrderService>(SalesOrderService);
    soRepo = module.get(SalesOrderRepository);
    inventorySvc = module.get(InventoryService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSalesOrder', () => {
    // SO-TC01: Create pending SO with valid data
    it('should create a pending SO with valid data', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        placedAt: '2024-01-15T10:00:00Z',
        items: [
          {
            productId: 'product-uuid-1',
            qty: 10,
            unitPrice: 50000,
          },
        ],
      };

      soRepo.createDraft.mockResolvedValue(mockSalesOrder);
      soRepo.updateTotals.mockResolvedValue(mockSalesOrder);
      soRepo.findById.mockResolvedValue(mockSalesOrder);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSalesOrder);
      expect(soRepo.createDraft).toHaveBeenCalled();
      expect(soRepo.updateTotals).toHaveBeenCalledWith(mockSalesOrder.id);
    });

    // SO-TC02: Create without customerId
    it('should create a SO without customerId', async () => {
      const createDto = {
        placedAt: '2024-01-15T10:00:00Z',
        items: [],
      };

      const soWithoutCustomer = { ...mockSalesOrder, customerId: null };
      soRepo.createDraft.mockResolvedValue(soWithoutCustomer);
      soRepo.updateTotals.mockResolvedValue(soWithoutCustomer);
      soRepo.findById.mockResolvedValue(soWithoutCustomer);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect(result.data.customerId).toBeNull();
    });

    // SO-TC03: Create without items
    it('should create a SO without items', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        items: [],
      };

      const soWithoutItems = { ...mockSalesOrder, items: [] };
      soRepo.createDraft.mockResolvedValue(soWithoutItems);
      soRepo.updateTotals.mockResolvedValue(soWithoutItems);
      soRepo.findById.mockResolvedValue(soWithoutItems);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect((result.data as any).items).toHaveLength(0);
    });

    // SO-TC04: Create with items missing unitPrice
    it('should create a SO with items missing unitPrice', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            qty: 10,
          },
        ],
      };

      const soWithNullUnitPrice = {
        ...mockSalesOrder,
        items: [{ ...mockSalesOrder.items[0], unitPrice: null, lineTotal: null }],
      };
      soRepo.createDraft.mockResolvedValue(soWithNullUnitPrice);
      soRepo.updateTotals.mockResolvedValue(soWithNullUnitPrice);
      soRepo.findById.mockResolvedValue(soWithNullUnitPrice);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect((result.data as any).items[0].unitPrice).toBeNull();
      expect((result.data as any).items[0].lineTotal).toBeNull();
    });

    // SO-TC05: Create with multiple items
    it('should create a SO with multiple items', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        items: [
          { productId: 'product-uuid-1', qty: 10, unitPrice: 50000 },
          { productId: 'product-uuid-2', qty: 5, unitPrice: 30000 },
        ],
      };

      const soWithMultipleItems = {
        ...mockSalesOrder,
        items: [
          { ...mockSalesOrder.items[0] },
          {
            id: 'so-item-uuid-2',
            salesOrderId: 'so-uuid-1',
            productId: 'product-uuid-2',
            qty: 5,
            unitPrice: 30000,
            lineTotal: 150000,
            qtyFulfilled: 0,
          },
        ],
      };
      soRepo.createDraft.mockResolvedValue(soWithMultipleItems);
      soRepo.updateTotals.mockResolvedValue(soWithMultipleItems);
      soRepo.findById.mockResolvedValue(soWithMultipleItems);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect((result.data as any).items).toHaveLength(2);
    });

    // SO-TC09: Create with placedAt in past
    it('should create a SO with placedAt in past', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        placedAt: '2020-01-01T10:00:00Z',
        items: [],
      };

      soRepo.createDraft.mockResolvedValue(mockSalesOrder);
      soRepo.updateTotals.mockResolvedValue(mockSalesOrder);
      soRepo.findById.mockResolvedValue(mockSalesOrder);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect(result).toBeDefined();
    });

    // SO-TC10: Create with placedAt in future
    it('should create a SO with placedAt in future', async () => {
      const createDto = {
        customerId: 'customer-uuid-1',
        placedAt: '2030-01-01T10:00:00Z',
        items: [],
      };

      soRepo.createDraft.mockResolvedValue(mockSalesOrder);
      soRepo.updateTotals.mockResolvedValue(mockSalesOrder);
      soRepo.findById.mockResolvedValue(mockSalesOrder);

      const result = await service.createSalesOrder(createDto, 'user-uuid-1');

      expect(result).toBeDefined();
    });
  });

  describe('submitSalesOrder', () => {
    // SO-TC11: Submit pending SO successfully
    it('should submit a pending SO successfully', async () => {
      const submitDto = { userId: 'user-uuid-1' };
      const approvedSO = { ...mockSalesOrder, status: OrderStatus.approved };

      soRepo.findById.mockResolvedValueOnce(mockSalesOrder);
      soRepo.submit.mockResolvedValue(approvedSO);
      soRepo.findById.mockResolvedValueOnce(approvedSO);

      const result = await service.submitSalesOrder('so-uuid-1', submitDto);

      expect(result.status).toBe(OrderStatus.approved);
      expect(soRepo.submit).toHaveBeenCalledWith('so-uuid-1');
    });

    // SO-TC12: Missing userId
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.submitSalesOrder('so-uuid-1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitSalesOrder('so-uuid-1', {} as any)).rejects.toThrow(
        'userId is required',
      );
    });

    // SO-TC13: Submit SO not in pending status
    it('should throw BadRequestException if SO is not pending', async () => {
      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };
      soRepo.findById.mockResolvedValue(approvedSo);

      await expect(
        service.submitSalesOrder('so-uuid-1', { userId: 'user-uuid-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitSalesOrder('so-uuid-1', { userId: 'user-uuid-1' }),
      ).rejects.toThrow('Only pending SO can be submitted');
    });

    // SO-TC14: Submit non-existent SO
    it('should throw NotFoundException if SO not found', async () => {
      soRepo.findById.mockResolvedValue(null);

      await expect(
        service.submitSalesOrder('invalid-id', { userId: 'user-uuid-1' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.submitSalesOrder('invalid-id', { userId: 'user-uuid-1' }),
      ).rejects.toThrow('SO not found');
    });
  });

  describe('findById', () => {
    // SO-TC17: Find by valid ID
    it('should return a SO by valid ID', async () => {
      soRepo.findById.mockResolvedValue(mockSalesOrder);

      const result = await service.findById('so-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSalesOrder);
      expect(soRepo.findById).toHaveBeenCalledWith('so-uuid-1');
    });

    // SO-TC18: SO not found
    it('should throw NotFoundException if SO not found', async () => {
      soRepo.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('SO not found');
    });
  });

  describe('list', () => {
    // SO-TC20: Get all with default pagination
    it('should return all SOs with default pagination', async () => {
      const query = {};
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.data).toEqual([mockSalesOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    // SO-TC21: Filter by soNo
    it('should filter SOs by soNo', async () => {
      const query = { soNo: 'SO-202512' };
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.data).toEqual([mockSalesOrder]);
      expect(soRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            soNo: expect.objectContaining({ contains: 'SO-202512' }),
          }),
        }),
      );
    });

    // SO-TC22: Filter by status
    it('should filter SOs by status', async () => {
      const query = { status: OrderStatus.approved };
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.data).toEqual([mockSalesOrder]);
      expect(soRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.approved }),
        }),
      );
    });

    // SO-TC23: Filter by customerId
    it('should filter SOs by customerId', async () => {
      const query = { customerId: 'customer-uuid-1' };
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.data).toEqual([mockSalesOrder]);
      expect(soRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'customer-uuid-1' }),
        }),
      );
    });

    // SO-TC27: Pagination page 1
    it('should return SOs for page 1', async () => {
      const query = { page: 1, pageSize: 10 };
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 25,
      });

      const result = await service.list(query);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(soRepo.list).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
    });

    // SO-TC29: Sort by placedAt asc
    it('should sort SOs by placedAt ascending', async () => {
      const query = { sort: 'placedAt:asc' };
      soRepo.list.mockResolvedValue({
        data: [mockSalesOrder],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.data).toBeDefined();
      expect(soRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ placedAt: 'asc' }],
        }),
      );
    });
  });

  describe('updateSalesOrder', () => {
    // SO-TC33: Update pending SO customer successfully
    it('should update pending SO customer successfully', async () => {
      const updateDto = { customerId: 'customer-uuid-2' };
      const updatedSO = { ...mockSalesOrder, customerId: 'customer-uuid-2' };

      soRepo.findById.mockResolvedValueOnce(mockSalesOrder);
      soRepo.update.mockResolvedValue(updatedSO);
      soRepo.updateTotals.mockResolvedValue(updatedSO);
      soRepo.findById.mockResolvedValueOnce(updatedSO);

      const result = await service.updateSalesOrder('so-uuid-1', updateDto);

      expect(result.customerId).toBe('customer-uuid-2');
    });

    // SO-TC40: Update SO not in pending status
    it('should throw BadRequestException if SO is not pending', async () => {
      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };
      soRepo.findById.mockResolvedValue(approvedSo);

      await expect(service.updateSalesOrder('so-uuid-1', {})).rejects.toThrow(BadRequestException);
      await expect(service.updateSalesOrder('so-uuid-1', {})).rejects.toThrow(
        'Only pending SO can be updated',
      );
    });

    // SO-TC41: Update non-existent SO
    it('should throw NotFoundException if SO not found', async () => {
      soRepo.findById.mockResolvedValue(null);

      await expect(service.updateSalesOrder('invalid-id', {})).rejects.toThrow(NotFoundException);
      await expect(service.updateSalesOrder('invalid-id', {})).rejects.toThrow('SO not found');
    });
  });

  describe('fulfillSalesOrder', () => {
    // SO-TC45: Fulfill partial successfully
    it('should fulfill partial successfully and set status to processing', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'so-item-uuid-1',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 5,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-1',
          },
        ],
      };

      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };
      const itemWithFulfillment = { ...mockSalesOrder.items[0], qtyFulfilled: 5 };
      const processingSo = { ...mockSalesOrder, status: OrderStatus.processing };

      soRepo.findById.mockResolvedValueOnce(approvedSo);
      soRepo.findItemsByIds.mockResolvedValueOnce([mockSalesOrder.items[0]]);
      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'batch-uuid-1',
        batchNo: 'BATCH-001',
        expiryDate: new Date('2025-12-31'), // Valid batch with future expiry
      } as any);
      inventorySvc.releaseReservation.mockResolvedValue(undefined as any);
      inventorySvc.dispatchInventory.mockResolvedValue(undefined as any);
      soRepo.updateItemFulfilled.mockResolvedValue(itemWithFulfillment);
      soRepo.findItemsByIds.mockResolvedValueOnce([itemWithFulfillment]);
      soRepo.updateStatus.mockResolvedValue(processingSo);
      soRepo.findById.mockResolvedValueOnce(processingSo);

      const result = await service.fulfillSalesOrder('so-uuid-1', fulfillDto);

      expect(result.status).toBe(OrderStatus.processing);
      expect(inventorySvc.dispatchInventory).toHaveBeenCalled();
    });

    // SO-TC46: Fulfill full successfully
    it('should fulfill full successfully and set status to shipped', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'so-item-uuid-1',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 10,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-2',
          },
        ],
      };

      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };
      const itemFullyFulfilled = { ...mockSalesOrder.items[0], qtyFulfilled: 10 };
      const shippedSo = { ...mockSalesOrder, status: OrderStatus.shipped };

      soRepo.findById.mockResolvedValueOnce(approvedSo);
      soRepo.findItemsByIds.mockResolvedValueOnce([mockSalesOrder.items[0]]);
      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'batch-uuid-1',
        batchNo: 'BATCH-001',
        expiryDate: new Date('2025-12-31'), // Valid batch with future expiry
      } as any);
      inventorySvc.releaseReservation.mockResolvedValue(undefined as any);
      inventorySvc.dispatchInventory.mockResolvedValue(undefined as any);
      soRepo.updateItemFulfilled.mockResolvedValue(itemFullyFulfilled);
      soRepo.findItemsByIds.mockResolvedValueOnce([itemFullyFulfilled]);
      soRepo.updateStatus.mockResolvedValue(shippedSo);
      soRepo.findById.mockResolvedValueOnce(shippedSo);

      const result = await service.fulfillSalesOrder('so-uuid-1', fulfillDto);

      expect(result.status).toBe(OrderStatus.shipped);
    });

    // SO-TC50: Fulfill exceeds ordered quantity
    it('should throw BadRequestException if fulfill exceeds ordered quantity', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'so-item-uuid-1',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 15,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-3',
          },
        ],
      };

      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };

      soRepo.findById.mockResolvedValue(approvedSo);
      soRepo.findItemsByIds.mockResolvedValue([mockSalesOrder.items[0]]);

      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        'exceeds remaining quantity',
      );
    });

    // SO-TC52: Fulfill SO not in approved/processing status
    it('should throw BadRequestException if SO is not approved/processing', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'so-item-uuid-1',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 5,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-4',
          },
        ],
      };

      soRepo.findById.mockResolvedValue(mockSalesOrder); // pending status

      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        'not eligible for fulfillment',
      );
    });

    // SO-TC53: Fulfill with invalid soItemId
    it('should throw BadRequestException if soItemId is invalid', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'invalid-item-id',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 5,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-5',
          },
        ],
      };

      const approvedSo = { ...mockSalesOrder, status: OrderStatus.approved };

      soRepo.findById.mockResolvedValue(approvedSo);
      soRepo.findItemsByIds.mockResolvedValue([]);

      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        'Some items not found in SO',
      );
    });

    // SO-TC54: Fulfill without items array
    it('should throw BadRequestException if items array is empty', async () => {
      const fulfillDto = { items: [] };

      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.fulfillSalesOrder('so-uuid-1', fulfillDto)).rejects.toThrow(
        'No items to fulfill',
      );
    });

    // SO-TC56: Fulfill non-existent SO
    it('should throw NotFoundException if SO not found', async () => {
      const fulfillDto = {
        items: [
          {
            soItemId: 'so-item-uuid-1',
            productBatchId: 'batch-uuid-1',
            locationId: 'location-uuid-1',
            qtyToFulfill: 5,
            createdById: 'user-uuid-1',
            idempotencyKey: 'idem-key-6',
          },
        ],
      };

      soRepo.findById.mockResolvedValue(null);

      await expect(service.fulfillSalesOrder('invalid-id', fulfillDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.fulfillSalesOrder('invalid-id', fulfillDto)).rejects.toThrow(
        'SO not found',
      );
    });
  });

  describe('cancelSalesOrder', () => {
    // SO-TC70: Cancel pending SO successfully
    it('should cancel a pending SO successfully', async () => {
      const cancelledSO = { ...mockSalesOrder, status: OrderStatus.cancelled };

      soRepo.findById.mockResolvedValueOnce(mockSalesOrder);
      soRepo.cancel.mockResolvedValue(cancelledSO);
      soRepo.findById.mockResolvedValueOnce(cancelledSO);

      const result = await service.cancelSalesOrder('so-uuid-1');

      expect(result.status).toBe(OrderStatus.cancelled);
      expect(soRepo.cancel).toHaveBeenCalledWith('so-uuid-1');
    });

    // SO-TC73: Cancel shipped SO
    it('should throw BadRequestException if trying to cancel shipped SO', async () => {
      const shippedSo = { ...mockSalesOrder, status: OrderStatus.shipped };
      soRepo.findById.mockResolvedValue(shippedSo);

      await expect(service.cancelSalesOrder('so-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.cancelSalesOrder('so-uuid-1')).rejects.toThrow(
        'Cannot cancel SO with status',
      );
    });

    // SO-TC74: Cancel already cancelled SO
    it('should throw BadRequestException if SO is already cancelled', async () => {
      const cancelledSo = { ...mockSalesOrder, status: OrderStatus.cancelled };
      soRepo.findById.mockResolvedValue(cancelledSo);

      await expect(service.cancelSalesOrder('so-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.cancelSalesOrder('so-uuid-1')).rejects.toThrow(
        'Cannot cancel SO with status',
      );
    });

    // SO-TC75: Cancel non-existent SO
    it('should throw NotFoundException if SO not found', async () => {
      soRepo.findById.mockResolvedValue(null);

      await expect(service.cancelSalesOrder('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.cancelSalesOrder('invalid-id')).rejects.toThrow('SO not found');
    });
  });
});
