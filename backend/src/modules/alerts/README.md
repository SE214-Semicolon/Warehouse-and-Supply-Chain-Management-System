# Alerts & Notifications Module

## Overview

Automated notification system that monitors inventory levels and product expiry dates. Generates alerts based on business rules via event-driven triggers and scheduled background jobs.

**Purpose:** Prevent stockouts and expired products through proactive monitoring and timely notifications.

## Features

- **Alert Types:** LOW_STOCK (inventory below threshold), EXPIRING_SOON (products near expiry)
- **Alert Severity:** WARNING (attention needed), CRITICAL (immediate action required)
- **Alert Generation:** Event-driven (after inventory operations) + Scheduled (daily cron jobs)
- **Alert Management:** CRUD operations with filtering, pagination, read/unread status
- **Auto-Cleanup:** TTL index deletes alerts after 90 days

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/alerts`

| Method | Endpoint               | Auth                 | Description               |
| ------ | ---------------------- | -------------------- | ------------------------- |
| POST   | `/alerts`              | Admin, Manager       | Create alert manually     |
| GET    | `/alerts`              | All (except Partner) | Query alerts with filters |
| GET    | `/alerts/:id`          | All (except Partner) | Get alert by ID           |
| PATCH  | `/alerts/:id/read`     | All (except Partner) | Mark alert as read        |
| DELETE | `/alerts/:id`          | Admin, Manager       | Delete alert              |
| GET    | `/alerts/unread-count` | All (except Partner) | Count unread alerts       |

**Query Filters:** `type`, `severity`, `isRead`, `page`, `limit`, `sortBy`, `sortOrder`

### Database

**MongoDB Collection:** `alerts` (TTL: 90 days)

```javascript
{
  type: 'LOW_STOCK' | 'EXPIRING_SOON',
  severity: 'WARNING' | 'CRITICAL',
  message: string,
  isRead: boolean,
  relatedEntity: { type: 'Product' | 'Inventory', id: ObjectId },
  createdAt: Date,  // TTL indexed
  updatedAt: Date
}
```

**Indexes:** `type`, `severity`, `isRead`, `createdAt` (with TTL: 7776000s)

### Dependencies

**Uses:**

- `InventoryModule`, `ProductModule` - Data queries via Prisma
- `CacheModule` - Redis caching (5-min TTL)
- `@nestjs/schedule` - Cron jobs

**Used by:** None (standalone notification system)

## Architecture

### Components

```
alerts/
├── controllers/alert.controller.ts      # REST API (6 endpoints)
├── services/
│   ├── alert.service.ts                 # CRUD + caching
│   ├── alert-generation.service.ts      # Severity calculation
│   └── alert-scheduler.service.ts       # Cron jobs (8AM, 12PM)
├── repositories/alert.repository.ts     # MongoDB access
└── dto/                                 # Request/response validation
```

**Key Responsibilities:**

- **Controller:** HTTP handling, RBAC guards, Swagger docs
- **AlertService:** Business logic, cache management (Redis)
- **AlertGenerationService:** Alert creation logic, severity rules
- **AlertSchedulerService:** Daily scans (low stock: 8AM, expiry: 12PM)
- **Repository:** MongoDB CRUD with TTL indexes

### Key Design Decisions

**Why MongoDB (not PostgreSQL)?**

- High write volume (1000+ alerts/day)
- TTL indexes for auto-cleanup (no manual purge jobs)
- Flexible schema (alert metadata can vary)

**Why Redis Caching?**

- Read-heavy workload (dashboards poll frequently)
- 5-min TTL = ~80% cache hit rate
- Query cache invalidated on create/update/delete

**Why Non-Blocking Alert Generation?**

- Alert failures shouldn't rollback inventory transactions
- Fire-and-forget pattern: errors logged but operations continue

## Business Rules

### 1. LOW_STOCK Alert Severity

```
CRITICAL: availableQty <= minStockLevel * 0.5
WARNING:  availableQty <= minStockLevel
```

**Example:** `minStock=100`, `available=40` → CRITICAL | `available=80` → WARNING

### 2. EXPIRING_SOON Alert Severity

```
CRITICAL: daysUntilExpiry <= 7 OR already expired
WARNING:  daysUntilExpiry <= 30
```

**Example:** `expiry in 5 days` → CRITICAL | `expiry in 20 days` → WARNING

### 3. Idempotency Rule

Duplicate alerts prevented by checking existing unread alerts with same:

- `type` + `relatedEntity.id` + `severity`

Prevents duplicate alerts from multiple triggers (event + cron job).

### 4. Caching Rules

- **Cache Key:** `ALERT:query:{hash(filters)}` or `ALERT:detail:{id}`
- **TTL:** 5 minutes (300 seconds)
- **Invalidation:** Create/Update/Delete → flush query caches

### 5. TTL Cleanup

Alerts auto-deleted 90 days after creation via MongoDB TTL index on `createdAt`.

## Integration

### Event Triggers (Real-time)

Alert generation triggered after inventory operations:

```typescript
// In InventoryService
await this.alertGenService
  .checkLowStockAlert(inventoryId)
  .catch((err) => logger.error('Alert failed (non-blocking)', err));
```

**Triggered by:**

- `InventoryService.dispatchInventory()` - After stock deduction
- `InventoryService.adjustInventory()` - After negative adjustment

### Scheduled Jobs (Cron)

- **8:00 AM Daily:** Scan all inventory for low stock (batch mode)
- **12:00 PM Daily:** Scan product batches expiring within 30 days

**Implementation:** `@Cron()` decorators in `AlertSchedulerService`

### How to Add New Alert Type

1. Add enum to `schemas/alert.schema.ts`:

   ```typescript
   export enum AlertType {
     LOW_STOCK = 'LOW_STOCK',
     EXPIRING_SOON = 'EXPIRING_SOON',
     YOUR_NEW_TYPE = 'YOUR_NEW_TYPE', // Add here
   }
   ```

2. Implement check logic in `AlertGenerationService`:

   ```typescript
   async checkYourNewAlert(entityId: string): Promise<void> {
     // Query entity, calculate severity, create alert
   }
   ```

3. Add cron job (optional) in `AlertSchedulerService`:
   ```typescript
   @Cron(CronExpression.EVERY_DAY_AT_10AM)
   async scanYourNewAlerts() { ... }
   ```

## Development

### Run Tests

```bash
npm test -- alerts           # All tests (27 total)
npm test:cov -- alerts       # With coverage
```

### Sample API Calls

```bash
# Get unread critical alerts
curl "http://localhost:3000/alerts?isRead=false&severity=CRITICAL" \
  -H "Authorization: Bearer TOKEN"

# Mark as read
curl -X PATCH "http://localhost:3000/alerts/{id}/read" \
  -H "Authorization: Bearer TOKEN"
```

### Common Issues

**MongoDB index conflict:** Drop `createdAt_1` index if TTL options mismatch

```bash
docker exec -it mongodb mongosh warehouse_analytics
db.alerts.dropIndex("createdAt_1")
```

**Cron jobs not running:** Verify `@nestjs/schedule` installed and `ScheduleModule` imported

---
