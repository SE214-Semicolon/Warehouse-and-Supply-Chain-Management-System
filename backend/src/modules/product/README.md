# Product Management Module

## Overview

Product catalog management system handling product master data, categories, and batch tracking. Supports barcode/SKU lookup, expiry date tracking, and hierarchical category organization.

**Purpose:** Maintain accurate product information and batch traceability for warehouse operations.

## Features

- **Product CRUD:** Create, read, update, delete products with SKU/barcode
- **Product Categories:** Hierarchical category organization
- **Batch Tracking:** Manufacture date, expiry date, batch number, barcode/QR
- **Product Search:** Autocomplete, SKU lookup, barcode lookup
- **Expiry Management:** Query batches expiring within N days
- **Soft Delete:** Products and batches can be archived (not hard deleted)

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/products`

**Products:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/products` | Admin, Manager | Create product |
| GET | `/products` | All (except Partner) | List products with filters |
| GET | `/products/autocomplete` | All (except Partner) | Search products (typeahead) |
| GET | `/products/sku/:sku` | All (except Partner) | Get by SKU |
| GET | `/products/barcode/:barcode` | All (except Partner) | Get by barcode |
| GET | `/products/:id` | All (except Partner) | Get by ID |
| PATCH | `/products/:id` | Admin, Manager | Update product |
| DELETE | `/products/:id` | Admin | Soft delete product |

**Product Categories:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/product-categories` | Admin, Manager | Create category |
| GET | `/product-categories` | All (except Partner) | List categories |
| GET | `/product-categories/:id` | All (except Partner) | Get by ID |
| PATCH | `/product-categories/:id` | Admin, Manager | Update category |
| DELETE | `/product-categories/:id` | Admin | Delete category |

**Product Batches:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/product-batches` | Admin, Manager, Staff | Create batch |
| GET | `/product-batches` | All (except Partner) | List batches with filters |
| GET | `/product-batches/expiring` | All (except Partner) | Get expiring batches (days param) |
| GET | `/product-batches/product/:productId` | All (except Partner) | Get batches for product |
| GET | `/product-batches/:id` | All (except Partner) | Get by ID |
| PATCH | `/product-batches/:id` | Admin, Manager, Staff | Update batch |
| DELETE | `/product-batches/:id` | Admin | Soft delete batch |

### Database

**PostgreSQL Tables:**

**Product:**

```prisma
model Product {
  id              String          @id @default(uuid())
  name            String
  description     String?
  sku             String          @unique
  barcode         String?         @unique
  categoryId      String          // FK to ProductCategory
  unitOfMeasure   String          // 'kg', 'pcs', 'liters', etc.
  reorderPoint    Int?            // Min stock before reorder
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  batches         ProductBatch[]
  @@index([categoryId])
  @@index([sku])
  @@index([barcode])
}
```

**ProductCategory:**

```prisma
model ProductCategory {
  id          String    @id @default(uuid())
  name        String
  code        String    @unique
  description String?
  parentId    String?   // For hierarchical categories
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products    Product[]
  parent      ProductCategory? @relation("CategoryHierarchy")
  children    ProductCategory[] @relation("CategoryHierarchy")
}
```

**ProductBatch:**

```prisma
model ProductBatch {
  id                String    @id @default(uuid())
  productId         String    // FK to Product
  batchNo           String
  quantity          Int
  manufactureDate   DateTime?
  expiryDate        DateTime?
  barcodeOrQr       String?   @unique
  inboundReceiptId  String?   // Link to inbound receipt
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  @@unique([productId, batchNo, deletedAt])
  @@index([expiryDate])
  @@index([barcodeOrQr])
}
```

### Dependencies

**Uses:**

- `CacheModule` - Redis caching (5-min TTL)

**Used by:**

- `InventoryModule` - Validate product batches in inventory operations
- `AlertsModule` - Check expiry dates for EXPIRING_SOON alerts
- Future modules: Order fulfillment, Demand Planning

## Architecture

### Components

```
product/
├── controllers/
│   ├── product.controller.ts          # Product CRUD (9 endpoints)
│   ├── product-category.controller.ts # Category CRUD (5 endpoints)
│   └── product-batch.controller.ts    # Batch CRUD (7 endpoints)
├── services/
│   ├── product.service.ts             # Product business logic
│   ├── product-category.service.ts    # Category business logic
│   └── product-batch.service.ts       # Batch business logic
├── repositories/
│   ├── product.repository.ts          # Product data access
│   ├── product-category.repository.ts # Category data access
│   └── product-batch.repository.ts    # Batch data access
└── dto/                               # Request/response validation
```

