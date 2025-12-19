# Procurement Management Module

## Overview

Procurement management system handling supplier relationships and purchase order lifecycle. Supports supplier management, purchase order creation, submission, receiving, and invoice processing.

**Purpose:** Manage procurement operations from supplier selection to goods receipt and payment.

## Features

- **Supplier CRUD:** Create, read, update, soft delete suppliers with contact info
- **Purchase Order Management:** Draft, submit, receive purchase orders
- **Order Tracking:** Status transitions (draft → ordered → partial/received)
- **Supplier Search:** Find suppliers by name, code, or contact information
- **Active Order Validation:** Prevent deletion of suppliers with active purchase orders
- **Soft Delete:** Suppliers can be archived (not hard deleted)

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/procurement`

**Suppliers:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/suppliers` | Admin, Manager, Procurement | Create supplier |
| GET | `/suppliers` | All (except Partner) | List suppliers with pagination |
| GET | `/suppliers/:id` | All (except Partner) | Get supplier by ID |
| PATCH | `/suppliers/:id` | Admin, Manager, Procurement | Update supplier |
| DELETE | `/suppliers/:id` | Admin | Soft delete supplier |

**Purchase Orders:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/purchase-orders` | Admin, Manager, Procurement | Create draft PO |
| GET | `/purchase-orders` | All (except Partner) | List POs with filters |
| GET | `/purchase-orders/:id` | All (except Partner) | Get PO by ID |
| PATCH | `/purchase-orders/:id` | Admin, Manager, Procurement | Update draft PO |
| POST | `/purchase-orders/:id/submit` | Admin, Manager, Procurement | Submit PO (draft → ordered) |
| POST | `/purchase-orders/:id/receive` | Admin, Manager, Warehouse Staff | Receive goods (ordered → received) |
| DELETE | `/purchase-orders/:id` | Admin | Delete draft PO only |

### Database

**PostgreSQL Tables:**

**Supplier:**

```prisma
model Supplier {
  id             String          @id @default(uuid())
  code           String?         @unique
  name           String
  contactInfo    Json?           // {email, phone, fax, etc.}
  address        String?
  createdAt      DateTime        @default(now())
  deletedAt      DateTime?       // Soft delete
  purchaseOrders PurchaseOrder[]

  @@index([deletedAt])
}
```

**PurchaseOrder:**

```prisma
model PurchaseOrder {
  id              String              @id @default(uuid())
  poNo            String              @unique
  supplierId      String
  status          PoStatus            @default(draft)
  placedAt        DateTime?           // When submitted
  expectedArrival DateTime?
  totalAmount     Decimal?
  notes           String?
  createdById     String
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  supplier        Supplier            @relation(...)
  createdBy       User                @relation(...)
  items           PurchaseOrderItem[]

  @@index([status])
  @@index([supplierId])
}
```

**PurchaseOrderItem:**

```prisma
model PurchaseOrderItem {
  id              String        @id @default(uuid())
  purchaseOrderId String
  productId       String
  quantity        Int
  unitPrice       Decimal?
  receivedQty     Int?          // Quantity actually received

  purchaseOrder   PurchaseOrder @relation(...)
  product         Product       @relation(...)
}
```

**PoStatus Enum:**

- `draft` - Initial state, can be edited
- `ordered` - Submitted to supplier
- `partial` - Partially received
- `received` - Fully received
- `cancelled` - Order cancelled

### Dependencies

**Uses:**

- `CacheModule` - Redis caching (30-min TTL for suppliers)
- `PrismaService` - Database access
- `Logger` - Structured logging

**Used by:**

- `InventoryModule` - Receiving goods creates inventory entries
- `ReportingModule` - Procurement analytics
- `AlertsModule` - Low stock triggers purchase suggestions

## Architecture

### Components

```
procurement/
├── controllers/
│   ├── supplier.controller.ts         # Supplier CRUD (5 endpoints)
│   └── purchase-order.controller.ts   # PO CRUD + workflow (7 endpoints)
├── services/
│   ├── supplier.service.ts            # Supplier business logic
│   └── purchase-order.service.ts      # PO business logic + workflow
├── repositories/
│   ├── supplier.repository.ts         # Supplier data access
│   └── purchase-order.repository.ts   # PO data access
├── dto/
│   ├── supplier/                      # Supplier DTOs
│   └── purchase-order/                # PO DTOs
├── entities/
│   ├── supplier.entity.ts             # Supplier entity (Swagger)
│   └── purchase-order.entity.ts       # PO entity (Swagger)
└── interfaces/
    ├── supplier-repository.interface.ts
    └── purchase-order-repository.interface.ts
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, validation, cache management, logging
- **Repositories:** Database CRUD with Prisma, complex queries

### Key Design Decisions

**Why Separate Supplier from PurchaseOrder?**

- One supplier can have multiple purchase orders
- Supplier information reused across orders
- Can track supplier performance and history

**Why PO Status Workflow?**

