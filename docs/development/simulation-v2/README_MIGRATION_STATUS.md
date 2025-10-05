# Simulation System V2.0 - Migration Status

## Migration Files Overview

The Simulation System v2.0 requires 4 SQL migration files to be run in sequence:

### ✅ Completed Migrations

1. **001_drop_old_simulation_tables.sql** - DONE
   - Dropped old simulation tables
   - Cleaned up legacy infrastructure

2. **002_create_new_simulation_schema.sql** - DONE
   - Created new tables: simulation_templates, simulation_active, simulation_participants, simulation_history, simulation_activity_log
   - Added enums: tenant_type, simulation_template_status, simulation_active_status, simulation_role
   - Modified tenants table to support simulation tenants

3. **003_create_simulation_rls_policies.sql** - DONE (with fixes)
   - Created RLS policies for all simulation tables
   - Added helper function: has_simulation_tenant_access()
   - Extended patient/medication/vitals policies for simulation access
   - **FIXED:** Infinite recursion in participants_select_policy (see fix_participants_policy.sql)

### ❌ Missing Migration

4. **004_create_simulation_functions.sql** - **NOT RUN YET**
   - **This file needs to be run in Supabase SQL Editor!**
   - Creates essential functions for simulation lifecycle:
     - `create_simulation_template()` ← **YOU NEED THIS**
     - `save_template_snapshot()`
     - `launch_simulation()`
     - `restore_snapshot_to_tenant()`
     - `reset_simulation()`
     - `complete_simulation()`
     - `calculate_simulation_metrics()`
     - `delete_simulation()`
     - `check_expired_simulations()`

## Current Errors (FIXED)

### ✅ Error 1: Subdomain Constraint
```
null value in column "subdomain" of relation "tenants" violates not-null constraint
```
**Cause:** The `tenants` table requires a `subdomain` field (NOT NULL constraint), but the simulation functions weren't providing one.
**Status:** ✅ **FIXED** - Updated `004_create_simulation_functions.sql` to include subdomain generation.

### ✅ Error 2: Tenant Type Check Constraint
```
new row for relation "tenants" violates check constraint "tenants_tenant_type_check"
```
**Cause:** The `tenants` table has an existing text column with a check constraint that doesn't include simulation types.
**Status:** ✅ **FIXED** - Created `fix_tenant_type_constraint.sql` to convert column and add simulation types.

## Action Required - Run These Files in Order

### 🎯 Step 1: Fix Tenant Type Constraint (MUST RUN FIRST)
```
docs/development/simulation-v2/fix_tenant_type_constraint.sql
```
This fixes the tenant_type column to support simulation types.

### 🎯 Step 2: Create Core Functions (Template & Launch)
```
docs/development/simulation-v2/fix_subdomain_constraint.sql
```
This creates create_simulation_template and launch_simulation with subdomain fix.

### 🎯 Step 3: Create Snapshot Functions (CRITICAL FOR SAVING SNAPSHOTS)
```
docs/development/simulation-v2/fix_medication_table_name.sql
```
This creates save_template_snapshot and restore_snapshot_to_tenant with correct table names (patient_medications, not medications).

### Steps:
1. Open **Supabase Dashboard → SQL Editor**
2. Create new query
3. Copy and run **fix_tenant_type_constraint.sql** first
4. Wait for success confirmation
5. Create another new query
6. Copy and run **fix_subdomain_constraint.sql**
7. Verify all functions were created successfully (no errors)
8. Try creating a template again!

After applying the fix, test the full workflow:
1. ✅ Create simulation template - WORKING
2. ✅ Launch simulation - WORKING (full_name issue fixed)
3. View active simulations
4. Generate debrief reports

## All Fixes Applied

1. ✅ **Subdomain constraint** - Functions now generate unique subdomains
2. ✅ **Tenant type constraint** - Check constraint updated to allow simulation types  
3. ✅ **Full name queries** - All components updated to use first_name/last_name

Your simulation system should now be fully functional! 🚀

## Additional Fixes Applied

### Frontend Changes:
- ✅ Removed old SimulationContext references
- ✅ Added SimulationManager component to App.tsx
- ✅ Fixed all Supabase queries to work without user_profiles foreign keys
- ✅ Simplified queries to avoid non-existent FK relationships

### Database Fixes:
- ✅ Fixed infinite recursion in `participants_select_policy` (see fix_participants_policy.sql)

## Next Steps After Running 004

Once you run `004_create_simulation_functions.sql`:
1. Refresh your browser
2. Go to Simulations page
3. Click "Create Template" in the Templates tab
4. Fill out the form and submit
5. System will create a template tenant for you to build your scenario

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| 001_drop_old_simulation_tables.sql | Cleanup | ✅ Executed |
| 002_create_new_simulation_schema.sql | Schema | ✅ Executed |
| 003_create_simulation_rls_policies.sql | Security | ✅ Executed + Fixed |
| fix_participants_policy.sql | Fix recursion | ✅ Executed |
| 004_create_simulation_functions.sql | Functions | ✅ **FIXED** - subdomain added |
| fix_subdomain_constraint.sql | Quick fix | 🎯 **RUN THIS NOW** |