**Key Responsibilities:**

- **Controllers:** HTTP handling, RBAC guards, Swagger docs
- **Services:** Business logic, validation, cache management
- **Repositories:** Database CRUD with Prisma, complex queries

### Key Design Decisions

**Why Separate Product and ProductBatch?**

- Same product can have multiple batches (different expiry dates)
- Batch-level traceability for quality control
- Flexible inventory management (FEFO - First Expire First Out)

**Why Unique Constraint on SKU and Barcode?**

- Prevent duplicate products in catalog
- Enable fast lookups for scanning operations
- Barcode nullable (not all products have barcodes)

**Why Soft Delete?**

- Preserve historical data (orders may reference deleted products)
- Can restore products if deleted by mistake
- Unique constraints include `deletedAt` for re-creation

## Business Rules

### 1. SKU Uniqueness

```
SKU must be unique across all products (case-insensitive)
Database unique constraint enforced
```

### 2. Barcode Uniqueness

```
Barcode must be unique if provided (nullable)
Supports EAN-13, UPC, QR codes, etc.
```

### 3. Batch Number Uniqueness

```
Unique constraint: (productId, batchNo, deletedAt)
Same product can't have duplicate batch numbers (unless deleted)
```

### 4. Expiry Date Validation

```
If provided:
  - expiryDate must be >= manufactureDate
  - expiryDate must be > today (warning if in past)
```

### 5. Category Hierarchy

```
Categories can have parent categories (unlimited depth)
Deleting parent category requires handling children (cascade or reassign)
```

### 6. Caching Rules

- **Cache Key:** `PRODUCT:detail:{id}` or `PRODUCT:list:{hash(filters)}`
- **TTL:** 5 minutes (300 seconds)
- **Invalidation:** Create/Update/Delete → flush related caches

## Integration

### How Other Modules Use This

**InventoryModule:**

```typescript
// Validate product batch exists before receiving inventory
const batch = await productService.getBatchById(batchId);
if (!batch) throw new NotFoundException('Product batch not found');
```

**AlertsModule:**

```typescript
// Query expiring batches for daily scan
const batches = await productService.getExpiringBatches(30); // 30 days
batches.forEach((batch) => generateExpiryAlert(batch));
```

### Common Workflows

**Create Product with First Batch:**

```bash
# 1. Create category
POST /product-categories
{ "name": "Electronics", "code": "ELEC" }

# 2. Create product
POST /products
{
  "name": "Laptop Dell XPS 15",
  "sku": "DELL-XPS-15",
  "barcode": "1234567890123",
  "categoryId": "{category-uuid}",
  "unitOfMeasure": "pcs",
  "reorderPoint": 10
}

# 3. Create batch
POST /product-batches
{
  "productId": "{product-uuid}",
  "batchNo": "BATCH-2024-001",
  "quantity": 100,
  "manufactureDate": "2024-01-01",
  "expiryDate": "2026-01-01"
}
```

## Development

### Run Tests

```bash
npm test -- product                    # Unit tests
npm run test:e2e -- product            # E2E tests
npm run test:e2e -- product-category   # Category E2E tests
```

### Sample Queries

```bash
# Search products (autocomplete)
GET /products/autocomplete?search=laptop&limit=10

# Get expiring batches within 30 days
GET /product-batches/expiring?days=30

# Get all batches for a product
GET /product-batches/product/{productId}

# Lookup by barcode
GET /products/barcode/1234567890123
```

### Common Issues

**Duplicate SKU error:**

```
Error: Product with SKU 'ABC-123' already exists
Solution: SKUs must be unique, use different SKU or update existing product
```

**Expiry date validation:**

```
Error: Expiry date must be after manufacture date
Solution: Ensure expiryDate > manufactureDate
```

**Batch deletion with inventory:**

```
Error: Cannot delete batch with existing inventory
Solution: Dispatch all inventory first, or use soft delete
```

## Performance Notes

- **Indexes:** `sku`, `barcode`, `categoryId`, `expiryDate` for fast lookups
- **Caching:** Product catalog rarely changes, high cache hit rate (~85%)
- **Autocomplete:** Uses ILIKE query with limit for typeahead performance
- **Soft Delete:** Filtered by `deletedAt IS NULL` in all queries (index included)
