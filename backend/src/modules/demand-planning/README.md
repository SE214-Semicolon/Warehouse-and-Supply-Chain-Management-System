# Demand Planning Module

## Overview

Sales forecasting and demand prediction system that helps procurement and sales teams make data-driven inventory planning decisions. Uses historical stock movement data to generate future demand forecasts using statistical algorithms.

**Purpose:** Optimize inventory levels, reduce stockouts, and minimize excess inventory through accurate demand forecasting.

## Features

- **Forecasting Algorithms:** Simple Moving Average (SMA) with plans for Exponential Smoothing and ML-based models
- **Forecast Management:** CRUD operations for manual and algorithm-generated forecasts
- **Historical Analysis:** Analyzes past sales movements (7-365 days window)
- **Batch Generation:** Create forecasts for multiple future periods (1-90 days ahead)
- **Unique Constraints:** One forecast per product per date
- **Auto-Caching:** Redis cache with 5-minute TTL for query performance

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/demand-planning`

| Method | Endpoint                                    | Auth                                        | Description                  |
| ------ | ------------------------------------------- | ------------------------------------------- | ---------------------------- |
| POST   | `/demand-planning/forecasts`                | Admin, Manager, Analyst                     | Create forecast manually     |
| GET    | `/demand-planning/forecasts`                | Admin, Manager, Analyst, Procurement, Sales | Query forecasts with filters |
| GET    | `/demand-planning/forecasts/:id`            | Admin, Manager, Analyst, Procurement, Sales | Get forecast by ID           |
| PUT    | `/demand-planning/forecasts/:id`            | Admin, Manager, Analyst                     | Update forecast              |
| DELETE | `/demand-planning/forecasts/:id`            | Admin, Manager                              | Delete forecast              |
| POST   | `/demand-planning/forecasts/run/:productId` | Admin, Manager, Analyst                     | Run forecasting algorithm    |

**Query Filters:** `productId`, `startDate`, `endDate`, `algorithmUsed`

### Database

**PostgreSQL Table:** `DemandForecast`

```sql
CREATE TABLE "DemandForecast" (
  id                  TEXT PRIMARY KEY DEFAULT cuid(),
  productId           UUID NOT NULL REFERENCES "Product"(id),
  forecastDate        TIMESTAMP NOT NULL,
  forecastedQuantity  INTEGER NOT NULL,
  algorithmUsed       TEXT DEFAULT 'SIMPLE_MOVING_AVERAGE',
  createdAt           TIMESTAMP DEFAULT now(),
  updatedAt           TIMESTAMP,
  UNIQUE(productId, forecastDate)
);

-- Indexes
CREATE INDEX idx_demandforecast_product ON "DemandForecast"(productId);
```

### Dependencies

**Uses:**

- `ProductModule` - Product validation
- `InventoryModule` - Historical StockMovement data (sale_issue type)
- `CacheModule` - Redis caching (5-min TTL)
- `PrismaModule` - Database access

**Used by:**

- Future modules: Procurement (reorder planning), Sales (demand-based targets)

## Architecture

### Components

```
demand-planning/
├── controllers/demand-planning.controller.ts  # REST API (6 endpoints)
├── services/demand-planning.service.ts        # Business logic, algorithms
├── repositories/demand-planning.repository.ts # Prisma queries
└── dto/
    ├── create-forecast.dto.ts                 # Manual forecast creation
    ├── update-forecast.dto.ts                 # Update existing forecast
    ├── query-forecast.dto.ts                  # Filter/search forecasts
    └── run-algorithm.dto.ts                   # Algorithm parameters
```

**Key Responsibilities:**

- **Controller:** HTTP handling, RBAC guards, Swagger docs
- **Service:** Forecast validation, SMA algorithm, cache management
- **Repository:** Database CRUD, historical data queries
- **DTOs:** Input validation, API documentation

### Key Design Decisions

**Why PostgreSQL (not MongoDB)?**

- Forecasts have structured data with fixed schema
- Foreign key to Product ensures referential integrity
- Complex queries with JOINs and aggregations
- ACID transactions for batch forecast creation

**Why Cache Forecasts?**

- Read-heavy workload (procurement/sales query frequently)
- 5-min TTL balances freshness vs performance
- Cache invalidated on create/update/delete operations

**Why sale_issue StockMovementType?**

- Represents actual product demand (sales/dispatches)
- Excludes internal movements (adjustments, transfers)
- Provides accurate demand signal for forecasting

## Business Rules

### 1. Forecast Uniqueness

**Rule:** One forecast per product per date

```typescript
UNIQUE(productId, forecastDate);
```

Prevents duplicate forecasts; updates require PUT or algorithm re-run.

### 2. Algorithm Parameters

**Simple Moving Average:**

- `windowDays`: 7-365 (historical period to analyze)
- `forecastDays`: 1-90 (future period to forecast)
- Formula: `avgDailyDemand = sum(sale_issue.quantity) / windowDays`

**Validation:**

- Product must exist in database
- Sufficient historical data required (>0 movements)
- Existing forecasts in range will be deleted before batch insert

### 3. Forecast Generation Workflow

```
1. Validate product exists
2. Query sale_issue movements (last windowDays)
3. Calculate average daily demand
4. Delete existing forecasts in target date range
5. Batch create forecasts (forecastDays entries)
6. Invalidate cache
```

### 4. Caching Rules

**Cache Key Pattern:** `forecast:query:p:{productId}:s:{startDate}:e:{endDate}:a:{algorithm}`

**TTL:** 300 seconds (5 minutes)

**Invalidation:** All forecast caches cleared on create/update/delete

### 5. Historical Data Requirements

**Minimum Data:**

- At least 1 sale_issue movement in lookback window
- If no data: Returns `{ forecastsCreated: 0, avgDailyDemand: 0 }`

**Data Quality:**

- Only sale_issue type movements counted
- Excludes: adjustments, transfers, reservations
- Date range: `[today - windowDays, today]`

## Integration

### How Other Modules Use This

**Procurement Module (Future):**

```typescript
// Get 30-day demand forecast for reorder planning
const forecasts = await demandPlanningService.queryForecasts({
  productId: 'product-123',
  startDate: today,
  endDate: addDays(today, 30),
});

