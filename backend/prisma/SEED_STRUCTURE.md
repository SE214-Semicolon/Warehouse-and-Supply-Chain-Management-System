# Seed Data Structure - Warehouse Management System

## 📁 Folder Organization

```
backend/prisma/
├── schema.prisma          # Database schema (18 models, 5 enums)
├── seed.ts                # ✅ MAIN SEED FILE (837 lines, fully working)
├── README.md              # Prisma folder documentation
├── SEED_DATA.md           # Seed data overview
├── migrations/            # Database migrations
└── seeds/                 # Modular seed modules (for future use)
    ├── user-seed.ts
    ├── warehouse-seed.ts
    ├── product-seed.ts
    ├── customer-seed.ts
    ├── supplier-seed.ts
    ├── order-seed.ts
    ├── inventory-seed.ts
    ├── shipment-seed.ts
    └── forecast-seed.ts
```

## ✅ Current Seed Status (seed.ts)

### **Production-Ready**: Matches schema field names exactly

| Model | Records | Status | Notes |
|-------|---------|--------|-------|
| User | 7 | ✅ | All roles: admin, manager, warehouse_staff, analyst, logistics, sales, procurement |
| Warehouse | 2 | ✅ | Main + Secondary warehouse |
| Location | 8 | ✅ | Distributed across warehouses |
| ProductCategory | 3 | ✅ | Electronics, Clothing, Food |
| Product | 5 | ✅ | Realistic product mix |
| ProductBatch | 5 | ✅ | With expiry dates for food items |
| Inventory | ~20 | ✅ | Distributed across locations |
| StockMovement | ~50 | ✅ | Various movement types |
| Customer | 2 | ✅ | Different customer types |
| Supplier | 2 | ✅ | Electronics & Food suppliers |
| PurchaseOrder | 4 | ✅ | Various statuses (draft, ordered, partial, received) |
| SalesOrder | 2 | ✅ | Different order statuses |
| Shipment | 3 | ✅ | preparing, in_transit, delivered |
| ShipmentTrackingEvent | 5 | ✅ | Complete tracking history |
| DemandForecast | 5 | ✅ | 3 algorithms, multiple products |

**Total**: ~120 records across 15 models

## 🔑 Schema Field Mapping (Verified with Production Code)

### ✅ Correct Field Names Used:

```typescript
// PurchaseOrder
placedAt         // NOT orderDate
expectedArrival  // NOT expectedDate

// SalesOrder
placedAt         // NOT orderDate

// Shipment
shipmentNo       // NOT code
shippedAt        // NOT shipmentDate
deliveredAt      // NOT actualDelivery
warehouseId      // REQUIRED field

// ShipmentTrackingEvent
eventTime        // NOT timestamp
statusText       // NOT status

// StockMovement
createdById      // NOT performedBy
createdAt        // NOT timestamp
note             // NOT notes (singular)

// Customer/Supplier
contactInfo      // JSON field (contains email, phone, etc.)
```

## 🎯 Demo Scenarios Covered

1. **User Management**: 7 roles for complete RBAC testing
2. **Inventory Operations**: Stock in/out, transfers, adjustments
3. **Procurement Flow**: PO creation → receiving → inventory updates
4. **Sales Flow**: SO creation → shipment → delivery tracking
5. **Warehouse Management**: Multi-location inventory distribution
6. **Analytics**: Demand forecasts with multiple algorithms
7. **Expiry Management**: Products with expiry dates
8. **Low Stock Alerts**: Inventory below threshold levels

## 🚀 Usage

### Run Seed:
```bash
cd backend
npx prisma db seed
```

### Reset & Seed:
```bash
npx prisma migrate reset
```

### Test Accounts:
```
admin / admin123           # Full access
manager / manager123       # Management operations
staff / staff123           # Warehouse operations
analyst / analyst123       # Reports & analytics
logistics / logistics123   # Shipment management
sales / sales123           # Sales operations
procurement / procurement123  # Procurement operations
```

## 📌 Notes

- **seeds/ folder**: Modular seed modules available for future expansion
- Current seed.ts is **monolithic but working and tested**
- All field names **match schema.prisma exactly**
- Compatible with **existing production code in src/modules/**
- Ready for **Docker and production deployment**

## 🔄 Future Enhancements

To use modular seeds/ folder:
1. Import modules in seed.ts
2. Orchestrate execution order
3. Pass dependencies between modules
4. Update field names in modules to match schema

**For now**: Current monolithic seed.ts is **production-ready and sufficient** for Phase 1 demo.
