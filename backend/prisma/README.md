# Prisma Database Layer

## Directory Structure

```
prisma/
├── schema.prisma           # Database schema definition
├── seed.ts                 # Comprehensive seed data (936 lines)
├── SEED_DATA.md           # Seed data documentation
├── migrations/            # Database migration history
└── seeds/                 # Modular seed helpers
    ├── user-seed.ts       # User seeding utilities
    ├── product-seed.ts    # Product seeding utilities
    └── warehouse-seed.ts  # Warehouse seeding utilities
```

## Schema Overview

### Core Models (16 models)

#### Infrastructure
- **Warehouse** - Physical warehouse locations
- **Location** - Storage locations within warehouses

#### Product Management
- **ProductCategory** - Hierarchical product categorization
- **Product** - Product master data
- **ProductBatch** - Batch/lot tracking with expiry dates

#### Inventory
- **Inventory** - Stock levels by batch and location
- **StockMovement** - All inventory movements (9 types)

#### Procurement
- **Supplier** - Supplier master data
- **PurchaseOrder** - Purchase orders
- **PurchaseOrderItem** - PO line items

#### Sales
- **Customer** - Customer master data
- **SalesOrder** - Sales orders
- **SalesOrderItem** - SO line items

#### Logistics
- **Shipment** - Shipment tracking
- **ShipmentItem** - Items in shipment
- **ShipmentTrackingEvent** - Shipment history

#### Analytics
- **DemandForecast** - Demand planning forecasts

#### User Management
- **User** - System users (8 roles)
- **RefreshToken** - JWT refresh tokens
- **UserInvite** - User invitation system

### Enums

1. **UserRole** (8 roles)
   - admin, manager, warehouse_staff
   - procurement, sales, logistics
   - analyst, partner

2. **OrderStatus** (6 statuses)
   - pending, approved, processing
   - shipped, closed, cancelled

3. **PoStatus** (5 statuses)
   - draft, ordered, received
   - partial, cancelled

4. **StockMovementType** (9 types)
   - purchase_receipt, sale_issue
   - adjustment, transfer_in, transfer_out
   - returned, reservation, release, consumption

5. **ShipmentStatus** (5 statuses)
   - preparing, in_transit, delivered
   - delayed, cancelled

## Seed Data Coverage

### ✅ Fully Seeded Models
- [x] User (7 accounts covering all roles)
- [x] Warehouse (2 warehouses)
- [x] Location (4 locations)
- [x] ProductCategory (3 categories)
- [x] Product (5 products)
- [x] ProductBatch (5 batches with expiry tracking)
- [x] Inventory (Multiple records with alert scenarios)
- [x] StockMovement (Historical transactions)
- [x] Supplier (Multiple suppliers)
- [x] Customer (Multiple customers)
- [x] PurchaseOrder (4 orders with various statuses)
- [x] PurchaseOrderItem (Line items)
- [x] SalesOrder (2 orders)
- [x] SalesOrderItem (Line items)
- [x] Shipment (3 shipments: delivered, in_transit, preparing)
- [x] ShipmentItem (Items per shipment)
- [x] ShipmentTrackingEvent (Tracking history for 2 shipments)
- [x] DemandForecast (5 forecasts with 3 algorithms)

### ⚠️ Auto-Generated Models
- [ ] RefreshToken (created during login)
- [ ] UserInvite (created when inviting users)

### 📦 MongoDB Collections (Not in Prisma)
- **audit_logs** - Auto-logged via AuditLogInterceptor
- **alerts** - Auto-generated via AlertService

## Database Operations

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Run Migrations
```bash
# Development
npm run prisma:migrate

# Production
npm run db:migrate:prod
```

### Seed Database
```bash
# Automatic after migrate, or manually:
npx prisma db seed

# Or via Prisma migrate:
npx prisma migrate reset  # Resets DB and seeds
```

### Open Prisma Studio
```bash
npm run prisma:studio
```

## Migration Strategy

### Development
1. Edit `schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Review generated migration in `migrations/`
4. Test migration
5. Commit migration files

### Production
1. Review all migrations
2. Run `npx prisma migrate deploy`
3. No interactive prompts
4. Fails fast on errors

## Important Notes

### Schema Design
- All IDs use UUID (@db.Uuid)
- Timestamps: createdAt, updatedAt (auto-managed)
- Soft deletes: deletedAt fields where needed
- JSON fields for flexible metadata
- Proper foreign key constraints with onDelete actions

### Indexes
- Strategic indexes on foreign keys
- Composite unique constraints
- Query performance optimization
- See schema.prisma for full index list

### Relationships
- Proper cascade deletes where appropriate
- Restrict deletes for critical references
- Many-to-many through junction tables
- Self-referential relations (ProductCategory hierarchy)

### Best Practices
- Always use transactions for multi-record operations
- Validate data before Prisma operations
- Use DTOs for input validation
- Leverage Prisma's type safety
- Handle unique constraint violations gracefully

## Quick Reference

### User Accounts (All: password = {role}123)
```
admin       - Full system access
manager     - Warehouse management
staff       - Daily operations
analyst     - Reporting and analytics
logistics   - Shipment management
sales       - Sales operations
procurement - Purchase management
```

### Test Scenarios
- Low stock: TSHIRT-001 (3 units)
- Expiring: MILK-001 (15 days)
- Expired: BREAD-001 (5 days ago)
- Shipments: All statuses covered
- PO flows: Complete lifecycle
- SO flows: With fulfillment tracking

## Related Documentation
- [SEED_DATA.md](./SEED_DATA.md) - Detailed seed data info
- [/docs/DATABASE.md](../docs/DATABASE.md) - Database architecture
- [Prisma Documentation](https://www.prisma.io/docs/)
