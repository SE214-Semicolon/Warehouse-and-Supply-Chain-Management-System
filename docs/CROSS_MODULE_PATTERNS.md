# Cross-Module Patterns & Best Practices

## Error Handling Patterns

### ✅ Standard Exception Usage

All services follow consistent exception patterns:

```typescript
// 1. NotFoundException - Resource not found (404)
if (!entity) {
  throw new NotFoundException(`Entity with ID "${id}" not found`);
}

// 2. BadRequestException - Invalid business rules (400)
if (quantity > available) {
  throw new BadRequestException("Insufficient quantity available");
}

// 3. ConflictException - Unique constraint violation (409)
if (existingCode) {
  throw new ConflictException(`Code "${code}" already exists`);
}
```

### Current Implementation Review

#### ✅ Good Practices Found

1. **Product Module**

   - Validates SKU uniqueness before insert
   - Checks category existence before assignment
   - Validates batch dates (expiry > manufacture)
   - Checks batch usage before deletion

2. **Inventory Module**

   - Validates entity existence (batch, location, user)
   - Checks stock availability before dispatch
   - Handles idempotency gracefully
   - Wraps Prisma errors properly

3. **Sales/Procurement Modules**
   - Validates status transitions
   - Checks quantity limits
   - Verifies item existence
   - Handles concurrent modifications

#### ⚠️ Issues Found

1. **Inconsistent Error Wrapping**

   ```typescript
   // ❌ Problem: Prisma error exposed to client
   catch (err) {
     throw err; // Exposes internal Prisma error
   }

   // ✅ Solution: Wrap and translate
   catch (err) {
     if (err instanceof Prisma.PrismaClientKnownRequestError) {
       if (err.code === 'P2002') {
         throw new ConflictException('Duplicate entry');
       }
     }
     throw new InternalServerErrorException('Operation failed');
   }
   ```

2. **Non-blocking Alerts Can Fail Silently**

   ```typescript
   // ⚠️ Current: Error only logged
   this.alertGenService
     .checkLowStockAlert(data)
     .catch((err) => this.logger.warn("Alert failed:", err));

   // ✅ Recommendation: Add retry + dead letter queue
   await this.alertQueue.add("low-stock", data, {
     attempts: 3,
     backoff: { type: "exponential", delay: 1000 },
   });
   ```

3. **Missing Validation in Cross-Module Calls**

   ```typescript
   // ❌ Problem: No validation before calling inventory
   await this.inventorySvc.receiveInventory(dto);
   await this.poRepo.receiveItems(poId, items); // Can fail!

   // ✅ Solution: Validate first, then execute
   const validation = await this.validateReceive(poId, dto);
   if (!validation.success) {
     throw new BadRequestException(validation.error);
   }
   // Now safe to proceed
   ```

## Cache Invalidation Patterns

### Current Strategy: Prefix-Based Invalidation

```typescript
// Standard pattern across all modules:
await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);
```

### ✅ Strengths

1. **Consistent Usage**

   - All write operations invalidate cache
   - Prefix-based approach simple and reliable
   - No risk of stale data

2. **Proper Timing**
   - Invalidation after successful transaction
   - No invalidation on error paths

### ⚠️ Potential Issues

1. **Cache Invalidation Not Transactional**

   ```typescript
   // ❌ Problem: Cache invalidated even if transaction rolls back
   try {
     const result = await this.repo.updateTx(data);
     await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);
     // If this fails, cache invalidated but DB unchanged!
     throw new Error("Some business logic error");
   } catch (err) {
     // Cache already invalidated
     throw err;
   }

   // ✅ Solution: Invalidate only on final success
   let result;
   try {
     result = await this.repo.updateTx(data);
     // ... all business logic ...
   } catch (err) {
     // Cache NOT invalidated
     throw err;
   }
   // Only invalidate if everything succeeded
   await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);
   return result;
   ```

2. **Over-Invalidation (Performance Impact)**

   ```typescript
   // ❌ Current: Invalidates ALL inventory cache
   await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);

   // ✅ Better: Invalidate only affected keys
   await this.cacheService.delete([
     `${CACHE_PREFIX.INVENTORY}:${locationId}`,
     `${CACHE_PREFIX.INVENTORY}:batch:${batchId}`,
     `${CACHE_PREFIX.INVENTORY}:location:${locationId}`,
   ]);
   ```

