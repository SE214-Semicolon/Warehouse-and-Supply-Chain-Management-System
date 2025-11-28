# Backend Architecture

## Overview

This document describes the backend architecture of the Warehouse and Supply Chain Management System. The system follows a **Modular Monolith** pattern with **Domain-Driven Design (DDD)** principles, built on NestJS framework.

## Architecture Diagram

![Modular Monolith Architecture](./diagrams/modular-monolith-architecture.png)

## Design Principles

### 1. Modular Monolith with Bounded Contexts

The system is organized into **11 bounded contexts**, each representing a distinct business domain:

- **Product Management**: Product catalog, categorization, and batch tracking
- **Warehouse Management**: Physical warehouse and storage location management
- **Inventory Management**: Stock levels, inventory tracking, and stock movements
- **Procurement**: Supplier management and purchase order processing
- **Sales**: Customer management and sales order processing
- **Logistics**: Shipment management and delivery tracking
- **Demand Planning**: Sales forecasting and demand prediction
- **Reporting & Analytics**: Business intelligence and historical analysis
- **Alerts & Notifications**: Real-time event notifications and warnings
- **User Management**: User accounts, roles, and authentication
- **Audit & Compliance**: Compliance logging and security audit trails

### 2. Domain-Driven Design (DDD)

**Key DDD Concepts Applied:**

- **Bounded Contexts**: Each module owns its domain logic and data
- **Data Ownership**: Clear boundaries prevent direct database access across modules
- **Ubiquitous Language**: Domain terms used consistently throughout each module
- **Aggregates**: Each module defines its own aggregates and domain entities

### 3. Layered Architecture

Each module follows a consistent 3-layer architecture:

```
Controller Layer  →  HTTP/API endpoints, request/response handling
Service Layer     →  Business logic, domain rules, orchestration
Repository Layer  →  Data persistence, database queries
```

### 4. Polyglot Persistence

The system uses different databases optimized for different data characteristics:

**PostgreSQL (Transactional Data):**

- 9 modules use PostgreSQL for ACID-compliant transactional data
- Strong consistency, complex relationships, referential integrity
- Tables: 16 domain tables across Product, Warehouse, Inventory, Procurement, Sales, Logistics, Demand Planning, User Management

**MongoDB (Operational Data):**

- 2 modules use MongoDB for operational data with TTL requirements
- Flexible schema, time-series characteristics, auto-expiration
- Collections:
  - `audit_logs`: Compliance and security audit trails (TTL: 180 days)
  - `alerts`: Real-time event notifications (TTL: 90 days)

## Module Interactions

**Core Dependencies:**

- **Inventory** depends on **Product** and **Warehouse** (stock must reference products and locations)
- **Sales** depends on **Product** and **Customer** (orders reference products)
- **Procurement** depends on **Product** and **Supplier** (purchase orders reference products)
- **Logistics** depends on **Sales** (shipments fulfill sales orders)
- **Alerts** triggered by **Inventory** and **Product** (low stock, expiring products)
- **Demand Planning** analyzes **Product** sales history (forecasting)

**Module Communication:**

- Modules interact through **service-to-service calls** within the monolith
- Interfaces are well-defined to maintain loose coupling
- Future migration path: modules can be extracted to microservices if needed

## Technology Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Primary Database**: PostgreSQL 14+
- **Secondary Database**: MongoDB 6+
- **ORM**: Prisma (PostgreSQL), Native MongoDB Driver
- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-Based Access Control (RBAC)

## Design Rationale

**Why Modular Monolith?**

- Simpler deployment and operations compared to microservices
- Easier development workflow (single codebase, shared models)
- Clear module boundaries prepare for future microservices migration
- Reduced operational complexity (single database cluster management)

**Why DDD?**

- Complex business domain requires clear domain boundaries
- Prevents "big ball of mud" anti-pattern
- Enables team ownership of specific bounded contexts
- Facilitates parallel development across modules

**Why Polyglot Persistence?**

- PostgreSQL for transactional integrity (orders, inventory, shipments)
- MongoDB for operational data with TTL (logs auto-expire, no manual cleanup)
- Each database optimized for its specific use case
- Compliance data separated from transactional data

## Future Considerations

- **Event-Driven Architecture**: Introduce event bus for asynchronous module communication
- **CQRS Pattern**: Separate read/write models for Reporting module
- **Cache Layer**: Redis for frequently accessed data (product catalog, inventory levels)
- **Microservices Migration**: Extract modules to independent services when scaling demands it
