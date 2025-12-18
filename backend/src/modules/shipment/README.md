# Shipment Management Module (Logistics)

## Overview

Shipment and logistics management system handling delivery operations from warehouse to customer. Supports shipment creation, tracking, carrier management, and delivery confirmation.

**Purpose:** Manage logistics operations from order fulfillment to final delivery.

## Features

- **Shipment CRUD:** Create, read, update shipments with tracking
- **Carrier Management:** Track carriers, tracking codes, delivery status
- **Status Tracking:** Monitor shipment lifecycle (preparing → shipped → in_transit → delivered)
- **Delivery Confirmation:** Record actual delivery times
- **Sales Order Integration:** Links shipments to sales orders
- **Warehouse Coordination:** Validates warehouse and inventory availability
- **Tracking Events:** Historical tracking events timeline

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/shipments`

**Shipments:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/shipments` | Admin, Manager, Logistics | Create shipment |
| GET | `/shipments` | All (except Partner) | List shipments with filters |
| GET | `/shipments/:id` | All (except Partner) | Get shipment by ID |
| PATCH | `/shipments/:id` | Admin, Manager, Logistics | Update shipment |
| POST | `/shipments/:id/ship` | Admin, Manager, Logistics | Mark as shipped |
| POST | `/shipments/:id/deliver` | Admin, Manager, Logistics | Confirm delivery |
| POST | `/shipments/:id/tracking` | Admin, Manager, Logistics | Add tracking event |
| DELETE | `/shipments/:id` | Admin | Delete preparing shipment only |

### Database

**PostgreSQL Tables:**

**Shipment:**

```prisma
model Shipment {
  id                String                  @id @default(uuid())
  shipmentNo        String?                 @unique
  warehouseId       String
  salesOrderId      String
  carrier           String?                 // Carrier name (FedEx, UPS, etc.)
  trackingCode      String?                 // Tracking number
  status            ShipmentStatus          @default(preparing)
  shippedAt         DateTime?               // When shipment left warehouse
  deliveredAt       DateTime?               // When delivered to customer
  estimatedDelivery DateTime?               // Estimated delivery date
  notes             String?

  warehouse         Warehouse               @relation(...)
  salesOrder        SalesOrder              @relation(...)
  items             ShipmentItem[]
  trackingEvents    ShipmentTrackingEvent[]

  @@index([warehouseId])
  @@index([salesOrderId])
  @@index([status])
}
```

**ShipmentItem:**

```prisma
model ShipmentItem {
  id           String   @id @default(uuid())
  shipmentId   String
  productId    String
  quantity     Int      // Quantity in this shipment

  shipment     Shipment @relation(...)
  product      Product  @relation(...)
}
```

**ShipmentTrackingEvent:**

```prisma
model ShipmentTrackingEvent {
  id          String   @id @default(uuid())
  shipmentId  String
  location    String?  // "Memphis Hub", "Out for Delivery", etc.
  status      String   // Event status description
  timestamp   DateTime @default(now())
  notes       String?

  shipment    Shipment @relation(...)

  @@index([shipmentId])
}
```

**ShipmentStatus Enum:**

- `preparing` - Initial state, packing in progress
- `shipped` - Left warehouse, in transit
- `in_transit` - In carrier's possession
- `out_for_delivery` - Out for final delivery
- `delivered` - Successfully delivered
- `failed` - Delivery failed/returned
- `cancelled` - Shipment cancelled

### Dependencies

**Uses:**

- `CacheModule` - Redis caching
- `PrismaService` - Database access
- `Logger` - Structured logging
- `SalesModule` - Validates sales orders
- `WarehouseModule` - Validates warehouse locations

**Used by:**

- `ReportingModule` - Logistics analytics
- `AlertsModule` - Delayed shipment alerts
- Future: Customer notification service

## Architecture

### Components

```
shipment/
├── controllers/
│   └── shipment.controller.ts        # Shipment CRUD + workflow (8 endpoints)
├── services/
│   └── shipment.service.ts           # Shipment business logic + workflow
├── repositories/
│   └── shipment.repository.ts        # Shipment data access
├── dto/
│   ├── create-shipment.dto.ts
│   ├── update-shipment.dto.ts
│   └── shipment-response.dto.ts
├── entities/
│   └── shipment.entity.ts            # Shipment entity (Swagger)
└── interfaces/
    └── shipment-repository.interface.ts
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, validation, logging, workflow orchestration
- **Repositories:** Database CRUD with Prisma, complex queries

### Key Design Decisions

**Why Link Shipment to SalesOrder?**

- One sales order can have multiple shipments (partial deliveries)
- Tracks which items from order are in which shipment
- Validates order is fulfilled before creating shipment

**Why Shipment Status Workflow?**

- **preparing:** Warehouse packing items
- **shipped:** Left warehouse, tracking activated
- **in_transit/out_for_delivery:** Carrier status updates
- **delivered:** Final confirmation, triggers order closure
- **failed/cancelled:** Exception handling

**Why Tracking Events Table?**

- Provides detailed timeline of shipment journey
- External carrier API integration (future)
- Customer visibility into shipment progress
- Audit trail for delivery disputes

## Business Rules

### 1. Shipment Number Auto-Generation

```
Format: SHIP-YYYYMMDD-NNNN
Example: SHIP-20251217-0001
Generated on shipment creation
Guaranteed unique by database constraint
```

### 2. Shipment Creation Validation

```
Before creating shipment:
  1. Sales order must exist
  2. Sales order status must be 'completed' (fulfilled)
  3. Warehouse must exist
  4. Cannot create duplicate shipment for same order (unless partial)

