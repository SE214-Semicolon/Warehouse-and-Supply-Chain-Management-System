#!/usr/bin/env python3
"""
Safe replacement script for warehouse integration test patterns
"""
import re

# Read the file
with open('src/modules/warehouse/tests/integration-test/warehouse.integration.spec.ts', 'r') as f:
    content = f.read()

# First, fix the syntax error at line 927
content = content.replace(
    "      expect(response.body.warehouses.length).toBeGreaterThan(0);\n"
    "      response.body.warehouses.forEach((wh) => {\n"
    "        expect(wh.code.toUpperCase()).toContain('EDGE-00');\n"
    "\n"
    "    describe('INTEGRATION-WH-01: Core CRUD Operations', () => {",
    "      expect(response.body.warehouses.length).toBeGreaterThan(0);\n"
    "      response.body.warehouses.forEach((wh) => {\n"
    "        expect(wh.code.toUpperCase()).toContain('EDGE-00');\n"
    "      });\n"
    "    });\n"
    "\n"
    "    describe('INTEGRATION-WH-01: Core CRUD Operations', () => {"
)

# Now replace patterns:
# 1. response.body.warehouse. -> response.body.data.
content = re.sub(r'response\.body\.warehouse\.', 'response.body.data.', content)

# 2. response.body.warehouse (standalone or followed by non-word char, but NOT warehouseId/Name/Code) -> response.body.data
# Use negative lookbehind to avoid matching warehouseId, warehouseName, warehouseCode
content = re.sub(r'response\.body\.warehouse(?![a-zA-Z])', 'response.body.data', content)

# 3. response.body.warehouses. -> response.body.data.
content = re.sub(r'response\.body\.warehouses\.', 'response.body.data.', content)

# 4. response.body.warehouses (not followed by .) -> response.body.data
content = re.sub(r'response\.body\.warehouses(?![.])', 'response.body.data', content)

# Write the result
with open('src/modules/warehouse/tests/integration-test/warehouse.integration.spec.ts', 'w') as f:
    f.write(content)

print("Warehouse test patterns fixed successfully")
