# Sales Management Module

## Overview

Sales order management system handling customer relationships and sales order lifecycle. Supports customer management, sales order creation, approval, fulfillment, and shipment coordination.

**Purpose:** Manage sales operations from order creation to fulfillment and delivery.

## Features

- **Customer CRUD:** Create, read, update, delete customers with contact info
- **Sales Order Management:** Create, approve, fulfill sales orders
- **Order Tracking:** Status transitions (pending → approved → in_progress → completed)
- **Customer Search:** Find customers by name, code, or contact information
- **Active Order Validation:** Prevent deletion of customers with active sales orders
- **Inventory Integration:** Validates product availability during fulfillment

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/sales`

**Customers:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/customers` | Admin, Manager, Sales Analyst | Create customer |
| GET | `/customers` | All (except Partner) | List customers with pagination |
| GET | `/customers/:id` | All (except Partner) | Get customer by ID |
| PATCH | `/customers/:id` | Admin, Manager, Sales Analyst | Update customer |
| DELETE | `/customers/:id` | Admin | Delete customer |

**Sales Orders:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sales-orders` | Admin, Manager, Sales Analyst | Create pending SO |
| GET | `/sales-orders` | All (except Partner) | List SOs with filters |
| GET | `/sales-orders/:id` | All (except Partner) | Get SO by ID |
| PATCH | `/sales-orders/:id` | Admin, Manager | Update pending SO |
| POST | `/sales-orders/:id/submit` | Admin, Manager, Sales Analyst | Submit SO (pending → approved) |
| POST | `/sales-orders/:id/fulfill` | Admin, Manager, Warehouse Staff | Fulfill order (approved → in_progress/completed) |
| POST | `/sales-orders/:id/cancel` | Admin, Manager | Cancel order |
| DELETE | `/sales-orders/:id` | Admin | Delete pending SO only |

### Database

**PostgreSQL Tables:**

**Customer:**

```prisma
model Customer {
  id          String       @id @default(uuid())
  code        String?      @unique
  name        String
  contactInfo Json?        // {email, phone, address, etc.}
  address     String?
  createdAt   DateTime     @default(now())
  salesOrders SalesOrder[]

  @@index([code])
}
```

**SalesOrder:**

```prisma
model SalesOrder {
  id            String           @id @default(uuid())
  soNo          String           @unique
  customerId    String
  status        SoStatus         @default(pending)
  orderDate     DateTime         @default(now())
  requiredDate  DateTime?
  totalAmount   Decimal?
  notes         String?
  createdById   String
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  customer      Customer         @relation(...)
  createdBy     User             @relation(...)
  items         SalesOrderItem[]
  shipments     Shipment[]

  @@index([status])
  @@index([customerId])
}
```

**SalesOrderItem:**

```prisma
model SalesOrderItem {
  id            String      @id @default(uuid())
  salesOrderId  String
  productId     String
  quantity      Int
  unitPrice     Decimal?
  fulfilledQty  Int?        // Quantity actually fulfilled

  salesOrder    SalesOrder  @relation(...)
  product       Product     @relation(...)
}
```

**SoStatus Enum:**

- `pending` - Initial state, awaiting approval
- `approved` - Approved, ready for fulfillment
- `in_progress` - Partially fulfilled
- `completed` - Fully fulfilled
- `cancelled` - Order cancelled
- `closed` - Order closed (delivered)

### Dependencies

**Uses:**

- `CacheModule` - Redis caching
- `PrismaService` - Database access
- `Logger` - Structured logging
- `InventoryModule` - Stock validation and reservation

**Used by:**

- `ShipmentModule` - Creates shipments for fulfilled orders
- `ReportingModule` - Sales analytics
- `DemandPlanningModule` - Sales forecasting

## Architecture

### Components

```
sales/
├── controllers/
│   ├── customer.controller.ts        # Customer CRUD (5 endpoints)
│   └── sales-order.controller.ts     # SO CRUD + workflow (8 endpoints)
├── services/
│   ├── customer.service.ts           # Customer business logic
│   └── sales-order.service.ts        # SO business logic + workflow
├── repositories/
│   ├── customer.repository.ts        # Customer data access
│   └── sales-order.repository.ts     # SO data access
├── dto/
│   ├── customer/                     # Customer DTOs
│   └── sales-order/                  # SO DTOs
├── entities/
│   ├── customer.entity.ts            # Customer entity (Swagger)
│   └── sales-order.entity.ts         # SO entity (Swagger)
└── interfaces/
    ├── customer-repository.interface.ts
    └── sales-order-repository.interface.ts
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, validation, logging
- **Repositories:** Database CRUD with Prisma, complex queries

### Key Design Decisions

**Why Separate Customer from SalesOrder?**

- One customer can have multiple sales orders
- Customer information reused across orders
- Can track customer purchase history and patterns

**Why SO Status Workflow?**

- **pending:** Awaiting approval, can be edited
- **approved:** Approved by manager, ready for fulfillment
- **in_progress:** Partially fulfilled (inventory reserved)
- **completed:** Fully fulfilled (ready for shipment)
- **cancelled/closed:** Final states, no further changes

**Why No Soft Delete for Customers?**

- Historical orders maintain customer reference
- Simpler data model (hard delete only)
- Active order validation prevents deletion of customers with pending orders

