# Fix for Simulation Launch Error - Handover Notes Columns

## Problem
The simulation launch is failing with this error:
```
column "handover_type" of relation "handover_notes" does not exist
```

## Root Cause
The `restore_snapshot_to_tenant` function in the database is trying to insert into the `handover_notes` table using incorrect column names:
- ❌ `handover_type` (doesn't exist)
- ❌ `recommendation` (singular - doesn't exist)

The actual schema has:
- ✅ `priority` 
- ✅ `recommendations` (plural)

## Solution
Apply the SQL fix to update the `restore_snapshot_to_tenant` function.

## Steps to Fix

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://cwhqffubvqolhnkecyck.supabase.co
2. Navigate to **SQL Editor**
3. Open the file: `fix_handover_notes_columns.sql` (in this same directory)
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

### Option 2: Via Supabase CLI
If you have the Supabase CLI installed:
```bash
cd /workspaces/hacCare/docs/development/simulation-v2
supabase db execute -f fix_handover_notes_columns.sql --project-ref cwhqffubvqolhnkecyck
```

## What This Fix Does
1. **Updates `restore_snapshot_to_tenant` function** with correct column mappings:
   - Maps `handover_type` → `priority` (with fallback to 'medium')
   - Maps `recommendation` → `recommendations`
   - Handles both old and new column names for backward compatibility

2. **Maintains data integrity** by using COALESCE to handle:
   - Legacy snapshots that might have old column names
   - New snapshots with correct column names

## Verification
After applying the fix, try launching your simulation again. You should see:
```
✅ restore_snapshot_to_tenant function FIXED with correct handover_notes columns!
```

The simulation launch should now work without the column error.

## Files Modified
- `restore_snapshot_to_tenant()` function in database

## Backward Compatibility
✅ This fix maintains backward compatibility with existing snapshots by:
- Checking for both `priority` and legacy `handover_type` fields
- Checking for both `recommendations` and legacy `recommendation` fields
- Using default values where appropriate
