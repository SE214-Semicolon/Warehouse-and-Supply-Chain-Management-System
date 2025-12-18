# Authentication & Authorization Module

## Overview

Cross-cutting concern handling user authentication (login/signup), authorization (role-based access control), and session management. Provides JWT-based stateless authentication with refresh tokens and invite-based user registration.

**Purpose:** Secure access control for all system operations. Not a business domain, but an infrastructure concern supporting all modules.

## Why Auth is Separate from User Module?

### DDD Perspective

In Domain-Driven Design (DDD) and Modular Monolith architecture:

1. **User Module = Domain Concept**
   - Represents the business entity "User"
   - Manages user data, profiles, roles (WHAT users are)
   - Part of the business domain model
   - Stores: username, email, full name, role, metadata

2. **Auth Module = Infrastructure Concern**
   - Handles HOW users prove their identity
   - Cross-cutting concern spanning all modules
   - Technical mechanism, not business logic
   - Manages: passwords, tokens, sessions, invites

3. **Separation Benefits:**
   - **Single Responsibility:** User module focuses on user data, Auth focuses on security
   - **Reusability:** Auth can support multiple identity sources (OAuth, SAML, LDAP)
   - **Security Isolation:** Sensitive operations (password hashing, token generation) isolated
   - **Testability:** Can mock auth in other module tests
   - **Scalability:** Auth can be extracted to separate service if needed

### Why Not Mentioned in ARCHITECTURE.md?

Auth is typically considered:

- **Cross-cutting concern** (like logging, caching, monitoring)
- **Foundation layer** (part of infrastructure, not business logic)
- **Prerequisite** (assumed to exist, not a bounded context)

Most DDD/Modular Monolith designs focus on **business domains** (Product, Order, Inventory, etc.), while infrastructure concerns (Auth, Logging, Email) are documented separately.

## Features

### Authentication

- **Signup:** User registration with optional invite token
- **Login:** JWT access + refresh token generation
- **Logout:** Refresh token revocation
- **Token Refresh:** Generate new access token from refresh token
- **Change Password:** Authenticated password change

### Authorization (RBAC)

- **Role-based Guards:** `@Roles()` decorator + `RolesGuard`
- **JWT Guard:** Validates JWT tokens on protected routes
- **Role Hierarchy:** Admin > Manager > Staff > Partner

### Invite System

- **Admin-only Invites:** Admins can invite new users
- **Role Assignment:** Invites pre-assign roles
- **Email-bound:** Invite tokens tied to specific email
- **Expiration:** Configurable TTL (default 7 days)
- **Single-use:** Tokens invalidated after signup

## Quick Reference

### API Endpoints

👉 **Swagger UI:** `http://localhost:3000/docs#tag/auth`

**Authentication:**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | Public | Register new user (requires invite token) |
| POST | `/auth/login` | Public | Login with email/password |
| POST | `/auth/logout` | JWT | Logout (revoke refresh token) |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/change-password` | JWT | Change password |
| GET | `/auth/me` | JWT | Get current user info |

**Invites (Admin Only):**
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/invites` | Admin | Create invite token |
| GET | `/invites` | Admin | List invites with filters |
| GET | `/invites/:id` | Admin | Get invite by ID |
| DELETE | `/invites/:id` | Admin | Revoke invite |

### Database

**PostgreSQL Tables:**

**User (in Users module):**

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String?  @unique
  passwordHash String?  // Bcrypt hash
  role         UserRole @default(warehouse_staff)
  active       Boolean  @default(true)
  // ... relations
}
```

**RefreshToken:**

```prisma
model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  revokedAt   DateTime? // For logout

  user        User     @relation(...)

  @@index([token])
  @@index([userId])
}
```

**UserInvite:**

```prisma
model UserInvite {
  id           String    @id @default(uuid())
  email        String
  role         UserRole
  token        String    @unique
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
  usedAt       DateTime? // When signup completed
  createdById  String?
  usedById     String?

  createdBy    User?     @relation("InviteCreatedBy", ...)
  usedBy       User?     @relation("InviteUsedBy", ...)

  @@index([token])
  @@index([email])
}
```

### Dependencies

**Uses:**

- `UsersModule` - User data access
- `JwtModule` - JWT token generation/verification
- `PassportModule` - Passport.js authentication strategies
- `PrismaService` - Database access
- `bcryptjs` - Password hashing

**Used by:**

- **All modules** - Protected routes require JWT authentication
- **Controllers** - Use `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles()`

## Architecture

### Components

```
auth/
├── auth.module.ts              # Module configuration
├── index.ts                    # Exports
├── controllers/
│   ├── auth.controller.ts      # Authentication endpoints (6)
│   └── invite.controller.ts    # Invite management (4)
├── services/
│   ├── auth.service.ts         # Authentication logic
│   └── invite.service.ts       # Invite management logic
├── guards/
│   ├── jwt.guard.ts            # JWT validation guard
│   └── roles.guard.ts          # RBAC authorization guard
├── strategies/
│   └── jwt.strategy.ts         # Passport JWT strategy
├── decorators/
│   └── roles.decorator.ts      # @Roles() decorator
└── dto/
    ├── signup.dto.ts
    ├── login.dto.ts
    ├── refresh.dto.ts
    ├── logout.dto.ts
    ├── change-password.dto.ts
    ├── create-invite.dto.ts
    └── query-invite.dto.ts
