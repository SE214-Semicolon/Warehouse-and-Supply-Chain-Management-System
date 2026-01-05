import { InventoryRepository } from '../../repositories/inventory.repository';

describe('InventoryRepository - grouping transfers', () => {
  it('should group transfer_in and transfer_out with same transferGroupId into single transfer', async () => {
    const mockMovements = [
      {
        id: 'm-out',
        movementType: 'transfer_out',
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'loc-1',
        toLocationId: null,
        quantity: 10,
        reference: null,
        note: null,
        createdById: 'user-1',
        createdAt: new Date('2025-01-02'),
        transferGroupId: 'tg-1',
        productBatch: { id: 'batch-uuid-1', productId: 'product-1', product: { id: 'product-1' } },
        fromLocation: { id: 'loc-1', name: 'From' },
        toLocation: null,
        createdBy: { id: 'user-1', username: 'u1' },
      },
      {
        id: 'm-in',
        movementType: 'transfer_in',
        productBatchId: 'batch-uuid-1',
        fromLocationId: null,
        toLocationId: 'loc-2',
        quantity: 10,
        reference: null,
        note: null,
        createdById: 'user-1',
        createdAt: new Date('2025-01-02T01:00:00Z'),
        transferGroupId: 'tg-1',
        productBatch: { id: 'batch-uuid-1', productId: 'product-1', product: { id: 'product-1' } },
        fromLocation: null,
        toLocation: { id: 'loc-2', name: 'To' },
        createdBy: { id: 'user-1', username: 'u1' },
      },
    ];

    const mockPrisma: any = {
      stockMovement: {
        findMany: jest.fn().mockResolvedValue(mockMovements),
      },
    };

    const repo = new InventoryRepository(mockPrisma);
    const res = await repo.getMovementsByProductBatch(
      'batch-uuid-1',
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      20,
      'createdAt',
      'desc',
    );

    expect(res.movements).toHaveLength(1);
    const mv = res.movements[0];
    expect(mv.movementType).toBe('transfer');
    expect(mv.fromLocationId).toBe('loc-1');
    expect(mv.toLocationId).toBe('loc-2');
    // ensure full location objects are preserved in grouped transfer
    expect(mv.fromLocation).toBeDefined();
    expect(mv.toLocation).toBeDefined();
    expect(mv.fromLocation.id).toBe('loc-1');
    expect(mv.toLocation.id).toBe('loc-2');
    expect(mv.transferGroupId).toBe('tg-1');
    expect(res.total).toBe(1);
  });

  it('generateMovementReport should also group transfers', async () => {
    const mockMovements = [
      {
        id: 'm-out',
        movementType: 'transfer_out',
        productBatchId: 'batch-uuid-1',
        fromLocationId: 'loc-1',
        toLocationId: null,
        quantity: 5,
        createdAt: new Date('2025-02-02'),
        transferGroupId: 'tg-2',
        productBatch: { id: 'batch-uuid-1', productId: 'product-1', product: { id: 'product-1' } },
        fromLocation: { id: 'loc-1', name: 'From' },
        toLocation: null,
        createdBy: { id: 'user-1' },
      },
      {
        id: 'm-in',
        movementType: 'transfer_in',
        productBatchId: 'batch-uuid-1',
        fromLocationId: null,
        toLocationId: 'loc-3',
        quantity: 5,
        createdAt: new Date('2025-02-02T01:00:00Z'),
        transferGroupId: 'tg-2',
        productBatch: { id: 'batch-uuid-1', productId: 'product-1', product: { id: 'product-1' } },
        fromLocation: null,
        toLocation: { id: 'loc-3', name: 'To3' },
        createdBy: { id: 'user-1' },
      },
      {
        id: 'm-solo',
        movementType: 'adjustment',
        productBatchId: 'batch-uuid-1',
        fromLocationId: null,
        toLocationId: 'loc-4',
        quantity: 2,
        createdAt: new Date('2025-02-05'),
        transferGroupId: null,
        productBatch: { id: 'batch-uuid-1', productId: 'product-1', product: { id: 'product-1' } },
        fromLocation: null,
        toLocation: { id: 'loc-4', name: 'Adj' },
        createdBy: { id: 'user-1' },
      },
    ];

    const mockPrisma: any = {
      stockMovement: {
        findMany: jest.fn().mockResolvedValue(mockMovements),
      },
    };

    const repo = new InventoryRepository(mockPrisma);
    const res = await repo.generateMovementReport(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      20,
      'createdAt',
      'desc',
    );

    // We expect 2 results: 1 grouped transfer + 1 standalone adjustment
    expect(res.movements).toHaveLength(2);
    const transfer = res.movements.find((m: any) => m.movementType === 'transfer');
    expect(transfer).toBeDefined();
    expect(transfer.transferGroupId).toBe('tg-2');
    expect(res.total).toBe(2);
  });

  it('should pass movementType=transfer filter through to the database', async () => {
    const mockPrisma: any = {
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const repo = new InventoryRepository(mockPrisma);

    await repo.getMovementsByProductBatch(
      'batch-uuid-1',
      'transfer' as any,
      undefined,
      undefined,
      undefined,
      1,
      20,
      'createdAt',
      'desc',
    );

    expect(mockPrisma.stockMovement.findMany).toHaveBeenCalled();
    const calledWhere = (mockPrisma.stockMovement.findMany as jest.Mock).mock.calls[0][0].where;
    expect(calledWhere).toBeDefined();
    expect(calledWhere.movementType).toBeDefined();
    expect(Array.isArray(calledWhere.movementType.in)).toBe(true);
  });
});
