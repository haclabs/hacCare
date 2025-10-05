# Medication Table Name Fix

## Problem

When trying to save a simulation template snapshot, you encountered:
```
POST /rest/v1/rpc/save_template_snapshot 404 (Not Found)
Error: relation "medications" does not exist
```

## Root Causes

1. **404 Not Found** - The `save_template_snapshot` function doesn't exist in your database because the SQL migration files haven't been executed yet.

2. **"medications" table doesn't exist** - The function was written to query a `medications` table, but your database uses `patient_medications` instead.

## Database Schema Reality

Your database has:
- ✅ `patient_medications` table (actual table name)
- ❌ `medications` table (doesn't exist)

The snapshot function was querying the wrong table name.

## Solution

Updated two critical functions to use the correct table name:

### 1. `save_template_snapshot()`
**Changed from:**
```sql
'medications', (
  SELECT json_agg(row_to_json(m.*))
  FROM medications m
  WHERE m.tenant_id = v_tenant_id
)
```

**Changed to:**
```sql
'patient_medications', (
  SELECT json_agg(row_to_json(pm.*))
  FROM patient_medications pm
  JOIN patients p ON p.id = pm.patient_id
  WHERE p.tenant_id = v_tenant_id
)
```

Also updated the column references to match `patient_medications` schema:
- Changed `tenant_id` query to join through patients
- Updated field references (prescribed_by instead of status/tenant_id)

### 2. `restore_snapshot_to_tenant()`
**Changed from:**
```sql
IF p_snapshot->'medications' IS NOT NULL THEN
  ...
  INSERT INTO medications (...)
```

**Changed to:**
```sql
IF p_snapshot->'patient_medications' IS NOT NULL THEN
  ...
  INSERT INTO patient_medications (...)
```

Also fixed the INSERT to match `patient_medications` schema:
- Uses `prescribed_by` instead of generic fields
- Proper timestamp types for dates
- Correct column mappings

## Files Updated

1. ✅ **004_create_simulation_functions.sql** - Main migration file updated
2. ✅ **fix_medication_table_name.sql** - Quick patch file created

## How to Apply

Run this file in Supabase SQL Editor:
```
docs/development/simulation-v2/fix_medication_table_name.sql
```

This will create/update:
- `save_template_snapshot()` function
- `restore_snapshot_to_tenant()` function

Both now use the correct `patient_medications` table name.

## Testing

After running the fix:

1. **Create a template** (if you haven't already)
2. **Switch to template tenant**
3. **Add some patients and medications**
4. **Click "Save Snapshot"** button
5. Should see success: "Snapshot saved successfully"
6. Template status changes to `ready`
7. You can now launch simulations!

## Prevention

When writing database functions that query patient-related data:
- ✅ Use `patient_medications` (not `medications`)
- ✅ Join through `patients` table when you need tenant_id
- ✅ Use `prescribed_by` for the user who prescribed
- ✅ Use `timestamptz` for date fields (not just `date`)

## Related Tables

For reference, here are the medication-related tables in your schema:
- `patient_medications` - Medications prescribed to patients
- `bcma_medication_administrations` - Medication administration records (BCMA system)

There is NO standalone `medications` table.
