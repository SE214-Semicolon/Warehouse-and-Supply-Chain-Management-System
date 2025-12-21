#!/usr/bin/env python3
"""
Comprehensive fix for supplier.integration.spec.ts structural issues.

Issues:
1. Line 839: deleteMany({ missing closing });
2. Line 840-841: it('SUP-INT-45') missing closing });
3. Line 843+: INTEGRATION blocks nested inside DELETE instead of being siblings
4. INTEGRATION blocks need to be dedented by 2 spaces
"""

def fix_supplier_structure():
    file_path = "src/modules/procurement/tests/integration-test/supplier.integration.spec.ts"
    
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Step 1: Fix line 839 - add closing for deleteMany and it block
    # Line 838 (index 838): "      await prisma.purchaseOrder.deleteMany({"
    # Line 839 (index 839): "        where: { supplierId: supplierWithPO.id },"
    # Need to insert after line 839:
    #   Line 840: "      });"  (close deleteMany)
    #   Line 841: "    });"    (close it block for SUP-INT-45)
    
    lines.insert(840, "      });\n")
    lines.insert(841, "    });\n")
    
    # Step 2: Close DELETE describe block
    # After the above inserts, line 841 is the closing of SUP-INT-45
    # Need to insert after line 841:
    #   Line 842: blank line
    #   Line 843: "  });"  (close DELETE describe)
    #   Line 844: blank line
    
    lines.insert(842, "\n")
    lines.insert(843, "  });\n")
    lines.insert(844, "\n")
    
    # Step 3: Dedent INTEGRATION blocks
    # After above inserts, INTEGRATION-SUP-01 starts at line 845 (was 841)
    # Find the range of INTEGRATION blocks and dedent by 2 spaces
    
    # Find start and end of INTEGRATION section
    integration_start = None
    integration_end = None
    
    for i, line in enumerate(lines):
        if "describe('INTEGRATION-SUP-01" in line:
            integration_start = i
        if integration_start is not None and i > integration_start and line.strip() == "});":
            # This is the closing of main describe
            integration_end = i
            break
    
    if integration_start and integration_end:
        # Dedent all lines in this range by 2 spaces
        for i in range(integration_start, integration_end):
            if lines[i].startswith("    "):  # Has at least 4 spaces
                lines[i] = lines[i][2:]  # Remove 2 spaces
            elif lines[i].startswith("  "):  # Has 2 spaces (should stay)
                pass  # Keep as is
    
    with open(file_path, 'w') as f:
        f.writelines(lines)
    
    print(f"Fixed structure:")
    print(f"  - Closed deleteMany at line 840")
    print(f"  - Closed SUP-INT-45 test at line 841")
    print(f"  - Closed DELETE describe at line 843")
    print(f"  - Dedented INTEGRATION blocks (lines {integration_start}-{integration_end})")

if __name__ == "__main__":
    fix_supplier_structure()
