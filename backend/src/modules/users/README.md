# User Management Module

## Overview

User account and access management system handling authentication, authorization, and user lifecycle. Supports user CRUD operations, role-based access control (RBAC), and account status management.

**Purpose:** Manage user accounts, roles, permissions, and authentication credentials.

## Features

- **User CRUD:** Create, read, update, delete user accounts
- **Role Management:** Assign roles (Admin, Manager, Staff, etc.)
- **Account Status:** Activate/deactivate user accounts
- **Email/Username Lookup:** Find users by email or username
- **Metadata Support:** Store additional user information (department, employee ID, etc.)
- **Password Management:** Secure password hashing with bcrypt
- **User Listing:** Paginated user lists with filtering

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/users`

**Users:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users` | Admin | Create new user |
| GET | `/users` | Admin, Manager | List users with pagination |
| GET | `/users/:id` | Admin, Manager | Get user by ID |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |
| PATCH | `/users/:id/deactivate` | Admin | Deactivate user account |
| PATCH | `/users/:id/activate` | Admin | Activate user account |

### Database

**PostgreSQL Table:**

**User:**

```prisma
model User {
  id             String          @id @default(uuid())
  username       String          @unique
  fullName       String?
  passwordHash   String?         // Bcrypt hashed password
  email          String?         @unique
  role           UserRole        @default(warehouse_staff)
  active         Boolean         @default(true)
  metadata       Json?           // Additional user info
  createdAt      DateTime        @default(now())

  // Relations
  purchaseOrders PurchaseOrder[] @relation("UserCreatedPO")
  refreshTokens  RefreshToken[]
  salesOrders    SalesOrder[]    @relation("UserCreatedSO")
  stockMovements StockMovement[] @relation("UserStockMovements")
  invitesCreated UserInvite[]    @relation("InviteCreatedBy")
  invitesUsed    UserInvite[]    @relation("InviteUsedBy")

  @@index([email])
  @@index([username])
}
```

**UserRole Enum:**

- `admin` - Full system access
- `manager` - Department management, reporting
- `warehouse_staff` - Warehouse operations
- `procurement` - Supplier and purchase order management
- `sales_analyst` - Sales order and customer management
- `logistics` - Shipment and delivery management
- `partner` - Limited external access

### Dependencies

**Uses:**

- `PrismaService` - Database access
- `bcryptjs` - Password hashing
- `AuthModule` - JWT token validation (for protected routes)

**Used by:**

- `AuthModule` - Login, registration, password reset
- `ProcurementModule` - Track PO creators
- `SalesModule` - Track SO creators
- `InventoryModule` - Track stock movement creators
- `AuditLogModule` - Audit trail of user actions

## Architecture

### Components

```
users/
├── users.controller.ts       # User CRUD (7 endpoints)
├── users.service.ts          # User business logic
├── users.module.ts           # Module configuration
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── query-user.dto.ts
│   └── user-response.dto.ts
├── entities/
│   └── user.entity.ts        # User entity (Swagger)
├── repositories/
│   └── user.repository.ts    # User data access
└── interfaces/
    └── user-repository.interface.ts
```

**Key Responsibilities:**

- **Controller:** HTTP handling, RBAC guards (Admin-only for most operations)
- **Service:** Business logic, password hashing, validation
- **Repository:** Database CRUD with Prisma

### Key Design Decisions

**Why Username and Email Both Unique?**

- Username for internal system login
- Email for external communication, password reset
- Both optional (one must be provided)
- Supports both username-based and email-based authentication

**Why PasswordHash Nullable?**

- Supports OAuth/SSO users (no password)
- Supports invited users (set password on first login)
- Regular users must have password hash

**Why Metadata Field?**

- Flexible storage for custom user attributes
- Avoids schema changes for new user properties
- Examples: department, employeeId, phoneNumber, preferences

**Why Active Boolean?**

- Soft deactivation (not deletion)
- Preserves historical data (orders, audit logs reference users)
- Can reactivate accounts if needed
- Inactive users cannot login

## Business Rules

### 1. Username/Email Uniqueness

```
Username must be unique (case-sensitive in DB, case-insensitive lookup)
Email must be unique if provided (case-insensitive)
At least one of username or email must be provided
Database unique constraints enforced
```

### 2. Password Requirements

```
Minimum 8 characters (enforced by DTO validation)
Must contain: uppercase, lowercase, number, special char (optional, can add validator)
Hashed with bcrypt (cost factor 10)
Never stored or returned in plain text
```

