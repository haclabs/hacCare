# hacCare Production RC - Cleanup & Reorganization

**Date:** October 18, 2025  
**Status:** In Progress  
**Goal:** Clean, production-ready codebase

## Current State Analysis

- **Total TypeScript Files:** 211
- **Debug SQL Files:** 46
- **Obsolete Components:** Found 3+ files

## Cleanup Strategy

### Phase 1: Archive & Remove (SAFE - No Breaking Changes)
This phase removes/archives files that are not imported or used.

#### Step 1.1: Create Archive Structure
```bash
mkdir -p archive/components
mkdir -p archive/sql/debug
mkdir -p archive/sql/fixes
mkdir -p archive/sql/tests
mkdir -p archive/lib
mkdir -p archive/utils
```

#### Step 1.2: Archive Debug SQL Files
Move all debug/fix/test SQL files to archive while keeping production migrations

#### Step 1.3: Archive Obsolete Components
- `ProtectedRoute-simple.tsx` → archive/components/
- `debugAdminService.ts` → archive/lib/
- `testPatientTransfer.ts` → archive/utils/

#### Step 1.4: Remove Unused Test Files
These are standalone test files not part of a test suite:
- Find and list all test files
- Verify they're not imported
- Move to archive

### Phase 2: Consolidate Contexts (Medium Risk)
Merge duplicate authentication contexts into single source of truth

### Phase 3: Feature Organization (High Risk - Update Imports)
Reorganize into feature-based architecture

## Execution Plan

### Start with Phase 1 (Zero Risk)
We'll execute each step with verification:
1. Create directories
2. Move files
3. Git commit
4. Verify build still works
5. Proceed to next step

### Safety Measures
- ✅ Git commit after each major change
- ✅ Verify build success before proceeding
- ✅ Test critical paths
- ✅ Keep archive for 30 days before deletion

## Current Step: Ready to Execute Phase 1.1

Shall I proceed with creating the archive structure?
