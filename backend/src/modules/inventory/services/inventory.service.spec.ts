import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: Partial<InventoryRepository>;

  beforeEach(async () => {
    repo = {
      findMovementByKey: jest.fn(),
      receiveInventoryTx: jest.fn(),
      findInventory: jest.fn(),
      dispatchInventoryTx: jest.fn(),
      findProductBatch: jest.fn().mockResolvedValue({ id: 'pb1' }),
      findLocation: jest.fn().mockResolvedValue({ id: 'loc1' }),
      findUser: jest.fn().mockResolvedValue({ id: 'user1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: InventoryRepository, useValue: repo }],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('receiveInventory', () => {
    it('should return existing movement if idempotencyKey already used', async () => {
      (repo.findMovementByKey as jest.Mock).mockResolvedValue({ id: '123' });

      const result = await service.receiveInventory({
        productBatchId: 'pb1',
        locationId: 'loc1',
        quantity: 10,
        createdById: 'user1',
        idempotencyKey: 'key1',
      });

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    it('should create new inventory and movement', async () => {
      (repo.findMovementByKey as jest.Mock).mockResolvedValue(null);
      (repo.receiveInventoryTx as jest.Mock).mockResolvedValue({
        inventory: { id: 'inv1' },
        movement: { id: 'move1' },
      });

      const result = await service.receiveInventory({
        productBatchId: 'pb1',
        locationId: 'loc1',
        quantity: 10,
        createdById: 'user1',
      });

      expect(result.inventory!.id).toBe('inv1');
      expect(result.movement.id).toBe('move1');
    });
  });

  describe('dispatchInventory', () => {
    it('should throw if not enough stock', async () => {
      // simulate dispatchInventoryTx throwing NotEnoughStock -> service maps to BadRequestException
      (repo.dispatchInventoryTx as jest.Mock).mockRejectedValue(new Error('NotEnoughStock'));

      await expect(
        service.dispatchInventory({
          productBatchId: 'pb1',
          locationId: 'loc1',
          quantity: 10,
          createdById: 'user1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should decrease stock and create movement', async () => {
      (repo.dispatchInventoryTx as jest.Mock).mockResolvedValue({
        inventory: { id: 'inv2' },
        movement: { id: 'move2' },
      });

      const result = await service.dispatchInventory({
        productBatchId: 'pb1',
        locationId: 'loc1',
        quantity: 10,
        createdById: 'user1',
      });

      expect(result.inventory!.id).toBe('inv2');
      expect(result.movement.id).toBe('move2');
    });
  });
});
