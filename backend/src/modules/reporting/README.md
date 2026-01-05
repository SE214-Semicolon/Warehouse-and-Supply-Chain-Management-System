# Reporting & Analytics Module

## Overview

Business intelligence and analytics system providing comprehensive reports across inventory, product performance, warehouse utilization, and demand forecasting. Aggregates data from multiple modules to deliver actionable insights for decision-making.

**Purpose:** Enable data-driven decisions through real-time reporting and historical analysis.

## Features

- **8 Report Types:** Inventory (5), Product (1), Warehouse (1), Demand Planning (1)
- **Real-Time Data:** Live queries from PostgreSQL with Redis caching
- **Advanced Metrics:** Turnover rates, utilization percentages, forecast accuracy
- **Flexible Filtering:** Date ranges, locations, products, warehouses
- **Pagination Support:** Handle large datasets efficiently
- **RBAC Protected:** Role-based access to financial and operational reports

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs`

#### Inventory Reports

| Method | Endpoint                          | Auth                           | Description                                   |
| ------ | --------------------------------- | ------------------------------ | --------------------------------------------- |
| GET    | `/reports/inventory/low-stock`    | Admin, Manager, Staff, Analyst | Items below minimum stock threshold           |
| GET    | `/reports/inventory/expiry`       | Admin, Manager, Staff, Analyst | Products expiring within N days               |
| GET    | `/reports/inventory/stock-levels` | Admin, Manager, Staff, Analyst | Aggregated stock by category/location/product |
| GET    | `/reports/inventory/movements`    | Admin, Manager, Staff, Analyst | Historical stock movements                    |
| GET    | `/reports/inventory/valuation`    | Admin, Manager, Analyst        | Inventory valuation (FIFO/LIFO/AVERAGE)       |

#### Product Reports

| Method | Endpoint                       | Auth                    | Description                               |
| ------ | ------------------------------ | ----------------------- | ----------------------------------------- |
| GET    | `/reports/product/performance` | Admin, Manager, Analyst | Product turnover rate, movement frequency |

#### Warehouse Reports

| Method | Endpoint                         | Auth                           | Description                              |
| ------ | -------------------------------- | ------------------------------ | ---------------------------------------- |
| GET    | `/reports/warehouse/utilization` | Admin, Manager, Staff, Analyst | Warehouse capacity usage, occupancy rate |

#### Demand Planning Reports

| Method | Endpoint                            | Auth                                        | Description                           |
| ------ | ----------------------------------- | ------------------------------------------- | ------------------------------------- |
| GET    | `/reports/demand-planning/accuracy` | Admin, Manager, Procurement, Sales, Analyst | Forecast accuracy metrics (MAE, MAPE) |

### Query Parameters

**Common Parameters (all reports):**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `locationId` (UUID): Filter by location
- `productId` (UUID): Filter by product

**Report-Specific Parameters:**

| Report                | Additional Parameters                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| Low Stock             | `threshold` (number): Stock threshold (default: 10)                      |
| Expiry                | `daysAhead` (number): Days to check ahead (default: 30, max: 365)        |
| Stock Levels          | `groupBy` (string): Group by 'category', 'location', or 'product'        |
| Movements             | `startDate`, `endDate` (ISO 8601), `movementType`, `sortBy`, `sortOrder` |
| Valuation             | `method` (string): 'FIFO', 'LIFO', or 'AVERAGE'                          |
| Product Performance   | `categoryId` (UUID), `startDate`, `endDate`, `sortBy`, `sortOrder`       |
| Warehouse Utilization | `warehouseId` (UUID), `sortBy`, `sortOrder`                              |
| Forecast Accuracy     | `startDate`, `endDate`, `sortBy`, `sortOrder`                            |

### Dependencies

**Uses:**

- `InventoryModule` - Reuse inventory reporting methods (low stock, expiry, stock levels, movements, valuation)
- `ProductModule` - Product data for performance analysis
- `WarehouseModule` - Warehouse/location data for utilization
- `DemandPlanningModule` - Forecast data for accuracy metrics
- `PrismaModule` - PostgreSQL database access
- `CacheModule` - Redis caching (30-min TTL)

**Used by:** None (standalone reporting system)

## Architecture

### Components

```
reporting/
├── controllers/
│   ├── inventory-reporting.controller.ts     # 5 endpoints
│   ├── product-reporting.controller.ts       # 1 endpoint
│   ├── warehouse-reporting.controller.ts     # 1 endpoint
│   └── demand-planning-reporting.controller.ts # 1 endpoint
├── services/
│   ├── inventory-reporting.service.ts        # Delegates to InventoryService
│   ├── product-reporting.service.ts          # Product performance analytics
│   ├── warehouse-reporting.service.ts        # Warehouse utilization analytics
│   └── demand-planning-reporting.service.ts  # Forecast accuracy analytics
├── dto/                                      # Request validation
│   ├── inventory-report.dto.ts              # 5 DTOs
│   ├── product-report.dto.ts                # 1 DTO
│   ├── warehouse-report.dto.ts              # 1 DTO
│   └── demand-planning-report.dto.ts        # 1 DTO
└── README.md
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, caching, data aggregation
- **DTOs:** Query parameter validation, pagination

