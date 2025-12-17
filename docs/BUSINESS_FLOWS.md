# Business Flow Analysis

## Critical Business Flows

### 1. Purchase Order → Inventory Receipt Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Purchase Order Receipt Flow (Procurement → Inventory → Alerts)          │
└──────────────────────────────────────────────────────────────────────────┘

Step 1: PurchaseOrderService.receivePurchaseOrder()
  ├─ Validation:
  │   ├─ Check PO status (ordered or partial)
  │   ├─ Verify PO items exist
  │   └─ Validate quantity doesn't exceed ordered
  │
  ├─ Step 2: InventoryService.receiveInventory() [FOR EACH ITEM]
  │   ├─ Validations:
  │   │   ├─ ProductBatch exists (404 if not)
  │   │   ├─ Location exists (404 if not)
  │   │   └─ User exists (404 if not)
  │   │
  │   ├─ Idempotency Check:
  │   │   ├─ If idempotencyKey exists → Return existing movement
  │   │   └─ If not → Proceed to transaction
  │   │
  │   ├─ Transaction (receiveInventoryTx):
  │   │   ├─ UPSERT Inventory record:
  │   │   │   ├─ availableQty += quantity
  │   │   │   ├─ totalQty += quantity
  │   │   │   └─ Update updatedAt
  │   │   │
  │   │   └─ INSERT StockMovement:
  │   │       ├─ movementType = 'in'
  │   │       ├─ quantity = received quantity
  │   │       ├─ idempotencyKey = unique constraint
  │   │       └─ createdBy = userId
  │   │
  │   └─ Cache Invalidation:
  │       └─ deleteByPrefix(CACHE_PREFIX.INVENTORY)
  │
  └─ Step 3: Update PO Items & Status
      ├─ If ALL increments idempotent → Return current PO (no mutation)
      ├─ Else → Transaction (receiveItems):
      │   ├─ UPDATE PurchaseOrderItem.qtyReceived += qtyInc
      │   ├─ Calculate completion: qtyReceived === qtyOrdered?
      │   └─ UPDATE PurchaseOrder.status:
      │       ├─ All items received → status = 'completed'
      │       ├─ Some items received → status = 'partial'
      │       └─ Otherwise → status = 'ordered'
      │
      └─ Return updated PO

✅ Strengths:
  - Idempotency handled at BOTH levels (Inventory + PO)
  - Atomic transactions prevent partial updates
  - Over-receive validation before DB write
  - Cache invalidation after successful transaction

⚠️ Potential Issues:
  - No rollback mechanism if PO update fails after inventory received
  - Alert generation not triggered on receive (only on dispatch)
  - No distributed transaction between Inventory and PO
  - Race condition possible if multiple receives happen simultaneously
```

### 2. Sales Order → Fulfillment Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sales Order Fulfillment Flow (Sales → Inventory → Alerts)               │
└──────────────────────────────────────────────────────────────────────────┘

Step 1: SalesOrderService.createSalesOrder()
  ├─ Generate SO Number (SO-YYYYMM-XXXXXX)
  ├─ Create SalesOrder with status = 'pending'
  ├─ Create SalesOrderItems (qty, unitPrice, lineTotal)
  ├─ Calculate totals
  └─ No inventory reservation at this stage

Step 2: SalesOrderService.submitSalesOrder()
  ├─ Validate SO status = 'pending'
  ├─ Update status → 'approved'
  └─ Still no inventory impact

Step 3: SalesOrderService.fulfillSalesOrder()
  ├─ Validation:
  │   ├─ SO status must be 'approved' or 'processing'
  │   ├─ Verify all SO items exist
  │   └─ Check qtyToFulfill <= (qty - qtyFulfilled)
  │
  ├─ Step 4: InventoryService.dispatchInventory() [FOR EACH ITEM]
  │   ├─ Validations:
  │   │   ├─ ProductBatch exists (404 if not)
  │   │   ├─ Location exists (404 if not)
  │   │   └─ User exists (404 if not)
  │   │
  │   ├─ Idempotency Check:
  │   │   ├─ If idempotencyKey exists → Return existing movement
  │   │   └─ If not → Proceed to transaction
  │   │
  │   ├─ Transaction (dispatchInventoryTx):
  │   │   ├─ Check Stock Availability:
  │   │   │   └─ availableQty >= quantity (else throw NotEnoughStock)
  │   │   │
  │   │   ├─ UPDATE Inventory:
  │   │   │   ├─ availableQty -= quantity
  │   │   │   ├─ totalQty -= quantity
  │   │   │   └─ Update updatedAt
  │   │   │
  │   │   └─ INSERT StockMovement:
  │   │       ├─ movementType = 'out'
  │   │       ├─ quantity = dispatched quantity
  │   │       └─ idempotencyKey = unique constraint
  │   │
  │   ├─ Step 5: Alert Generation (Non-blocking)
  │   │   └─ alertGenService.checkLowStockAlert()
  │   │       ├─ Check if availableQty < threshold
  │   │       └─ Create Alert in MongoDB (async)
  │   │
  │   └─ Cache Invalidation:
  │       └─ deleteByPrefix(CACHE_PREFIX.INVENTORY)
  │
  └─ Step 6: Update SO Items & Status
      ├─ UPDATE SalesOrderItem.qtyFulfilled += qtyToFulfill
      ├─ Calculate completion:
      │   ├─ All items: qtyFulfilled >= qty → status = 'shipped'
      │   ├─ Some items: qtyFulfilled > 0 → status = 'processing'
      │   └─ Otherwise → keep current status
      │
      └─ Return updated SO

✅ Strengths:
  - Idempotency prevents duplicate dispatches
  - Stock validation before deduction
  - Low stock alerts triggered automatically
  - Partial fulfillment supported
  - Status tracking through lifecycle

⚠️ Potential Issues:
  - No inventory reservation at order creation
    → Risk: Stock sold out before fulfillment
  - No distributed transaction between Inventory and SO
    → Risk: Inventory deducted but SO update fails
  - Alert generation can fail silently (non-blocking)
  - No compensation mechanism for failed fulfillments
  - Race condition: Multiple fulfillments for same item
```

