import { InventoryService } from 'src/modules/inventory/services/inventory.service';
import { InventoryRepository } from 'src/modules/inventory/repositories/inventory.repository';
import { BadRequestException } from '@nestjs/common';
import { DispatchInventoryDto } from 'src/modules/inventory/dto/dispatch-inventory.dto';
import { CacheService } from 'src/cache/cache.service';
import { AuditMiddleware } from 'src/database/middleware/audit.middleware';

// A simple in-memory mock repository to simulate atomic updateMany behavior
class InMemoryRepoMock {
  inventories: Record<string, { availableQty: number }> = {};
  movements: any[] = [];

  constructor() {
    this.inventories['pb1:loc1'] = { availableQty: 10 };
  }

  async findProductBatch(id: string) {
    return await Promise.resolve(id === 'pb1' ? { id } : null);
  }
  async findLocation(id: string) {
    return await Promise.resolve(id === 'loc1' ? { id } : null);
  }
  async findUser(id: string) {
    return await Promise.resolve(id === 'user1' ? { id } : null);
  }

  // emulate dispatchInventoryTx using an atomic check-and-decrement
  async dispatchInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    _createdById?: string,
    _idempotencyKey?: string,
  ) {
    const key = `${productBatchId}:${locationId}`;
    const inv = this.inventories[key];
    if (!inv || inv.availableQty < quantity) {
      throw new Error('NotEnoughStock');
    }
    // Perform check-and-decrement synchronously to emulate atomic updateMany at DB level
    inv.availableQty -= quantity;
    // simulate async delay to mimic DB latency
    await new Promise((r) => setTimeout(r, Math.random() * 50));
    const movement = { id: `m${this.movements.length + 1}`, quantity };
    this.movements.push(movement);
    return { inventory: { ...inv }, movement };
  }

  async findMovementByKey(/*_k: string*/) {
    return await Promise.resolve(null);
  }
}

describe('concurrent dispatch', () => {
  it('should not allow oversell when two dispatches run concurrently', async () => {
    const repo = new InMemoryRepoMock() as unknown as InventoryRepository;
    // minimal CacheService mock that executes factory and no-ops invalidations
    const mockCache: Partial<CacheService> = {
      getOrSet: jest.fn(async (_k: string, factory: () => Promise<any>) => await factory()),
      deleteByPrefix: jest.fn(async () => undefined as any),
      get: jest.fn(async () => undefined as any),
      set: jest.fn(async () => undefined as any),
      delete: jest.fn(async () => undefined as any),
      reset: jest.fn(async () => undefined as any),
    };
    // minimal AlertGenerationService mock (non-blocking, no-op)
    const mockAlertGen = {
      checkLowStockAlert: jest.fn(async () => undefined),
    } as any;
    // minimal AuditMiddleware mock (non-blocking, no-op)
    const mockAuditMiddleware = {
      logCreate: jest.fn(async () => undefined),
      logUpdate: jest.fn(async () => undefined),
      logDelete: jest.fn(async () => undefined),
      logOperation: jest.fn(async () => undefined),
    } as unknown as AuditMiddleware;
    const service = new InventoryService(
      repo as any,
      mockCache as CacheService,
      mockAlertGen,
      mockAuditMiddleware,
    );

    const dto = {
      productBatchId: 'pb1',
      locationId: 'loc1',
      quantity: 7,
      createdById: 'user1',
    } as DispatchInventoryDto;

    // run two dispatches concurrently
    const p1 = service.dispatchInventory(dto);
    const p2 = service.dispatchInventory(dto);

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // starting with 10 qty, two attempts of 7 -> only one should succeed
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const rej = rejected[0];
    expect(rej.reason).toBeInstanceOf(BadRequestException);
  });
});
