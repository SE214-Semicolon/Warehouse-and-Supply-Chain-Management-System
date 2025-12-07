# Inventory Management Module

## Overview

Core inventory tracking system managing stock movements, reservations, and real-time inventory levels across warehouse locations. Supports multi-location inventory with idempotency guarantees and automatic alert generation.

**Purpose:** Track product inventory lifecycle from receiving to dispatching, ensuring accurate stock levels and preventing overselling.

## Features

- **Inventory Operations:** Receive, Dispatch, Adjust, Transfer, Reserve, Release
- **Multi-Location Tracking:** Per product batch, per warehouse location
- **Idempotency:** Duplicate operation prevention via idempotency keys
- **Real-Time Alerts:** Automatic low stock alerts after operations
- **Inventory Reporting:** Stock levels, movements, valuation reports
- **Reservation System:** Reserve inventory for orders, release on cancel

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/inventory`

| Method | Endpoint                                          | Auth                  | Description                      |
| ------ | ------------------------------------------------- | --------------------- | -------------------------------- |
| POST   | `/inventory/receive`                              | Admin, Manager, Staff | Receive inventory into location  |
| POST   | `/inventory/dispatch`                             | Admin, Manager, Staff | Dispatch inventory from location |
| POST   | `/inventory/adjust`                               | Admin, Manager        | Adjust inventory quantity (±)    |
| POST   | `/inventory/transfer`                             | Admin, Manager, Staff | Transfer between locations       |
| POST   | `/inventory/reserve`                              | Admin, Manager, Staff | Reserve inventory for order      |
| POST   | `/inventory/release`                              | Admin, Manager, Staff | Release reservation              |
| GET    | `/inventory/location`                             | All (except Partner)  | Query by location                |
| GET    | `/inventory/product-batch`                        | All (except Partner)  | Query by product batch           |
| POST   | `/inventory/:batchId/:locationId/update-quantity` | Admin, Manager        | Update quantity directly         |
| DELETE | `/inventory/:batchId/:locationId`                 | Admin                 | Delete inventory record          |
| GET    | `/inventory/reports/stock-levels`                 | Admin, Manager        | Stock level report               |
| GET    | `/inventory/reports/movements`                    | Admin, Manager        | Movement history report          |
| GET    | `/inventory/reports/valuation`                    | Admin, Manager        | Inventory valuation              |

### Database

**PostgreSQL Table:** `Inventory`

```prisma
model Inventory {
  id                String       @id @default(uuid())
  productBatchId    String       // FK to ProductBatch
  locationId        String       // FK to Location
  totalQty          Int          // Total quantity in location
  availableQty      Int          // Available = total - reserved
  reservedQty       Int          // Reserved for orders
  minStockLevel     Int          // Threshold for alerts
  maxStockLevel     Int?         // Optional max threshold
  createdById       String?      // FK to User
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  deletedAt         DateTime?    // Soft delete

  @@unique([productBatchId, locationId, deletedAt])
  @@index([locationId])
  @@index([availableQty])
}
```

**Stock Movement Table:** `StockMovement`

```prisma
model StockMovement {
  id                String       @id @default(uuid())
  inventoryId       String       // FK to Inventory
  movementType      MovementType // RECEIVE, DISPATCH, ADJUST, TRANSFER
  quantity          Int          // Amount moved (can be negative)
  fromLocationId    String?      // For transfers
  toLocationId      String?      // For transfers
  idempotencyKey    String?      @unique
  executedById      String?      // FK to User
  createdAt         DateTime     @default(now())

  @@index([inventoryId])
  @@index([movementType])
  @@index([createdAt])
}
```

### Dependencies

**Uses:**

- `ProductModule` - Validate product batches exist
- `WarehouseModule` - Validate locations exist
- `AlertsModule` - Trigger low stock alerts
- `CacheModule` - Redis caching (5-min TTL)

**Used by:**

- Future modules: Order fulfillment, Reporting & Analytics

## Architecture

### Components

```
inventory/
├── controllers/inventory.controller.ts   # REST API (15 endpoints)
├── services/inventory.service.ts         # Business logic (905 lines)
├── repositories/inventory.repository.ts  # Data access with Prisma
├── helpers/inventory.helper.ts           # Utility functions
└── dto/                                  # 15+ DTOs for operations
```

**Key Responsibilities:**

- **Controller:** HTTP handling, RBAC guards, Swagger docs
- **InventoryService:** Transaction management, business rules, cache invalidation, alert triggers
- **Repository:** Database CRUD with optimistic locking, complex queries
- **Helper:** Calculation utilities (available qty, movement validation)

### Key Design Decisions

**Why PostgreSQL (not MongoDB)?**

- ACID transactions required (multi-step inventory operations)
- Relational integrity (FK to products, locations, users)
- Complex aggregations for reports

**Why Idempotency Keys?**

- Prevent duplicate receives/dispatches from network retries
- Stored in `StockMovement.idempotencyKey` (unique constraint)
- 24-hour deduplication window

**Why Soft Delete?**

- Audit trail preservation (who deleted what, when)
- Historical reporting accuracy
- Unique constraint includes `deletedAt` for re-creation

## Business Rules

### 1. Available Quantity Calculation

```
availableQty = totalQty - reservedQty