### 3. Inventory Transfer Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Inventory Transfer Flow (Location A → Location B)                        │
└──────────────────────────────────────────────────────────────────────────┘

InventoryService.transferInventory()
  ├─ Validations:
  │   ├─ ProductBatch exists
  │   ├─ Source Location exists
  │   ├─ Destination Location exists
  │   ├─ User exists
  │   └─ Source ≠ Destination
  │
  ├─ Idempotency Check:
  │   └─ If idempotencyKey exists → Return existing movement
  │
  └─ Transaction (transferInventoryTx):
      ├─ Check Stock at Source:
      │   └─ availableQty >= quantity (else throw NotEnoughStock)
      │
      ├─ UPDATE Inventory at Source:
      │   ├─ availableQty -= quantity
      │   ├─ totalQty -= quantity
      │   └─ Update updatedAt
      │
      ├─ UPSERT Inventory at Destination:
      │   ├─ availableQty += quantity
      │   ├─ totalQty += quantity
      │   └─ Update updatedAt
      │
      └─ INSERT 2 StockMovements:
          ├─ OUT movement from Source
          └─ IN movement to Destination

✅ Strengths:
  - Atomic transaction (Source + Destination + Movements)
  - Idempotency prevents duplicate transfers
  - Stock validation before transfer
  - Both movements recorded for audit trail

⚠️ Potential Issues:
  - No validation of destination capacity
  - No check for location compatibility (zone/type)
  - Transfer can create negative reservedQty inconsistency
```

## Error Handling Analysis

### Current Error Handling Patterns

#### 1. PurchaseOrderService

```typescript
✅ Good Practices:
- Validates PO status before operations
- Checks item existence before processing
- Validates quantity limits
- Custom error messages for business rules

⚠️ Issues Found:
- No transaction rollback if inventory succeeds but PO update fails
- Error messages from repository not always wrapped
- Some validations happen after calling InventoryService
```

#### 2. SalesOrderService

```typescript
✅ Good Practices:
- Validates SO status transitions
- Checks fulfillment quantity limits
- Idempotency handled at inventory layer
- Status recalculation logic

⚠️ Issues Found:
- No reservation mechanism (stock can be oversold)
- Fulfillment errors don't rollback inventory deductions
- Missing validation for productBatch availability
- No check for expired batches
```

#### 3. InventoryService

```typescript
✅ Good Practices:
- Comprehensive existence validations
- Idempotency pattern implemented correctly
- Transaction wrapper for atomic operations
- NotEnoughStock error properly thrown
- Cache invalidation after successful operations
- Non-blocking alert generation with error handling