Validation errors logged as warnings
```

### 3. Shipment Status Transitions

```
Allowed transitions:
  preparing → shipped (via ship action)
  preparing → cancelled
  shipped → in_transit (via tracking update)
  in_transit → out_for_delivery
  out_for_delivery → delivered (via deliver action)
  shipped → delivered (direct, if no intermediate tracking)
  any → failed (exception handling)

Forbidden:
  delivered → any other state (final state)
  cancelled → any other state (final state)
```

### 4. Carrier and Tracking Validation

```
Carrier is optional (nullable)
Tracking code is optional (nullable)
If tracking code provided, carrier should be specified
Tracking events require shipment to be in 'shipped' or later status
```

### 5. Shipment Edit Restrictions

```
Can only edit shipment in 'preparing' status
After shipping, only status updates and tracking events allowed
Cannot modify items after shipping
Delivered shipments are immutable
```

### 6. Delivery Confirmation

```
When marking as delivered:
  1. Set deliveredAt timestamp
  2. Update status to 'delivered'
  3. Optional: Update related sales order to 'closed'
  4. Create final tracking event

Cannot deliver without shipping first
```

## Testing

### Test Coverage

```
Shipment Service:    Unit tests (repository mocked)
Shipment Sanity:     E2E tests (CRUD workflow)
Shipment Integration: E2E tests (with sales order and warehouse integration)
```

### Running Tests

```bash
# Unit tests only
npm test -- --testPathPattern=shipment.*unit

# Sanity tests (E2E)
npm test -- --testPathPattern=shipment.*sanity

# Integration tests
npm test -- --testPathPattern=shipment.*integration

# All shipment tests
npm test -- --testPathPattern=shipment
```

### Test Cases

**Shipment Tests:**

- ✅ Create shipment for fulfilled order
- ✅ Cannot create shipment for non-existent order
- ✅ Cannot create shipment for non-existent warehouse
- ✅ Ship shipment (preparing → shipped)
- ✅ Cannot ship non-preparing shipment
- ✅ Add tracking events
- ✅ Deliver shipment (shipped → delivered)
- ✅ Cannot edit delivered shipment
- ✅ List shipments with filters

## Logging & Monitoring

### Log Events

```typescript
// Create operations
logger.log(`Creating shipment for sales order ${salesOrderId}`);
logger.log(`Shipment created: ${shipmentNo}`);
logger.warn(`Sales order ${salesOrderId} not found`);
logger.warn(`Warehouse ${warehouseId} not found`);

// Status updates
logger.log(`Shipping shipment ${id}`);
logger.log(`Shipment ${id} marked as shipped`);
logger.log(`Delivering shipment ${id}`);
logger.log(`Shipment ${id} delivered successfully`);

// Tracking events
logger.log(`Adding tracking event to shipment ${id}: ${status}`);
```

### Cache Keys

```
Pattern: shipment:{id}
TTL: Configurable (default: 15 minutes)
Invalidation: On update, status change
```

## Error Handling

### Common Errors

```typescript
// Shipment not found
404 NotFoundException: 'Shipment not found'

// Invalid sales order
404 NotFoundException: 'Sales order not found'
400 BadRequestException: 'Sales order must be completed before creating shipment'

// Invalid warehouse
404 NotFoundException: 'Warehouse not found'

// Invalid status transition
400 BadRequestException: 'Shipment cannot be shipped - current status: delivered'

// Edit delivered shipment
400 BadRequestException: 'Cannot modify delivered shipment'

// Deliver without shipping
400 BadRequestException: 'Shipment must be shipped before delivery confirmation'
```

## Integration Points

### Sales Order Integration

```typescript
// On shipment creation:
1. Validate sales order exists
2. Validate sales order status = 'completed'
3. Link shipment to sales order

// On delivery:
1. Update sales order status to 'closed'
2. Notify sales module
```

### Warehouse Integration

```typescript
// On shipment creation:
1. Validate warehouse exists
2. Validate items are at specified warehouse
3. Link shipment to warehouse

// On shipping:
1. Inventory already reduced during fulfillment
2. No additional inventory operations
```

## Future Enhancements

1. **Carrier API Integration:** Real-time tracking from FedEx, UPS, DHL APIs
2. **Customer Notifications:** Email/SMS on status changes
3. **Route Optimization:** Batch shipments by geographic area
4. **Shipping Cost Calculation:** Rate shopping, cost allocation
5. **Returns Management:** Reverse logistics, RMA tracking
6. **Proof of Delivery:** Signature capture, photo confirmation
7. **Multi-leg Shipments:** International shipping with customs
8. **Shipping Labels:** Generate and print carrier labels

## Related Documentation

- [Architecture Overview](../../../docs/ARCHITECTURE.md)
- [Database Schema](../../../docs/DATABASE.md)
- [RBAC Policies](../../../docs/RBAC.md)
- [Testing Guide](../../TEST_GUIDE.md)