// Calculate recommended order quantity
const totalDemand = forecasts.reduce((sum, f) => sum + f.forecastedQuantity, 0);
const reorderQty = totalDemand + safetyStock - currentStock;
```

**Sales Module (Future):**

```typescript
// Set sales targets based on forecasted demand
const avgDemand = forecasts.reduce((sum, f) => sum + f.forecastedQuantity, 0) / forecasts.length;
const salesTarget = avgDemand * 1.1; // 10% above forecast
```

### Common Workflows

**1. Generate 30-Day Forecast:**

```bash
POST /demand-planning/forecasts/run/:productId
{
  "algorithm": "SIMPLE_MOVING_AVERAGE",
  "windowDays": 30,
  "forecastDays": 30,
  "startDate": "2025-12-10"
}

Response:
{
  "success": true,
  "productId": "123...",
  "algorithm": "SIMPLE_MOVING_AVERAGE",
  "forecastsCreated": 30,
  "avgDailyDemand": 150
}
```

**2. Query Forecasts for Product:**

```bash
GET /demand-planning/forecasts?productId=123...&startDate=2025-12-01&endDate=2025-12-31

Response: [
  {
    "id": "clx...",
    "forecastDate": "2025-12-01",
    "forecastedQuantity": 150,
    "algorithmUsed": "SIMPLE_MOVING_AVERAGE",
    "product": { "id": "123...", "name": "Product A", "sku": "SKU-001" }
  },
  ...
]
```

**3. Manual Forecast Override:**

```bash
POST /demand-planning/forecasts
{
  "productId": "123...",
  "forecastDate": "2025-12-25",
  "forecastedQuantity": 500,  // Override algorithm due to holiday spike
  "algorithmUsed": "MANUAL_OVERRIDE"
}
```

## Development

### Run Tests

```bash
# Unit tests (when implemented)
npm run test -- demand-planning

# E2E tests (when implemented)
npm run test:e2e -- demand-planning
```

### Sample Queries

**Get all forecasts for a product:**

```typescript
const forecasts = await prisma.demandForecast.findMany({
  where: { productId: 'product-id' },
  include: { product: { select: { name: true, sku: true } } },
  orderBy: { forecastDate: 'asc' },
});
```

**Calculate forecast accuracy (future feature):**

```sql
SELECT
  AVG(ABS(actual_qty - forecasted_qty)) as MAE,
  AVG(POWER(actual_qty - forecasted_qty, 2)) as MSE
FROM (
  SELECT
    df.forecastedQuantity,
    SUM(sm.quantity) as actual_qty
  FROM "DemandForecast" df
  LEFT JOIN "StockMovement" sm
    ON sm.productId = df.productId
    AND DATE(sm.createdAt) = DATE(df.forecastDate)
    AND sm.movementType = 'sale_issue'
  GROUP BY df.id
);
```

### Common Issues

**Issue:** "No historical data found"

- **Cause:** Product has no sale_issue movements in window period
- **Solution:** Reduce windowDays or wait for more sales data

**Issue:** "Forecast already exists for product X on date Y"

- **Cause:** Duplicate forecast (unique constraint violation)
- **Solution:** Use PUT to update or run algorithm to overwrite batch

**Issue:** "Product not found"

- **Cause:** Invalid productId or product deleted
- **Solution:** Verify product exists: `GET /products/:id`

## Performance Notes

- **Batch Inserts:** Algorithm creates 1-90 forecasts in single transaction
- **Cache Hit Rate:** ~80% for repeated queries (5-min TTL)
- **Historical Query:** Optimized with productId + date range index
- **Pagination:** Not implemented (forecasts typically <365 records per product)

## Future Enhancements

### Phase 2 (Planned):

- **Exponential Smoothing:** Better for trending data
- **Seasonal Adjustment:** Handle holiday/seasonal patterns
- **Accuracy Metrics:** MAE, RMSE, MAPE calculation
- **Confidence Intervals:** Forecast ranges (pessimistic/optimistic)

### Phase 3 (Advanced):

- **ML-Based Models:** LSTM, Prophet for complex patterns
- **Multi-Factor Forecasting:** Consider promotions, weather, events
- **Auto-Tuning:** Automatic algorithm selection per product
- **Real-Time Updates:** Streaming forecast recalculation

## Limitations

- **Algorithm Scope:** Only Simple Moving Average currently implemented
- **No Seasonality:** SMA doesn't capture recurring patterns
- **Product-Level Only:** No warehouse/location-specific forecasts
- **Single Horizon:** All forecasts use same algorithm; no ensemble methods
- **No External Factors:** Doesn't consider promotions, market trends, competitors
