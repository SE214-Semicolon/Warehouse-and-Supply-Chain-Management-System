# Seed Data Summary

## Overview
Comprehensive seed data for Warehouse and Supply Chain Management System Phase 1 demo.

## Database Statistics

### Users (7 accounts - all roles covered)
- **admin** / admin123 - System Administrator
- **manager** / manager123 - Warehouse Manager  
- **staff** / staff123 - Warehouse Staff
- **analyst** / analyst123 - Business Analyst
- **logistics** / logistics123 - Logistics Coordinator
- **sales** / sales123 - Sales Representative
- **procurement** / procurement123 - Procurement Officer

### Infrastructure
- **Warehouses**: 2 (MAIN, SEC)
- **Locations**: 4 (Zone A, B, C across warehouses)

### Products & Inventory
- **Categories**: 3 (Electronics, Clothing, Food & Beverages)
- **Products**: 5 (Laptop, Phone, T-Shirt, Milk, Bread)
- **Product Batches**: 5 (with varying expiry dates)
- **Inventory Records**: Multiple with different stock levels

### Business Entities
- **Customers**: Multiple customers
- **Suppliers**: Multiple suppliers

### Transactions
- **Purchase Orders**: Multiple with statuses (draft, ordered, partial, received)
- **Sales Orders**: 2 orders with different statuses
- **Shipments**: 3 shipments with various statuses
  - SHIP-2024-001: Delivered (with 3 tracking events)
  - SHIP-2024-002: In Transit (with 2 tracking events)
  - SHIP-2024-003: Preparing (no tracking yet)

### Analytics
- **Stock Movements**: Historical movement records
- **Demand Forecasts**: 5 forecasts using different algorithms
  - MOVING_AVERAGE
  - EXPONENTIAL_SMOOTHING
  - SIMPLE_MOVING_AVERAGE

## Demo Scenarios

### 1. Inventory Management
- Low stock alerts (TSHIRT-001: 3 units - below threshold)
- Stock transfers between locations
- Inventory valuation reports
- Reservation and release operations

### 2. Expiry Management
- Items expiring soon (MILK-001: expires in 15 days)
- Expired items requiring disposal (BREAD-001: expired 5 days ago)

### 3. Purchase Orders
- Draft PO workflow
- Ordered PO awaiting delivery
- Partial receipt handling
- Completed PO with full receipt

### 4. Sales Orders
- Pending orders
- Approved orders ready for fulfillment
- qtyFulfilled tracking for partial fulfillment

### 5. Shipment Tracking
- Complete shipment lifecycle (preparing → in_transit → delivered)
- Real-time tracking events
- Multiple carriers support
- Estimated vs actual delivery dates

### 6. Demand Planning
- Forecasting with multiple algorithms
- Historical data for trend analysis
- Product-specific forecasts

### 7. Role-Based Access
- Test all 7 user roles
- Different permission levels
- Role-specific functionality access

## Running the Seed

```bash
# Generate Prisma client first
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Run seed (automatic after migrate, or manually)
npx prisma db seed
```

## MongoDB Collections (seeded automatically via API)
- **audit_logs** - System audit trail
- **alerts** - Low stock, expiry, and system alerts

## Notes
- All passwords follow pattern: {role}123
- Dates are relative to current time for realistic scenarios
- Inventory includes various stock levels to trigger alerts
- Batches have realistic expiry dates for testing expiry management
- Shipments include tracking events for complete history
