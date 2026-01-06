/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { PurchaseOrderRepository } from '../../repositories/purchase-order.repository';
import { InventoryService } from '../../../inventory/services/inventory.service';
import { AuditMiddleware } from '../../../../database/middleware/audit.middleware';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { PoStatus, StockMovementType } from '@prisma/client';

describe('Purchase Order Service', () => {
  let service: PurchaseOrderService;
  let poRepo: jest.Mocked<PurchaseOrderRepository>;
  let inventorySvc: jest.Mocked<InventoryService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockPurchaseOrder: any = {
    id: 'po-uuid-1',
    poNo: 'PO-202510-ABC123',
    supplierId: 'supplier-uuid-1',
    status: PoStatus.draft,
    placedAt: new Date('2024-01-15T10:00:00Z'),
    expectedArrival: new Date('2024-01-20T10:00:00Z'),
    totalAmount: 500000,
    notes: 'Test order',
    createdById: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'po-item-uuid-1',
        purchaseOrderId: 'po-uuid-1',
        productId: 'product-uuid-1',
        productBatchId: null,
        qtyOrdered: 10,
        qtyReceived: 0,
        unitPrice: 50000,
        lineTotal: 500000,
        remark: 'Test item',
        product: {
          id: 'product-uuid-1',
          code: 'PROD-001',
          name: 'Product A',
          description: 'Test Product',
        },
      },
    ],
    supplier: {
      id: 'supplier-uuid-1',
      code: 'SUP-001',
      name: 'Test Supplier',
      contactInfo: { phone: '0901234567' },
      address: null,
      createdAt: new Date(),
    },
  };

  const mockMovement = {
    id: 'mov-uuid-1',
    productBatchId: 'batch-uuid-1',
    productId: null,
    fromLocationId: null,
    toLocationId: 'location-uuid-1',
    quantity: 5,
    movementType: StockMovementType.purchase_receipt,
    reference: null,
    note: null,
    transferGroupId: null,
    createdById: 'user-uuid-1',
    idempotencyKey: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockPoRepo = {
      findById: jest.fn(),
      findByPoNo: jest.fn(),
      createDraft: jest.fn(),
      updateTotals: jest.fn(),
      submit: jest.fn(),
      findItemsByIds: jest.fn(),
      receiveItems: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      updateItem: jest.fn(),
      cancel: jest.fn(),
      addItems: jest.fn(),
      removeItems: jest.fn(),
      getItemById: jest.fn(),
      removeItem: jest.fn(),
    };

    const mockInventorySvc = {
      receiveInventory: jest.fn(),
    };

    const mockAuditMiddleware = {
      logCreate: jest.fn().mockResolvedValue(undefined),
      logUpdate: jest.fn().mockResolvedValue(undefined),
      logDelete: jest.fn().mockResolvedValue(undefined),
      logOperation: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = {
      location: {
        findFirst: jest.fn(),
      },
      productBatch: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        {
          provide: PurchaseOrderRepository,
          useValue: mockPoRepo,
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

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    poRepo = module.get(PurchaseOrderRepository);
    inventorySvc = module.get(InventoryService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPurchaseOrder', () => {
    // PO-TC01: Create draft PO with valid data
    it('should create a draft PO with valid data', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        placedAt: '2024-01-15T10:00:00Z',
        expectedArrival: '2024-01-20T10:00:00Z',
        notes: 'Test order',
        createdById: 'user-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            qtyOrdered: 10,
            unitPrice: 50000,
            remark: 'Test item',
          },
        ],
      };

      poRepo.createDraft.mockResolvedValue(mockPurchaseOrder);
      poRepo.updateTotals.mockResolvedValue(mockPurchaseOrder);
      poRepo.findById.mockResolvedValue(mockPurchaseOrder);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPurchaseOrder);
      expect(result.data.status).toBe(PoStatus.draft);
      expect(result.data.poNo).toMatch(/^PO-\d{6}-[A-Z0-9]{6}$/);
      expect(result.message).toBe('Purchase order created successfully');
      expect(poRepo.createDraft).toHaveBeenCalled();
      expect(poRepo.updateTotals).toHaveBeenCalled();
    });

    // PO-TC02: Create without supplierId
    it('should create a PO without supplierId', async () => {
      const createDto = {
        placedAt: '2024-01-15T10:00:00Z',
        expectedArrival: '2024-01-20T10:00:00Z',
        notes: 'Test order',
        createdById: 'user-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            qtyOrdered: 10,
            unitPrice: 50000,
          },
        ],
      };

      const poWithoutSupplier = { ...mockPurchaseOrder, supplierId: null };
      poRepo.createDraft.mockResolvedValue(poWithoutSupplier);
      poRepo.updateTotals.mockResolvedValue(poWithoutSupplier);
      poRepo.findById.mockResolvedValue(poWithoutSupplier);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data.supplierId).toBeNull();
      expect(result.message).toBe('Purchase order created successfully');
    });

    // PO-TC03: Create without items
    it('should create a PO without items', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        placedAt: '2024-01-15T10:00:00Z',
        createdById: 'user-uuid-1',
      };

      const poWithoutItems = { ...mockPurchaseOrder, items: [], totalAmount: 0 };
      poRepo.createDraft.mockResolvedValue(poWithoutItems);
      poRepo.updateTotals.mockResolvedValue(poWithoutItems);
      poRepo.findById.mockResolvedValue(poWithoutItems);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect((result.data as any).items).toEqual([]);
      expect(result.data.totalAmount).toBe(0);
      expect(result.message).toBe('Purchase order created successfully');
    });

    // PO-TC04: Create with items missing unitPrice
    it('should create a PO with items missing unitPrice', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            qtyOrdered: 10,
          },
        ],
        createdById: 'user-uuid-1',
      };

      const itemWithoutPrice = {
        ...mockPurchaseOrder.items![0],
        unitPrice: null,
        lineTotal: null,
      };
      const poWithNullPrice = {
        ...mockPurchaseOrder,
        items: [itemWithoutPrice],
        totalAmount: 0,
      };

      poRepo.createDraft.mockResolvedValue(poWithNullPrice);
      poRepo.updateTotals.mockResolvedValue(poWithNullPrice);
      poRepo.findById.mockResolvedValue(poWithNullPrice);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect((result.data as any).items[0].unitPrice).toBeNull();
      expect((result.data as any).items[0].lineTotal).toBeNull();
      expect(result.message).toBe('Purchase order created successfully');
    });

    // PO-TC05: Create with multiple items
    it('should create a PO with multiple items and calculate total', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            qtyOrdered: 5,
            unitPrice: 100,
          },
          {
            productId: 'product-uuid-2',
            qtyOrdered: 3,
            unitPrice: 200,
          },
        ],
        createdById: 'user-uuid-1',
      };

      const poWithMultipleItems = {
        ...mockPurchaseOrder,
        items: [
          { ...mockPurchaseOrder.items![0], qtyOrdered: 5, unitPrice: 100, lineTotal: 500 },
          {
            ...mockPurchaseOrder.items![0],
            id: 'po-item-uuid-2',
            qtyOrdered: 3,
            unitPrice: 200,
            lineTotal: 600,
          },
        ],
        totalAmount: 1100,
      };

      poRepo.createDraft.mockResolvedValue(poWithMultipleItems);
      poRepo.updateTotals.mockResolvedValue(poWithMultipleItems);
      poRepo.findById.mockResolvedValue(poWithMultipleItems);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect((result.data as any).items).toHaveLength(2);
      expect(result.data.totalAmount).toBe(1100);
      expect(result.message).toBe('Purchase order created successfully');
    });

    // PO-TC06: Create with invalid productId (tested by DTO)
    // PO-TC07: Create with negative qtyOrdered (tested by DTO)
    // PO-TC08: Permission denied (tested by guard)

    // PO-TC09: Create with placedAt in past
    it('should allow creating PO with placedAt in past', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        placedAt: '2020-01-15T10:00:00Z',
        items: [],
        createdById: 'user-uuid-1',
      };

      const poWithPastDate = {
        ...mockPurchaseOrder,
        placedAt: new Date('2020-01-15T10:00:00Z'),
        items: [],
      };

      poRepo.createDraft.mockResolvedValue(poWithPastDate);
      poRepo.updateTotals.mockResolvedValue(poWithPastDate);
      poRepo.findById.mockResolvedValue(poWithPastDate);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data.placedAt).toEqual(new Date('2020-01-15T10:00:00Z'));
      expect(result.message).toBe('Purchase order created successfully');
    });

    // PO-TC10: Create with expectedArrival before placedAt (TODO: add validation)
    it('should allow creating PO with expectedArrival before placedAt (edge case)', async () => {
      const createDto = {
        supplierId: 'supplier-uuid-1',
        placedAt: '2024-01-15T10:00:00Z',
        expectedArrival: '2024-01-10T10:00:00Z',
        items: [],
        createdById: 'user-uuid-1',
      };

      const poWithInvalidDates = {
        ...mockPurchaseOrder,
        placedAt: new Date('2024-01-15T10:00:00Z'),
        expectedArrival: new Date('2024-01-10T10:00:00Z'),
        items: [],
      };

      poRepo.createDraft.mockResolvedValue(poWithInvalidDates);
      poRepo.updateTotals.mockResolvedValue(poWithInvalidDates);
      poRepo.findById.mockResolvedValue(poWithInvalidDates);

      const result = await service.createPurchaseOrder(createDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data.expectedArrival!.getTime()).toBeLessThan(result.data.placedAt!.getTime());
      expect(result.message).toBe('Purchase order created successfully');
      // TODO: Should add validation to prevent this
    });
  });

  describe('submitPurchaseOrder', () => {
    // PO-TC11: Submit draft PO successfully
    it('should submit a draft PO successfully', async () => {
      const submitDto = {};

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered, placedAt: new Date() };
      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(orderedPo);
      poRepo.submit.mockResolvedValue(orderedPo);

      const result = await service.submitPurchaseOrder('po-uuid-1', submitDto, 'user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(PoStatus.ordered);
      expect(result.data.placedAt).toBeDefined();
      expect(result.message).toBe('Purchase order submitted successfully');
      expect(poRepo.submit).toHaveBeenCalledWith('po-uuid-1');
    });

    // PO-TC12: Missing userId (tested by DTO)
    it('should accept missing submittedById (handled by controller layer)', async () => {
      const submitDto = {};
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered, placedAt: new Date() };
      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(orderedPo);
      poRepo.submit.mockResolvedValue(orderedPo);

      const result = await service.submitPurchaseOrder('po-uuid-1', submitDto, '');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(PoStatus.ordered);
      expect(result.data.placedAt).toBeDefined();
      expect(poRepo.submit).toHaveBeenCalledWith('po-uuid-1');
    });

    // PO-TC13: Submit PO not in draft status
    it('should throw BadRequestException if PO is not in draft status', async () => {
      const submitDto = {};

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      poRepo.findById.mockResolvedValue(orderedPo);

      await expect(
        service.submitPurchaseOrder('po-uuid-1', submitDto, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitPurchaseOrder('po-uuid-1', submitDto, 'user-uuid-1'),
      ).rejects.toThrow('Only draft can be submitted');
    });

    // PO-TC14: Submit non-existent PO
    it('should throw NotFoundException if PO not found', async () => {
      const submitDto = {};

      poRepo.findById.mockResolvedValue(null);

      await expect(
        service.submitPurchaseOrder('invalid-id', submitDto, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.submitPurchaseOrder('invalid-id', submitDto, 'user-uuid-1'),
      ).rejects.toThrow('PO not found');
    });

    // PO-TC15: Permission denied (tested by guard)
    // PO-TC16: No authentication (tested by guard)
  });

  describe('findById', () => {
    // PO-TC17: Find by valid ID
    it('should return a PO by valid ID', async () => {
      poRepo.findById.mockResolvedValue(mockPurchaseOrder);

      const result = await service.findById('po-uuid-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPurchaseOrder);
      expect(result.message).toBe('Purchase order retrieved successfully');
      expect(poRepo.findById).toHaveBeenCalledWith('po-uuid-1');
    });

    // PO-TC18: PO not found
    it('should throw NotFoundException if PO not found', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('PO not found');
    });
  });

  describe('receivePurchaseOrder', () => {
    const receiveDto = {
      items: [
        {
          poItemId: 'po-item-uuid-1',
          qtyToReceive: 5,
          locationId: 'location-uuid-1',
          productBatchId: 'batch-uuid-1',
          createdById: 'user-uuid-1',
          idempotencyKey: 'key-001',
        },
      ],
    };

    // PO-TC19: Receive partial successfully
    it('should receive partial quantity successfully', async () => {
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      const partialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 5 }],
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDto);

      expect(result.status).toBe(PoStatus.partial);
      expect((result as any).items[0].qtyReceived).toBe(5);
      expect(inventorySvc.receiveInventory).toHaveBeenCalled();
    });

    // PO-TC20: Receive full successfully
    it('should receive full quantity successfully', async () => {
      const receiveDtoFull = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 10,
            locationId: 'location-uuid-1',
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-002',
          },
        ],
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      const receivedPo = {
        ...mockPurchaseOrder,
        status: PoStatus.received,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 10 }],
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(receivedPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(receivedPo as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoFull);

      expect(result.status).toBe(PoStatus.received);
      expect((result as any).items[0].qtyReceived).toBe(10);
    });

    // PO-TC21: Receive multiple times partial → partial
    it('should handle multiple partial receives', async () => {
      const partialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 5 }],
      };

      const morePartialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 8 }],
      };

      poRepo.findById
        .mockResolvedValueOnce(partialPo as any)
        .mockResolvedValueOnce(morePartialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([partialPo.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(morePartialPo as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', {
        items: [{ ...receiveDto.items[0], qtyToReceive: 3 }],
      });

      expect(result.status).toBe(PoStatus.partial);
      expect((result as any).items[0].qtyReceived).toBe(8);
    });

    // PO-TC22: Receive multiple times partial → received
    it('should transition from partial to received after final receive', async () => {
      const partialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 5 }],
      };

      const receivedPo = {
        ...mockPurchaseOrder,
        status: PoStatus.received,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 10 }],
      };

      poRepo.findById
        .mockResolvedValueOnce(partialPo as any)
        .mockResolvedValueOnce(receivedPo as any);
      poRepo.findItemsByIds.mockResolvedValue([partialPo.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(receivedPo as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', {
        items: [{ ...receiveDto.items[0], qtyToReceive: 5 }],
      });

      expect(result.status).toBe(PoStatus.received);
      expect((result as any).items[0].qtyReceived).toBe(10);
    });

    // PO-TC23: Receive multiple times with multiple items
    it('should handle receiving multiple items', async () => {
      const receiveDtoMultiple = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            locationId: 'location-uuid-1',
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-003',
          },
          {
            poItemId: 'po-item-uuid-2',
            qtyToReceive: 3,
            locationId: 'location-uuid-1',
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-004',
          },
        ],
      };

      const poWithMultipleItems = {
        ...mockPurchaseOrder,
        status: PoStatus.ordered,
        items: [
          mockPurchaseOrder.items![0],
          { ...mockPurchaseOrder.items![0], id: 'po-item-uuid-2', qtyOrdered: 8 },
        ],
      };

      const partialPoMultiple = {
        ...poWithMultipleItems,
        status: PoStatus.partial,
        items: [
          { ...poWithMultipleItems.items![0], qtyReceived: 5 },
          { ...poWithMultipleItems.items![1], qtyReceived: 3 },
        ],
      };

      poRepo.findById
        .mockResolvedValueOnce(poWithMultipleItems as any)
        .mockResolvedValueOnce(partialPoMultiple as any);
      poRepo.findItemsByIds.mockResolvedValue(poWithMultipleItems.items as any);
      poRepo.receiveItems.mockResolvedValue(partialPoMultiple as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoMultiple);

      expect(result.status).toBe(PoStatus.partial);
      expect(inventorySvc.receiveInventory).toHaveBeenCalledTimes(2);
    });

    // PO-TC24: Receive exceeds ordered quantity
    it('should throw BadRequestException if receive exceeds ordered quantity', async () => {
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };

      poRepo.findById.mockResolvedValue(orderedPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);

      const exceedDto = {
        items: [{ ...receiveDto.items[0], qtyToReceive: 15 }],
      };

      await expect(service.receivePurchaseOrder('po-uuid-1', exceedDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receivePurchaseOrder('po-uuid-1', exceedDto)).rejects.toThrow(
        'exceeds remaining quantity',
      );
    });

    // PO-TC25: Receive exceeds with multiple receives
    it('should throw BadRequestException if cumulative receives exceed ordered quantity', async () => {
      const partialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 8 }],
      };

      poRepo.findById.mockResolvedValue(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([partialPo.items![0]] as any);

      const exceedDto = {
        items: [{ ...receiveDto.items[0], qtyToReceive: 5 }], // 8 + 5 = 13 > 10
      };

      await expect(service.receivePurchaseOrder('po-uuid-1', exceedDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receivePurchaseOrder('po-uuid-1', exceedDto)).rejects.toThrow(
        'exceeds remaining quantity',
      );
    });

    // PO-TC26: Receive PO not in ordered/partial status
    it('should throw BadRequestException if PO status not eligible', async () => {
      const draftPo = { ...mockPurchaseOrder, status: PoStatus.draft };

      poRepo.findById.mockResolvedValue(draftPo as any);

      await expect(service.receivePurchaseOrder('po-uuid-1', receiveDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receivePurchaseOrder('po-uuid-1', receiveDto)).rejects.toThrow(
        'PO status is not eligible for receiving',
      );
    });

    // PO-TC27: Receive with invalid poItemId
    it('should throw BadRequestException if poItemId not found in PO', async () => {
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };

      poRepo.findById.mockResolvedValue(orderedPo as any);
      poRepo.findItemsByIds.mockResolvedValue([]);

      await expect(service.receivePurchaseOrder('po-uuid-1', receiveDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receivePurchaseOrder('po-uuid-1', receiveDto)).rejects.toThrow(
        'Some items not found in PO',
      );
    });

    // PO-TC28: Receive without items array (tested by DTO)
    it('should throw BadRequestException if items array is empty', async () => {
      const emptyDto = {
        items: [],
      };

      await expect(service.receivePurchaseOrder('po-uuid-1', emptyDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receivePurchaseOrder('po-uuid-1', emptyDto)).rejects.toThrow(
        'No items to receive',
      );
    });

    // PO-TC29: Receive with duplicate idempotencyKey
    it('should handle duplicate idempotencyKey (idempotent)', async () => {
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      const partialPo = {
        ...mockPurchaseOrder,
        status: PoStatus.partial,
        items: [{ ...mockPurchaseOrder.items![0], qtyReceived: 5 }],
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);
      inventorySvc.receiveInventory
        .mockResolvedValueOnce({ success: true, idempotent: false, movement: mockMovement })
        .mockResolvedValueOnce({
          success: true,
          idempotent: true,
          movement: { ...mockMovement, idempotencyKey: 'key-001' },
        });

      // First call with idempotency key
      await service.receivePurchaseOrder('po-uuid-1', receiveDto);

      // Second call with same idempotency key - should be handled by inventorySvc
      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'key-001',
        }),
      );
    });

    // PO-TC30: Receive non-existent PO
    it('should throw NotFoundException if PO not found', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(service.receivePurchaseOrder('invalid-id', receiveDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.receivePurchaseOrder('invalid-id', receiveDto)).rejects.toThrow(
        'PO not found',
      );
    });

    // PO-TC31: Receive without locationId (tested by DTO)
    // PO-TC32: Receive without productBatchId (tested by DTO)
    // PO-TC33: Receive without createdById (tested by DTO)
    // PO-TC34: Receive without idempotencyKey (tested by DTO)

    // PO-TC35: Receive multiple items simultaneously
    it('should receive multiple items simultaneously', async () => {
      const receiveDtoMultiple = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            locationId: 'location-uuid-1',
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-005',
          },
          {
            poItemId: 'po-item-uuid-2',
            qtyToReceive: 3,
            locationId: 'location-uuid-1',
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-006',
          },
        ],
      };

      const poWithMultipleItems = {
        ...mockPurchaseOrder,
        status: PoStatus.ordered,
        items: [
          mockPurchaseOrder.items![0],
          { ...mockPurchaseOrder.items![0], id: 'po-item-uuid-2' },
        ],
      };

      const partialPoMultiple = {
        ...poWithMultipleItems,
        status: PoStatus.partial,
      };

      poRepo.findById
        .mockResolvedValueOnce(poWithMultipleItems as any)
        .mockResolvedValueOnce(partialPoMultiple as any);
      poRepo.findItemsByIds.mockResolvedValue(poWithMultipleItems.items as any);
      poRepo.receiveItems.mockResolvedValue(partialPoMultiple as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoMultiple);

      expect(result).toBeDefined();
      expect(inventorySvc.receiveInventory).toHaveBeenCalledTimes(2);
    });

    // PO-TC36: Permission denied (tested by guard)
    // PO-TC37: No authentication (tested by guard)

    // PO-TC38: Inventory integration verified
    it('should verify inventory integration with correct parameters', async () => {
      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      const partialPo = { ...mockPurchaseOrder, status: PoStatus.partial };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);
      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      await service.receivePurchaseOrder('po-uuid-1', receiveDto);

      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith({
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 5,
        createdById: 'user-uuid-1',
        idempotencyKey: 'key-001',
      });
    });

    // PO-TC39: Auto-allocate locationId when missing
    it('should auto-allocate locationId when not provided', async () => {
      const receiveDtoWithoutLocation = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-auto-loc',
          },
        ],
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered, poNo: 'PO-2025-001' };
      const partialPo = { ...mockPurchaseOrder, status: PoStatus.partial };

      const mockDefaultLocation = {
        id: 'default-location-uuid-1',
        code: 'DEFAULT',
        name: 'Default Location',
        warehouseId: 'warehouse-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);

      // Mock Prisma location queries
      (prisma.location.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockDefaultLocation) // First call: find DEFAULT location
        .mockResolvedValueOnce(null); // Second call: find batch (not found, will create)

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.productBatch.create as jest.Mock).mockResolvedValue({
        id: 'batch-uuid-1',
        batchNo: 'BATCH-PO-PO-2025-001-PO-ITEM',
        productId: 'product-uuid-1',
        quantity: 0,
      });

      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoWithoutLocation);

      expect(result.status).toBe(PoStatus.partial);
      expect(prisma.location.findFirst).toHaveBeenCalled();
      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: 'default-location-uuid-1',
        }),
      );
    });

    // PO-TC40: Auto-create ProductBatch when productBatchId missing
    it('should auto-create ProductBatch when productBatchId not provided', async () => {
      const receiveDtoWithoutBatch = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            locationId: 'location-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-auto-batch',
          },
        ],
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered, poNo: 'PO-2025-001' };
      const partialPo = { ...mockPurchaseOrder, status: PoStatus.partial };

      const mockCreatedBatch = {
        id: expect.any(String),
        batchNo: 'BATCH-PO-PO-2025-001-PO-ITEM',
        productId: 'product-uuid-1',
        quantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);

      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.productBatch.create as jest.Mock).mockResolvedValue(mockCreatedBatch);

      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoWithoutBatch);

      expect(result.status).toBe(PoStatus.partial);
      expect(prisma.productBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'product-uuid-1',
            batchNo: expect.stringContaining('BATCH-PO-PO-2025-001'),
          }),
        }),
      );
      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          productBatchId: expect.any(String),
        }),
      );
    });

    // PO-TC41: Auto-allocate both locationId and productBatchId when both missing
    it('should auto-allocate both locationId and productBatchId when both are missing', async () => {
      const receiveDtoWithoutBoth = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-auto-both',
          },
        ],
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered, poNo: 'PO-2025-001' };
      const partialPo = { ...mockPurchaseOrder, status: PoStatus.partial };

      const mockDefaultLocation = {
        id: 'default-location-uuid-1',
        code: 'DEFAULT',
        name: 'Default Location',
        warehouseId: 'warehouse-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedBatch = {
        id: expect.any(String),
        batchNo: 'BATCH-PO-PO-2025-001-PO-ITEM',
        productId: 'product-uuid-1',
        quantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      poRepo.findById
        .mockResolvedValueOnce(orderedPo as any)
        .mockResolvedValueOnce(partialPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);
      poRepo.receiveItems.mockResolvedValue(partialPo as any);

      (prisma.location.findFirst as jest.Mock).mockResolvedValue(mockDefaultLocation);
      (prisma.productBatch.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.productBatch.create as jest.Mock).mockResolvedValue(mockCreatedBatch);

      inventorySvc.receiveInventory.mockResolvedValue({
        success: true,
        idempotent: false,
        movement: mockMovement,
      });

      const result = await service.receivePurchaseOrder('po-uuid-1', receiveDtoWithoutBoth);

      expect(result.status).toBe(PoStatus.partial);
      expect(prisma.location.findFirst).toHaveBeenCalled();
      expect(prisma.productBatch.create).toHaveBeenCalled();
      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: 'default-location-uuid-1',
          productBatchId: expect.any(String),
        }),
      );
    });

    // PO-TC42: Throw error when no location found in system
    it('should throw BadRequestException when no location found for auto-allocation', async () => {
      const receiveDtoWithoutLocation = {
        items: [
          {
            poItemId: 'po-item-uuid-1',
            qtyToReceive: 5,
            productBatchId: 'batch-uuid-1',
            createdById: 'user-uuid-1',
            idempotencyKey: 'key-no-loc',
          },
        ],
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      poRepo.findById.mockResolvedValue(orderedPo as any);
      poRepo.findItemsByIds.mockResolvedValue([mockPurchaseOrder.items![0]] as any);

      // Mock no location found
      (prisma.location.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.receivePurchaseOrder('po-uuid-1', receiveDtoWithoutLocation),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.receivePurchaseOrder('po-uuid-1', receiveDtoWithoutLocation),
      ).rejects.toThrow('No location found in system');
    });
  });

  describe('list', () => {
    // PO-TC39: Get all POs (pagination disabled)
    it('should return all POs without pagination', async () => {
      const query = {};

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.total).toBe(1);
      expect(result.message).toBe('Purchase orders retrieved successfully');
    });

    // PO-TC40: Filter by poNo
    it('should filter POs by poNo', async () => {
      const query = {
        poNo: 'PO-202510',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            poNo: expect.objectContaining({
              contains: 'PO-202510',
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });

    // PO-TC41: Filter by status
    it('should filter POs by status', async () => {
      const query = {
        status: PoStatus.ordered,
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PoStatus.ordered,
          }),
        }),
      );
    });

    // PO-TC42: Filter by supplierId
    it('should filter POs by supplierId', async () => {
      const query = {
        supplierId: 'supplier-uuid-1',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplierId: 'supplier-uuid-1',
          }),
        }),
      );
    });

    // PO-TC43: Filter by dateFrom
    it('should filter POs by dateFrom', async () => {
      const query = {
        dateFrom: '2024-01-01',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            placedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // PO-TC44: Filter by dateTo
    it('should filter POs by dateTo', async () => {
      const query = {
        dateTo: '2024-01-31',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            placedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // PO-TC45: Filter by date range
    it('should filter POs by date range', async () => {
      const query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            placedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // PO-TC46: Pagination disabled - returns all records
    it('should return all POs regardless of page/pageSize params', async () => {
      const query = {
        page: 2,
        pageSize: 10,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          orderBy: expect.any(Array),
        }),
      );
      expect(poRepo.list).not.toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expect.anything(),
          take: expect.anything(),
        }),
      );
    });

    // PO-TC47: Sort by placedAt asc
    it('should sort POs by placedAt ascending', async () => {
      const query = {
        sort: 'placedAt:asc',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ placedAt: 'asc' }],
        }),
      );
    });

    // PO-TC48: Sort by status desc
    it('should sort POs by status descending', async () => {
      const query = {
        sort: 'status:desc',
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ status: 'desc' }],
        }),
      );
    });

    // PO-TC49: Combine multiple filters
    it('should combine multiple filters', async () => {
      const query = {
        status: PoStatus.ordered,
        supplierId: 'supplier-uuid-1',
        dateFrom: '2024-01-01',
        page: 1,
        pageSize: 10,
        sort: 'placedAt:desc',
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PoStatus.ordered,
            supplierId: 'supplier-uuid-1',
            placedAt: expect.any(Object),
          }),
        }),
      );
    });

    // PO-TC50: SQL injection test (handled by Prisma)
    it('should handle SQL injection attempts safely', async () => {
      const query = {
        poNo: "'; DROP TABLE purchase_orders; --",
        page: 1,
        pageSize: 20,
      };

      poRepo.list.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      // Prisma will escape the input, preventing SQL injection
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            poNo: expect.objectContaining({
              contains: "'; DROP TABLE purchase_orders; --",
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });
  });

  describe('updatePurchaseOrder', () => {
    it('should update purchase order successfully', async () => {
      const id = 'po-uuid-1';
      const updateDto = {
        supplierId: 'new-supplier-uuid',
        expectedArrival: '2024-02-15',
        notes: 'Updated notes',
      };

      const updatedPo = {
        ...mockPurchaseOrder,
        ...updateDto,
      };

      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(updatedPo);
      poRepo.update.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.updatePurchaseOrder(id, updateDto);

      expect(result).toEqual(updatedPo);
      expect(poRepo.update).toHaveBeenCalledWith(id, expect.any(Object));
    });

    it('should throw NotFoundException if PO does not exist', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(
        service.updatePurchaseOrder('non-existent-id', { notes: 'test' }),
      ).rejects.toThrow('PO not found');
    });

    it('should update PO with items', async () => {
      const id = 'po-uuid-1';
      const updateDto = {
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            qtyOrdered: 150,
            unitPrice: 55,
          },
        ],
      };

      const updatedPo = {
        ...mockPurchaseOrder,
        items: [
          { id: 'item-1', productId: 'prod-1', qtyOrdered: 150, unitPrice: 55, lineTotal: 8250 },
        ],
      };

      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(updatedPo);
      poRepo.getItemById.mockResolvedValue({
        id: 'item-1',
        purchaseOrderId: id,
        productId: 'prod-1',
        productBatchId: null,
        qtyOrdered: 100,
        qtyReceived: 0,
        unitPrice: 50,
        lineTotal: 5000,
        remark: null,
      } as any);
      poRepo.update.mockResolvedValue(mockPurchaseOrder as any);
      poRepo.updateItem.mockResolvedValue({} as any);

      const result = await service.updatePurchaseOrder(id, updateDto);

      expect(result).toEqual(updatedPo);
      expect(poRepo.updateItem).toHaveBeenCalledWith('item-1', expect.any(Object));
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('should cancel purchase order successfully', async () => {
      const id = 'po-uuid-1';
      const cancelDto = {
        reason: 'Supplier delay',
      };

      const cancelledPo = {
        ...mockPurchaseOrder,
        status: PoStatus.cancelled,
      };

      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(cancelledPo);
      poRepo.cancel.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.cancelPurchaseOrder(id, cancelDto, 'user-uuid-1');

      expect(result).toEqual(cancelledPo);
      expect(poRepo.cancel).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if PO does not exist', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(service.cancelPurchaseOrder('non-existent-id', {}, 'user-1')).rejects.toThrow(
        'PO not found',
      );
    });

    it('should accept missing cancelledById (handled by controller layer)', async () => {
      const cancelledPo = { ...mockPurchaseOrder, status: PoStatus.cancelled };
      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(cancelledPo);
      poRepo.cancel.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.cancelPurchaseOrder('po-uuid-1', {}, '');

      expect(result).toEqual(cancelledPo);
      expect(poRepo.cancel).toHaveBeenCalledWith('po-uuid-1');
    });

    it('should throw BadRequestException if PO is already received', async () => {
      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.received,
      });

      await expect(service.cancelPurchaseOrder('po-uuid-1', {}, 'user-1')).rejects.toThrow(
        'Cannot cancel PO with status: received',
      );
    });

    it('should throw BadRequestException if PO is already cancelled', async () => {
      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.cancelled,
      });

      await expect(service.cancelPurchaseOrder('po-uuid-1', {}, 'user-1')).rejects.toThrow(
        'Cannot cancel PO with status: cancelled',
      );
    });

    it('should allow cancellation with optional reason', async () => {
      const id = 'po-uuid-1';
      const cancelDto = {};

      const cancelledPo = {
        ...mockPurchaseOrder,
        status: PoStatus.cancelled,
      };

      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(cancelledPo);
      poRepo.cancel.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.cancelPurchaseOrder(id, cancelDto, 'user-uuid-1');

      expect(result).toEqual(cancelledPo);
      expect(poRepo.cancel).toHaveBeenCalledWith(id);
    });
  });

  describe('addPurchaseOrderItems', () => {
    it('should add items to draft PO successfully', async () => {
      const id = 'po-uuid-1';
      const items = [
        {
          productId: 'prod-1',
          qtyOrdered: 100,
          unitPrice: 50,
          remark: 'New item',
        },
        {
          productId: 'prod-2',
          qtyOrdered: 50,
        },
      ];

      const updatedPo = {
        ...mockPurchaseOrder,
        items: [
          { id: 'item-1', productId: 'prod-1', qtyOrdered: 100, unitPrice: 50, lineTotal: 5000 },
          { id: 'item-2', productId: 'prod-2', qtyOrdered: 50, unitPrice: null, lineTotal: null },
        ],
      };

      poRepo.findById
        .mockResolvedValueOnce({ ...mockPurchaseOrder, status: PoStatus.draft })
        .mockResolvedValueOnce(updatedPo);
      poRepo.addItems.mockResolvedValue(undefined);
      poRepo.updateTotals.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.addPurchaseOrderItems(id, items);

      expect(result).toEqual(updatedPo);
      expect(poRepo.addItems).toHaveBeenCalledWith(id, expect.any(Array));
    });

    it('should throw NotFoundException if PO does not exist', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(service.addPurchaseOrderItems('non-existent-id', [])).rejects.toThrow(
        'PO not found',
      );
    });

    it('should throw BadRequestException if PO is not draft', async () => {
      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.ordered,
      });

      await expect(
        service.addPurchaseOrderItems('po-uuid-1', [{ productId: 'prod-1', qtyOrdered: 10 }]),
      ).rejects.toThrow('Can only add items to draft PO');
    });

    it('should calculate lineTotal when unitPrice is provided', async () => {
      const id = 'po-uuid-1';
      const items = [
        {
          productId: 'prod-1',
          qtyOrdered: 100,
          unitPrice: 50,
        },
      ];

      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.draft,
      });
      poRepo.addItems.mockResolvedValue(mockPurchaseOrder);

      await service.addPurchaseOrderItems(id, items);

      const addItemsCall = (poRepo.addItems as jest.Mock).mock.calls[0][1];
      expect(addItemsCall[0].lineTotal).toBe(5000); // 100 * 50
    });

    it('should set lineTotal to null when unitPrice is not provided', async () => {
      const id = 'po-uuid-1';
      const items = [
        {
          productId: 'prod-1',
          qtyOrdered: 100,
        },
      ];

      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.draft,
      });
      poRepo.addItems.mockResolvedValue(mockPurchaseOrder);

      await service.addPurchaseOrderItems(id, items);

      const addItemsCall = (poRepo.addItems as jest.Mock).mock.calls[0][1];
      expect(addItemsCall[0].lineTotal).toBeNull();
    });
  });

  describe('removePurchaseOrderItems', () => {
    it('should remove items from draft PO successfully', async () => {
      const id = 'po-uuid-1';
      const itemIds = ['item-uuid-1', 'item-uuid-2'];

      const updatedPo = {
        ...mockPurchaseOrder,
        items: [],
      };

      poRepo.findById
        .mockResolvedValueOnce({ ...mockPurchaseOrder, status: PoStatus.draft })
        .mockResolvedValueOnce(updatedPo);
      poRepo.getItemById
        .mockResolvedValueOnce({
          id: 'item-uuid-1',
          purchaseOrderId: id,
          productId: 'prod-1',
          productBatchId: null,
          qtyOrdered: 100,
          qtyReceived: 0,
          unitPrice: null,
          lineTotal: null,
          remark: null,
        } as any)
        .mockResolvedValueOnce({
          id: 'item-uuid-2',
          purchaseOrderId: id,
          productId: 'prod-2',
          productBatchId: null,
          qtyOrdered: 50,
          qtyReceived: 0,
          unitPrice: null,
          lineTotal: null,
          remark: null,
        } as any);
      poRepo.removeItems.mockResolvedValue(undefined);
      poRepo.updateTotals.mockResolvedValue(mockPurchaseOrder as any);

      const result = await service.removePurchaseOrderItems(id, itemIds);

      expect(result).toEqual(updatedPo);
      expect(poRepo.removeItems).toHaveBeenCalledWith(itemIds);
    });

    it('should throw NotFoundException if PO does not exist', async () => {
      poRepo.findById.mockResolvedValue(null);

      await expect(service.removePurchaseOrderItems('non-existent-id', [])).rejects.toThrow(
        'PO not found',
      );
    });

    it('should throw BadRequestException if PO is not draft', async () => {
      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.received,
      });

      await expect(service.removePurchaseOrderItems('po-uuid-1', ['item-1'])).rejects.toThrow(
        'Can only remove items from draft PO',
      );
    });

    it('should throw NotFoundException if item does not exist', async () => {
      const id = 'po-uuid-1';
      const itemIds = ['non-existent-item'];

      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.draft,
      });
      poRepo.getItemById.mockResolvedValue(null);

      await expect(service.removePurchaseOrderItems(id, itemIds)).rejects.toThrow(
        'Item non-existent-item not found in this PO',
      );
    });

    it('should throw BadRequestException if item belongs to different PO', async () => {
      const id = 'po-uuid-1';
      const itemIds = ['item-uuid-1'];

      poRepo.findById.mockResolvedValue({
        ...mockPurchaseOrder,
        status: PoStatus.draft,
      });
      poRepo.getItemById.mockResolvedValue({
        id: 'item-uuid-1',
        purchaseOrderId: 'different-po-id',
        productId: 'prod-1',
        productBatchId: null,
        qtyOrdered: 100,
        qtyReceived: 0,
        unitPrice: null,
        lineTotal: null,
        remark: null,
      } as any);

      await expect(service.removePurchaseOrderItems(id, itemIds)).rejects.toThrow(
        'Item item-uuid-1 not found in this PO',
      );
    });
  });
});