```

### Key Responsibilities

- **Controllers:** Public (signup/login) and protected (logout/change password) endpoints
- **Services:** Business logic for authentication, token management, invite lifecycle
- **Guards:** Request validation (JWT) and authorization (RBAC)
- **Strategies:** Passport.js integration for JWT extraction and validation

### Design Decisions

**Why JWT Instead of Sessions?**

- **Stateless:** No server-side session storage
- **Scalable:** Works across multiple server instances
- **Microservice-ready:** Tokens can be validated by any service
- **Mobile-friendly:** Tokens easy to store in mobile apps

**Why Refresh Tokens?**

- **Security:** Short-lived access tokens (15 min default)
- **Revocation:** Can invalidate refresh tokens on logout
- **User Experience:** No frequent re-login required

**Why Invite System?**

- **Admin Control:** Only admins can create accounts
- **Pre-assigned Roles:** Ensures proper initial permissions
- **Email Verification:** Confirms user owns the email
- **Security:** Prevents unauthorized registrations

## Business Rules

### 1. Signup Flow

```
1. User receives invite email with token
2. User visits signup page with token in URL
3. System validates:
   - Token exists
   - Token not expired
   - Token not already used
   - Email matches invite email
4. User creates password
5. User account created with pre-assigned role
6. Invite marked as used
```

### 2. Login Flow

```
1. User submits email + password
2. System validates:
   - User exists
   - User account active
   - Password correct (bcrypt comparison)
3. Generate access token (15 min TTL)
4. Generate refresh token (7 days TTL)
5. Store refresh token in database
6. Return both tokens to client
```

### 3. Token Refresh Flow

```
1. Client submits expired access token + valid refresh token
2. System validates:
   - Refresh token exists in database
   - Refresh token not expired
   - Refresh token not revoked
3. Generate new access token
4. Optionally rotate refresh token (recommended for high security)
5. Return new access token
```

### 4. Password Requirements

```
Minimum 8 characters (enforced by DTO)
Hashed with bcrypt (cost factor 10)
Never stored in plain text
Never returned in API responses
```

### 5. Role Hierarchy & Permissions

```
admin:
  - Full access to all modules
  - Can create invites
  - Can manage all users

manager:
  - Can manage operations
  - Can view reports
  - Cannot create invites

warehouse_staff:
  - Inventory operations
  - Stock movements

procurement:
  - Supplier management
  - Purchase orders

sales_analyst:
  - Customer management
  - Sales orders

logistics:
  - Shipment management

partner:
  - Limited external access
```

### 6. Invite Token Lifecycle

```
Created:
  - Token: random UUID
  - TTL: 7 days (configurable)
  - Status: pending

Used (on signup):
  - usedAt timestamp set
  - usedById set to new user ID
  - Token cannot be reused

Expired:
  - expiresAt < now()
  - Cannot be used for signup
  - Can be deleted by admin

Revoked (deleted):
  - Admin can delete pending invites
  - Prevents signup with that token
```

## Security Best Practices

### Password Security

```typescript
// Hashing (on signup/change password)
const salt = await bcryptjs.genSalt(10);
const hash = await bcryptjs.hash(password, salt);

// Verification (on login)
const isValid = await bcryptjs.compare(password, user.passwordHash);
```

### JWT Configuration

```typescript
// Access Token
{
  secret: process.env.JWT_ACCESS_SECRET,
  expiresIn: '15m' // Short-lived
}

// Refresh Token
{
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: '7d'  // Long-lived, stored in DB
}
```

### Guard Usage

```typescript
// Protect route with JWT
@UseGuards(JwtAuthGuard)
@Get('protected')
async protectedRoute() { ... }

// Protect route with JWT + RBAC
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
@Post('admin-only')
async adminRoute() { ... }
```

## Testing

### Test Coverage

```
Auth Service:       Unit tests (mocked dependencies)
Invite Service:     Unit tests (mocked dependencies)
Auth Controller:    E2E tests (signup/login/logout flow)
Invite Controller:  E2E tests (invite CRUD)
Guards:             Unit tests (JWT validation, RBAC logic)
```

### Running Tests

```bash
# Unit tests
npm test -- --testPathPattern=auth.*unit

