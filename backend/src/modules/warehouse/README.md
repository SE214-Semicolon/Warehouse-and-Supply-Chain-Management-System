# Warehouse Management Module

## Overview

Warehouse and storage location management system. Handles warehouse master data and hierarchical location structures (zones, aisles, racks, bins) with capacity tracking and utilization statistics.

**Purpose:** Organize warehouse physical structure and track storage capacity across locations.

## Features

- **Warehouse CRUD:** Create, read, update, delete warehouses
- **Location CRUD:** Manage storage locations with hierarchical types
- **Location Types:** ZONE, AISLE, RACK, BIN, FLOOR, STAGING
- **Capacity Tracking:** Current and max capacity per location
- **Location Lookup:** By code, by warehouse, available locations only
- **Statistics:** Warehouse/location utilization, inventory counts
- **Soft Delete:** Warehouses and locations can be archived

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/warehouses`

**Warehouses:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/warehouses` | Admin, Manager | Create warehouse |
| GET | `/warehouses` | All (except Partner) | List warehouses with filters |
| GET | `/warehouses/code/:code` | All (except Partner) | Get by warehouse code |
| GET | `/warehouses/:id` | All (except Partner) | Get by ID |
| GET | `/warehouses/:id/stats` | All (except Partner) | Get warehouse statistics |
| PATCH | `/warehouses/:id` | Admin, Manager | Update warehouse |
| DELETE | `/warehouses/:id` | Admin | Soft delete warehouse |

**Locations:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/locations` | Admin, Manager | Create location |
| GET | `/locations` | All (except Partner) | List locations with filters |
| GET | `/locations/warehouse/:warehouseId` | All (except Partner) | Get all locations in warehouse |
| GET | `/locations/warehouse/:warehouseId/available` | All (except Partner) | Get available locations (capacity > current) |
| GET | `/locations/code/:warehouseId/:code` | All (except Partner) | Get by location code |
| GET | `/locations/:id` | All (except Partner) | Get by ID |
| GET | `/locations/:id/stats` | All (except Partner) | Get location statistics |
| PATCH | `/locations/:id` | Admin, Manager | Update location |
| DELETE | `/locations/:id` | Admin | Soft delete location |

### Database

**PostgreSQL Tables:**

**Warehouse:**

```prisma
model Warehouse {
  id          String    @id @default(uuid())
  name        String
  code        String    @unique
  address     String
  metadata    Json?     // Contact, operating hours, etc.
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  locations   Location[]
  @@index([code])
}
```

**Location:**

```prisma
model Location {
  id              String        @id @default(uuid())
  warehouseId     String        // FK to Warehouse
  code            String        // e.g., "A-01-R3-B5"
  name            String
  type            LocationType  // ZONE, AISLE, RACK, BIN, etc.
  capacity        Int?          // Max units (nullable for zones)
  currentCapacity Int           @default(0) // Current units stored
  properties      Json?         // Custom metadata (temperature, etc.)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  warehouse       Warehouse     @relation(fields: [warehouseId])
  inventory       Inventory[]

  @@unique([warehouseId, code, deletedAt])
  @@index([warehouseId])
  @@index([type])
}

enum LocationType {
  ZONE
  AISLE
  RACK
  BIN
  FLOOR
  STAGING
}
```

### Dependencies

**Uses:**

- `CacheModule` - Redis caching (5-min TTL)

**Used by:**

- `InventoryModule` - Validate locations in inventory operations
- Future modules: Order fulfillment (picking locations)

## Architecture

### Components

```
warehouse/
├── controllers/
│   ├── warehouse.controller.ts  # Warehouse CRUD (7 endpoints)
│   └── location.controller.ts   # Location CRUD (9 endpoints)
├── services/
│   ├── warehouse.service.ts     # Warehouse business logic
│   └── location.service.ts      # Location business logic
├── repositories/
│   ├── warehouse.repository.ts  # Warehouse data access
│   └── location.repository.ts   # Location data access
└── dto/                         # Request/response validation
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, validation, cache management
- **Repositories:** Database CRUD with Prisma

### Key Design Decisions

**Why Separate Warehouse and Location?**

- One warehouse contains many locations (1:N relationship)
- Locations are hierarchical (ZONE → AISLE → RACK → BIN)
- Flexible location types for different warehouse layouts

