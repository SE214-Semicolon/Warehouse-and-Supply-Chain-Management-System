# Inventory Module API Testing Guide

This guide provides comprehensive documentation for testing the inventory management APIs. All endpoints require authentication with a JWT token obtained from the login endpoint.

## Prerequisites

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations:**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

3. **Seed test data:**
   ```bash
   npm run prisma:seed
   ```

4. **Start backend server:**
   ```bash
   npm run start:dev
   ```

## Authentication

First, authenticate to get a JWT token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Use the returned `accessToken` in the `Authorization: Bearer <token>` header for all subsequent requests.

## Test Data Overview

The seed data creates:
- **3 Users**: admin, manager, staff
- **2 Warehouses**: Main (MAIN), Secondary (SEC)
- **4 Locations**: A-01, A-02, B-01 (Main), C-01 (Secondary)
- **3 Categories**: Electronics, Clothing, Food & Beverages
- **5 Products** with different unit costs
- **5 Product Batches** with various expiry dates
- **5 Inventory Records** with different stock levels
- **6 Stock Movements** (historical data)

### Test Accounts

| Username | Password  | Role          | Description |
|----------|-----------|---------------|-------------|
| admin    | admin123  | admin         | Full system access |
| manager  | manager123| manager       | Warehouse management |
| staff    | staff123  | warehouse_staff | Basic warehouse operations |

### Key Test Data IDs

| Product SKU | Name | Unit Cost | Location | Available | Reserved | Batch ID |
|-------------|------|-----------|----------|-----------|----------|----------|
| LAPTOP-001 | Business Laptop | $1200 | A-01 | 25 | 5 | L2024-001 |
| PHONE-001 | Smartphone | $800 | A-02 | 75 | 10 | P2024-001 |
| TSHIRT-001 | Cotton T-Shirt | $15 | B-01 | 3 | 0 | T2024-001 |
| MILK-001 | Fresh Milk | $2.50 | A-01 | 150 | 20 | M2024-001 |
| BREAD-001 | Whole Wheat Bread | $3.00 | C-01 | 15 | 0 | B2024-001 |

## API Endpoints

### Core Inventory Operations

#### 1. Receive Inventory (Purchase Receipt)

**Endpoint:** `POST /inventory/receive`

**Description:** Add new stock to inventory through purchase receipt.

**Request Body:**
```json
{
  "productBatchId": "L2024-001",
  "locationId": "A-01",
  "quantity": 10,
  "createdById": "user-uuid",
  "idempotencyKey": "receipt-001",
  "note": "New laptop delivery"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/inventory/receive \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productBatchId": "L2024-001",
    "locationId": "A-01",
    "quantity": 10,
    "createdById": "user-uuid",
    "idempotencyKey": "receipt-001"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "inventory": {
    "id": "inv-uuid",
    "productBatchId": "L2024-001",
    "locationId": "A-01",
    "availableQty": 35,
    "reservedQty": 5,
    "updatedAt": "2025-10-12T08:24:50.000Z"
  },
  "movement": {
    "id": "move-uuid",
    "movementType": "purchase_receipt",
    "quantity": 10,
    "toLocationId": "A-01",
    "createdById": "user-uuid",
    "createdAt": "2025-10-12T08:24:50.000Z"
  }
}
```

#### 2. Dispatch Inventory (Sale Issue)

**Endpoint:** `POST /inventory/dispatch`

**Description:** Remove stock from inventory for sales.

**Request Body:**
```json
{
  "productBatchId": "PHONE-001",
  "locationId": "A-02",
  "quantity": 5,
  "createdById": "user-uuid",
  "idempotencyKey": "dispatch-001",
  "note": "Customer order fulfillment"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/inventory/dispatch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productBatchId": "PHONE-001",
    "locationId": "A-02",
    "quantity": 5,
    "createdById": "user-uuid",
    "idempotencyKey": "dispatch-001"
  }'
```

#### 3. Adjust Inventory

**Endpoint:** `POST /inventory/adjust`

**Description:** Manually adjust inventory quantities (positive or negative adjustments).

**Request Body:**
```json
{
  "productBatchId": "TSHIRT-001",
  "locationId": "B-01",
  "adjustmentQuantity": 2,
  "createdById": "user-uuid",
  "idempotencyKey": "adjust-001",
  "reason": "count_error",
  "note": "Found 2 extra items during physical count"
}
```

#### 4. Transfer Inventory

