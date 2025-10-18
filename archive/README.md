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