# E2E tests
npm test -- --testPathPattern=auth.*e2e

# All auth tests
npm test -- --testPathPattern=auth
```

### Test Cases

**Authentication Tests:**

- ✅ Signup with valid invite token
- ✅ Signup fails with expired token
- ✅ Signup fails with used token
- ✅ Signup fails with wrong email
- ✅ Login with valid credentials
- ✅ Login fails with wrong password
- ✅ Login fails for inactive user
- ✅ Refresh token generates new access token
- ✅ Logout revokes refresh token
- ✅ Change password updates hash

**Authorization Tests:**

- ✅ JWT guard rejects requests without token
- ✅ JWT guard rejects expired tokens
- ✅ Roles guard allows admin to access admin routes
- ✅ Roles guard denies non-admin access to admin routes
- ✅ Roles guard allows multiple roles

**Invite Tests:**

- ✅ Admin can create invite
- ✅ Non-admin cannot create invite
- ✅ Invite token is unique
- ✅ Invite expires after TTL
- ✅ Used invite cannot be reused

## Error Handling

### Common Errors

```typescript
// Authentication
401 UnauthorizedException: 'Invalid credentials'
401 UnauthorizedException: 'Email already registered'
401 UnauthorizedException: 'Invalid invite token'
401 UnauthorizedException: 'Invite token expired'
401 UnauthorizedException: 'Invite token already used'
401 UnauthorizedException: 'Invalid refresh token'

// Authorization
403 ForbiddenException: 'Insufficient permissions'
403 ForbiddenException: 'User account is inactive'
```

## Integration with Other Modules

### How Modules Use Auth

```typescript
// Example: Product Controller
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply to all routes
export class ProductController {

  @Post()
  @Roles('admin', 'manager') // Admin or Manager only
  async create(@Body() dto: CreateProductDto) { ... }

  @Get()
  @Roles('admin', 'manager', 'warehouse_staff') // Multiple roles
  async findAll() { ... }

  @Get(':id')
  // No @Roles() means all authenticated users can access
  async findOne(@Param('id') id: string) { ... }
}
```

### Accessing Current User

```typescript
// In controller (via JWT payload)
@Get('me')
@UseGuards(JwtAuthGuard)
async getProfile(@Req() req) {
  const userId = req.user.sub; // From JWT payload
  const email = req.user.email;
  const role = req.user.role;
  return this.usersService.findById(userId);
}
```

## Environment Variables

```bash
# JWT Secrets (REQUIRED)
JWT_ACCESS_SECRET=your-access-secret-min-10-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-10-chars

# JWT Expiration (optional, defaults shown)
JWT_ACCESS_TTL=15m   # Access token lifetime
JWT_REFRESH_TTL=7d   # Refresh token lifetime
```

## Future Enhancements

1. **OAuth/Social Login:** Google, Microsoft, GitHub integration
2. **Two-Factor Authentication (2FA):** SMS or authenticator app
3. **Password Reset:** Email-based reset flow
4. **Rate Limiting:** Prevent brute force attacks
5. **Session Management:** Track active sessions, force logout
6. **Audit Logging:** Log all auth events (login, failed attempts)
7. **IP Whitelisting:** Restrict access by IP
8. **Device Fingerprinting:** Track login devices
9. **Account Lockout:** Lock after N failed login attempts
10. **SAML/LDAP:** Enterprise SSO integration

## Related Documentation

- [Architecture Overview](../../../docs/ARCHITECTURE.md)
- [RBAC Policies](../../../docs/RBAC.md)
- [User Module](../users/README.md)
- [Database Schema](../../../docs/DATABASE.md)

## FAQs

**Q: Why are passwords nullable in User model?**  
A: To support OAuth/SSO users who don't have passwords. They authenticate via external providers.

**Q: Why separate access and refresh tokens?**  
A: Security. Access tokens are short-lived (15 min) to limit exposure if stolen. Refresh tokens are long-lived but stored in DB and can be revoked.

**Q: Can I add custom roles?**  
A: Yes, but requires:

1. Add to `UserRole` enum in Prisma schema
2. Run migration
3. Update RBAC guards if needed
4. Document new role permissions

**Q: How to test protected routes?**  
A: Generate JWT tokens using `scripts/generate-tokens.js` or use test helper to create valid tokens.

**Q: Why invite system instead of open registration?**  
A: Security and control. Prevents unauthorized account creation, ensures proper role assignment, and provides email verification.