### 3. Default Role

```
New users default to 'warehouse_staff' role
Admin can override during creation
Only Admin can change user roles
```

### 4. Account Activation

```
New accounts default to active = true
Admin can deactivate accounts
Inactive users:
  - Cannot login
  - Cannot perform any operations
  - Still visible in user lists (filtered by active status)
```

### 5. User Deletion

```
Hard delete only (no soft delete for users)
Cannot delete user if:
  - Has created purchase orders
  - Has created sales orders
  - Has stock movements
  - Has refresh tokens (must revoke first)

Error: "Cannot delete user with associated data"
```

### 6. Role Hierarchy

```
Permissions (from highest to lowest):
  admin          - Full access to all modules
  manager        - Manage operations, view reports
  warehouse_staff - Inventory, stock movements
  procurement    - Suppliers, purchase orders
  sales_analyst  - Customers, sales orders
  logistics      - Shipments, deliveries
  partner        - Limited read access

Role-based guards enforce access control
```

## Testing

### Test Coverage

```
Users Service:    Unit tests (repository mocked)
Users Controller: E2E tests (RBAC validation)
User Sanity:      E2E tests (CRUD workflow)
```

### Running Tests

```bash
# Unit tests only
npm test -- --testPathPattern=users.*unit

# E2E tests
npm test -- --testPathPattern=users.*e2e

# All user tests
npm test -- --testPathPattern=users
```

### Test Cases

**User Tests:**

- ✅ Create user with valid data
- ✅ Username uniqueness validation
- ✅ Email uniqueness validation
- ✅ Password hashing on creation
- ✅ Get user by ID (password hash excluded)
- ✅ Update user information
- ✅ Deactivate user account
- ✅ Activate user account
- ✅ Cannot delete user with associated data
- ✅ List users with pagination
- ✅ Filter users by role
- ✅ Filter users by active status

## Security Considerations

### Password Handling

```typescript
// Password hashing
const salt = await bcryptjs.genSalt(10);
const hash = await bcryptjs.hash(password, salt);

// Password verification (in AuthService)
const isValid = await bcryptjs.compare(password, user.passwordHash);

// Never return password hash in API responses
// Use DTOs to exclude sensitive fields
```

### Authentication

```
Users module only manages user data
Authentication (login, JWT) handled by AuthModule
Users module requires JWT validation for all endpoints
```

### RBAC Guards

```typescript
// Example: Only Admin can create users
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin')
@Post()
async create(@Body() dto: CreateUserDto) { ... }
```

## Error Handling

### Common Errors

```typescript
// User not found
404 NotFoundException: 'User not found'

// Duplicate username
409 ConflictException: 'Username already exists'

// Duplicate email
409 ConflictException: 'Email already exists'

// Invalid role
400 BadRequestException: 'Invalid user role'

// Cannot delete with associations
400 BadRequestException: 'Cannot delete user with associated purchase orders/sales orders'

// Weak password
400 BadRequestException: 'Password must be at least 8 characters'
```

## Logging & Monitoring

### Log Events

```typescript
// No logging currently in UsersService
// Recommend adding:

// Create operations
logger.log(`Creating user: ${data.email || data.username}`);
logger.log(`User created: ${user.id}`);

// Update operations
logger.log(`Updating user ${id}`);
logger.warn(`User ${id} not found`);

// Deactivation
logger.log(`Deactivating user ${id}`);
logger.log(`User ${id} deactivated successfully`);

// Deletion attempts
logger.warn(`Cannot delete user ${id} - has associated data`);
```

## Future Enhancements

1. **Password Reset:** Email-based password reset flow
2. **Two-Factor Authentication:** SMS or authenticator app 2FA
3. **Password History:** Prevent password reuse
4. **Session Management:** Track active sessions, force logout
5. **Audit Trail:** Log all user management actions
6. **User Groups:** Organize users into teams/departments
7. **Permission Granularity:** Fine-grained permissions beyond roles
8. **OAuth/SSO Integration:** Google, Microsoft login
9. **User Profile:** Avatar upload, preferences, timezone
10. **Activity Monitoring:** Track last login, failed login attempts

## Related Documentation

- [Architecture Overview](../../../docs/ARCHITECTURE.md)
- [RBAC Policies](../../../docs/RBAC.md)
- [Authentication Module](../auth/README.md)
- [Database Schema](../../../docs/DATABASE.md)