**Endpoint:** `POST /inventory/transfer`

**Description:** Move stock between locations.

**Request Body:**
```json
{
  "productBatchId": "LAPTOP-001",
  "fromLocationId": "A-01",
  "toLocationId": "A-02",
  "quantity": 5,
  "createdById": "user-uuid",
  "idempotencyKey": "transfer-001",
  "note": "Moving stock to different warehouse section"
}
```

#### 5. Reserve Inventory

**Endpoint:** `POST /inventory/reserve`

**Description:** Reserve stock for pending orders.

**Request Body:**
```json
{
  "productBatchId": "PHONE-001",
  "locationId": "A-02",
  "quantity": 2,
  "orderId": "ORDER-001",
  "createdById": "user-uuid",
  "idempotencyKey": "reserve-001",
  "note": "Reserving stock for order #12345"
}
```

#### 6. Release Reservation

**Endpoint:** `POST /inventory/release`

**Description:** Release previously reserved stock.

**Request Body:**
```json
{
  "productBatchId": "PHONE-001",
  "locationId": "A-02",
  "orderId": "ORDER-001",
  "quantity": 2,
  "createdById": "user-uuid",
  "idempotencyKey": "release-001",
  "note": "Order cancelled, releasing reserved stock"
}
```

### Query Operations

#### 7. Get Inventory by Location

**Endpoint:** `GET /inventory/location`

**Description:** Query inventory items in a specific location.

**Query Parameters:**
- `locationId` (required): Location UUID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'productBatchId')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'asc')

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/location?locationId=A-01&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### 8. Get Inventory by Product Batch

**Endpoint:** `GET /inventory/product-batch`

**Description:** Query inventory for a specific product batch across all locations.

**Query Parameters:**
- `productBatchId` (required): Product batch UUID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'locationId')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'asc')

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/product-batch?productBatchId=L2024-001" \
  -H "Authorization: Bearer <token>"
```

#### 9. Update Inventory Quantities

**Endpoint:** `POST /inventory/:productBatchId/:locationId/update-quantity`

**Description:** Directly update available and reserved quantities.

**Request Body:**
```json
{
  "availableQty": 100,
  "reservedQty": 0,
  "updatedById": "user-uuid",
  "reason": "manual_count",
  "note": "Physical inventory count adjustment"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/inventory/L2024-001/A-01/update-quantity" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "availableQty": 100,
    "reservedQty": 0,
    "updatedById": "user-uuid"
  }'
```

#### 10. Soft Delete Inventory

**Endpoint:** `DELETE /inventory/:productBatchId/:locationId`

**Description:** Soft delete an inventory record.

**Example:**
```bash
curl -X DELETE "http://localhost:3000/inventory/L2024-001/A-01" \
  -H "Authorization: Bearer <token>"
```

### Alert Operations

#### 11. Low Stock Alerts

**Endpoint:** `GET /inventory/alerts/low-stock`

**Description:** Get inventory items below the threshold level.

**Query Parameters:**
- `threshold` (optional): Low stock threshold (default: 10)
- `locationId` (optional): Filter by location
- `productId` (optional): Filter by product
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'availableQty')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'asc')

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/alerts/low-stock?threshold=5" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "inventories": [
    {
      "id": "inv-uuid",
      "productBatchId": "T2024-001",
      "locationId": "B-01",
      "availableQty": 3,
      "reservedQty": 0,
      "updatedAt": "2025-10-12T08:24:50.000Z",
      "productBatch": {
        "id": "T2024-001",
        "batchNo": "T2024-001",
        "product": {
          "sku": "TSHIRT-001",
          "name": "Cotton T-Shirt"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### 12. Expiry Alerts

**Endpoint:** `GET /inventory/alerts/expiry`

**Description:** Get inventory items expiring within the threshold days.

**Query Parameters:**
- `threshold` (optional): Days until expiry (default: 30)
- `locationId` (optional): Filter by location
- `productId` (optional): Filter by product
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'productBatch')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'asc')

**Example - Expiring soon:**
```bash
curl -X GET "http://localhost:3000/inventory/alerts/expiry?threshold=30" \
  -H "Authorization: Bearer <token>"
```

**Example - Already expired:**
```bash
curl -X GET "http://localhost:3000/inventory/alerts/expiry?threshold=0" \
  -H "Authorization: Bearer <token>"
