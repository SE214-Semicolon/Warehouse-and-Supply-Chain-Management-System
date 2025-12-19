# Audit & Compliance Module

## Overview

Automatic audit trail system that logs database changes for **warehouse-related entities only**. Captures who changed what, when, and provides immutable audit history for compliance and troubleshooting.

**Purpose:** Maintain comprehensive audit trail for security, compliance, and data traceability.

**Scope:** Currently audits Product, Inventory, Warehouse, and StockMovement entities. User management and other modules are handled by respective teams.

## Features

- **Automatic Logging:** Captures all CREATE, UPDATE, DELETE operations via Prisma middleware
- **Change Tracking:** Before/after snapshots of data changes
- **User Attribution:** Tracks userId, email, IP address for each change
- **Query & Filter:** Search audit logs by entity, action, user, date range
- **Immutable Storage:** MongoDB append-only collection (no updates/deletes)
- **TTL Cleanup:** Auto-delete logs after 180 days (configurable)
- **Non-Blocking:** Audit failures don't break business operations

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/audit-logs`

| Method | Endpoint      | Auth           | Description                   |
| ------ | ------------- | -------------- | ----------------------------- |
| GET    | `/audit-logs` | Admin, Manager | Query audit logs with filters |

**Query Filters:**

- `entityType` - Filter by entity (e.g., "Product", "Inventory")
- `entityId` - Filter by specific record ID
- `action` - Filter by action (CREATE, UPDATE, DELETE)
- `userId` - Filter by user who made the change
- `startDate`, `endDate` - Date range filter (ISO format)
- `search` - Full-text search in metadata
- `page`, `limit` - Pagination (default: page=1, limit=50)

### Database

**MongoDB Collection:** `audit_logs` (TTL: 180 days)

**Schema:**

```javascript
{
  timestamp: Date,             // When change occurred
  correlationId: string,       // Request tracking ID (optional)
  entityType: string,          // "Product", "Inventory", "Warehouse", etc.
  entityId: string,            // UUID of changed entity
  action: string,              // CREATE | UPDATE | DELETE
  userId: string,              // User who made the change (optional)
  userEmail: string,           // Email of user (optional)
  ipAddress: string,           // Client IP (optional)
  method: string,              // HTTP method (POST, PATCH, etc.)
  path: string,                // API endpoint path
  before: object,              // State before change (null for CREATE)
  after: object,               // State after change (null for DELETE)
  metadata: object             // Additional context
}
```

**Indexes:**

- `entityType` - Fast filtering by entity
- `entityId` - Lookup changes for specific record
- `action` - Filter by operation type
- `userId` - User activity tracking
- `timestamp` - Date range queries + TTL (expireAfterSeconds: 15552000 = 180 days)
- `metadata` - Full-text search (GIN index for JSON)

### Dependencies

**Uses:**

- `DatabaseModule` - Prisma middleware for automatic logging
- `MongoDBService` - Audit log storage

**Used by:**

- All modules (automatic via Prisma middleware)

## Architecture

### Components

```
audit-log/
├── controllers/audit-log.controller.ts  # Query endpoint (1 GET)
├── services/audit-log.service.ts        # Write/query operations
├── repositories/audit-log.repository.ts # MongoDB data access
├── interfaces/audit-log-entry.interface.ts # Entry schema
└── dto/
    ├── query-audit-log.dto.ts           # Query filters
    └── audit-log-response.dto.ts        # Response DTOs
```

**Key Responsibilities:**

- **Controller:** Query API for admin/manager users only
- **Service:** Write logs (non-blocking), query with pagination
- **Repository:** MongoDB insert/query with TTL index
- **Prisma Middleware:** Automatic capture of all DB changes

### Key Design Decisions

**Why MongoDB (not PostgreSQL)?**

- High write volume (every DB change logged)
- TTL indexes for automatic cleanup
- Flexible schema (metadata can vary by entity type)
- No need for ACID (append-only, no updates)

**Why Prisma Middleware?**

- Automatic logging without code changes in every module
- Centralized audit logic (single point of maintenance)
- Captures all Prisma operations (create, update, delete)

**Why Non-Blocking Write?**

- Audit failures shouldn't break business operations
- Logged errors but don't throw exceptions
- Trade-off: Potential audit log gaps vs system stability

## Business Rules

### 1. Automatic Capture (Prisma Middleware)

```
Audited Entities (warehouse modules only):
- Product, ProductBatch, ProductCategory
- Inventory, StockMovement
- Warehouse, Location

