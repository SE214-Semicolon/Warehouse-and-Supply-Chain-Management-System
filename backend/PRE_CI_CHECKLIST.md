# Pre-CI Checklist - Code Quality Verification

## 🎯 Objective
Ensure all code passes CI checks before pushing to remote.

---

## ✅ Verification Steps

### Step 1: Format Code
```bash
cd backend
npm run format
```

**What it does:**
- Formats all `.ts` files using Prettier
- Ensures consistent code style

**Expected output:**
```
✓ All files formatted
```

---

### Step 2: Check Formatting
```bash
npm run format:check
```

**What it does:**
- Verifies code formatting without making changes
- Fails if any file needs formatting

**Expected output:**
```
✓ All files are correctly formatted
```

**If fails:**
```bash
npm run format  # Run formatter again
```

---

### Step 3: Lint Code
```bash
npm run lint
```

**What it does:**
- Runs ESLint on all TypeScript files
- Auto-fixes simple issues
- Reports remaining issues

**Expected output:**
```
✓ No linting errors
```

**Common issues and fixes:**

1. **Unused imports:**
```typescript
// ❌ Bad
import { Injectable, BadRequestException } from '@nestjs/common';
// Only using Injectable

// ✅ Good
import { Injectable } from '@nestjs/common';
```

2. **Unused variables:**
```typescript
// ❌ Bad
const user = await findUser();
// user not used

// ✅ Good
await findUser(); // If you don't need it
```

3. **Any type usage:**
```typescript
// ❌ Bad
const data: any = {};

// ✅ Good
const data: Record<string, unknown> = {};
```

---

### Step 4: Build TypeScript
```bash
npm run build
```

**What it does:**
- Compiles TypeScript to JavaScript
- Checks for type errors
- Generates dist/ folder

**Expected output:**
```
✓ Successfully compiled
dist/ folder created
```

**Common TypeScript errors:**

1. **Missing types:**
```typescript
// ❌ Bad
async function getData() {  // implicit any
  return await fetch();
}

// ✅ Good
async function getData(): Promise<DataType> {
  return await fetch();
}
```

2. **Property does not exist:**
```typescript
// ❌ Bad
const warehouse: Warehouse = {};
warehouse.unknownProperty = 'value';

// ✅ Good
const warehouse: Warehouse = {
  ...requiredFields
};
```

3. **Import errors:**
```typescript
// ❌ Bad
import { Something } from './wrong/path';

// ✅ Good
import { Something } from '../correct/path';
```

---

### Step 5: Run Unit Tests
```bash
npm run test
```

**What it does:**
- Runs all `*.spec.ts` files
- Tests individual units of code

**Expected output:**
```
Test Suites: X passed, X total
Tests:       X passed, X total
✓ All tests passed
```

**If tests fail:**

1. **Review the error message**
2. **Check the specific test file**
3. **Fix the implementation or test**
4. **Run again**

**Run specific test:**
```bash
# Test specific module
npm run test -- warehouse

# Test specific file
npm run test -- warehouse.service.spec
```

---

### Step 6: Test Coverage (Optional)
```bash
npm run test:cov
```

**What it does:**
- Runs tests with coverage report
- Shows which lines are not tested

**Target:**
- Aim for >80% coverage
- Focus on critical paths

**Review coverage:**
```bash
# Coverage report in: coverage/
# Open: coverage/lcov-report/index.html
```

---

### Step 7: E2E Tests (Requires Docker)
```bash
# First, ensure Docker is running
# Then run e2e tests
npm run test:e2e
```

**Prerequisites:**
- Docker Desktop running
- PostgreSQL container running
- Database migrations applied

**What it does:**
- Tests complete API flows
- Tests integration between modules

**Common setup issues:**

1. **Database connection error:**
```bash
# Check if PostgreSQL is running
docker ps

# If not, start it
docker-compose up -d postgres
```

2. **Migration not applied:**
```bash
npx prisma migrate dev
```

3. **Seed data needed:**
```bash
npx ts-node prisma/seeds/warehouse-seed.ts
npx ts-node prisma/seeds/product-seed.ts
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Import Errors
**Symptom:** Cannot find module errors

**Solutions:**
```bash
# Regenerate Prisma client
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue 2: Test Timeouts
**Symptom:** Tests timeout after 5000ms

**Solutions:**
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 10000); // 10 seconds

// Or in beforeAll
beforeAll(async () => {
  // ...
}, 30000); // 30 seconds
```

### Issue 3: Module Not Found
**Symptom:** Cannot find '@nestjs/...' or other dependencies

**Solution:**
```bash
npm install
```

### Issue 4: Port Already in Use (E2E tests)
**Symptom:** Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
# On Linux/Mac:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📋 Quick Command Reference

```bash
# All-in-one check (format + lint + build + test)
npm run format && npm run lint && npm run build && npm run test

# Or use the check script
chmod +x scripts/check-code-quality.sh
./scripts/check-code-quality.sh
```

---

## ✅ CI Readiness Checklist

Before pushing to remote:

- [ ] Code formatted (`npm run format:check` passes)
- [ ] No linting errors (`npm run lint` passes)
- [ ] TypeScript compiles (`npm run build` succeeds)
- [ ] All unit tests pass (`npm run test` passes)
- [ ] Test coverage >80% (optional but recommended)
- [ ] E2E tests pass (if Docker available)
- [ ] No console.log statements in production code
- [ ] All TODO comments addressed or documented
- [ ] Documentation updated
- [ ] No merge conflicts

---

## 🔍 Module-Specific Checks

### Product Module
```bash
npm run test -- product
```
Expected: All tests pass ✅

### Warehouse Module
```bash
npm run test -- warehouse
```
Expected: All tests pass ✅

### Inventory Module
```bash
npm run test -- inventory
```
Expected: All tests pass ✅

---

## 🚀 Ready to Push?

Final check:
```bash
# Run all checks
npm run format:check && \
npm run lint && \
npm run build && \
npm run test

# If all pass:
git add .
git commit -m "feat: your commit message"
git push origin your-branch
```

---

## 📞 Need Help?

If any step fails:

1. **Read the error message carefully**
2. **Check the specific file mentioned**
3. **Review the solutions in this document**
4. **Check the module's README**
5. **Ask team for help**

---

## 🎉 Success Criteria

All commands should output:
```
✓ Format check passed
✓ Lint passed
✓ Build succeeded
✓ Tests passed
```

**Ready for CI/CD! 🚀**