**Why Location Code Unique per Warehouse?**

- Each warehouse has independent location naming scheme
- Prevents conflicts when querying locations by code
- Unique constraint: `(warehouseId, code, deletedAt)`

**Why Capacity Tracking?**

- Prevent overfilling locations
- Optimize space utilization
- Query available locations for receiving operations

## Business Rules

### 1. Warehouse Code Uniqueness

```
Code must be unique across all warehouses (e.g., "WH-001")
Database unique constraint enforced
```

### 2. Location Code Uniqueness per Warehouse

```
Unique constraint: (warehouseId, code, deletedAt)
Same warehouse can't have duplicate location codes
Different warehouses can have same location code
```

### 3. Capacity Validation

```
If capacity is set:
  - currentCapacity must be <= capacity
  - currentCapacity must be >= 0
  - Receiving inventory updates currentCapacity automatically
```

### 4. Location Types

```
ZONE:    Large area (e.g., "Dry Goods Zone")
AISLE:   Row within zone (e.g., "Aisle A")
RACK:    Shelving unit (e.g., "Rack 3")
BIN:     Smallest unit (e.g., "Bin B5")
FLOOR:   Floor-level storage
STAGING: Temporary holding area
```

### 5. Available Locations Query

```
GET /locations/warehouse/:id/available
Returns locations where: capacity > currentCapacity
Used by receiving operations to find empty spots
```

### 6. Caching Rules

- **Cache Key:** `WAREHOUSE:detail:{id}` or `LOCATION:detail:{id}`
- **TTL:** 5 minutes (300 seconds)
- **Invalidation:** Create/Update/Delete → flush related caches

## Integration

### How Other Modules Use This

**InventoryModule:**

```typescript
// Validate location exists and has capacity before receiving
const location = await locationService.getById(locationId);
if (!location) throw new NotFoundException('Location not found');
if (location.capacity && location.currentCapacity >= location.capacity) {
  throw new BadRequestException('Location at full capacity');
}
```

### Common Workflows

**Setup New Warehouse:**

```bash
# 1. Create warehouse
POST /warehouses
{
  "name": "Main Distribution Center",
  "code": "WH-MDC",
  "address": "123 Warehouse St, City",
  "metadata": {
    "contact": "manager@example.com",
    "operatingHours": "24/7"
  }
}

# 2. Create zones
POST /locations
{ "warehouseId": "{uuid}", "code": "ZONE-A", "name": "Dry Goods", "type": "ZONE" }
POST /locations
{ "warehouseId": "{uuid}", "code": "ZONE-B", "name": "Cold Storage", "type": "ZONE" }

# 3. Create aisles
POST /locations
{ "warehouseId": "{uuid}", "code": "A-01", "name": "Aisle 1", "type": "AISLE" }

# 4. Create bins
POST /locations
{
  "warehouseId": "{uuid}",
  "code": "A-01-R3-B5",
  "name": "Bin 5, Rack 3, Aisle 1",
  "type": "BIN",
  "capacity": 100
}
```

## Development

### Run Tests

```bash
npm test -- warehouse       # Unit tests
npm run test:e2e -- warehouse   # E2E tests
```

### Sample Queries

```bash
# Get all locations in warehouse
GET /locations/warehouse/{warehouseId}

# Get available locations (with capacity)
GET /locations/warehouse/{warehouseId}/available

# Get location by code
GET /locations/code/{warehouseId}/A-01-R3-B5

# Get warehouse statistics
GET /warehouses/{id}/stats
# Returns: totalLocations, totalCapacity, currentUtilization, etc.
```

### Common Issues

**Duplicate warehouse code:**

```
Error: Warehouse with code 'WH-001' already exists
Solution: Use unique warehouse codes
```

**Location at capacity:**

```
Error: Location at full capacity
Solution: Query available locations or increase capacity
```

**Delete warehouse with locations:**

```
Error: Cannot delete warehouse with existing locations
Solution: Delete all locations first, or use soft delete (sets deletedAt)
```

## Performance Notes

- **Indexes:** `warehouseId`, `code`, `type` for fast lookups
- **Caching:** Warehouse/location data changes infrequently, high cache hit rate
- **Soft Delete:** Filtered by `deletedAt IS NULL` in all queries
- **Statistics:** Cached for 5 minutes to avoid expensive aggregations
