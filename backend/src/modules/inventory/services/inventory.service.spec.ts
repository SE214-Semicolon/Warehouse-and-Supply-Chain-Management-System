import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { CacheService } from '../../../cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdjustmentReason } from '../dto/adjust-inventory.dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<InventoryRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockProductBatch = {
    id: 'batch-uuid-1',
    productId: 'product-uuid-1',
    batchNo: 'BATCH-001',
    quantity: 100,
    manufactureDate: null,
    expiryDate: null,
    barcodeOrQr: null,
    inboundReceiptId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLocation = {
    id: 'location-uuid-1',
    code: 'LOC-001',
    name: 'Main Warehouse',
    warehouseId: 'warehouse-uuid-1',
    capacity: null,
    type: null,
    properties: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-uuid-1',
    username: 'testuser',
    email: 'user@test.com',
    fullName: 'Test User',
    passwordHash: null,
    role: 'STAFF' as any,
    active: true,
    metadata: {},
    createdAt: new Date(),
  };

  const mockInventory = {
    id: 'inventory-uuid-1',
    productBatchId: 'batch-uuid-1',
    locationId: 'location-uuid-1',
    availableQty: 100,
    reservedQty: 0,
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMovement = {
    id: 'movement-uuid-1',
    idempotencyKey: null,
    movementType: 'RECEIVE' as any,
    productBatchId: 'batch-uuid-1',
    productId: null,
    fromLocationId: null,
    toLocationId: 'location-uuid-1',
    quantity: 100,
    orderId: null,
    note: null,
    reference: null,
    createdById: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockInventoryRepo = {
      findProductBatch: jest.fn(),
      findLocation: jest.fn(),
      findUser: jest.fn(),
      findMovementByKey: jest.fn(),
      receiveInventoryTx: jest.fn(),
      dispatchInventoryTx: jest.fn(),
      adjustInventoryTx: jest.fn(),
      transferInventoryTx: jest.fn(),
      reserveInventoryTx: jest.fn(),
      releaseReservationTx: jest.fn(),
      findInventoryByLocation: jest.fn(),
      findInventoryByProductBatch: jest.fn(),
      updateInventoryQuantities: jest.fn(),
      softDeleteInventory: jest.fn(),
      findLowStockInventory: jest.fn(),
      findExpiringInventory: jest.fn(),
      generateStockLevelReport: jest.fn(),
      generateMovementReport: jest.fn(),
      generateValuationReport: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getOrSet: jest.fn(),
      delete: jest.fn(),
      deleteByPrefix: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: mockInventoryRepo },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get(InventoryRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('receiveInventory', () => {
    // INV-TC01: Receive with valid data
    it('should receive inventory with valid data', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.receiveInventoryTx.mockResolvedValue({
        inventory: mockInventory,
        movement: mockMovement,
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toEqual(mockInventory);
      expect(result.movement).toEqual(mockMovement);
      expect(cacheService.deleteByPrefix).toHaveBeenCalled();
    });

    // INV-TC02: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const receiveDto = {
        productBatchId: 'invalid-batch-id',
        locationId: 'location-uuid-1',
        quantity: 100,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(NotFoundException);
      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(
        'ProductBatch not found: invalid-batch-id',
      );
    });

    // INV-TC03: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'invalid-location-id',
        quantity: 100,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(NotFoundException);
      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(
        'Location not found: invalid-location-id',
      );
    });

    // INV-TC04: User not found
    it('should throw NotFoundException if user not found', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(NotFoundException);
      await expect(service.receiveInventory(receiveDto)).rejects.toThrow(
        'User not found: invalid-user-id',
      );
    });

    // INV-TC05: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        idempotencyKey: 'existing-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
      expect(inventoryRepo.receiveInventoryTx).not.toHaveBeenCalled();
    });

    // INV-TC06: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        idempotencyKey: 'concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.receiveInventoryTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
    });

    // INV-TC07: Missing required fields tested by DTO
    // INV-TC08: Permission denied tested by guard
    // INV-TC09: No authentication tested by guard

    // Edge case: Receive with very large quantity
    it('should receive inventory with very large quantity', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 999999999,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.receiveInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 999999999 },
        movement: mockMovement,
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.inventory!.availableQty).toBe(999999999);
    });

    // Edge case: Receive without createdById
    it('should receive inventory without createdById', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.receiveInventoryTx.mockResolvedValue({
        inventory: mockInventory,
        movement: mockMovement,
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(inventoryRepo.findUser).not.toHaveBeenCalled();
    });

    // Edge case: Receive without idempotency key
    it('should receive inventory without idempotency key', async () => {
      const receiveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.receiveInventoryTx.mockResolvedValue({
        inventory: mockInventory,
        movement: mockMovement,
      });
      cacheService.deleteByPrefix.mockResolvedValue(undefined);

      const result = await service.receiveInventory(receiveDto);

      expect(result.success).toBe(true);
      expect(inventoryRepo.findMovementByKey).not.toHaveBeenCalled();
    });
  });

  describe('dispatchInventory', () => {
    // INV-TC10: Dispatch with valid data
    it('should dispatch inventory with valid data', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 50,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.dispatchInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 50, deletedAt: null },
        movement: { ...mockMovement, movementType: 'DISPATCH' as any, quantity: 50 },
      });

      const result = await service.dispatchInventory(dispatchDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.movement).toBeDefined();
    });

    // INV-TC11: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const dispatchDto = {
        productBatchId: 'invalid-batch-id',
        locationId: 'location-uuid-1',
        quantity: 50,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(NotFoundException);
      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(
        'ProductBatch not found: invalid-batch-id',
      );
    });

    // INV-TC12: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'invalid-location-id',
        quantity: 50,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(NotFoundException);
      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(
        'Location not found: invalid-location-id',
      );
    });

    // INV-TC13: User not found
    it('should throw NotFoundException if user not found', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 50,
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(NotFoundException);
      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(
        'User not found: invalid-user-id',
      );
    });

    // INV-TC14: Not enough stock
    it('should throw BadRequestException if not enough stock', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 200,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.dispatchInventoryTx.mockRejectedValue(new Error('NotEnoughStock'));

      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(BadRequestException);
      await expect(service.dispatchInventory(dispatchDto)).rejects.toThrow(
        'Not enough stock available',
      );
    });

    // INV-TC15: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 50,
        idempotencyKey: 'existing-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.dispatchInventory(dispatchDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
    });

    // INV-TC16: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 50,
        idempotencyKey: 'concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.dispatchInventoryTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.dispatchInventory(dispatchDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    // INV-TC17: Missing required fields tested by DTO
    // INV-TC18: Permission denied tested by guard
    // INV-TC19: No authentication tested by guard

    // Edge case: Dispatch exact available quantity
    it('should dispatch all available inventory', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100, // exact available qty
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.dispatchInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 0, deletedAt: new Date() },
        movement: { ...mockMovement, movementType: 'DISPATCH' as any, quantity: 100 },
      });

      const result = await service.dispatchInventory(dispatchDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.inventory!.availableQty).toBe(0);
    });

    // Edge case: Dispatch with quantity = 1
    it('should dispatch minimal quantity of 1', async () => {
      const dispatchDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 1,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.dispatchInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 99, deletedAt: null },
        movement: { ...mockMovement, movementType: 'DISPATCH' as any, quantity: 1 },
      });

      const result = await service.dispatchInventory(dispatchDto);

      expect(result.success).toBe(true);
      expect(result.movement.quantity).toBe(1);
    });
  });

  describe('adjustInventory', () => {
    // INV-TC20: Adjust with positive quantity
    it('should adjust inventory with positive quantity', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 10,
        reason: AdjustmentReason.COUNT_ERROR,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 110, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: 10 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.movement).toBeDefined();
    });

    // INV-TC21: Adjust with negative quantity
    it('should adjust inventory with negative quantity', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: -10,
        reason: AdjustmentReason.DAMAGE,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 90, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: -10 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
    });

    // INV-TC22: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const adjustDto = {
        productBatchId: 'invalid-batch-id',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 10,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(
        'ProductBatch not found: invalid-batch-id',
      );
    });

    // INV-TC23: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'invalid-location-id',
        adjustmentQuantity: 10,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(
        'Location not found: invalid-location-id',
      );
    });

    // INV-TC24: User not found
    it('should throw NotFoundException if user not found', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 10,
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(NotFoundException);
      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(
        'User not found: invalid-user-id',
      );
    });

    // INV-TC25: Zero adjustment quantity
    it('should throw BadRequestException if adjustment quantity is zero', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 0,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(BadRequestException);
      await expect(service.adjustInventory(adjustDto)).rejects.toThrow(
        'Adjustment quantity must not be zero',
      );
    });

    // INV-TC26: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 10,
        idempotencyKey: 'existing-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
    });

    // INV-TC27: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 10,
        idempotencyKey: 'concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.adjustInventoryTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    // INV-TC28: Missing required fields tested by DTO
    // INV-TC29: Permission denied tested by guard
    // INV-TC30: No authentication tested by guard

    // Edge case: Adjust with very large positive value
    it('should adjust inventory with very large positive value', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 1000000,
        reason: AdjustmentReason.COUNT_ERROR,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 1000100, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: 1000000 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
    });

    // Edge case: Adjust with very large negative value
    it('should adjust inventory with very large negative value', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: -50,
        reason: AdjustmentReason.DAMAGE,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 50, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: -50 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
    });

    // Edge case: Adjust by 1 (minimum positive)
    it('should adjust inventory by 1', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: 1,
        reason: AdjustmentReason.COUNT_ERROR,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 101, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: 1 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.movement).toBeDefined();
    });

    // Edge case: Adjust by -1 (minimum negative)
    it('should adjust inventory by -1', async () => {
      const adjustDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        adjustmentQuantity: -1,
        reason: AdjustmentReason.THEFT,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.adjustInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 99, deletedAt: null },
        movement: { ...mockMovement, movementType: 'ADJUSTMENT' as any, quantity: -1 },
      });

      const result = await service.adjustInventory(adjustDto);

      expect(result.success).toBe(true);
      expect(result.movement).toBeDefined();
    });
  });

  describe('transferInventory', () => {
    // INV-TC31: Transfer with valid data
    it('should transfer inventory with valid data', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 30,
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation);
      inventoryRepo.findLocation.mockResolvedValueOnce({ ...mockLocation, id: 'location-uuid-2' });
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.transferInventoryTx.mockResolvedValue({
        fromInventory: { ...mockInventory, availableQty: 70, deletedAt: null },
        toInventory: {
          ...mockInventory,
          locationId: 'location-uuid-2',
          availableQty: 30,
          deletedAt: null,
        },
        transferOutMovement: { ...mockMovement, movementType: 'TRANSFER_OUT' as any },
        transferInMovement: { ...mockMovement, movementType: 'TRANSFER_IN' as any },
      });

      const result = await service.transferInventory(transferDto);

      expect(result.success).toBe(true);
      expect(result.fromInventory).toBeDefined();
      expect(result.toInventory).toBeDefined();
      expect((result as any).transferOutMovement).toBeDefined();
      expect((result as any).transferInMovement).toBeDefined();
    });

    // INV-TC32: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const transferDto = {
        productBatchId: 'invalid-batch-id',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 30,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.transferInventory(transferDto)).rejects.toThrow(NotFoundException);
      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        'ProductBatch not found: invalid-batch-id',
      );
    });

    // INV-TC33: From location not found
    it('should throw NotFoundException if from location not found', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'invalid-location-id',
        toLocationId: 'location-uuid-2',
        quantity: 30,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(null);

      await expect(service.transferInventory(transferDto)).rejects.toThrow(NotFoundException);
      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        'From location not found: invalid-location-id',
      );
    });

    // INV-TC34: To location not found
    it('should throw NotFoundException if to location not found', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'invalid-location-id',
        quantity: 30,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation).mockResolvedValueOnce(null);

      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('To location not found: invalid-location-id'),
        }),
      );
    });

    // INV-TC35: User not found
    it('should throw NotFoundException if user not found', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 30,
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      const mockLocation2 = { ...mockLocation, id: 'location-uuid-2' };
      inventoryRepo.findLocation
        .mockResolvedValueOnce(mockLocation)
        .mockResolvedValueOnce(mockLocation2);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('User not found: invalid-user-id'),
        }),
      );
    });

    // INV-TC36: Same source and destination
    it('should throw BadRequestException if source and destination are same', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-1',
        quantity: 30,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.transferInventory(transferDto)).rejects.toThrow(BadRequestException);
      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        'Source and destination locations must be different',
      );
    });

    // INV-TC37: Not enough stock
    it('should throw BadRequestException if not enough stock', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 200,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      const mockLocation2 = { ...mockLocation, id: 'location-uuid-2' };
      inventoryRepo.findLocation
        .mockResolvedValueOnce(mockLocation)
        .mockResolvedValueOnce(mockLocation2);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.transferInventoryTx.mockRejectedValue(new Error('NotEnoughStock'));

      await expect(service.transferInventory(transferDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Not enough stock available for transfer'),
        }),
      );
    });

    // INV-TC38: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 30,
        idempotencyKey: 'existing-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation);
      inventoryRepo.findLocation.mockResolvedValueOnce({ ...mockLocation, id: 'location-uuid-2' });
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.transferInventory(transferDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect((result as any).movement).toEqual(mockMovement);
    });

    // INV-TC39: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 30,
        idempotencyKey: 'concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation);
      inventoryRepo.findLocation.mockResolvedValueOnce({ ...mockLocation, id: 'location-uuid-2' });
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.transferInventoryTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.transferInventory(transferDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    // INV-TC40: Missing required fields tested by DTO
    // INV-TC41: Permission denied tested by guard
    // INV-TC42: No authentication tested by guard

    // Edge case: Transfer all available quantity
    it('should transfer entire available quantity', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 100, // all available
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation);
      inventoryRepo.findLocation.mockResolvedValueOnce({ ...mockLocation, id: 'location-uuid-2' });
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.transferInventoryTx.mockResolvedValue({
        fromInventory: { ...mockInventory, availableQty: 0, deletedAt: new Date() },
        toInventory: {
          ...mockInventory,
          locationId: 'location-uuid-2',
          availableQty: 100,
          deletedAt: null,
        },
        transferOutMovement: {
          ...mockMovement,
          movementType: 'TRANSFER_OUT' as any,
          quantity: 100,
        },
        transferInMovement: { ...mockMovement, movementType: 'TRANSFER_IN' as any, quantity: 100 },
      });

      const result = await service.transferInventory(transferDto);

      expect(result.success).toBe(true);
      expect(result.fromInventory).toBeDefined();
      expect(result.toInventory).toBeDefined();
    });

    // Edge case: Transfer minimal quantity of 1
    it('should transfer minimal quantity of 1', async () => {
      const transferDto = {
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'location-uuid-1',
        toLocationId: 'location-uuid-2',
        quantity: 1,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValueOnce(mockLocation);
      inventoryRepo.findLocation.mockResolvedValueOnce({ ...mockLocation, id: 'location-uuid-2' });
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.transferInventoryTx.mockResolvedValue({
        fromInventory: { ...mockInventory, availableQty: 99, deletedAt: null },
        toInventory: {
          ...mockInventory,
          locationId: 'location-uuid-2',
          availableQty: 1,
          deletedAt: null,
        },
        transferOutMovement: { ...mockMovement, movementType: 'TRANSFER_OUT' as any, quantity: 1 },
        transferInMovement: { ...mockMovement, movementType: 'TRANSFER_IN' as any, quantity: 1 },
      });

      const result = await service.transferInventory(transferDto);

      expect(result.success).toBe(true);
      expect((result as any).transferOutMovement.quantity).toBe(1);
    });
  });

  describe('reserveInventory', () => {
    // INV-TC43: Reserve with valid data
    it('should reserve inventory with valid data', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-1',
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.reserveInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 80, reservedQty: 20, deletedAt: null },
        movement: { ...mockMovement, movementType: 'RESERVE' as any, quantity: 20 },
      });

      const result = await service.reserveInventory(reserveDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.movement).toBeDefined();
    });

    // INV-TC44: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const reserveDto = {
        productBatchId: 'invalid-batch-id',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-2',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(NotFoundException);
      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(
        'ProductBatch not found: invalid-batch-id',
      );
    });

    // INV-TC45: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'invalid-location-id',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-3',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(NotFoundException);
      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(
        'Location not found: invalid-location-id',
      );
    });

    // INV-TC46: User not found
    it('should throw NotFoundException if user not found', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-4',
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(NotFoundException);
      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(
        'User not found: invalid-user-id',
      );
    });

    // INV-TC47: Zero or negative quantity
    it('should throw BadRequestException if quantity is zero or negative', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 0,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-5',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(BadRequestException);
      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(
        'Reservation quantity must be greater than zero',
      );
    });

    // INV-TC48: Not enough available stock
    it('should throw BadRequestException if not enough available stock', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 200,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-6',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.reserveInventoryTx.mockRejectedValue(new Error('NotEnoughStock'));

      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(BadRequestException);
      await expect(service.reserveInventory(reserveDto)).rejects.toThrow(
        'Not enough available stock to reserve',
      );
    });

    // INV-TC49: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-key-123',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.reserveInventory(reserveDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
    });

    // INV-TC50: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.reserveInventoryTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.reserveInventory(reserveDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    // INV-TC51: Missing required fields tested by DTO
    // INV-TC52: Permission denied tested by guard
    // INV-TC53: No authentication tested by guard

    // Edge case: Reserve all available quantity
    it('should reserve entire available quantity', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        orderId: 'order-uuid-1',
        idempotencyKey: 'reserve-all-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.reserveInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 0, reservedQty: 100 },
        movement: { ...mockMovement, movementType: 'RESERVE' as any, quantity: 100 },
      });

      const result = await service.reserveInventory(reserveDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
    });

    // Edge case: Reserve minimal quantity of 1
    it('should reserve minimal quantity of 1', async () => {
      const reserveDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 1,
        orderId: 'order-uuid-2',
        idempotencyKey: 'reserve-one-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.reserveInventoryTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 99, reservedQty: 1 },
        movement: { ...mockMovement, movementType: 'RESERVE' as any, quantity: 1 },
      });

      const result = await service.reserveInventory(reserveDto);

      expect(result.success).toBe(true);
      expect(result.movement).toBeDefined();
    });
  });

  describe('releaseReservation', () => {
    // INV-TC54: Release with valid data
    it('should release reservation with valid data', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-1',
        createdById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.releaseReservationTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 100, reservedQty: 0, deletedAt: null },
        movement: { ...mockMovement, movementType: 'RELEASE' as any, quantity: 20 },
      });

      const result = await service.releaseReservation(releaseDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.movement).toBeDefined();
    });

    // INV-TC55: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const releaseDto = {
        productBatchId: 'invalid-batch-id',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-2',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('ProductBatch not found: invalid-batch-id'),
        }),
      );
    });

    // INV-TC56: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'invalid-location-id',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-3',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Location not found: invalid-location-id'),
        }),
      );
    });

    // INV-TC57: User not found
    it('should throw NotFoundException if user not found', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-4',
        createdById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('User not found: invalid-user-id'),
        }),
      );
    });

    // INV-TC58: Inventory not found
    it('should throw NotFoundException if inventory not found', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-5',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.releaseReservationTx.mockRejectedValue(new Error('InventoryNotFound'));

      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Inventory not found'),
        }),
      );
    });

    // INV-TC59: Not enough reserved stock
    it('should throw BadRequestException if not enough reserved stock', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 200,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-6',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.releaseReservationTx.mockRejectedValue(new Error('NotEnoughReservedStock'));

      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Not enough reserved stock to release'),
        }),
      );
    });

    // INV-TC60: Idempotency key reuse
    it('should return existing movement if idempotency key already used', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-key-existing',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValue(mockMovement);

      const result = await service.releaseReservation(releaseDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.movement).toEqual(mockMovement);
    });

    // INV-TC61: Concurrent idempotency conflict
    it('should handle concurrent idempotency conflict', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-concurrent-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      inventoryRepo.releaseReservationTx.mockRejectedValue(prismaError);
      inventoryRepo.findMovementByKey.mockResolvedValueOnce(mockMovement);

      const result = await service.releaseReservation(releaseDto);

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    // INV-TC62: Missing required fields tested by DTO
    // INV-TC63: Permission denied tested by guard
    // INV-TC64: No authentication tested by guard

    // Edge case: Release all reserved quantity
    it('should release entire reserved quantity', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 100,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-all-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.releaseReservationTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 100, reservedQty: 0 },
        movement: { ...mockMovement, movementType: 'RELEASE_RESERVATION' as any, quantity: 100 },
      });

      const result = await service.releaseReservation(releaseDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
    });

    // Edge case: Release partial reservation
    it('should release partial reserved quantity', async () => {
      const releaseDto = {
        productBatchId: 'batch-uuid-1',
        locationId: 'location-uuid-1',
        quantity: 20,
        orderId: 'order-uuid-1',
        idempotencyKey: 'release-partial-key',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);
      inventoryRepo.findMovementByKey.mockResolvedValue(null);
      inventoryRepo.releaseReservationTx.mockResolvedValue({
        inventory: { ...mockInventory, availableQty: 20, reservedQty: 80 },
        movement: { ...mockMovement, movementType: 'RELEASE_RESERVATION' as any, quantity: 20 },
      });

      const result = await service.releaseReservation(releaseDto);

      expect(result.success).toBe(true);
      expect(result.movement).toBeDefined();
    });
  });

  describe('getInventoryByLocation', () => {
    // INV-TC65: Get with valid location
    it('should get inventory by location with valid data', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByLocation(queryDto);

      expect(result.success).toBe(true);
      expect(result.inventories).toBeDefined();
      expect(result.total).toBe(1);
    });

    // INV-TC66: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const queryDto = {
        locationId: 'invalid-location-id',
      };

      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Location not found: invalid-location-id'),
        }),
      );
    });

    // INV-TC67: Invalid page number
    it('should throw BadRequestException if page number is invalid', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 0,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Page must be greater than 0'),
        }),
      );
    });

    // INV-TC68: Invalid limit
    it('should throw BadRequestException if limit is invalid', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        limit: 200,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Limit must be between 1 and 100'),
        }),
      );
    });

    // INV-TC69: Pagination and sorting
    it('should support pagination and sorting', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 2,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc' as const,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByLocation(queryDto);

      expect(result.success).toBe(true);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    // INV-TC70: Cache hit
    it('should return cached data when available', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByLocation(queryDto);

      expect(result.success).toBe(true);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: expect.any(String),
          key: expect.stringContaining('location:location-uuid-1'),
        }),
        expect.any(Function),
        expect.any(Object),
      );
    });

    // INV-TC71: Permission denied tested by guard
    // INV-TC72: No authentication tested by guard

    // Edge case: Query with page = 0 (should reject)
    it('should reject page 0', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 0,
        limit: 20,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(BadRequestException);
      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(
        'Page must be greater than 0',
      );
    });

    // Edge case: Query with limit = 0 (invalid)
    it('should reject invalid limit of 0', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 1,
        limit: 0,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(BadRequestException);
    });

    // Edge case: Query with very large limit
    it('should reject limit greater than 100', async () => {
      const queryDto = {
        locationId: 'location-uuid-1',
        page: 1,
        limit: 101,
      };

      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(service.getInventoryByLocation(queryDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInventoryByProductBatch', () => {
    // INV-TC73: Get with valid product batch
    it('should get inventory by product batch with valid data', async () => {
      const queryDto = {
        productBatchId: 'batch-uuid-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByProductBatch(queryDto);

      expect(result.success).toBe(true);
      expect(result.inventories).toBeDefined();
      expect(result.total).toBe(1);
    });

    // INV-TC74: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const queryDto = {
        productBatchId: 'invalid-batch-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.getInventoryByProductBatch(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('ProductBatch not found: invalid-batch-id'),
        }),
      );
    });

    // INV-TC75: Invalid page number
    it('should throw BadRequestException if page number is invalid', async () => {
      const queryDto = {
        productBatchId: 'batch-uuid-1',
        page: -1,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);

      await expect(service.getInventoryByProductBatch(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Page must be greater than 0'),
        }),
      );
    });

    // INV-TC76: Invalid limit
    it('should throw BadRequestException if limit is invalid', async () => {
      const queryDto = {
        productBatchId: 'batch-uuid-1',
        limit: 0,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);

      await expect(service.getInventoryByProductBatch(queryDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Limit must be between 1 and 100'),
        }),
      );
    });

    // INV-TC77: Pagination and sorting
    it('should support pagination and sorting', async () => {
      const queryDto = {
        productBatchId: 'batch-uuid-1',
        page: 3,
        limit: 15,
        sortBy: 'availableQty',
        sortOrder: 'asc' as const,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 50,
        page: 3,
        limit: 15,
        totalPages: 4,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByProductBatch(queryDto);

      expect(result.success).toBe(true);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    // INV-TC78: Cache hit
    it('should return cached data when available', async () => {
      const queryDto = {
        productBatchId: 'batch-uuid-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        inventories: [mockInventory],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      cacheService.getOrSet.mockResolvedValue(mockResult);

      const result = await service.getInventoryByProductBatch(queryDto);

      expect(result.success).toBe(true);
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: expect.any(String),
          key: expect.stringContaining('batch:batch-uuid-1'),
        }),
        expect.any(Function),
        expect.any(Object),
      );
    });

    // INV-TC79: Permission denied tested by guard
    // INV-TC80: No authentication tested by guard
  });

  describe('updateInventoryQuantity', () => {
    // INV-TC81: Update with valid data
    it('should update inventory quantity with valid data', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'location-uuid-1';
      const updateDto = {
        availableQty: 150,
        reservedQty: 10,
        updatedById: 'user-uuid-1',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(mockUser);
      inventoryRepo.updateInventoryQuantities.mockResolvedValue({
        ...mockInventory,
        availableQty: 150,
        reservedQty: 10,
        deletedAt: null,
      });

      const result = await service.updateInventoryQuantity(productBatchId, locationId, updateDto);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.inventory.availableQty).toBe(150);
      expect(result.inventory.reservedQty).toBe(10);
    });

    // INV-TC82: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const productBatchId = 'invalid-batch-id';
      const locationId = 'location-uuid-1';
      const updateDto = {
        availableQty: 150,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(
        service.updateInventoryQuantity(productBatchId, locationId, updateDto),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('ProductBatch not found: invalid-batch-id'),
        }),
      );
    });

    // INV-TC83: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'invalid-location-id';
      const updateDto = {
        availableQty: 150,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(
        service.updateInventoryQuantity(productBatchId, locationId, updateDto),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Location not found: invalid-location-id'),
        }),
      );
    });

    // INV-TC84: User not found
    it('should throw NotFoundException if user not found', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'location-uuid-1';
      const updateDto = {
        availableQty: 150,
        updatedById: 'invalid-user-id',
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.findUser.mockResolvedValue(null);

      await expect(
        service.updateInventoryQuantity(productBatchId, locationId, updateDto),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('User not found: invalid-user-id'),
        }),
      );
    });

    // INV-TC85: Negative available quantity
    it('should throw BadRequestException if available quantity is negative', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'location-uuid-1';
      const updateDto = {
        availableQty: -10,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(
        service.updateInventoryQuantity(productBatchId, locationId, updateDto),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Available quantity cannot be negative'),
        }),
      );
    });

    // INV-TC86: Negative reserved quantity
    it('should throw BadRequestException if reserved quantity is negative', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'location-uuid-1';
      const updateDto = {
        availableQty: 100,
        reservedQty: -5,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);

      await expect(
        service.updateInventoryQuantity(productBatchId, locationId, updateDto),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Reserved quantity cannot be negative'),
        }),
      );
    });

    // INV-TC87: Missing required fields tested by DTO
    // INV-TC88: Permission denied tested by guard
    // INV-TC89: No authentication tested by guard

    // Edge case: Update with both availableQty and reservedQty to 0
    it('should update both quantities to 0', async () => {
      const updateDto = {
        availableQty: 0,
        reservedQty: 0,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.updateInventoryQuantities.mockResolvedValue({
        ...mockInventory,
        availableQty: 0,
        reservedQty: 0,
      });

      const result = await service.updateInventoryQuantity(
        'batch-uuid-1',
        'location-uuid-1',
        updateDto,
      );

      expect(result.success).toBe(true);
      expect(result.inventory.availableQty).toBe(0);
      expect(result.inventory.reservedQty).toBe(0);
    });

    // Edge case: Update only availableQty
    it('should update only availableQty', async () => {
      const updateDto = {
        availableQty: 50,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.updateInventoryQuantities.mockResolvedValue({
        ...mockInventory,
        availableQty: 50,
      });

      const result = await service.updateInventoryQuantity(
        'batch-uuid-1',
        'location-uuid-1',
        updateDto,
      );

      expect(result.success).toBe(true);
      expect(result.inventory.availableQty).toBe(50);
    });

    // Edge case: Update with very large values
    it('should update with very large quantities', async () => {
      const updateDto = {
        availableQty: 999999999,
        reservedQty: 888888888,
      };

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.updateInventoryQuantities.mockResolvedValue({
        ...mockInventory,
        availableQty: 999999999,
        reservedQty: 888888888,
      });

      const result = await service.updateInventoryQuantity(
        'batch-uuid-1',
        'location-uuid-1',
        updateDto,
      );

      expect(result.success).toBe(true);
      expect(result.inventory.availableQty).toBe(999999999);
    });
  });

  describe('softDeleteInventory', () => {
    // INV-TC90: Soft delete with valid data
    it('should soft delete inventory with valid data', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'location-uuid-1';

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(mockLocation);
      inventoryRepo.softDeleteInventory.mockResolvedValue({ ...mockInventory, deletedAt: null });

      const result = await service.softDeleteInventory(productBatchId, locationId);

      expect(result.success).toBe(true);
      expect(result.inventory).toBeDefined();
      expect(result.message).toBe('Inventory soft deleted successfully');
    });

    // INV-TC91: Product batch not found
    it('should throw NotFoundException if product batch not found', async () => {
      const productBatchId = 'invalid-batch-id';
      const locationId = 'location-uuid-1';

      inventoryRepo.findProductBatch.mockResolvedValue(null);

      await expect(service.softDeleteInventory(productBatchId, locationId)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('ProductBatch not found: invalid-batch-id'),
        }),
      );
    });

    // INV-TC92: Location not found
    it('should throw NotFoundException if location not found', async () => {
      const productBatchId = 'batch-uuid-1';
      const locationId = 'invalid-location-id';

      inventoryRepo.findProductBatch.mockResolvedValue(mockProductBatch);
      inventoryRepo.findLocation.mockResolvedValue(null);

      await expect(service.softDeleteInventory(productBatchId, locationId)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Location not found: invalid-location-id'),
        }),
      );
    });

    // INV-TC93: Invalid ID format tested by DTO
    // INV-TC94: Permission denied tested by guard
    // INV-TC95: No authentication tested by guard
  });

  describe('getLowStockAlerts', () => {
    // INV-TC96: Get alerts with threshold
    it('should get low stock alerts with threshold', async () => {
      const alertDto = {
        threshold: 20,
        page: 1,
        limit: 10,
      };

      const mockResult = {
        inventories: [
          {
            ...mockInventory,
            availableQty: 5,
            productBatch: {
              ...mockProductBatch,
              product: {
                id: 'product-uuid-1',
                name: 'Test Product',
                sku: 'SKU-001',
                unit: 'pcs',
                categoryId: null,
                barcode: null,
                parameters: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            location: mockLocation,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      inventoryRepo.findLowStockInventory.mockResolvedValue(mockResult as any);

      const result = await service.getLowStockAlerts(alertDto);

      expect(result.success).toBe(true);
      expect(result.inventories).toBeDefined();
      expect(inventoryRepo.findLowStockInventory).toHaveBeenCalledWith(
        20,
        undefined,
        undefined,
        1,
        10,
        'availableQty',
        'asc',
      );
    });

    // INV-TC97: Filter by location and product
    it('should filter alerts by location and product', async () => {
      const alertDto = {
        threshold: 15,
        locationId: 'location-uuid-1',
        productId: 'product-uuid-1',
        page: 1,
        limit: 20,
      };

      const mockResult = {
        inventories: [
          {
            ...mockInventory,
            availableQty: 10,
            productBatch: {
              ...mockProductBatch,
              product: {
                id: 'product-uuid-1',
                name: 'Test Product',
                sku: 'SKU-001',
                unit: 'pcs',
                categoryId: null,
                barcode: null,
                parameters: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            location: mockLocation,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      inventoryRepo.findLowStockInventory.mockResolvedValue(mockResult as any);

      const result = await service.getLowStockAlerts(alertDto);

      expect(result.success).toBe(true);
      expect(inventoryRepo.findLowStockInventory).toHaveBeenCalledWith(
        15,
        'location-uuid-1',
        'product-uuid-1',
        1,
        20,
        'availableQty',
        'asc',
      );
    });

    // INV-TC98: Invalid pagination
    it('should throw BadRequestException if pagination is invalid', async () => {
      const alertDto = {
        threshold: 10,
        page: -1,
      };

      await expect(service.getLowStockAlerts(alertDto)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Page must be greater than 0'),
        }),
      );
    });

    // INV-TC99: Permission denied tested by guard
    // INV-TC100: No authentication tested by guard

    // Edge case: Get alerts with very high threshold
    it('should get alerts with high threshold', async () => {
      const alertDto = {
        threshold: 10000,
        page: 1,
        limit: 20,
      };

      inventoryRepo.findLowStockInventory.mockResolvedValue({
        inventories: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.getLowStockAlerts(alertDto);

      expect(result.success).toBe(true);
      expect(result.inventories).toEqual([]);
    });

    // Edge case: Get alerts with negative page (should reject)
    it('should reject negative page number', async () => {
      const alertDto = {
        threshold: 10,
        page: -1,
        limit: 20,
      };

      await expect(service.getLowStockAlerts(alertDto)).rejects.toThrow(BadRequestException);
      await expect(service.getLowStockAlerts(alertDto)).rejects.toThrow(
        'Page must be greater than 0',
      );
    });

    // Edge case: Get alerts without threshold (should use default)
    it('should use default threshold of 10 when not provided', async () => {
      const alertDto = {
        page: 1,
        limit: 20,
      };

      inventoryRepo.findLowStockInventory.mockResolvedValue({
        inventories: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.getLowStockAlerts(alertDto);

      expect(result.success).toBe(true);
      expect(inventoryRepo.findLowStockInventory).toHaveBeenCalledWith(
        10, // default threshold
        undefined,
        undefined,
        1,
        20,
        'availableQty',
        'asc',
      );
    });
  });
});