NOT Audited (other teams' responsibility):
- User, Supplier, Customer, Order, Inbound/Outbound Receipts
- Note: These modules not yet standardized to team's coding standards

All Prisma operations on audited entities trigger logging:
- prisma.*.create() → action: CREATE, before: null, after: newData
- prisma.*.update() → action: UPDATE, before: oldData, after: newData
- prisma.*.delete() → action: DELETE, before: oldData, after: null
```

### 2. Immutable Logs

```
Once written, audit logs cannot be modified or deleted
Only automatic TTL cleanup after 180 days
```

### 3. Data Retention

```
TTL Policy: 180 days (15552000 seconds)
After 180 days, MongoDB automatically deletes old logs
Configurable via TTL index expireAfterSeconds
```

### 4. User Attribution

```
If HTTP request context available:
  - userId from JWT token
  - userEmail from JWT token
  - ipAddress from request headers
  - method, path from request

If background job (cron, etc.):
  - userId may be null
  - metadata contains job context
```

### 5. Before/After Snapshots

```
CREATE: before = null, after = created record
UPDATE: before = old state, after = new state
DELETE: before = deleted record, after = null
```

### 6. Non-Blocking Error Handling

```
try {
  await auditRepo.insert(entry);
} catch (error) {
  logger.error('Audit log failed', error);
  // Don't throw - business logic continues
}
```

## Integration

### Automatic via Prisma Middleware

Audit logging is **automatic** for warehouse-related entities only. No manual code needed.

**Configured in:** `backend/src/database/middleware/audit.middleware.ts`

**Applies to these models only:**

- Product, ProductBatch, ProductCategory
- Inventory, StockMovement
- Warehouse, Location

**Does NOT apply to:**

- User, Supplier, Customer (managed by other teams)
- Order, InboundReceipt, OutboundReceipt (not yet standardized)
- Future: Will expand when other modules adopt team's coding standards

### How It Works

```typescript
// In audit.middleware.ts (simplified)
prisma.$use(async (params, next) => {
  const before = await getBeforeData(params);
  const result = await next(params); // Execute operation
  const after = result;

  await auditService.write({
    entityType: params.model, // "Product", "Inventory", etc.
    entityId: result.id,
    action: params.action.toUpperCase(), // CREATE, UPDATE, DELETE
    before,
    after,
    timestamp: new Date(),
    userId: getContextUserId(),
    // ... other fields
  });

  return result;
});
```

### Query Audit Logs

**Get all changes to a specific product:**

```bash
GET /audit-logs?entityType=Product&entityId={uuid}
```

**Get all changes by a user:**

```bash
GET /audit-logs?userId={uuid}&page=1&limit=50
```

**Get all deletes in date range:**

```bash
GET /audit-logs?action=DELETE&startDate=2024-01-01&endDate=2024-12-31
```

**Search metadata:**

```bash
GET /audit-logs?search=batch-123
```

## Development

### Run Tests

```bash
npm test -- audit-log       # Unit tests
```

### Sample Queries

```bash
# Recent inventory changes
GET /audit-logs?entityType=Inventory&limit=100

# User activity audit
GET /audit-logs?userId={uuid}&startDate=2024-12-01

# All product deletions
GET /audit-logs?entityType=Product&action=DELETE
```

### Common Use Cases

**Compliance Audit:**
"Show me all changes to product ABC-123 in the last 30 days"

```bash
GET /audit-logs?entityType=Product&entityId={uuid}&startDate=2024-11-07
```

**Security Investigation:**
"What did user john@example.com change today?"

```bash
GET /audit-logs?userEmail=john@example.com&startDate=2024-12-07
```

**Data Recovery:**
"What was the state of inventory before it was deleted?"

```bash
GET /audit-logs?entityType=Inventory&entityId={uuid}&action=DELETE
# Check "before" field for deleted state
```

## Performance Notes

- **Write Performance:** ~1-2ms per audit log write (non-blocking)
- **Query Performance:** Indexed queries < 50ms for typical filters
- **TTL Cleanup:** Automatic background process (no manual intervention)
- **Collection Size:** ~1MB per 1000 logs (180-day retention manageable)
- **No Caching:** Audit logs are write-once, read-rarely (no cache needed)

## Compliance Features

- **GDPR:** Can filter/export user activity via `userId` filter
- **SOC 2:** Immutable audit trail with user attribution
- **ISO 27001:** Change tracking for all sensitive data
- **HIPAA:** (if applicable) Complete data access history

## Limitations

- **Limited Scope:** Only audits warehouse-related entities (Product, Inventory, Warehouse, Location, StockMovement)
- **No User Audit:** User management audit handled by auth team (different module)
- **Future Expansion:** Will audit more entities when other modules standardized
- **No Rollback:** Audit logs are for tracking only, not data recovery
- **Gap Risk:** Non-blocking writes mean potential audit gaps on MongoDB failures
- **No Real-Time Alerts:** Query-based only, no active monitoring (use AlertsModule for that)
- **Storage Cost:** 180-day retention can grow large (monitor collection size)
