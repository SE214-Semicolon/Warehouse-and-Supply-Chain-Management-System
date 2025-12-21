#!/usr/bin/env python3
"""
Fix all integration test files with missing closing braces before INTEGRATION describe blocks
"""
import re
import os

files_to_fix = [
    'src/modules/inventory/tests/integration-test/inventory.integration.spec.ts',
    'src/modules/sales/tests/integration-test/sales-order.integration.spec.ts',
    'src/modules/procurement/tests/integration-test/purchase-order.integration.spec.ts',
    'src/modules/procurement/tests/integration-test/supplier.integration.spec.ts',
    'src/modules/product/tests/integration-test/product-batch.integration.spec.ts',
    'src/modules/product/tests/integration-test/product-category.integration.spec.ts',
    'src/modules/product/tests/integration-test/product.integration.spec.ts',
    'src/modules/reporting/tests/integration-test/reporting.integration.spec.ts',
]

def fix_file(filepath):
    """Fix missing closing braces before INTEGRATION describe blocks"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Pattern: find places where INTEGRATION describe blocks start without proper closing
        # Look for: .expect(XXX);\n\n    describe('INTEGRATION-
        # Should be: .expect(XXX);\n    });\n  });\n\n  describe('INTEGRATION-
        
        # Fix pattern 1: Missing }); before INTEGRATION describe (most common)
        pattern1 = r'(\n      \.expect\(\d+\);\n)\s*\n(\s+describe\(\'INTEGRATION-)'
        replacement1 = r'\1    });\n  });\n\n  \2'
        content = re.sub(pattern1, replacement1, content)
        
        # Fix pattern 2: Missing }); at end of test before INTEGRATION
        pattern2 = r'(\n      expect\([^\)]+\)[^\n]*;\n)\s*\n(\s+describe\(\'INTEGRATION-)'
        replacement2 = r'\1    });\n  });\n\n  \2'
        content = re.sub(pattern2, replacement2, content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
        return False

fixed_count = 0
for filepath in files_to_fix:
    if os.path.exists(filepath):
        if fix_file(filepath):
            fixed_count += 1
            print(f"✓ Fixed {filepath}")
        else:
            print(f"✗ Failed to fix {filepath}")
    else:
        print(f"✗ File not found: {filepath}")

print(f"\n✓ Fixed {fixed_count}/{len(files_to_fix)} files")