## Business Rules

### 1. Customer Code Uniqueness

```
Customer code must be unique if provided (nullable)
Used for external system integration (e.g., ERP)
Database unique constraint enforced
```

### 2. SO Number Auto-Generation

```
Format: SO-YYYYMMDD-NNNN
Example: SO-20251217-0001
Generated on SO creation
Guaranteed unique by database constraint
```

### 3. SO Status Transitions

```
Allowed transitions:
  pending → approved (via submit)
  pending → cancelled
  approved → in_progress (via fulfill, partial)
  approved → completed (via fulfill, full)
  in_progress → completed (via fulfill remaining)
  approved → cancelled
  in_progress → cancelled

Forbidden:
  completed → any other state (final state)
  closed → any other state (final state)
```

### 4. Active Order Validation

```
Cannot delete customer if:
  - Has sales orders in status: pending, approved, in_progress

Error: "Cannot delete customer with active sales orders"
Must cancel or complete all orders first
```

### 5. SO Edit Restrictions

```
Can only edit SO in 'pending' status
After approval, changes require admin override
Items can be added/removed only in pending
```

### 6. Fulfillment Validation

```
Cannot fulfill qty > ordered qty per item
Must check inventory availability before fulfillment
Partial fulfillment allowed
System auto-calculates remaining qty
Status updates based on total fulfilled vs ordered
```

### 7. Inventory Reservation

```
When order is approved:
  - Check inventory availability
  - Reserve inventory (increase reservedQty)

When order is fulfilled:
  - Reduce inventory availableQty
  - Reduce reservedQty
  - Create stock movement record
```

## Testing

### Test Coverage

```
Customer Service:       Unit tests (26 passing, repository mocked)
Sales Order Service:    Unit tests (repository mocked)
Customer Sanity:        E2E tests (CRUD workflow)
Sales Order Sanity:     E2E tests (workflow: pending → approved → fulfilled)
Sales Order Integration: E2E tests (with inventory integration)
```

### Running Tests

```bash
# Unit tests only
npm test -- --testPathPattern=sales.*unit

# Sanity tests (E2E)
npm test -- --testPathPattern=sales.*sanity

# Integration tests
npm test -- --testPathPattern=sales.*integration

# All sales tests
npm test -- --testPathPattern=sales
```

### Test Cases

**Customer Tests:**

- ✅ Create customer with valid data (26 passing unit tests)
- ✅ Get customer by ID
- ✅ Update customer information
- ✅ Delete customer
- ✅ Cannot delete customer with active orders
- ✅ List customers with pagination

**Sales Order Tests:**

- ✅ Create pending SO
- ✅ Submit pending SO (status: pending → approved)
- ✅ Cannot submit non-pending SO
- ✅ Fulfill full order (status: approved → completed)
- ✅ Fulfill partial order (status: approved → in_progress)
- ✅ Cannot edit approved SO
- ✅ Cannot fulfill more than ordered qty
- ✅ Inventory reservation on approval
- ✅ Inventory reduction on fulfillment

## Logging & Monitoring

### Log Events

```typescript
// Create operations
logger.log(`Creating customer: ${data.name}`);
logger.log(`Customer created with ID: ${customer.id}`);

// Update operations
logger.log(`Updating customer ${id}`);
logger.warn(`Customer ${id} not found`);

// Delete operations
logger.log(`Deleting customer ${id}`);
logger.warn(`Cannot delete customer with active orders`);

// Sales order workflow
logger.log(`Creating sales order for customer ${customerId}`);
logger.log(`Sales order created: ${soNo}`);
logger.log(`Submitting sales order ${id}`);
logger.warn(`SO ${id} cannot be submitted - invalid status`);
```

### Cache Keys

```
Pattern: sales:customer:{id}
TTL: Configurable (default: 30 minutes)
Invalidation: On update, delete
```

## Error Handling

### Common Errors

```typescript
// Customer not found
404 NotFoundException: 'Customer not found'

// Cannot delete with active orders
400 BadRequestException: 'Cannot delete customer with active sales orders'

// Invalid SO status transition
400 BadRequestException: 'Sales order cannot be submitted - current status: completed'

// Insufficient inventory
400 BadRequestException: 'Insufficient inventory for product: {productName}'

// Fulfill qty exceeds ordered qty
400 BadRequestException: 'Fulfilled quantity exceeds ordered quantity for item'

// Update non-pending SO
400 BadRequestException: 'Can only update sales orders in pending status'
```

## Future Enhancements

1. **Payment Integration:** Track payments, payment terms
2. **Credit Management:** Customer credit limits, payment history
3. **Pricing Rules:** Dynamic pricing, discounts, promotions
4. **Order Templates:** Recurring orders, order history reorder
5. **Approval Workflow:** Multi-level approval for high-value orders
6. **Customer Portal:** Self-service order tracking
7. **Returns Management:** RMA process, restocking
8. **Sales Analytics:** Customer segmentation, sales trends

## Related Documentation

- [Architecture Overview](../../../docs/ARCHITECTURE.md)
- [Database Schema](../../../docs/DATABASE.md)
- [RBAC Policies](../../../docs/RBAC.md)
- [Testing Guide](../../TEST_GUIDE.md)
- [Customer Service Unit Tests](./tests/customer/unit-test/customer.service.spec.ts)
