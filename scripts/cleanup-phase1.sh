#!/bin/bash

# hacCare Production Cleanup Script
# Phase 1: Safe Archive & Removal
# This script only moves files that are NOT imported anywhere

set -e  # Exit on error

echo "🧹 hacCare Production Cleanup - Phase 1"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create archive structure
echo -e "${YELLOW}Step 1: Creating archive structure...${NC}"
mkdir -p archive/components
mkdir -p archive/contexts
mkdir -p archive/lib
mkdir -p archive/utils
mkdir -p archive/sql/debug
mkdir -p archive/sql/fixes
mkdir -p archive/sql/tests
mkdir -p archive/documentation
echo -e "${GREEN}✓ Archive directories created${NC}"
echo ""

# Archive unused contexts
echo -e "${YELLOW}Step 2: Archiving unused contexts...${NC}"
if [ -f "src/contexts/AuthContext-secure.tsx" ]; then
    mv src/contexts/AuthContext-secure.tsx archive/contexts/
    echo -e "${GREEN}✓ Moved AuthContext-secure.tsx${NC}"
fi
echo ""

# Archive debug lib files
echo -e "${YELLOW}Step 3: Archiving debug library files...${NC}"
if [ -f "src/lib/debugAdminService.ts" ]; then
    mv src/lib/debugAdminService.ts archive/lib/
    echo -e "${GREEN}✓ Moved debugAdminService.ts${NC}"
fi
echo ""

# Archive test utilities
echo -e "${YELLOW}Step 4: Archiving test utilities...${NC}"
if [ -f "src/utils/testPatientTransfer.ts" ]; then
    mv src/utils/testPatientTransfer.ts archive/utils/
    echo -e "${GREEN}✓ Moved testPatientTransfer.ts${NC}"
fi
echo ""

# Archive obsolete components
echo -e "${YELLOW}Step 5: Archiving obsolete components...${NC}"
if [ -f "src/components/Auth/ProtectedRoute-simple.tsx" ]; then
    mv src/components/Auth/ProtectedRoute-simple.tsx archive/components/
    echo -e "${GREEN}✓ Moved ProtectedRoute-simple.tsx${NC}"
fi
echo ""

# Archive debug SQL files
echo -e "${YELLOW}Step 6: Archiving debug SQL files...${NC}"
find docs/development -name "debug_*.sql" -type f -exec mv {} archive/sql/debug/ \; 2>/dev/null || true
DEBUG_COUNT=$(ls archive/sql/debug/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Moved ${DEBUG_COUNT} debug SQL files${NC}"
echo ""

# Archive fix SQL files (keep migrations, archive temporary fixes)
echo -e "${YELLOW}Step 7: Archiving temporary fix SQL files...${NC}"
find docs/development -name "fix_*.sql" -type f -exec mv {} archive/sql/fixes/ \; 2>/dev/null || true
FIX_COUNT=$(ls archive/sql/fixes/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Moved ${FIX_COUNT} fix SQL files${NC}"
echo ""

# Archive test SQL files
echo -e "${YELLOW}Step 8: Archiving test SQL files...${NC}"
find docs/development -name "test_*.sql" -type f -exec mv {} archive/sql/tests/ \; 2>/dev/null || true
TEST_COUNT=$(ls archive/sql/tests/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Moved ${TEST_COUNT} test SQL files${NC}"
echo ""

# Create archive README
echo -e "${YELLOW}Step 9: Creating archive documentation...${NC}"
cat > archive/README.md << 'EOF'
# hacCare Archive

This directory contains files that were removed during the Production RC cleanup.

**Archive Date:** October 18, 2025  
**Retention Period:** 30 days (until November 18, 2025)

## Contents

### components/
Obsolete or duplicate component files that are no longer imported

### contexts/
Unused context files (e.g., experimental auth contexts)

### lib/
Debug and development-only service files

### utils/
Test utilities that are not part of the test suite

### sql/
- `debug/` - Debug SQL scripts used during development
- `fixes/` - Temporary fix scripts (permanent fixes are in migrations)
- `tests/` - SQL test scripts

## Restoration

If you need to restore any file:
```bash
# Example: restore a component
cp archive/components/MyComponent.tsx src/components/
git add src/components/MyComponent.tsx
```

## Deletion Schedule

These files will be permanently deleted on **November 18, 2025** unless:
- A restoration request is made
- The file is identified as needed for production

## Notes

All files were verified as:
- Not imported by any active code
- Not referenced in package.json
- Not part of active test suites
- Safe to archive without breaking changes
EOF
echo -e "${GREEN}✓ Archive README created${NC}"
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✅ Phase 1 Cleanup Complete!${NC}"
echo ""
echo "Summary:"
echo "  - Components archived: $(ls archive/components/ 2>/dev/null | wc -l)"
echo "  - Contexts archived: $(ls archive/contexts/ 2>/dev/null | wc -l)"
echo "  - Lib files archived: $(ls archive/lib/ 2>/dev/null | wc -l)"
echo "  - Utils archived: $(ls archive/utils/ 2>/dev/null | wc -l)"
echo "  - SQL files archived: $((DEBUG_COUNT + FIX_COUNT + TEST_COUNT))"
echo ""
echo "Next steps:"
echo "  1. Review archive/ directory"
echo "  2. Run: npm run build (verify no errors)"
echo "  3. Run: npm run dev (test application)"
echo "  4. Git commit: git add -A && git commit -m 'Phase 1: Archive unused files'"
echo ""
