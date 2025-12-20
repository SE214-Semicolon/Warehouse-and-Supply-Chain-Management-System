# TEST STRUCTURE DOCUMENTATION

## Overview

Backend test suite follows industry-standard test pyramid with 4 distinct layers.

## Test Layers

### 1. Smoke Tests (System-wide) - `src/tests/smoke/`

**Purpose**: Verify application can start and critical systems work

**Characteristics**:

- **Scope**: Entire system (not per-module)
- **Count**: ~15 tests total
- **Speed**: < 30 seconds
- **Setup**: Minimal - just app initialization
- **Assertions**: Shallow - only verify endpoints respond

**What to test**:

- ✅ Application starts
- ✅ Database connections (PostgreSQL + MongoDB)
- ✅ Authentication works
- ✅ Critical endpoints return < 500

**What NOT to test**:

- ❌ Response body validation
- ❌ Business logic
- ❌ Edge cases
- ❌ Authorization rules

**Run**:

```bash
npm run test:smoke
```

**Files**:

- `src/tests/smoke/system.smoke.spec.ts`

---

### 2. Sanity Tests (Basic workflows) - `*/tests/sanity-test/`

**Purpose**: Verify basic workflows after deployments/changes

**Characteristics**:

- **Scope**: Per module
- **Count**: ~85 tests (2-3 per module)
- **Speed**: < 2 minutes
- **Setup**: Full E2E but minimal data
- **Assertions**: Basic - verify success/failure only

**What to test**:

- ✅ Create-Read-Delete workflows
- ✅ List endpoints work
- ✅ Basic happy paths

**What NOT to test**:

- ❌ Deep field validation
- ❌ Complex business rules
- ❌ Authorization matrices
- ❌ Error edge cases

**Run**:

```bash
npm run test:sanity
```

**Files**:

- `src/modules/*/tests/sanity-test/*.sanity.spec.ts`

---

### 3. Integration Tests (Full E2E) - `*/tests/integration-test/`

**Purpose**: Test complete workflows and cross-module interactions

**Characteristics**:

- **Scope**: Per module + cross-module
- **Count**: ~855 tests (combined from previous main + additional)
- **Speed**: < 30 minutes
- **Setup**: Full E2E with comprehensive data
- **Assertions**: Deep - validate all fields and business rules

**What to test**:

- ✅ Complete CRUD workflows
- ✅ Field validation (all properties)
- ✅ Business rules enforcement
- ✅ Authorization matrices
- ✅ Error handling
- ✅ Cross-module interactions
- ✅ Filtering, sorting, pagination
- ✅ Batch operations
- ✅ Edge cases

**Run**:

```bash
npm run test:integration
```

**Files**:

- `src/modules/*/tests/integration-test/*.integration.spec.ts`

---

### 4. Unit Tests (Isolated) - `*/tests/unit-test/` + `*/controllers/`

**Purpose**: Test individual functions/methods in isolation

**Characteristics**:

- **Scope**: Per service/class/controller
- **Count**: ~758 tests
- **Speed**: < 10 seconds
- **Setup**: Mocks only, no real dependencies
- **Assertions**: Focused on logic, not integration

**What to test**:

- ✅ Service methods (in `tests/unit-test/`)
- ✅ Business logic calculations
- ✅ Validation functions
- ✅ Data transformations
- ✅ Controller routing & request handling (in `controllers/`)

**What NOT to test**:

- ❌ Database queries
- ❌ HTTP requests
- ❌ External services

**Run**:

```bash
npm run test:unit
```

**Files**:

- `src/modules/*/tests/unit-test/*.service.spec.ts` (Service tests)
- `src/modules/*/controllers/*.controller.spec.ts` (Controller tests - colocation pattern)

**Note**: Controller tests follow **NestJS convention** of colocating test files with source files.

---

## Test Commands

### Individual layers:

```bash
npm run test:unit         # Unit tests (~758 tests, <10s)
npm run test:smoke        # Smoke tests (~15 tests, <30s)
npm run test:sanity       # Sanity tests (~85 tests, <2m)
npm run test:integration  # Integration tests (~855 tests, <30m)
```

### Combined:

```bash
npm run test:quick        # Unit + Smoke (~773 tests, <1m)
npm run test:full         # All layers (~1713 tests, <35m)
```

### CI/CD:

```bash
npm run test:ci           # Quick validation (unit + smoke)
npm run test:nightly      # Full test suite (all layers)
```

---

## Test Structure Summary

```
Total Tests: ~1,713
├── Smoke Tests:         15 (1%)  - System health
├── Sanity Tests:        85 (5%)  - Basic workflows
├── Integration Tests:  855 (50%) - Full E2E
└── Unit Tests:         758 (44%) - Isolated logic
```

---

## Industry Standards Compliance

✅ **Test Pyramid**: Follows Google/Microsoft recommendations

- Unit: 44% (target: 60-70%, but acceptable for API-heavy project)
- Integration: 50% (target: 20-30%, higher due to business logic complexity)
- Sanity + Smoke: 6% (target: <10%)

✅ **Naming**: Clear purpose-driven names
✅ **Separation**: Distinct test types with different scopes
✅ **Speed**: Fast feedback (unit + smoke < 1 min)
✅ **Coverage**: Comprehensive E2E testing for business critical paths

---

## Migration Notes (December 2025)

**What changed**:

1. Created system-wide smoke tests (was per-module before)
2. Renamed `smoke-test/` → `sanity-test/` (more accurate)
3. Merged old `sanity-test/` + `integration-test/` → single `integration-test/` (industry standard)
4. Renamed `*.e2e.spec.ts` → `*.integration.spec.ts` (clearer naming)

**Why**:

- Previous "smoke tests" were actually sanity tests (tested workflows)
- Previous "sanity tests" were actually integration tests (full E2E with deep validation)
- No true smoke tests existed (app health check)
- Having separate "main" and "additional" integration folders was not industry standard

**Impact**:

- ✅ Better alignment with industry standards
- ✅ Clearer test purposes
- ✅ No test coverage lost
- ✅ Single integration-test folder per module (industry standard)
- ✅ All tests consolidated and deduplicated