```

### Reporting Operations

#### 13. Stock Level Report

**Endpoint:** `GET /inventory/reports/stock-levels`

**Description:** Generate stock level reports grouped by category, location, or product.

**Query Parameters:**
- `locationId` (optional): Filter by location
- `productId` (optional): Filter by product
- `groupBy` (optional): 'category', 'location', or 'product' (default: 'location')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/reports/stock-levels?groupBy=location" \
  -H "Authorization: Bearer <token>"
```

#### 14. Movement Report

**Endpoint:** `GET /inventory/reports/movements`

**Description:** Generate movement history reports.

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `locationId` (optional): Filter by location
- `productId` (optional): Filter by product
- `movementType` (optional): Filter by movement type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'createdAt')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'desc')

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/reports/movements?startDate=2024-01-01&movementType=purchase_receipt" \
  -H "Authorization: Bearer <token>"
```

#### 15. Inventory Valuation Report

**Endpoint:** `GET /inventory/reports/valuation`

**Description:** Generate inventory valuation reports using different costing methods.

**Query Parameters:**
- `locationId` (optional): Filter by location
- `productId` (optional): Filter by product
- `method` (optional): 'FIFO', 'LIFO', or 'AVERAGE' (default: 'AVERAGE')
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example:**
```bash
curl -X GET "http://localhost:3000/inventory/reports/valuation?method=AVERAGE" \
  -H "Authorization: Bearer <token>"
```

## Testing Scenarios

### 1. Low Stock Alert Testing
- **Product**: TSHIRT-001 (Cotton T-Shirt)
- **Current Stock**: 3 units (below default threshold of 10)
- **Test**: `GET /inventory/alerts/low-stock`

### 2. Expiry Alert Testing
- **Expiring Soon**: MILK-001 (expires in 15 days)
- **Already Expired**: BREAD-001 (expired 5 days ago)
- **Test**: `GET /inventory/alerts/expiry?threshold=30`

### 3. Stock Transfer Testing
Transfer items between locations:
```bash
# Transfer 5 laptops from A-01 to A-02
curl -X POST http://localhost:3000/inventory/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productBatchId": "L2024-001",
    "fromLocationId": "A-01",
    "toLocationId": "A-02",
    "quantity": 5,
    "createdById": "user-uuid",
    "idempotencyKey": "transfer-test-001"
  }'
```

### 4. Reservation System Testing
Reserve and release stock for orders:
```bash
# Reserve 2 smartphones
curl -X POST http://localhost:3000/inventory/reserve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productBatchId": "P2024-001",
    "locationId": "A-02",
    "quantity": 2,
    "orderId": "ORDER-TEST-001",
    "createdById": "user-uuid",
    "idempotencyKey": "reserve-test-001"
  }'

# Release the reservation
curl -X POST http://localhost:3000/inventory/release \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productBatchId": "P2024-001",
    "locationId": "A-02",
    "orderId": "ORDER-TEST-001",
    "quantity": 2,
    "createdById": "user-uuid",
    "idempotencyKey": "release-test-001"
  }'
```

## Error Handling

### Common HTTP Status Codes
- **200**: Success (idempotent operations)
- **201**: Created (new resources)
- **400**: Bad Request (validation errors)
- **404**: Not Found (invalid IDs)
- **409**: Conflict (concurrency issues, idempotency conflicts)
- **500**: Internal Server Error

### Common Error Scenarios
1. **Invalid UUIDs**: Using non-existent product batch or location IDs
2. **Insufficient Stock**: Trying to dispatch/transfer more than available
3. **Invalid Quantities**: Negative numbers or zero adjustments
4. **Idempotency Conflicts**: Same idempotency key used twice quickly
5. **Permission Issues**: Using wrong user roles for operations

## Testing Tips

1. **Use Swagger UI**: Visit `http://localhost:3000/api` for interactive API documentation
2. **Monitor Logs**: Check backend console for detailed operation logs
3. **Database Inspection**: Use pgAdmin at `http://localhost:5050` to inspect data changes
4. **Test Edge Cases**: Try operations with insufficient stock, invalid IDs, etc.
5. **Role Testing**: Test with different user roles to verify permissions
6. **Idempotency Testing**: Send the same request multiple times to verify idempotent behavior

## Resetting Test Data

To reset the database and re-seed:

```bash
cd backend
npm run prisma:migrate reset --force
npm run prisma:seed
```

This gives you a fresh database with all test scenarios ready to explore!