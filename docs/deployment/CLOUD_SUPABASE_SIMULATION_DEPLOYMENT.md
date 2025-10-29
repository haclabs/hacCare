# 🚀 Cloud Supabase Deployment Plan: New Simulation System

## Overview
Deploy the new schema-agnostic simulation system to your cloud Supabase instance and clean up all broken legacy code.

## Phase 1: Deploy New System (Cloud Supabase)

### Step 1: Deploy via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy the new migration file: `030_new_schema_agnostic_simulation_system.sql`
3. Paste and run in SQL Editor
4. Verify functions are created successfully

### Step 2: Update Application Code
- Update function calls from old names to new v2 functions:
  - `save_template_snapshot()` → `save_template_snapshot_v2()`
  - `reset_simulation_for_next_session()` → `reset_simulation_for_next_session_v2()`
  - `restore_snapshot_to_tenant()` → `restore_snapshot_to_tenant_v2()`

### Step 3: Test New System
- Create a test template
- Take snapshot with new function
- Test reset functionality
- Verify medication ID preservation

## Phase 2: Clean Up Legacy Code

### Files to Delete (Broken Simulation Code):
```
database/migrations/014_reset_simulation_preserve_ids.sql
database/migrations/015_reset_simulation_update_in_place.sql
database/migrations/015_fix_reset_simulation_conflicts.sql
database/migrations/016_reset_simulation_preserve_meds.sql
database/migrations/016_fix_reset_simulation_expiry.sql
database/migrations/017_fix_reset_simulation_uuid_cast.sql
database/migrations/018_fix_reset_simulation_jsonb_update.sql
```

### Archive Old Development Files:
```
docs/development/simulation-v2/ (entire folder)
docs/development/archives/simulationService.old.ts
archive/sql/fixes/fix_reset_simulation_complete.sql
```

## Phase 3: Update Service Layer

### Update simulationService.ts:
- Replace old RPC calls with new v2 function names
- Update error handling for new response format
- Test all simulation flows

### Update UI Components:
- Verify simulation templates still work
- Test snapshot creation UI
- Validate reset button functionality

## Benefits After Cleanup:

✅ **Zero Maintenance**: New features automatically work in simulations  
✅ **Future-Proof**: No more schema mismatch errors  
✅ **Simple**: ~200 lines instead of 2000+ lines of broken code  
✅ **Reliable**: No more complex column existence checks  
✅ **Clean Codebase**: Remove 15+ broken migration files  

## Deployment Commands (Cloud Supabase):

Since you're using cloud Supabase, no local supabase CLI commands needed. Everything is deployed via the dashboard.

## Rollback Plan:
If anything goes wrong, the old functions are still available until we explicitly drop them in the cleanup phase.

## Next Steps:
1. Deploy new system via Supabase Dashboard
2. Update application code to use v2 functions  
3. Test thoroughly
4. Clean up old files once confirmed working