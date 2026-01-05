import { Inventory, StockMovement, ProductBatch, Location, User } from '@prisma/client';

export interface IInventoryRepository {
  // Movement lookup
  findMovementByKey(idempotencyKey: string): Promise<StockMovement | null>;

  // Transactional operations
  receiveInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
  ): Promise<{ inventory: Inventory; movement: StockMovement }>;

  dispatchInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
    consumeReservation?: boolean,
  ): Promise<{ inventory: Inventory; movement: StockMovement }>;

  adjustInventoryTx(
    productBatchId: string,
    locationId: string,
    adjustmentQuantity: number,
    createdById?: string,
    idempotencyKey?: string,
    reason?: string,
    note?: string,
  ): Promise<{ inventory: Inventory; movement: StockMovement }>;

  transferInventoryTx(
    productBatchId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ): Promise<{
    fromInventory: Inventory;
    toInventory: Inventory;
    transferOutMovement: StockMovement;
    transferInMovement: StockMovement;
  }>;

  reserveInventoryTx(
    productBatchId: string,
    locationId: string,
    quantity: number,
    orderId: string,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ): Promise<{ inventory: Inventory; movement: StockMovement }>;

  releaseReservationTx(
    productBatchId: string,
    locationId: string,
    quantity: number | undefined,
    orderId: string,
    createdById?: string,
    idempotencyKey?: string,
    note?: string,
  ): Promise<{ inventory: Inventory; movement: StockMovement }>;

  // Query operations
  findInventory(productBatchId: string, locationId: string): Promise<Inventory | null>;

  findInventoryByLocation(
    locationId: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    inventories: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  findInventoryByProductBatch(
    productBatchId: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    inventories: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  // Update operations
  updateInventoryQuantities(
    productBatchId: string,
    locationId: string,
    availableQty: number,
    reservedQty?: number,
  ): Promise<Inventory>;

  softDeleteInventory(productBatchId: string, locationId: string): Promise<Inventory>;

  // Alert queries
  findLowStockInventory(
    threshold?: number,
    locationId?: string,
    productId?: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    inventories: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  findExpiringInventory(
    daysAhead?: number,
    locationId?: string,
    productId?: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    inventories: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  // Report generation
  generateStockLevelReport(
    locationId?: string,
    productId?: string,
    groupBy?: 'category' | 'location' | 'product',
    page?: number,
    limit?: number,
  ): Promise<{
    groupedData: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  generateMovementReport(
    startDate?: string,
    endDate?: string,
    locationId?: string,
    productId?: string,
    movementType?: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    movements: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  getMovementsByProductBatch(
    productBatchId: string,
    movementType?: string,
    locationId?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    movements: StockMovement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  generateValuationReport(
    locationId?: string,
    productId?: string,
    method?: 'FIFO' | 'LIFO' | 'AVERAGE',
    page?: number,
    limit?: number,
  ): Promise<{
    valuationData: any[];
    grandTotal: number;
    method: string;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  // Validation helpers
  findProductBatch(productBatchId: string): Promise<ProductBatch | null>;
  findLocation(locationId: string): Promise<Location | null>;
  findUser(userId: string): Promise<User | null>;
}
