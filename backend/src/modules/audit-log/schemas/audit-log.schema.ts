export interface AuditLogEntry {
  timestamp: Date;
  correlationId?: string;
  entityType: string;
  entityId: string;
  action: string; // CREATE | UPDATE | DELETE | DOMAIN_EVENT
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
}

/**
 * Audited entities (as defined in audit.middleware.ts):
 * - Product, ProductBatch, ProductCategory
 * - Inventory, Warehouse, Location
 * - StockMovement
 *
 * NOT audited (managed by other teams, not yet standardized):
 * - User, Supplier, Customer, Order, etc.
 */
export const AUDITED_ENTITIES = [
  'Product',
  'ProductBatch',
  'ProductCategory',
  'Inventory',
  'Warehouse',
  'Location',
  'StockMovement',
] as const;

export type AuditedEntityType = (typeof AUDITED_ENTITIES)[number];
