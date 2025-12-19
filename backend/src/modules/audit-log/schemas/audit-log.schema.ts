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
 *
 * Core Product & Warehouse Module:
 * - Product, ProductBatch, ProductCategory
 * - Inventory, Warehouse, Location
 * - StockMovement
 *
 * Procurement Module (NEW):
 * - PurchaseOrder, PurchaseOrderItem
 *
 * Sales Module (NEW):
 * - SalesOrder, SalesOrderItem
 *
 * Logistics Module (NEW):
 * - Shipment
 *
 * NOT audited (infrastructure, handled separately):
 * - User (auth module)
 * - Supplier, Customer (may be added later)
 */
export const AUDITED_ENTITIES = [
  // Core modules
  'Product',
  'ProductBatch',
  'ProductCategory',
  'Inventory',
  'Warehouse',
  'Location',
  'StockMovement',

  // Procurement module
  'PurchaseOrder',
  'PurchaseOrderItem',

  // Sales module
  'SalesOrder',
  'SalesOrderItem',

  // Logistics module
  'Shipment',
] as const;

export type AuditedEntityType = (typeof AUDITED_ENTITIES)[number];