- **draft:** Can be edited, not yet committed
- **ordered:** Submitted to supplier, triggers procurement alerts
- **partial/received:** Tracks goods receipt progress
- Prevents accidental modifications after submission

**Why Soft Delete for Suppliers?**

- Preserve historical data (orders reference deleted suppliers)
- Can restore suppliers if deleted by mistake
- Active order validation prevents deletion of suppliers with pending orders

## Business Rules

### 1. Supplier Code Uniqueness

```
Supplier code must be unique if provided (nullable)
Used for external system integration
Database unique constraint enforced
```

### 2. PO Number Auto-Generation

```
Format: PO-YYYYMMDD-NNNN
Example: PO-20251217-0001
Generated on PO creation
Guaranteed unique by database constraint
```

### 3. PO Status Transitions

```
Allowed transitions:
  draft → ordered (via submit)
  draft → cancelled
  ordered → partial (via receive, qty < total)
  ordered → received (via receive, qty = total)
  partial → received (via receive)

Forbidden:
  received → any other state (final state)
  cancelled → any other state (final state)
```

### 4. Active Order Validation

```
Cannot soft delete supplier if:
  - Has purchase orders in status: draft, ordered, partial

Error: "Cannot delete supplier with active purchase orders"
Must cancel or complete all orders first
```

### 5. PO Edit Restrictions

```
Can only edit PO in 'draft' status
After submission, changes require admin override
Items can be added/removed only in draft
```

### 6. Receive Validation

```
Cannot receive qty > ordered qty per item
Partial receipts allowed
System auto-calculates remaining qty
Status updates based on total received vs ordered
```

## Testing

### Test Coverage

```
Supplier Service:       Unit tests (repository mocked)
Purchase Order Service: Unit tests (repository mocked)
Supplier Sanity:        E2E tests (CRUD workflow)
Purchase Order Sanity:  E2E tests (workflow: draft → ordered → received)
```

### Running Tests

```bash
# Unit tests only
npm test -- --testPathPattern=procurement.*unit

# Sanity tests (E2E)
npm test -- --testPathPattern=procurement.*sanity

# All procurement tests
npm test -- --testPathPattern=procurement
```

### Test Cases

**Supplier Tests:**

- ✅ Create supplier with valid data
- ✅ Get supplier by ID with caching
- ✅ Update supplier invalidates cache
- ✅ Soft delete supplier
- ✅ Cannot delete supplier with active orders
- ✅ List suppliers with pagination

**Purchase Order Tests:**

- ✅ Create draft PO
- ✅ Submit draft PO (status: draft → ordered)
- ✅ Cannot submit non-draft PO
- ✅ Receive full order (status: ordered → received)
- ✅ Receive partial order (status: ordered → partial)
- ✅ Cannot edit submitted PO
- ✅ Cannot receive more than ordered qty

## Logging & Monitoring

### Log Events

```typescript
// Create operations
logger.log(`Creating supplier: ${data.name}`);
logger.log(`Supplier created: ${supplier.code || supplier.id}`);

// Update operations
logger.log(`Updating supplier ${id}`);
logger.warn(`Supplier ${id} not found`);

// Delete operations
logger.log(`Soft deleting supplier ${id}`);
logger.warn(`Cannot delete supplier with active orders`);

// Purchase order workflow
logger.log(`Creating purchase order for supplier ${supplierId}`);
logger.log(`Purchase order created: ${poNo}`);
logger.log(`Submitting purchase order ${id}`);
logger.warn(`PO ${id} cannot be submitted - invalid status`);
```

### Cache Keys

```
Pattern: procurement:supplier:{id}
TTL: 30 minutes (MEDIUM)
Invalidation: On update, delete
```

## Error Handling

### Common Errors

```typescript
// Supplier not found
404 NotFoundException: 'Supplier not found'

// Cannot delete with active orders
400 BadRequestException: 'Cannot delete supplier with active purchase orders'

// Invalid PO status transition
400 BadRequestException: 'Purchase order cannot be submitted - current status: received'

// Receive qty exceeds ordered qty
400 BadRequestException: 'Received quantity exceeds ordered quantity for item'

// Update non-draft PO
400 BadRequestException: 'Can only update purchase orders in draft status'
```

## Future Enhancements

1. **Invoice Management:** Link POs to invoices, payment tracking
2. **Supplier Performance:** Rating system, delivery time tracking
3. **Price History:** Track price changes per supplier/product
4. **Auto-reorder:** Trigger PO creation when inventory low
5. **Approval Workflow:** Multi-level approval for high-value POs
6. **Email Notifications:** Send PO to supplier email
7. **Document Attachments:** Store contracts, certificates

## Related Documentation

- [Architecture Overview](../../../docs/ARCHITECTURE.md)
- [Database Schema](../../../docs/DATABASE.md)
- [RBAC Policies](../../../docs/RBAC.md)
- [Testing Guide](../../TEST_GUIDE.md)
