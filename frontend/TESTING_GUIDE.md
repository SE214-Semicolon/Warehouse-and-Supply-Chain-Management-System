# Frontend Testing Guide

## 📋 Testing Structure Overview

This project follows a comprehensive testing strategy with organized folder structure:

```
src/
├── components/
│   ├── DataTable/
│   │   ├── DataTable.jsx              # Component code
│   │   ├── index.js                    # Export file
│   │   └── tests/
│   │       └── DataTable.test.jsx      # Unit tests
│   ├── SearchBar/
│   │   ├── SearchBar.jsx
│   │   ├── index.js
│   │   └── tests/
│   │       └── SearchBar.test.jsx
│   └── ...
│
├── pages/
│   ├── warehouse/
│   │   ├── Warehouse.jsx               # Page component
│   │   ├── ProductDetail.jsx
│   │   ├── components/                 # Page-specific components
│   │   └── tests/
│   │       ├── Warehouse.integration.test.jsx  # Integration tests
│   │       └── validation.test.js              # Unit tests for helpers
│   └── ...
│
e2e/
├── smoke/
│   └── critical-paths.spec.js          # @smoke tagged tests
├── sanity/
│   └── bug-fixes.spec.js               # @sanity tagged tests
├── warehouse.spec.js                   # @regression tagged tests
├── purchase-order.spec.js
└── ...

tests/
├── setup.js                            # Global test setup
├── test-utils.jsx                      # Custom render utilities
└── mocks/
    ├── server.js                       # MSW server setup
    └── handlers.js                     # API mock handlers
```

---

## 🧪 Test Types & When to Use

### 1. **Unit Tests** (Vitest)
- **Location**: `component/tests/ComponentName.test.jsx`
- **Scope**: Individual components, utilities, functions
- **Run Time**: Fast (< 30 seconds)
- **Coverage Target**: 80%+

**Run Commands:**
```bash
npm test                    # Watch mode
npm run test:run           # Single run
npm run test:coverage      # With coverage report
```

**Example Test File**: `src/components/SearchBar/tests/SearchBar.test.jsx`

---

### 2. **Integration Tests** (Vitest + MSW)
- **Location**: `page/tests/PageName.integration.test.jsx`
- **Scope**: Page components + child components + API calls
- **Run Time**: Medium (1-2 minutes)
- **Coverage Target**: 70%+

**What to Test:**
- Complete workflows (create → read → update → delete)
- Component interactions
- API integration (mocked with MSW)
- State management
- Form submissions

**Example Test File**: `src/pages/warehouse/tests/Warehouse.integration.test.jsx`

---

### 3. **E2E Tests** (Playwright)
- **Location**: `e2e/*.spec.js`
- **Scope**: Full user journeys across multiple pages
- **Run Time**: Slow (5-15 minutes)
- **Coverage Target**: Critical paths 100%

**Run Commands:**
```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Open Playwright UI
npm run test:e2e:headed    # Run with browser visible
```

**Test Categories (using tags):**

#### 3a. **Smoke Tests** (`@smoke`)
- **Run**: `npm run test:smoke`
- **Frequency**: After every deployment
- **Run Time**: < 5 minutes
- **Tests**: 5-10 critical functionality checks

**Example**: `e2e/smoke/critical-paths.spec.js`

#### 3b. **Sanity Tests** (`@sanity`)
- **Run**: `npm run test:sanity`
- **Frequency**: After specific bug fixes
- **Run Time**: < 2 minutes
- **Tests**: 3-5 focused validations

**Example**: `e2e/sanity/bug-fixes.spec.js`

#### 3c. **Regression Tests** (`@regression`)
- **Run**: `npm run test:regression`
- **Frequency**: Before major releases
- **Run Time**: 10-15 minutes
- **Tests**: All E2E tests (30-50 tests)

**Example**: `e2e/warehouse.spec.js` (tagged with `@regression`)

---

## 🎨 Testing Design Techniques Applied

### 1. **Happy Path Testing**
Testing normal, expected user flows without errors.

```javascript
test('should create product successfully', async () => {
  // User fills form correctly → Product created
});
```

### 2. **Equivalence Partitioning**
Testing representative values from each group (valid/invalid).

```javascript
test('should accept valid SKU formats', async () => {
  // Test one valid format: "SKU-001"
});

test('should reject invalid SKU formats', async () => {
  // Test one invalid format: "invalid sku"
});
```

### 3. **Boundary Value Analysis (BVA)**
Testing edge cases at boundaries.

```javascript
test('should handle empty string', () => {});
test('should handle single character', () => {});
test('should handle max length (255 chars)', () => {});
test('should reject over max length (256 chars)', () => {});
```

