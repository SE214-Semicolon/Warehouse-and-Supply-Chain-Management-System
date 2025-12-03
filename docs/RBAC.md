# Role-Based Access Control (RBAC)

## Overview

This document defines the authorization matrix for all modules in the Warehouse and Supply Chain Management System based on the 11 bounded contexts in the architecture.

---

## User Roles

| Role                | Code              | Description             | Primary Responsibility                        |
| ------------------- | ----------------- | ----------------------- | --------------------------------------------- |
| **Admin**           | `admin`           | System administrator    | Full system access, user management, security |
| **Manager**         | `manager`         | General manager         | Oversight, approvals, strategic decisions     |
| **Warehouse Staff** | `warehouse_staff` | Warehouse operators     | Daily inventory operations                    |
| **Procurement**     | `procurement`     | Procurement specialists | Supplier and purchase order management        |
| **Sales**           | `sales`           | Sales representatives   | Customer and sales order management           |
| **Logistics**       | `logistics`       | Logistics coordinators  | Shipment and delivery management              |
| **Analyst**         | `analyst`         | Data analysts           | Forecasting, reporting, analytics             |
| **Partner**         | `partner`         | External partners       | Limited tracking access                       |

---

## Permission Matrix

### Legend

- ✅ Full access
- 👁️ Read-only
- ❌ No access

### 📦 Product Management

| Resource             | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| -------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Product Category** |       |         |       |             |       |           |         |
| Create/Update/Delete | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | 👁️    | 👁️          | 👁️    | 👁️        | 👁️      | 👁️      |
| **Product**          |       |         |       |             |       |           |         |
| Create/Update/Delete | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read/Search          | ✅    | ✅      | 👁️    | 👁️          | 👁️    | 👁️        | 👁️      | 👁️      |
| **Product Batch**    |       |         |       |             |       |           |         |
| Create/Update        | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Delete               | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | 👁️    | 👁️          | 👁️    | 👁️        | 👁️      | ❌      |

**Key Rules**:

- Master data (Product, Category) → Admin/Manager only
- Operational data (Batch) → Staff can create when receiving goods
- All roles can view products for their operations

---

### 🏢 Warehouse Management

| Resource             | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| -------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Warehouse**        |       |         |       |             |       |           |         |
| Create/Update/Delete | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read/Stats           | ✅    | ✅      | 👁️    | ❌          | ❌    | 👁️        | ❌      | ❌      |
| **Location**         |       |         |       |             |       |           |         |
| Create/Update        | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Delete               | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read/Stats           | ✅    | ✅      | 👁️    | ❌          | ❌    | 👁️        | ❌      | ❌      |

**Key Rules**:

- Warehouse structure is master data → Admin/Manager configure
- Staff use existing locations, cannot create/modify
- Logistics view for shipment planning

---

### 📊 Inventory Management

| Operation                | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| ------------------------ | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Inventory Operations** |       |         |       |             |       |           |         |
| Receive/Dispatch         | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Adjust/Transfer          | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Reserve/Release          | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Query Inventory          | ✅    | ✅      | 👁️    | 👁️          | 👁️    | 👁️        | ❌      | ❌      |
| **Reports**              |       |         |       |             |       |           |         |
| Stock Levels             | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Movements                | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Valuation                | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| **Alerts**               |       |         |       |             |       |           |         |
| Low Stock                | ✅    | ✅      | 👁️    | 👁️          | ❌    | ❌        | ❌      | ❌      |
| Expiring Products        | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | ❌      | ❌      |

**Key Rules**:

- Staff perform all daily inventory operations
- Procurement sees low stock alerts for reordering
- Valuation report restricted (financial data)

---

### 🛒 Procurement

| Resource             | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| -------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Supplier**         |       |         |       |             |       |           |         |
| Create/Update/Delete | ✅    | ✅      | ❌    | ✅          | ❌    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | ❌    | 👁️          | ❌    | ❌        | ❌      | ❌      |
| **Purchase Order**   |       |         |       |             |       |           |         |
| Create/Update        | ✅    | ✅      | ❌    | ✅          | ❌    | ❌        | ❌      | ❌      |
| Approve              | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Receive Goods        | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | 👁️    | 👁️          | ❌    | ❌        | ❌      | ❌      |

**Key Rules**:

- Procurement creates POs, Manager approves
- Staff receives goods (operational)

---

### 📤 Sales

| Resource             | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| -------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Customer**         |       |         |       |             |       |           |         |
| Create/Update/Delete | ✅    | ✅      | ❌    | ❌          | ✅    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | ❌    | ❌          | 👁️    | ❌        | ❌      | ❌      |
| **Sales Order**      |       |         |       |             |       |           |         |
| Create/Update        | ✅    | ✅      | ❌    | ❌          | ✅    | ❌        | ❌      | ❌      |
| Approve              | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Fulfill              | ✅    | ✅      | ✅    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Read                 | ✅    | ✅      | 👁️    | ❌          | 👁️    | 👁️        | 👁️      | ❌      |

**Key Rules**:

- Sales creates orders, Manager approves
- Staff fulfills (picks/packs)
- Logistics reads for shipping, Analyst for forecasting

---

### 🚚 Logistics

