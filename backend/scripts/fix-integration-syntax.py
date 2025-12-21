#!/usr/bin/env python3
"""
Auto-fix missing closing braces in integration test files
Pattern: describe block không được đóng trước khi bắt đầu INTEGRATION-XXX describe block
"""
import re
import sys

def fix_integration_test_syntax(filepath):
    """Fix missing }); before INTEGRATION describe blocks"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern 1: Missing }); before describe('INTEGRATION-
    # Look for: .expect(xxx);\n\n    describe('INTEGRATION-
    # Should be: .expect(xxx);\n    });\n  });\n\n  describe('INTEGRATION-
    
    # Match: one or more blank lines followed by indented describe('INTEGRATION-
    pattern1 = r"(\s+\.expect\([^)]+\);)\n+(\s+)describe\('INTEGRATION-"
    
    def replacement1(match):
        expect_line = match.group(1)
        indent = match.group(2)
        # Add closing test (4 spaces) and closing outer describe (2 spaces)
        return f"{expect_line}\n{indent}});\n  }});\n\n  describe('INTEGRATION-"
    
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: Missing }); after last test in describe block before INTEGRATION blocks
    # This catches cases where there's a test ending but not properly closed
    pattern2 = r"(\s+expect\([^)]+\)\.toBe\([^)]+\);)\n+(\s+)describe\('INTEGRATION-"
    
    def replacement2(match):
        expect_line = match.group(1)
        indent = match.group(2)
        return f"{expect_line}\n{indent}});\n  }});\n\n  describe('INTEGRATION-"
    
    content = re.sub(pattern2, replacement2, content)
    
    # Pattern 3: Missing }); after .expect(xxx) line before INTEGRATION
    pattern3 = r"(\n\s+expect\([^)]+\)\.[^;]+;)\n\n(\s+)describe\('INTEGRATION-"
    
    def replacement3(match):
        expect_line = match.group(1)
        indent = match.group(2)
        return f"{expect_line}\n{indent}});\n  }});\n\n  describe('INTEGRATION-"
    
    content = re.sub(pattern3, replacement3, content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 fix-integration-syntax.py <file1.spec.ts> [file2.spec.ts ...]")
        sys.exit(1)
    
    for filepath in sys.argv[1:]:
        if fix_integration_test_syntax(filepath):
            print(f"✓ Fixed {filepath}")
        else:
            print(f"- No changes needed for {filepath}")
