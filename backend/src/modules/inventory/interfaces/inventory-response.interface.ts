import { StockMovement, Inventory } from '@prisma/client';

export interface BaseInventoryResponse {
  success: boolean;
}

export interface IdempotentMovementResponse extends BaseInventoryResponse {
  idempotent?: boolean;
  movement: StockMovement;
}

export interface StandardMovementResponse extends BaseInventoryResponse {
  inventory: Inventory;
  movement: StockMovement;
}

export interface TransferMovementResponse extends BaseInventoryResponse {
  fromInventory: Inventory;
  toInventory: Inventory;
  transferOutMovement: StockMovement;
  transferInMovement: StockMovement;
}

export interface InventoryUpdateResponse extends BaseInventoryResponse {
  inventory: Inventory;
  message: string;
}

export interface PaginatedResponse<T> extends BaseInventoryResponse {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
