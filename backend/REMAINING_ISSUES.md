# Remaining Critical Issues for Academic Project

## Status: Inventory Reservation - COMPLETED ✅

The critical inventory reservation mechanism has been fully implemented and tested (423 unit tests passing).

---

## Remaining Issues

### 1. Cache Invalidation Timing ⏰ Priority: HIGH

**Problem:** Cache is invalidated BEFORE transaction commits, causing race conditions

**Affected Services:**

1. `PurchaseOrderService` (3-4 methods)
2. `SalesOrderService` (3-4 methods)
3. `InventoryService` (2-3 methods)
4. `WarehouseService` (2 methods)
5. `LocationService` (2 methods)
6. `ShipmentService` (2 methods)

**Current Pattern (Incorrect):**

```typescript
async updateSomething(id: string, dto: UpdateDto) {
  // Invalidate cache BEFORE DB write
  await this.cacheManager.del(`cache:key:${id}`);

  // Then update DB
  const result = await this.repo.update(id, dto);

  return result;
  // Problem: If update fails, cache is already invalidated
  // Problem: Between invalidation and update, stale data can be cached again
}
```

**Correct Pattern:**

```typescript
async updateSomething(id: string, dto: UpdateDto) {
  try {
    // First update DB
    const result = await this.repo.update(id, dto);

    // Then invalidate cache ONLY if successful
    await this.cacheManager.del(`cache:key:${id}`);

    return result;
  } catch (error) {
    // If update fails, cache stays valid (no race condition)
    throw error;
  }
}
```

**Estimated Time:** 20-25 minutes

- Find all cache invalidation calls: 5 min
- Update pattern in each service: 15-20 min
- Quick smoke test: 5 min

**Files to Modify:**

- `src/modules/purchasing/services/purchase-order.service.ts`
- `src/modules/sales/services/sales-order.service.ts`
- `src/modules/inventory/services/inventory.service.ts`
- `src/modules/warehouse/services/warehouse.service.ts`
- `src/modules/warehouse/services/location.service.ts`
- `src/modules/shipment/services/shipment.service.ts`

---

### 2. Batch Expiry Validation ✅ PARTIALLY DONE

**Status:** Added validation in `fulfillSalesOrder()`, but should also check in:

**Remaining Locations to Add:**

1. `PurchaseOrderService.receivePurchaseOrder()` - Warn if receiving near-expiry batches
2. `InventoryService.dispatchInventory()` - Prevent dispatching expired batches
3. `ShipmentService.createShipment()` - Validate batches not expired

**Validation Logic:**

```typescript
if (batch.expiryDate && batch.expiryDate < new Date()) {
  throw new BadRequestException(`Cannot dispatch expired batch ${batch.batchNo || batch.id}`);
}

// Optional: Warn for near-expiry (within 7 days)
const daysUntilExpiry = Math.floor(
  (batch.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
);
if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
  this.logger.warn(`Batch ${batch.batchNo} expires in ${daysUntilExpiry} days`);
}
```

**Estimated Time:** 15-20 minutes

- Add validation to 3 methods: 12-15 min
- Test each flow: 5 min

---

## Issues to SKIP (Production Concerns)

### ❌ Saga Pattern

**Reason:** Adds significant complexity for distributed transaction coordination
**Alternative:** Single database transactions are sufficient for academic scope

### ❌ Circuit Breaker

**Reason:** Fault tolerance pattern for microservices, unnecessary for monolithic academic project
**Alternative:** Basic try-catch error handling

### ❌ Event-Driven Architecture

**Reason:** Requires message queue infrastructure (RabbitMQ/Kafka), complex setup
**Alternative:** Direct service calls with proper error handling

### ❌ Distributed Tracing

**Reason:** Production-scale observability, requires Jaeger/Zipkin
**Alternative:** Structured logging with correlation IDs

### ❌ Advanced Monitoring

**Reason:** Real-time dashboards and metrics, requires Grafana/Prometheus
**Alternative:** Basic logging and database queries for demonstration

---

## Implementation Summary

| Task                      | Status     | Time Estimate   | Tests Impact           |
| ------------------------- | ---------- | --------------- | ---------------------- |
| Inventory Reservation     | ✅ DONE    | ~1.5 hours      | 34 tests updated       |
| Cache Invalidation Timing | ⏰ TODO    | ~25 minutes     | No test changes needed |
| Batch Expiry Validation   | 🟡 PARTIAL | ~20 minutes     | Minor test updates     |
| **Total Remaining**       | -          | **~45 minutes** | Minimal impact         |

---

## Testing Strategy

### Before Implementing Remaining Issues

```bash
cd backend
npm test -- --testPathPatterns="unit-test"
```

**Expected:** 423/423 passing ✅

### After Cache Invalidation Fix

1. Run unit tests: `npm test -- --testPathPatterns="unit-test"`
2. Check specific services: `npm test -- purchase-order.service.spec.ts`
3. Expected: No test failures (logic unchanged, only ordering changed)

### After Batch Expiry Validation

1. Run unit tests again
2. May need to add mock for `prisma.productBatch.findUnique()` in 2-3 test files
3. Expected: ~430 tests passing (minor additions)

---

## Database Migration Status

### Already Migrated ✅

- `20251217000000_add_location_to_sales_order_item` - Created manually

### To Apply

```bash
cd backend
npx prisma migrate dev
```

**Note:** DB must be running for migration. If not running:

1. Start DB: `docker-compose up -d postgres` (or local setup)
2. Run migration
3. Verify: `npx prisma studio` (optional GUI check)

---

## Final Deliverables

### Documentation Created ✅

1. `MODULE_DEPENDENCIES.md` - Cross-module dependency graph
2. `BUSINESS_FLOWS.md` - Purchase Order, Sales Order, Inventory Transfer flows
3. `CROSS_MODULE_PATTERNS.md` - Error handling, transactions, cache patterns
4. `INVENTORY_RESERVATION.md` - Complete implementation guide

### Code Changes ✅

1. Schema modification (`locationId` in `SalesOrderItem`)
2. Migration file created
3. DTO updated (`CreateSOItemDto`)
4. Service logic updated (`create`, `submit`, `cancel`, `fulfill`)
5. Unit tests updated (34 tests, all passing)

### Remaining Work

1. Cache invalidation timing fix (~25 min)
2. Batch expiry validation completion (~20 min)
3. Final integration test (~10 min)

**Total Time to Complete:** ~1 hour from current state

---

## Risk Assessment

### High Risk Issues - NOW RESOLVED ✅

- ~~Overselling due to no reservation~~ → **FIXED**

### Medium Risk Issues - TO BE RESOLVED

- Cache race conditions → **45 min to fix**
- Expired batch dispatch → **Partially fixed, 20 min remaining**

### Low Risk Issues - ACCEPTABLE FOR ACADEMIC PROJECT

- No distributed tracing → **Skip**
- No circuit breaker → **Skip**
- No event-driven architecture → **Skip**

---

## Conclusion

**Academic Project Readiness: 85%**

- ✅ Core functional correctness: DONE
- ⏰ Production-ready patterns: 45 minutes remaining
- ❌ Production-scale concerns: Intentionally skipped

**Recommendation:** Complete cache invalidation fix and batch expiry validation to reach 95% readiness for academic demonstration. The remaining 5% (production concerns) are explicitly out of scope.
