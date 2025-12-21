#!/usr/bin/env python3
"""
Safe replacement script for location integration test patterns
"""
import re

# Read the file
with open('src/modules/warehouse/tests/integration-test/location.integration.spec.ts', 'r') as f:
    content = f.read()

# Replace patterns:
# 1. response.body.location. -> response.body.data.
content = re.sub(r'response\.body\.location\.', 'response.body.data.', content)

# 2. response.body.location (standalone, not followed by letter - avoid locationId etc)
content = re.sub(r'response\.body\.location(?![a-zA-Z])', 'response.body.data', content)

# 3. response.body.locations. -> response.body.data.
content = re.sub(r'response\.body\.locations\.', 'response.body.data.', content)

# 4. response.body.locations (not followed by .) -> response.body.data
content = re.sub(r'response\.body\.locations(?![.])', 'response.body.data', content)

# Write the result
with open('src/modules/warehouse/tests/integration-test/location.integration.spec.ts', 'w') as f:
    f.write(content)

print("Location test patterns fixed successfully")