⚠️ Issues Found:
- Alert generation failures logged but not retried
- No circuit breaker for alert service
- Cache invalidation not rolled back on error
```

## Transaction Boundary Analysis

### ✅ Properly Transactional Operations

1. **InventoryRepository.receiveInventoryTx()**

   - UPSERT Inventory + INSERT StockMovement
   - Atomic guarantee via Prisma $transaction

2. **InventoryRepository.dispatchInventoryTx()**

   - Stock check + UPDATE Inventory + INSERT StockMovement
   - Atomic guarantee via Prisma $transaction

3. **InventoryRepository.transferInventoryTx()**

   - UPDATE Source + UPSERT Destination + INSERT 2 Movements
   - Atomic guarantee via Prisma $transaction

4. **PurchaseOrderRepository.receiveItems()**
   - UPDATE Items + UPDATE PO Status
   - Atomic guarantee via Prisma $transaction

### ⚠️ Missing Transaction Boundaries

1. **PurchaseOrder.receive() → Inventory.receive()**

   - Problem: Two separate transactions
   - Risk: Inventory updated but PO update fails
   - Recommendation: Saga pattern or compensation logic

2. **SalesOrder.fulfill() → Inventory.dispatch()**

   - Problem: Two separate transactions
   - Risk: Inventory deducted but SO update fails
   - Recommendation: Two-phase commit or event-driven

3. **Cache Invalidation**
   - Problem: Not part of transaction
   - Risk: Cache invalidated but operation fails
   - Recommendation: Invalidate only on successful commit

## Recommendations

### High Priority Fixes

1. **Implement Saga Pattern for Cross-Module Operations**

   ```typescript
   // Example: PurchaseOrder Receipt Saga
   class POReceiptSaga {
     async execute(poId, items) {
       const compensations = [];
       try {
         // Step 1: Receive inventory
         const invResults = await inventorySvc.receiveInventory(items);
         compensations.push(() => inventorySvc.rollbackReceive(invResults));

         // Step 2: Update PO
         await poRepo.receiveItems(poId, items);

         // Success: Clear compensations
         compensations = [];
       } catch (error) {
         // Rollback all completed steps
         for (const compensate of compensations.reverse()) {
           await compensate();
         }
         throw error;
       }
     }
   }
   ```

2. **Add Inventory Reservation for Sales Orders**

   ```typescript
   async createSalesOrder(dto) {
     // Reserve inventory immediately
     for (const item of dto.items) {
       await inventorySvc.reserveInventory({
         productBatchId: item.productBatchId,
         locationId: item.locationId,
         quantity: item.qty,
         reservationKey: `SO-${soNo}-${item.productId}`
       });
     }
     // Create SO with reserved flag
   }
   ```

3. **Implement Circuit Breaker for Alert Service**
   ```typescript
   class AlertServiceCircuitBreaker {
     private failureCount = 0;
     private lastFailureTime?: Date;
     private readonly threshold = 5;
     private readonly timeout = 60000; // 1 minute

     async call(fn: () => Promise<void>) {
       if (this.isOpen()) {
         this.logger.warn("Circuit breaker OPEN, skipping alert");
         return;
       }

       try {
         await fn();
         this.reset();
       } catch (error) {
         this.recordFailure();
         throw error;
       }
     }
   }
   ```

### Medium Priority Improvements

4. **Add Distributed Tracing**

   - Use correlation IDs across service calls
   - Track request flow through multiple services
   - Enable debugging of cross-module failures

5. **Implement Retry Logic with Exponential Backoff**

   ```typescript
   async dispatchWithRetry(dto, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await this.dispatchInventory(dto);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await this.delay(Math.pow(2, i) * 1000);
       }
     }
   }
   ```

6. **Add Validation for Business Rules**
   - Check batch expiry before dispatch
   - Validate location capacity before receive
   - Check warehouse/location compatibility for transfers

### Low Priority Enhancements

7. **Event-Driven Architecture**

   - Replace direct service calls with events
   - Use NestJS EventEmitter or external queue
   - Enable loose coupling and better scalability

8. **Add Compensation Endpoints**
   - Create rollback APIs for failed operations
   - Enable manual intervention for stuck transactions
   - Provide admin tools for data reconciliation

## Conclusion

### Overall System Health: 🟡 Good with Risks

**Strengths:**

- ✅ Idempotency well implemented
- ✅ Atomic transactions within modules
- ✅ Clear error messages
- ✅ Cache invalidation strategy

**Critical Risks:**

- 🔴 No distributed transactions across modules
- 🔴 No inventory reservation mechanism
- 🔴 Missing rollback/compensation logic
- 🟠 Alert service failures can be silent
- 🟠 Race conditions possible in concurrent operations

**Next Steps:**

1. Implement Saga pattern for PO receive and SO fulfill
2. Add inventory reservation for sales orders
3. Add circuit breaker for alert service
4. Implement distributed tracing
5. Add comprehensive integration tests for failure scenarios