### 4. **Error Guessing**
Intentionally causing errors to test handling.

```javascript
test('should handle API 500 error', async () => {
  server.use(
    http.get('/products', () => HttpResponse.json({}, { status: 500 }))
  );
  // Verify error message displayed
});
```

### 5. **Decision Table Testing**
Testing combinations of conditions.

```javascript
test('Admin + Authenticated + In Stock → Show Buy Button', () => {});
test('Staff + Authenticated + Out of Stock → Hide Buy Button', () => {});
```

### 6. **Non-Functional Checks**
Testing accessibility, performance, security.

```javascript
test('should have accessible labels', () => {
  expect(screen.getByLabelText('Search')).toBeInTheDocument();
});

test('should not have accessibility violations', async () => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### 7. **Basic State & Rendering Check**
Verifying component displays correctly.

```javascript
test('should render with initial props', () => {
  render(<Component data={mockData} />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npm run playwright:install
```

### 3. Start Backend (for E2E tests)
```bash
cd ../backend
npm run dev
```

### 4. Run Tests

**Unit + Integration Tests:**
```bash
npm test                    # Watch mode
npm run test:ui            # Vitest UI
npm run test:coverage      # Generate coverage
```

**E2E Tests:**
```bash
npm run test:e2e           # All E2E tests
npm run test:smoke         # Smoke tests only
npm run test:sanity        # Sanity tests only
npm run test:regression    # Regression tests only
```

---

## 📝 Writing New Tests

### Unit Test Example

**File**: `src/components/MyComponent/tests/MyComponent.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../../tests/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent - Unit Tests', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click event', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Integration Test Example

**File**: `src/pages/mypage/tests/MyPage.integration.test.jsx`

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../../tests/test-utils';
import { server } from '../../../../tests/mocks/server';
import MyPage from '../MyPage';

describe('MyPage - Integration Tests', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('should load data and display', async () => {
    render(<MyPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Data Item')).toBeInTheDocument();
    });
  });
});
```

### E2E Test Example

**File**: `e2e/myfeature.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('My Feature @regression', () => {
  test('should complete workflow @smoke', async ({ page }) => {
    await page.goto('/mypage');
    await page.click('button:has-text("Start")');
    await expect(page).toHaveURL('/result');
  });
});
```

---

## 📊 Coverage Reports

### View Coverage
```bash
npm run test:coverage
```

Coverage report will be generated in:
- **Terminal**: Summary
- **HTML**: `coverage/lcov-report/index.html`

Open in browser:
```bash
# Windows
start coverage/lcov-report/index.html

# Mac/Linux
open coverage/lcov-report/index.html
```

### Coverage Targets
- **Utils**: 90%+
- **Components**: 80%+
- **Pages**: 70%+
- **E2E Critical Paths**: 100%

---

## 🏷️ Test Tags Reference

| Tag | Purpose | Run Command | Run Time |
|-----|---------|-------------|----------|
| `@smoke` | Critical functionality after deploy | `npm run test:smoke` | < 5 min |
| `@sanity` | Quick check after bug fix | `npm run test:sanity` | < 2 min |
| `@regression` | Full test suite before release | `npm run test:regression` | 10-15 min |
| `@critical` | Must-pass tests | `playwright test --grep @critical` | Varies |
| `@auth` | Authentication related | `playwright test --grep @auth` | Varies |
| `@warehouse` | Warehouse feature | `playwright test --grep @warehouse` | Varies |
| `@a11y` | Accessibility tests | `playwright test --grep @a11y` | Varies |

---

## 🛠️ Debugging Tests

### Debug Unit/Integration Tests
```bash
npm run test:ui    # Opens Vitest UI for debugging
```

### Debug E2E Tests
```bash
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # See browser while running
npx playwright test --debug  # Step-through debugger
```

### View Test Results
```bash
npx playwright show-report   # View last E2E test report
```

---

## 🔧 Configuration Files

- **`vitest.config.js`** - Unit/Integration test configuration
- **`playwright.config.js`** - E2E test configuration
- **`tests/setup.js`** - Global test setup (MSW, mocks)
- **`tests/test-utils.jsx`** - Custom render with providers
- **`tests/mocks/handlers.js`** - API mock definitions

---

## ✅ CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🤝 Contributing

When adding new features:

1. **Write unit tests** for new components
2. **Write integration tests** for new pages/workflows
3. **Add E2E tests** for critical user journeys
4. **Tag appropriately**: `@smoke`, `@regression`, etc.
5. **Maintain coverage** above thresholds
6. **Run tests locally** before pushing

---

## 📞 Support

For testing questions or issues, contact the QA team or create an issue in the repository.
