# 🔧 Medication Barcode Fix Deployment Guide

## Problem Solved

**Issue:** Medication barcodes change after `reset_simulation_for_next_session`, causing pre-printed labels to become invalid.

**Root Cause:** The reset function was deleting and re-creating medications with new UUIDs. Since barcodes are generated from UUIDs, this changed the barcodes.

**Solution:** Modified `reset_simulation_for_next_session` to preserve medication UUIDs by updating medications in place instead of deleting/recreating them.

## Changes Made

### File Modified: `/workspaces/hacCare/database/functions/reset_simulation_for_next_session.sql`

**Key Changes:**

1. **Save Medication Mappings (STEP 1)**
   - Now saves medication UUIDs before reset
   - Maps by `patient_id||medication_name` for lookup during restore
   - Stored in `v_patient_barcodes` under special key `__medication_mappings__`

2. **Preserve Medications (STEP 2)**
   - **Removed:** `DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;`
   - Medications are now preserved during reset

3. **Update Medications In Place (NEW STEP 3B)**
   - Loops through snapshot medications
   - **Updates** existing medications (preserves UUID)
   - **Inserts** new medications (if added to template since last session)
   - **Deletes** medications no longer in template
   - Logs: updated count, inserted count, removed count

4. **Updated Documentation**
   - Activity log notes medication UUID preservation
   - Function comment updated

## Deployment Steps

### 1. Backup Current Function (IMPORTANT!)

```sql
-- Run in Supabase SQL Editor
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'reset_simulation_for_next_session';
```

Save the output as a backup!

### 2. Deploy New Function

Copy the entire contents of `/workspaces/hacCare/database/functions/reset_simulation_for_next_session.sql` and run in Supabase SQL Editor.

### 3. Verify Deployment

```sql
-- Check function exists and has correct signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'reset_simulation_for_next_session';
```

Expected output:
- `function_name`: reset_simulation_for_next_session
- `arguments`: p_simulation_id uuid
- `return_type`: jsonb

### 4. Test with Your Simulation

**Testing Procedure:**

1. **Print medication labels** for your current simulation (tenant: `2f466ac2-96b1-4911-87db-9a86176c2d11`)
   - Record the barcode for ZOFRAN: Should be `MZ65956` (current simulation)

2. **Reset the simulation:**
   ```sql
   SELECT reset_simulation_for_next_session('<simulation_id>');
   ```

3. **Check ZOFRAN barcode after reset:**
   ```sql
   -- Find ZOFRAN in simulation tenant
   SELECT 
     pm.id,
     pm.name,
     -- Generate barcode (simulate JavaScript logic)
     'M' || 
     UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(pm.name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
     LPAD(
       (ABS(('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(pm.id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int) % 100000)::text,
       5, '0'
     ) as generated_barcode
   FROM patient_medications pm
   JOIN patients p ON p.id = pm.patient_id
   WHERE p.tenant_id = '2f466ac2-96b1-4911-87db-9a86176c2d11'
     AND pm.name ILIKE '%ZOFRAN%';
   ```

4. **Expected Result:**
   - Barcode should **STILL BE** `MZ65956`
   - UUID should be **UNCHANGED**
   - ✅ Your printed labels will still work!

5. **Test scanning:**
   - Scan the ZOFRAN label with barcode `MZ65956`
   - It should successfully validate

## Expected Behavior After Fix

### Before Fix (OLD):
```
Print Labels → MZ65956
Reset Simulation → NEW UUID → MZ12345 ❌
Labels Don't Scan! 💔
```

### After Fix (NEW):
```
Print Labels → MZ65956
Reset Simulation → SAME UUID → MZ65956 ✅
Labels Still Work! 🎉
```

## Rollback Plan

If something goes wrong:

```sql
-- Restore old function from backup you saved in step 1
-- Paste the backup here and execute
```

## Monitoring

After deployment, check the reset logs:

```sql
SELECT 
  action_type,
  notes,
  action_details,
  created_at
FROM simulation_activity_log
WHERE action_type = 'simulation_reset'
ORDER BY created_at DESC
LIMIT 5;
```

Look for:
- "preserved patient and medication UUIDs for barcode compatibility"
- No errors in action_details

## Benefits

✅ **Print labels once** - Use them for entire semester  
✅ **No label waste** - No need to reprint after resets  
✅ **Workflow efficiency** - No downtime between class sessions  
✅ **Cost savings** - Less label paper and printer wear  
✅ **Student experience** - Consistent barcodes reduce confusion  

## Known Limitations

1. **First deployment** - Existing simulations will still have mismatched barcodes. You'll need to:
   - Print new labels after this fix is deployed
   - OR manually update medication UUIDs to match printed labels (advanced)

2. **Template changes** - If you add new medications to a template:
   - New medications will get fresh UUIDs (and new barcodes)
   - You'll need to print labels for those new medications
   - Existing medication labels will still work

## Support

If you encounter issues:

1. Check simulation_activity_log for errors
2. Run the diagnostic SQL: `/workspaces/hacCare/debug_medication_barcode_mismatch.sql`
3. Review function logs for NOTICE messages
4. Contact dev team with simulation_id and error details

## Success Criteria

- ✅ Medication UUIDs preserved across resets
- ✅ Barcodes unchanged after reset
- ✅ Pre-printed labels scan correctly
- ✅ No errors in simulation_activity_log
- ✅ Students can complete medication administration workflow

---

**Deployed by:** _________________  
**Date:** _________________  
**Tested by:** _________________  
**Sign-off:** _________________
