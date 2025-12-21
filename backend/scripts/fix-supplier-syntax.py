#!/usr/bin/env python3
"""Fix supplier.integration.spec.ts syntax errors"""

import re

file_path = "src/modules/procurement/tests/integration-test/supplier.integration.spec.ts"

# Read the file
with open(file_path, 'r') as f:
    lines = f.readlines()

# Line 839 is missing closing braces: });  and  });
# Insert after line 838 (index 838 since 0-indexed)
# Line 838 is: "      where: { supplierId: supplierWithPO.id },"
# Need to add:
#     });
#   });

lines.insert(839, "    });\n")
lines.insert(840, "  });\n")
lines.insert(841, "\n")

# The file ends at line 1010 with "});", which closes the main describe
# But it's missing closes for the 5 INTEGRATION describe blocks
# The INTEGRATION blocks start at line 841 (now 844 after inserts)
# They should be siblings to the other describe blocks like "POST /suppliers"

# Find the last line
# Current last line should be "});" which closes main describe
# Need to add 5 closing "  });" before it

# Find the last closing brace
last_line_idx = len(lines) - 1
while last_line_idx >= 0 and lines[last_line_idx].strip() == '':
    last_line_idx -= 1

# lines[last_line_idx] should be "});"
# Insert before it
lines.insert(last_line_idx, "  });\n")  # Close INTEGRATION-SUP-05
lines.insert(last_line_idx, "  });\n")  # Close INTEGRATION-SUP-04
lines.insert(last_line_idx, "  });\n")  # Close INTEGRATION-SUP-03
lines.insert(last_line_idx, "  });\n")  # Close INTEGRATION-SUP-02
lines.insert(last_line_idx, "  });\n")  # Close INTEGRATION-SUP-01

# Write back
with open(file_path, 'w') as f:
    f.writelines(lines)

print("Fixed syntax errors in supplier.integration.spec.ts")