Must always be >= 0 (enforced by validation)
```

### 2. Low Stock Alert Trigger

```
After DISPATCH or ADJUST (negative):
  if (availableQty <= minStockLevel):
    → Trigger alert generation (non-blocking)
```

### 3. Idempotency Rule

```
Same idempotencyKey within 24 hours:
  → Return existing StockMovement result (HTTP 200, not 201)
  → No database changes
```

### 4. Reservation Rules

```
RESERVE:
  - availableQty must be >= reserveQty
  - totalQty unchanged, reservedQty += amount, availableQty -= amount

RELEASE:
  - reservedQty must be >= releaseQty
  - totalQty unchanged, reservedQty -= amount, availableQty += amount
```

### 5. Transfer Rules

```
TRANSFER:
  - Atomic operation (both locations updated in transaction)
  - From location: totalQty -= qty, availableQty -= qty
  - To location: totalQty += qty, availableQty += qty
  - Creates 2 StockMovement records (OUT + IN)
```

### 6. Caching Rules

- **Cache Key:** `INVENTORY:location:{id}` or `INVENTORY:batch:{id}`
- **TTL:** 5 minutes (300 seconds)
- **Invalidation:** All write operations → flush related caches

## Integration

### Event Triggers (Outbound)

After inventory operations, module triggers:

```typescript
// After DISPATCH or negative ADJUST
await this.alertGenService
  .checkLowStockAlert(inventoryId)
  .catch((err) => logger.error('Alert failed (non-blocking)', err));
```

**Triggered operations:**

- `dispatchInventory()` - Always checks low stock
- `adjustInventory()` - Only if adjustment is negative

### How to Perform Common Operations

**Receive Inventory:**

```bash
POST /inventory/receive
{
  "productBatchId": "uuid",
  "locationId": "uuid",
  "quantity": 100,
  "createdById": "uuid",
  "idempotencyKey": "unique-key-123"  # Optional but recommended
}
```

**Reserve for Order:**

```bash
POST /inventory/reserve
{
  "productBatchId": "uuid",
  "locationId": "uuid",
  "quantity": 10,
  "executedById": "uuid",
  "idempotencyKey": "order-123-reserve"
}
```

**Transfer Between Locations:**

```bash
POST /inventory/transfer
{
  "productBatchId": "uuid",
  "fromLocationId": "uuid-A",
  "toLocationId": "uuid-B",
  "quantity": 50,
  "executedById": "uuid",
  "idempotencyKey": "transfer-456"
}
```

## Development

### Run Tests

```bash
npm test -- inventory              # All inventory tests
npm run test:e2e -- inventory      # E2E tests with real DB
```

### Sample Queries

```bash
# Query inventory by location
GET /inventory/location?locationId={uuid}&page=1&limit=20

# Query inventory by product batch
GET /inventory/product-batch?productBatchId={uuid}

# Stock level report
GET /inventory/reports/stock-levels?locationId={uuid}&minStockOnly=true
```

### Common Issues

**Insufficient stock error:**

```
Error: Cannot dispatch 100 units, only 50 available
Solution: Check availableQty before dispatching
```

**Idempotency key conflict:**

```
Error: Duplicate idempotency key
Solution: Expected behavior - returns existing result (not error)
```

**Negative available quantity:**

```
Error: Available quantity cannot be negative
Solution: availableQty = totalQty - reservedQty, ensure reservedQty <= totalQty
```

## Performance Notes

- **Indexes:** `locationId`, `productBatchId`, `availableQty` for fast queries
- **Caching:** Reduces database load by ~70% for read operations
- **Transaction Isolation:** READ COMMITTED to prevent dirty reads
- **Batch Operations:** Transfer creates 2 movements in single transaction
- **Soft Delete:** `deletedAt` in unique constraint allows record re-creation