3. **Missing Cross-Module Cache Invalidation**

   ```typescript
   // ⚠️ Issue: PO receive doesn't invalidate product cache
   // But product availability might change!

   // Current in PurchaseOrderService:
   await this.inventorySvc.receiveInventory(dto); // Invalidates inventory
   // Missing: Product cache should also be invalidated

   // ✅ Solution: Service should know dependencies
   await this.cacheService.deleteByPrefix(CACHE_PREFIX.INVENTORY);
   await this.cacheService.deleteByPrefix(CACHE_PREFIX.PRODUCT);
   ```

## Transaction Boundary Patterns

### ✅ Well-Implemented Transactions

1. **Inventory Operations**

   ```typescript
   // receiveInventoryTx: UPSERT inventory + INSERT movement
   return this.prisma.$transaction(async (tx) => {
     const inventory = await tx.inventory.upsert({...});
     const movement = await tx.stockMovement.create({...});
     return { inventory, movement };
   });
   ```

2. **Purchase Order Receipt**

   ```typescript
   // receiveItems: UPDATE items + UPDATE PO status
   return this.prisma.$transaction(async (tx) => {
     for (const inc of increments) {
       await tx.purchaseOrderItem.update({...});
     }
     const updated = await tx.purchaseOrder.update({...});
     return updated;
   });
   ```

3. **Inventory Transfer**
   ```typescript
   // transferInventoryTx: 3 operations atomically
   return this.prisma.$transaction(async (tx) => {
     // 1. Deduct from source
     await tx.inventory.update({...});
     // 2. Add to destination
     await tx.inventory.upsert({...});
     // 3. Create movement records
     await tx.stockMovement.createMany({...});
   });
   ```

### ⚠️ Missing Transaction Boundaries

1. **Cross-Module Operations Not Transactional**

   ```typescript
   // ❌ Problem: Two separate transactions
   async receivePurchaseOrder(poId, dto) {
     // Transaction 1: Inventory update
     await this.inventorySvc.receiveInventory(dto);

     // Transaction 2: PO update (can fail!)
     await this.poRepo.receiveItems(poId, items);
   }

   // Result: Inventory updated but PO stuck in old state
   ```

2. **No Compensation Mechanism**
   ```typescript
   // ✅ Recommended: Saga Pattern
   async receivePurchaseOrderSaga(poId, dto) {
     const compensations = [];

     try {
       // Step 1: Receive inventory
       const invResult = await this.inventorySvc.receiveInventory(dto);
       compensations.push(async () => {
         await this.inventorySvc.rollbackReceive(invResult.movement.id);
       });

       // Step 2: Update PO
       await this.poRepo.receiveItems(poId, items);

       // Success - clear compensations
       return { success: true };
     } catch (error) {
       // Rollback all completed steps
       for (const compensate of compensations.reverse()) {
         await compensate().catch(err =>
           this.logger.error('Compensation failed:', err)
         );
       }
       throw error;
     }
   }
   ```

## Idempotency Patterns

### ✅ Well-Implemented Idempotency

All inventory operations support idempotency:

```typescript
// Pattern used consistently:
if (dto.idempotencyKey) {
  const existing = await this.repo.findMovementByKey(dto.idempotencyKey);
  if (existing) {
    return { success: true, idempotent: true, movement: existing };
  }
}

// Proceed with transaction...

try {
  // ... transaction logic ...
} catch (err) {
  // Handle race condition: key constraint violation
  if (dto.idempotencyKey && err.code === "P2002") {
    const existing = await this.repo.findMovementByKey(dto.idempotencyKey);
    if (existing)
      return { success: true, idempotent: true, movement: existing };
  }
  throw err;
}
```

### Key Benefits

1. **Prevents Duplicate Operations**

   - Receiving same PO item twice
   - Dispatching same inventory twice
   - Creating duplicate movements

2. **Handles Race Conditions**

   - Concurrent API calls with same key
   - Retries from client
   - Network failures

3. **Integration with PO/SO**
   - PO service checks `idempotent` flag
   - Skips incrementing qtyReceived if idempotent
   - Prevents over-counting

## Audit Logging Patterns

### Current Implementation

```typescript
// AuditContextInterceptor (Global)
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    return next.handle().pipe(
      tap((response) => {
        // Log to AuditLogService
        this.auditLogService.write({
          userId: user?.id,
          method,
          path: url,
          // ... other fields
        });
      })
    );
  }
}
```

### ✅ Strengths

1. **Non-Blocking**

   - Audit failures don't break business logic
   - Logged but not thrown

2. **Comprehensive**
   - Captures all HTTP requests
   - Includes user context, timestamps
   - Records before/after state

### ⚠️ Issues

1. **No Explicit Entity Tracking**

   ```typescript
   // ❌ Current: Generic HTTP logging
   // Missing: Specific entity changes

   // ✅ Recommended: Explicit audit calls
   await this.auditLogService.write({
     entityType: "Product",
     entityId: product.id,
     action: "UPDATE",
     before: oldProduct,
     after: newProduct,
     userId: user.id,
   });
   ```