| Resource               | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| ---------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| **Shipment**           |       |         |       |             |       |           |         |
| Create/Update          | ✅    | ✅      | ❌    | ❌          | ❌    | ✅        | ❌      | ❌      |
| Update Status/Tracking | ✅    | ✅      | ❌    | ❌          | ❌    | ✅        | ❌      | ❌      |
| Read                   | ✅    | ✅      | 👁️    | ❌          | 👁️    | 👁️        | ❌      | ❌      |
| Track (public)         | ✅    | ✅      | 👁️    | ❌          | 👁️    | 👁️        | ❌      | 👁️      |

**Key Rules**:

- Logistics owns shipment lifecycle
- Staff reads to know what to pack
- Sales tracks for customer service
- Partners track public shipments

---

### 📈 Demand Planning

| Operation              | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| ---------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| Create/Update Forecast | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ✅      | ❌      |
| Run Algorithms         | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ✅      | ❌      |
| Read Forecasts         | ✅    | ✅      | ❌    | 👁️          | 👁️    | ❌        | 👁️      | ❌      |
| Accuracy Analysis      | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | 👁️      | ❌      |

**Key Rules**:

- Analyst creates and runs forecasts
- Procurement/Sales consume forecasts for planning

---

### 📊 Reporting & Analytics

| Report Type           | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| --------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| Stock Levels          | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Movements             | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Valuation             | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Product Performance   | ✅    | ✅      | ❌    | 👁️          | 👁️    | ❌        | 👁️      | ❌      |
| Warehouse Utilization | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| Supplier Performance  | ✅    | ✅      | ❌    | 👁️          | ❌    | ❌        | 👁️      | ❌      |
| Sales Trends          | ✅    | ✅      | ❌    | ❌          | 👁️    | ❌        | 👁️      | ❌      |
| Fulfillment Metrics   | ✅    | ✅      | 👁️    | ❌          | 👁️    | 👁️        | 👁️      | ❌      |
| Custom Reports        | ✅    | ❌      | ❌    | ❌          | ❌    | ❌        | ✅      | ❌      |

**Key Rules**:

- Each role sees relevant reports for their function
- Analyst creates custom reports and has access to all

---

### 🔔 Alerts & Notifications

| Alert Type            | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| --------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| Low Stock             | ✅    | ✅      | 👁️    | 👁️          | ❌    | ❌        | ❌      | ❌      |
| Expiring Products     | ✅    | ✅      | 👁️    | ❌          | ❌    | ❌        | ❌      | ❌      |
| PO Delayed            | ✅    | ✅      | ❌    | 👁️          | ❌    | ❌        | ❌      | ❌      |
| SO Pending            | ✅    | ✅      | ❌    | ❌          | 👁️    | ❌        | ❌      | ❌      |
| Shipment Delayed      | ✅    | ✅      | ❌    | ❌          | 👁️    | 👁️        | ❌      | ❌      |
| Forecast Accuracy Low | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | 👁️      | ❌      |
| **Operations**        |       |         |       |             |       |           |         |
| View My Alerts        | ✅    | ✅      | ✅    | ✅          | ✅    | ✅        | ✅      | ❌      |
| Mark Read/Dismiss     | ✅    | ✅      | ✅    | ✅          | ✅    | ✅        | ✅      | ❌      |
| Configure Rules       | ✅    | ✅      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |

**Key Rules**:

- Alert routing based on responsibility domain
- Users manage their own alerts only

---

### 🔍 Audit & Compliance

| Operation                   | Admin | Manager | Staff | Procurement | Sales | Logistics | Analyst | Partner |
| --------------------------- | ----- | ------- | ----- | ----------- | ----- | --------- | ------- | ------- |
| View Logs                   | ✅    | 👁️      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Query by Entity/Action/Date | ✅    | 👁️      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Query by User               | ✅    | ❌      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |
| Export Logs                 | ✅    | ❌      | ❌    | ❌          | ❌    | ❌        | ❌      | ❌      |

**Key Rules**:

- Admin: Full access including user-specific queries
- Manager: View only, cannot query specific users
- Operational staff: No access (separation of duties)

---

## Implementation

```typescript
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Post()
@Roles(UserRole.admin, UserRole.manager)
create(@Body() dto: CreateDto) {
  // Only admin and manager
}
```

---

## Security Principles

| Principle                | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Least Privilege**      | Users get only permissions needed for their role                                            |
| **Separation of Duties** | Critical operations require multiple roles (e.g., Procurement creates PO, Manager approves) |
| **Defense in Depth**     | Both frontend and backend enforce authorization                                             |
| **Fail Secure**          | Default deny unless explicitly granted                                                      |
| **Audit Everything**     | All privileged operations logged in `audit_logs`                                            |

---

## Change Log

| Date       | Version | Changes                                                                                  |
| ---------- | ------- | ---------------------------------------------------------------------------------------- |
| 2025-12-03 | 1.0     | Initial comprehensive RBAC documentation for 11 modules                                  |
| 2025-12-03 | 1.1     | Added `sales` and `analyst` roles via migration `20251203000000_add_sales_analyst_roles` |

---

## References

- [Architecture Design](./ARCHITECTURE.md) - 11 Bounded Contexts
- [Database Schema](./DATABASE.md) - Tables and relationships
- [Prisma Schema](../backend/prisma/schema.prisma) - UserRole enum definition