### Design Decisions

**Why Separate from Source Modules?**

- **DDD Compliance:** Reporting is a distinct bounded context
- **Cross-Module Analytics:** Aggregates data from multiple sources
- **Future Scalability:** Can be extracted to dedicated reporting service

**Why Delegate Inventory Reports?**

- **Code Reuse:** InventoryService already has reporting logic
- **No Duplication:** Avoids maintaining duplicate queries
- **Cache Layer:** Adds caching on top of existing methods

**Why Redis Caching?**

- **Medium TTL (30 mins):** Balance freshness with performance
- **Query-Based Keys:** Cache by filters, pagination
- **Invalidation:** Cache cleared on data mutations (handled by source modules)

**Why New Analytics for Product/Warehouse/Forecast?**

- **Complex Calculations:** Turnover rates, utilization %, accuracy metrics
- **Cross-Table Aggregation:** Join multiple tables for insights
- **Business Logic:** Domain-specific formulas (MAE, MAPE, occupancy rate)

## Report Details

### 1. Low Stock Report

**Endpoint:** `GET /reports/inventory/low-stock?threshold=10&page=1&limit=20`

**Purpose:** Identify inventory items below minimum stock levels

**Logic:**

- Query: `Inventory WHERE availableQty <= Product.minStockLevel * (threshold%)`
- Default threshold: 10 (show items at or below minStockLevel)
- Includes: Product info, location, current quantity

**Response:**