2. **MongoDB Dependency**
   - If MongoDB is down, audit logs lost
   - No fallback mechanism
   - Consider: Write-ahead log + async processing

## Alert Generation Patterns

### Current Implementation

```typescript
// Non-blocking pattern:
this.alertGenService
  .checkLowStockAlert(data)
  .catch((err) => this.logger.warn("Alert failed:", err));
```

### ✅ Strengths

1. **Non-Blocking**

   - Doesn't delay main business flow
   - Errors logged but not thrown

2. **Async Processing**
   - Low stock alerts after dispatch
   - Expiry alerts via scheduled jobs

### ⚠️ Issues

1. **No Retry Mechanism**

   ```typescript
   // ✅ Recommended: Queue-based alerts
   @Injectable()
   export class AlertQueue {
     async enqueueAlert(type: string, data: any) {
       await this.queue.add(type, data, {
         attempts: 3,
         backoff: {
           type: "exponential",
           delay: 1000,
         },
       });
     }
   }
   ```

2. **No Dead Letter Queue**

   - Failed alerts lost forever
   - No visibility into failures
   - Consider: Store failed alerts for manual retry

3. **No Circuit Breaker**

   ```typescript
   // ✅ Recommended: Circuit breaker
   if (this.circuitBreaker.isOpen()) {
     this.logger.warn("Alert service circuit open, skipping");
     return;
   }

   try {
     await this.generateAlert(data);
     this.circuitBreaker.recordSuccess();
   } catch (err) {
     this.circuitBreaker.recordFailure();
     throw err;
   }
   ```

## Recommendations Summary

### High Priority (Must Fix)

1. ✅ **Implement Saga Pattern for Cross-Module Operations**

   - PO receive flow
   - SO fulfill flow
   - Add rollback/compensation logic

2. ✅ **Add Inventory Reservation**

   - Reserve stock when SO created
   - Release on cancellation
   - Auto-expire after timeout

3. ✅ **Fix Cache Invalidation Timing**
   - Invalidate only after final success
   - Consider granular invalidation
   - Add cross-module invalidation

### Medium Priority (Should Fix)

4. ✅ **Add Circuit Breaker for Alert Service**

   - Prevent cascading failures
   - Graceful degradation
   - Health monitoring

5. ✅ **Implement Retry Logic with Backoff**

   - For transient failures
   - Idempotent operations
   - External service calls

6. ✅ **Add Explicit Audit Logging**
   - Entity-level changes
   - Before/after state
   - Correlation IDs

### Low Priority (Nice to Have)

7. ✅ **Event-Driven Architecture**

   - Replace direct service calls
   - Use message queue
   - Enable async processing

8. ✅ **Add Distributed Tracing**

   - Track cross-module flows
   - Performance monitoring
   - Debugging support

9. ✅ **Implement Dead Letter Queue**
   - For failed alerts
   - Manual retry interface
   - Visibility dashboard

## Code Quality Metrics

### Current State

| Metric               | Status       | Notes                                         |
| -------------------- | ------------ | --------------------------------------------- |
| **Error Handling**   | 🟡 Good      | Consistent exceptions, needs wrapping         |
| **Transactions**     | 🟡 Good      | Atomic within modules, missing cross-module   |
| **Idempotency**      | 🟢 Excellent | Well-implemented, handles race conditions     |
| **Cache Strategy**   | 🟡 Good      | Consistent, but over-invalidation             |
| **Audit Logging**    | 🟠 Fair      | Generic HTTP logging, missing entity tracking |
| **Alert Generation** | 🟠 Fair      | Non-blocking, but no retry/circuit breaker    |
| **Module Coupling**  | 🟡 Moderate  | Clear dependencies, but tight coupling        |
| **Test Coverage**    | 🟢 Excellent | 579 unit tests, 100% pass rate                |

### Overall Assessment: 🟡 B+ (Good with Improvements Needed)

**Strengths:**

- ✅ Excellent test coverage
- ✅ Consistent patterns across modules
- ✅ Well-implemented idempotency
- ✅ Clear error handling

**Areas for Improvement:**

- ⚠️ Distributed transaction handling
- ⚠️ Inventory reservation mechanism
- ⚠️ Alert service resilience
- ⚠️ Cross-module cache invalidation

**Next Steps:**

1. Implement high-priority fixes (Saga, Reservation, Cache timing)
2. Add integration tests for failure scenarios
3. Set up monitoring for cross-module flows
4. Document failure recovery procedures
