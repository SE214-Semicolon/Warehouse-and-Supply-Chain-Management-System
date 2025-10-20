#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Starting Code Quality Check..."
echo "=================================="

# Check if we're in backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from backend directory${NC}"
    exit 1
fi

# 1. Format Check
echo ""
echo "📝 Step 1: Checking code formatting..."
if npm run format:check; then
    echo -e "${GREEN}✅ Code formatting check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Code formatting issues found. Running formatter...${NC}"
    npm run format
    echo -e "${GREEN}✅ Code formatted${NC}"
fi

# 2. Lint Check
echo ""
echo "🔍 Step 2: Running ESLint..."
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed. Please fix the issues above.${NC}"
    exit 1
fi

# 3. TypeScript Compilation
echo ""
echo "🔨 Step 3: Checking TypeScript compilation..."
if npm run build; then
    echo -e "${GREEN}✅ TypeScript compilation passed${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

# 4. Unit Tests
echo ""
echo "🧪 Step 4: Running unit tests..."
if npm run test -- --passWithNoTests; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi

# 5. Test Coverage (optional, doesn't fail)
echo ""
echo "📊 Step 5: Generating test coverage report..."
npm run test:cov -- --passWithNoTests || true

echo ""
echo "=================================="
echo -e "${GREEN}✅ All checks completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review test coverage report"
echo "  2. Run e2e tests: npm run test:e2e"
echo "  3. Check if Docker containers are running for e2e tests"