```json
{
  "success": true,
  "inventories": [
    {
      "id": "inv-uuid",
      "availableQty": 5,
      "productBatch": {
        "product": { "sku": "PROD-001", "name": "Widget A", "minStockLevel": 20 }
      },
      "location": { "code": "A-01-R1-B3", "name": "Rack 1" }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 2. Expiry Report

**Endpoint:** `GET /reports/inventory/expiry?daysAhead=30&page=1&limit=20`

**Purpose:** Identify products expiring soon

**Logic:**

- Query: `ProductBatch WHERE expiryDate BETWEEN now() AND now() + daysAhead`
- Default: 30 days ahead
- Includes: Product info, batch details, expiry date

**Response:**

```json
{
  "success": true,
  "inventories": [
    {
      "productBatch": {
        "batchNo": "BATCH-2025-01",
        "expiryDate": "2025-01-15",
        "product": { "name": "Milk Carton" }
      },
      "availableQty": 50
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

---

### 3. Stock Level Report

**Endpoint:** `GET /reports/inventory/stock-levels?groupBy=location&page=1&limit=20`

**Purpose:** Aggregated inventory summary

**Logic:**

- Group by: `category`, `location`, or `product`
- Aggregates: Total quantity, reserved quantity, available quantity
- Includes: Location/category/product details

**Response:**

```json
{
  "success": true,
  "groupedData": [
    {
      "groupKey": "Warehouse A - Zone 1",
      "totalQuantity": 1500,
      "totalAvailable": 1200,
      "totalReserved": 300,
      "items": [...]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

### 4. Movement Report

**Endpoint:** `GET /reports/inventory/movements?startDate=2025-01-01&endDate=2025-12-31&movementType=purchase_receipt&page=1&limit=20`

**Purpose:** Historical stock movement analysis

**Logic:**

- Query: `StockMovement` filtered by date range, type, location, product
- Movement types: purchase_receipt, sale_issue, adjustment, transfer_in/out, etc.
- **Transfers are grouped by default**: transfer_in and transfer_out created as part of the same transfer are returned as a single `movement` with `movementType: 'transfer'` and both `fromLocation` and `toLocation` present.
- Sorting: By createdAt (default desc)

**Response:**

```json
{
  "success": true,
  "movements": [
    {
      "id": "mov-uuid",
      "movementType": "purchase_receipt",
      "quantity": 100,
      "createdAt": "2025-06-15T10:00:00Z",
      "productBatch": { "product": { "name": "Widget A" } },
      "fromLocation": null,
      "toLocation": { "code": "A-01-R1-B3" }
    }
  ],
  "total": 342,
  "page": 1,
  "limit": 20
}
```

---

### 5. Valuation Report

**Endpoint:** `GET /reports/inventory/valuation?method=AVERAGE&page=1&limit=20`

**Purpose:** Calculate inventory monetary value

**Logic:**

- Methods: FIFO (First In First Out), LIFO (Last In First Out), AVERAGE
- Calculates: Unit cost × quantity
- Aggregates: Grand total valuation

**Response:**

```json
{
  "success": true,
  "valuationData": [
    {
      "productId": "prod-uuid",
      "productName": "Widget A",
      "totalQuantity": 500,
      "averageUnitCost": 25.5,
      "totalValue": 12750.0
    }
  ],
  "grandTotal": 125000.0,
  "method": "AVERAGE",
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### 6. Product Performance Report

**Endpoint:** `GET /reports/product/performance?startDate=2025-01-01&endDate=2025-12-31&sortBy=turnoverRate&page=1&limit=20`

**Purpose:** Analyze product movement efficiency

**Metrics:**

- **Turnover Rate:** Total quantity moved ÷ days in period
- **Movement Frequency:** Number of movements ÷ days in period
- **Total Movements:** Count of stock movements
- **Total Quantity:** Sum of all movements

**Logic:**

- Query: `StockMovement` grouped by product
- Calculate: Turnover and frequency metrics
- Sort: By turnoverRate, movementFrequency, or totalMovements

**Response:**

```json
{
  "success": true,
  "performanceData": [
    {
      "productId": "prod-uuid",
      "productSku": "PROD-001",
      "productName": "Widget A",
      "categoryName": "Electronics",
      "totalMovements": 45,
      "totalQuantity": 1200,
      "turnoverRate": 40.0,
      "movementFrequency": 1.5,
      "daysInPeriod": 30
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }
}
```

---

### 7. Warehouse Utilization Report

**Endpoint:** `GET /reports/warehouse/utilization?warehouseId=wh-uuid&page=1&limit=20`

**Purpose:** Monitor warehouse capacity and space usage

**Metrics:**

- **Utilization Rate:** (Used capacity ÷ Total capacity) × 100
- **Occupancy Rate:** (Occupied locations ÷ Total locations) × 100
- **Available Capacity:** Total capacity - Used capacity

**Logic:**

- Query: Warehouse + Locations + Inventory
- Aggregate: Capacity from all locations
- Calculate: Current occupancy from inventory quantities

**Response:**

```json
{
  "success": true,
  "utilizationData": [
    {
      "warehouseId": "wh-uuid",
      "warehouseCode": "WH-001",
      "warehouseName": "Main Warehouse",
      "totalCapacity": 10000,
      "usedCapacity": 7500,
      "availableCapacity": 2500,
      "utilizationRate": 75.0,
      "locationCount": 100,
      "occupiedLocationCount": 78,
      "occupancyRate": 78.0
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### 8. Forecast Accuracy Report

**Endpoint:** `GET /reports/demand-planning/accuracy?productId=prod-uuid&startDate=2025-01-01&endDate=2025-12-31&page=1&limit=20`

**Purpose:** Evaluate demand forecasting accuracy

**Metrics:**

- **MAE (Mean Absolute Error):** Average of |forecast - actual|
- **MAPE (Mean Absolute Percentage Error):** (MAE ÷ actual) × 100
- **Accuracy:** 100% - MAPE

**Logic:**

- Query: `DemandForecast` joined with actual `StockMovement` (sale_issue)
- Compare: Forecasted quantity vs actual sales on same date
- Calculate: Error, absolute error, percentage error, accuracy

**Response:**

```json
{
  "success": true,
  "accuracyData": [
    {
      "forecastId": "fc-uuid",
      "productId": "prod-uuid",
      "productSku": "PROD-001",
      "productName": "Widget A",
      "forecastDate": "2025-06-15",
      "forecastedQuantity": 100,
      "actualQuantity": 95,
      "error": 5,
      "absoluteError": 5,
      "percentageError": 5.26,
      "accuracy": 94.74,
      "algorithmUsed": "SIMPLE_MOVING_AVERAGE"
    }
  ],
  "summaryStats": {
    "totalForecasts": 30,
    "averageAccuracy": 92.5,
    "averageMAE": 7.5,
    "averageMAPE": 7.5
  },
  "total": 30,
  "page": 1,
  "limit": 20
}
```

---

## Business Rules

### 1. RBAC Enforcement

| Report Type           | Admin | Manager | Staff   | Procurement | Sales   | Logistics | Analyst |
| --------------------- | ----- | ------- | ------- | ----------- | ------- | --------- | ------- |
| Low Stock             | ✅    | ✅      | ✅ View | ❌          | ❌      | ❌        | ✅ View |
| Expiry                | ✅    | ✅      | ✅ View | ❌          | ❌      | ❌        | ✅ View |
| Stock Levels          | ✅    | ✅      | ✅ View | ❌          | ❌      | ❌        | ✅ View |
| Movements             | ✅    | ✅      | ✅ View | ❌          | ❌      | ❌        | ✅ View |
| **Valuation**         | ✅    | ✅      | ❌      | ❌          | ❌      | ❌        | ✅ View |
| Product Performance   | ✅    | ✅      | ❌      | ❌          | ❌      | ❌        | ✅ View |
| Warehouse Utilization | ✅    | ✅      | ✅ View | ❌          | ❌      | ❌        | ✅ View |
| Forecast Accuracy     | ✅    | ✅      | ❌      | ✅ View     | ✅ View | ❌        | ✅ Full |

**Key Rules:**

- **Valuation:** Restricted to Admin, Manager, Analyst (financial data)
- **Forecast Accuracy:** Procurement and Sales have read access (planning purposes)
- **Analyst:** Full read access to all reports for data analysis

### 2. Caching Strategy

- **TTL:** 30 minutes (MEDIUM)
- **Cache Key:** Prefix + Report type + Query parameters
- **Invalidation:** Automatic expiration (no manual invalidation from Reporting module)
- **Source Modules:** Handle cache invalidation on data mutations

### 3. Pagination Limits

- **Default Page:** 1
- **Default Limit:** 20 items
- **Max Limit:** 100 items (prevent memory overflow)
- **Validation:** Page ≥ 1, Limit 1-100

### 4. Date Range Defaults

- **Product Performance:** Last 30 days if not specified
- **Expiry Report:** Next 30 days if not specified
- **Movements/Forecast Accuracy:** All time if not specified

## Integration

### Reusing Inventory Service

```typescript
// reporting/services/inventory-reporting.service.ts
@Injectable()
export class InventoryReportingService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly cacheService: CacheService,
  ) {}

  async getLowStockReport(dto: LowStockReportDto) {
    const cacheKey = { prefix: CACHE_PREFIX.REPORT, key: `low-stock:...` };
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.inventoryService.getLowStockAlerts(dto),
      { ttl: CACHE_TTL.MEDIUM },
    );
  }
}
```

### New Analytics Services

```typescript
// reporting/services/product-reporting.service.ts
async getProductPerformanceReport(dto) {
  // 1. Query StockMovement grouped by productBatchId
  const movements = await this.prisma.stockMovement.groupBy({ ... });

  // 2. Get product details and calculate metrics
  const performanceData = await Promise.all(
    movements.map(async (movement) => {
      const batch = await this.prisma.productBatch.findUnique({ ... });
      const turnoverRate = totalQuantity / daysInPeriod;
      return { productId, turnoverRate, ... };
    })
  );

  // 3. Sort and paginate
  return { performanceData, total, page, limit };
}
```

## Development

### Run Tests

```bash
# Unit tests (when implemented)
npm test -- reporting

# E2E tests (QA team)
npm run test:e2e
```

### Sample Queries

```bash
# Low stock items
GET /reports/inventory/low-stock?threshold=10&limit=50

# Products expiring in 7 days
GET /reports/inventory/expiry?daysAhead=7

# Stock levels by location
GET /reports/inventory/stock-levels?groupBy=location

# Movements in date range
GET /reports/inventory/movements?startDate=2025-01-01&endDate=2025-12-31

# Inventory valuation (FIFO method)
GET /reports/inventory/valuation?method=FIFO

# Product performance (sorted by turnover)
GET /reports/product/performance?sortBy=turnoverRate&sortOrder=desc

# Warehouse utilization
GET /reports/warehouse/utilization?warehouseId=wh-uuid

# Forecast accuracy for a product
GET /reports/demand-planning/accuracy?productId=prod-uuid
```

## Performance Notes

### Optimization Strategies

1. **Redis Caching (30-min TTL):**
   - First request: Query database (~500ms)
   - Cached requests: ~5ms
   - Cache hit rate: ~80% for repeated queries

2. **Pagination:**
   - Limit max 100 items per page
   - Use skip/take for efficient pagination
   - Total count cached separately

3. **Complex Aggregations:**
   - Product Performance: GroupBy reduces N+1 queries
   - Warehouse Utilization: Single query with includes
   - Forecast Accuracy: Batch process comparisons

4. **Index Requirements:**
   - `StockMovement.productBatchId` (for product performance)
   - `StockMovement.createdAt` (for date range queries)
   - `Location.warehouseId` (for warehouse utilization)
   - `DemandForecast.forecastDate` (for accuracy queries)

### Limitations

- **No Real-Time Updates:** Reports cached for 30 minutes
- **Large Datasets:** Use pagination (max 100 items/page)
- **Complex Filters:** Some combinations not supported (e.g., multiple productIds)
- **Historical Data:** Dependent on data retention policies

## Future Enhancements

- **Export Formats:** CSV, Excel, PDF generation
- **Scheduled Reports:** Daily/weekly automated email reports
- **Custom Reports:** User-defined queries with saved filters
- **Materialized Views:** Pre-aggregated data for faster queries
- **Alert Analytics:** Report on alert frequency and resolution time
- **Audit Trail Report:** User activity and compliance queries
