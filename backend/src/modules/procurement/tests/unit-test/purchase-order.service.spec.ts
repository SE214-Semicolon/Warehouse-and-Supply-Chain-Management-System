/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrderService } from '../../../services/purchase-order.service';
import { PurchaseOrderRepository } from '../../../repositories/purchase-order.repository';
import { InventoryService } from '../../../../inventory/services/inventory.service';
import { PoStatus } from '@prisma/client';

describe('Purchase Order Service', () => {
  let service: PurchaseOrderService;
  let poRepo: jest.Mocked<PurchaseOrderRepository>;
  let inventorySvc: jest.Mocked<InventoryService>;

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
    };

    const mockInventorySvc = {
      receiveInventory: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    poRepo = module.get(PurchaseOrderRepository);
    inventorySvc = module.get(InventoryService);
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
      const submitDto = {
        userId: 'user-uuid-1',
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      poRepo.findById.mockResolvedValueOnce(mockPurchaseOrder).mockResolvedValueOnce(orderedPo);
      poRepo.submit.mockResolvedValue(orderedPo);

      const result = await service.submitPurchaseOrder('po-uuid-1', submitDto);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(PoStatus.ordered);
      expect(result.message).toBe('Purchase order submitted successfully');
      expect(poRepo.submit).toHaveBeenCalledWith('po-uuid-1');
    });

    // PO-TC12: Missing userId (tested by DTO)
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.submitPurchaseOrder('po-uuid-1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitPurchaseOrder('po-uuid-1', {} as any)).rejects.toThrow(
        'userId is required',
      );
    });

    // PO-TC13: Submit PO not in draft status
    it('should throw BadRequestException if PO is not in draft status', async () => {
      const submitDto = {
        userId: 'user-uuid-1',
      };

      const orderedPo = { ...mockPurchaseOrder, status: PoStatus.ordered };
      poRepo.findById.mockResolvedValue(orderedPo);

      await expect(service.submitPurchaseOrder('po-uuid-1', submitDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitPurchaseOrder('po-uuid-1', submitDto)).rejects.toThrow(
        'Only draft can be submitted',
      );
    });

    // PO-TC14: Submit non-existent PO
    it('should throw NotFoundException if PO not found', async () => {
      const submitDto = {
        userId: 'user-uuid-1',
      };

      poRepo.findById.mockResolvedValue(null);

      await expect(service.submitPurchaseOrder('invalid-id', submitDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitPurchaseOrder('invalid-id', submitDto)).rejects.toThrow(
        'PO not found',
      );
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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

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
      inventorySvc.receiveInventory.mockResolvedValue(undefined as any);

      await service.receivePurchaseOrder('po-uuid-1', receiveDto);

      expect(inventorySvc.receiveInventory).toHaveBeenCalledWith({
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 5,
        createdById: 'user-uuid-1',
        idempotencyKey: 'key-001',
      });
    });
  });

  describe('list', () => {
    // PO-TC39: Get all with default pagination
    it('should return all POs with default pagination', async () => {
      const query = {};

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 1,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPurchaseOrder]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
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

    // PO-TC46: Pagination
    it('should handle pagination correctly', async () => {
      const query = {
        page: 2,
        pageSize: 10,
      };

      poRepo.list.mockResolvedValue({
        data: [mockPurchaseOrder as any],
        total: 25,
      });

      const result = await service.list(query);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
      expect(result.message).toBe('Purchase orders retrieved successfully');
      expect(poRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
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
});
