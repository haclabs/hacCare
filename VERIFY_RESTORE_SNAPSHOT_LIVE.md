# Verify restore_snapshot_to_tenant on Live System
**Date:** November 6, 2025  
**Purpose:** Check if snapshot restoration is working correctly before deploying lab panels/results

---

## Quick Status Check

Run this query in Supabase SQL Editor to see the function signature:

```sql
-- Check what version of restore_snapshot_to_tenant is deployed
SELECT 
  proname as function_name,
  pronargs as num_args,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc 
WHERE proname = 'restore_snapshot_to_tenant';
```

**Expected Result:**
- Should show: `p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb`
- Total of 4 parameters (2 required, 2 optional with defaults)

---

## Historical Issues (Resolved October 2025)

### Problem 1: Column Mismatch Errors ❌
**Symptoms:**
- Simulation launch failed with "column handover_type does not exist"
- Column "mrn" does not exist in patients table
- Various other column name mismatches

**Root Cause:**
- `restore_snapshot_to_tenant` function had wrong column names
- Didn't match actual table schema
- Old column names from previous schema versions

**Fix Applied:** October 2025
- Updated all column names to match current schema
- Fixed: `handover_type` → `priority`
- Fixed: `mrn` → `patient_id`
- Fixed: `recommendation` → `recommendations`
- Location: `docs/development/simulation-v2/RUN_THIS_FIX.md`

### Problem 2: Missing Tables in Snapshot ❌
**Symptoms:**
- Doctors orders not appearing after simulation reset
- New tables (bowel_records, admission_records, advanced_directives) not captured

**Root Cause:**
- Tables added to schema but not added to snapshot functions
- `save_template_snapshot` and `restore_snapshot_to_tenant` out of sync

**Fix Applied:** October 30, 2025
- Added bowel_records, patient_admission_records, patient_advanced_directives
- Added wound_treatments
- Updated both save and restore functions
- Location: `docs/database/SIMULATION_SNAPSHOT_STATUS.md`

---

## Current Cloud Version Analysis

Based on the function definition you retrieved, here's what's in your live system:

### ✅ Tables Being Restored (From Cloud Function):

1. **patients** - with ID and barcode mapping ✅
2. **patient_medications** - with medication ID mapping for barcodes ✅
3. **patient_vitals** - all vitals records ✅
4. **patient_notes** - all note types ✅
5. **patient_alerts** - with priority (not severity) ✅
6. **diabetic_records** - using barcode mapping ✅
7. **patient_admission_records** - admission assessments ✅
8. **medication_administrations** - med admin records ✅
9. **patient_advanced_directives** - advance directives ✅
10. **bowel_records** - bowel assessments ✅
11. **patient_wounds** - with wound ID mapping ✅
12. **wound_assessments** - linked to wounds ✅
13. **handover_notes** - SBAR handover notes ✅
14. **doctors_orders** - doctors orders ✅
15. **patient_images** - uploaded images ✅

### ❌ Tables NOT in Cloud Version:

16. **lab_panels** - NOT included (your pending update)
17. **lab_results** - NOT included (your pending update)
18. **wound_treatments** - NOT visible in function (need to verify)

---

## Verification Tests

### Test 1: Check Template Has Snapshot Data

```sql
-- Check if your templates have snapshot data
SELECT 
  id,
  name,
  status,
  snapshot_version,
  snapshot_taken_at,
  jsonb_object_keys(snapshot_data) as tables_in_snapshot,
  jsonb_array_length(snapshot_data->jsonb_object_keys(snapshot_data)) as record_count
FROM simulation_templates
WHERE snapshot_data IS NOT NULL
ORDER BY snapshot_taken_at DESC
LIMIT 10;
```

**Expected Result:**
- Should see template names with snapshot_data
- Should see table names like 'patients', 'patient_medications', etc.
- Record counts should be > 0 for tables with data

### Test 2: Check Active Simulation Has Restored Data

```sql
-- Get most recent active simulation tenant
WITH recent_sim AS (
  SELECT simulation_tenant_id, name, status, created_at
  FROM simulation_active
  WHERE status IN ('running', 'paused', 'completed')
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'patients' as table_name,
  COUNT(*) as record_count,
  rs.name as simulation_name,
  rs.status
FROM patients p
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status

UNION ALL

SELECT 
  'patient_medications',
  COUNT(*),
  rs.name,
  rs.status
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status

UNION ALL

SELECT 
  'patient_vitals',
  COUNT(*),
  rs.name,
  rs.status
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status

UNION ALL

SELECT 
  'bowel_records',
  COUNT(*),
  rs.name,
  rs.status
FROM bowel_records br
JOIN patients p ON p.patient_id = br.patient_id
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status

UNION ALL

SELECT 
  'patient_admission_records',
  COUNT(*),
  rs.name,
  rs.status
FROM patient_admission_records par
JOIN patients p ON p.patient_id = par.patient_id
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status

UNION ALL

SELECT 
  'doctors_orders',
  COUNT(*),
  rs.name,
  rs.status
FROM doctors_orders do_
JOIN patients p ON p.id = do_.patient_id
JOIN recent_sim rs ON p.tenant_id = rs.simulation_tenant_id
GROUP BY rs.name, rs.status;
```

**Expected Result:**
- Should see record counts for each table in the simulation
- If counts are 0, that table might not be in snapshot or restore failed
- Bowel records, admission records should show data if they were in template

### Test 3: Check for Lab Data (Will Be Zero Until You Deploy)

```sql
-- Check if lab data exists in simulation (should be 0 currently)
WITH recent_sim AS (
  SELECT simulation_tenant_id
  FROM simulation_active
  WHERE status IN ('running', 'paused')
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  'lab_panels' as table_name,
  COUNT(*) as record_count
FROM lab_panels lp
JOIN patients p ON p.id = lp.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM recent_sim)

UNION ALL

SELECT 
  'lab_results',
  COUNT(*)
FROM lab_results lr
JOIN lab_panels lp ON lp.id = lr.panel_id
JOIN patients p ON p.id = lp.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM recent_sim);
```

**Expected Result:**
- Both should return 0 records (labs not in snapshot yet)
- This confirms you need to deploy your lab updates

---

## Common Issues & Solutions

### Issue 1: Simulation Launch Fails Immediately
**Symptoms:** Launch button clicked, but no simulation created

**Check:**
```sql
-- Look for recent errors in simulation_active
SELECT id, name, status, error_message, created_at
FROM simulation_active
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Solution:**
- Check if error_message contains column mismatch
- Verify template has snapshot_data (not NULL)
- Check if restore_snapshot_to_tenant function exists

### Issue 2: Simulation Launches But No Patient Data
**Symptoms:** Simulation tenant created but patients table is empty

**Check:**
```sql
-- Check if patients were restored
SELECT 
  sa.name as simulation_name,
  sa.simulation_tenant_id,
  COUNT(p.id) as patient_count
FROM simulation_active sa
LEFT JOIN patients p ON p.tenant_id = sa.simulation_tenant_id
WHERE sa.status IN ('running', 'paused')
GROUP BY sa.name, sa.simulation_tenant_id;
```

**Solution:**
- If patient_count = 0, snapshot restore failed
- Check template's snapshot_data has 'patients' key
- Verify patient_mapping is working in restore function

### Issue 3: Some Tables Missing After Launch
**Symptoms:** Patients exist but other data (vitals, meds, etc.) missing

**Check:**
```sql
-- Comprehensive data check
SELECT 
  sa.name,
  COUNT(DISTINCT p.id) as patients,
  COUNT(DISTINCT pv.id) as vitals,
  COUNT(DISTINCT pm.id) as medications,
  COUNT(DISTINCT pn.id) as notes,
  COUNT(DISTINCT br.id) as bowel_records,
  COUNT(DISTINCT do_.id) as doctors_orders
FROM simulation_active sa
JOIN patients p ON p.tenant_id = sa.simulation_tenant_id
LEFT JOIN patient_vitals pv ON pv.patient_id = p.id
LEFT JOIN patient_medications pm ON pm.patient_id = p.id
LEFT JOIN patient_notes pn ON pn.patient_id = p.id
LEFT JOIN bowel_records br ON br.patient_id = p.patient_id
LEFT JOIN doctors_orders do_ ON do_.patient_id = p.id
WHERE sa.status IN ('running', 'paused')
GROUP BY sa.name;
```

**Solution:**
- If specific tables = 0, they weren't in template snapshot OR
- Restore function doesn't include that table OR
- Patient ID mapping failed (check v_patient_mapping logic)

---

## What to Look For

### ✅ Signs restore_snapshot_to_tenant is Working:
- Simulations launch successfully
- Patients appear in simulation tenant
- Patient data (vitals, meds, notes) all present
- Bowel records, admission records, advanced directives present
- No column mismatch errors in logs

### ❌ Signs restore_snapshot_to_tenant Has Issues:
- Simulation launch fails with database error
- Patients missing in simulation
- Some tables present but others empty
- Column name errors in Supabase logs
- Error messages about "does not exist"

---

## Before Deploying Lab Updates

**Checklist:**

1. ✅ Verify current simulations are launching successfully
   - Run Test 2 above
   - Should see patients and related data

2. ✅ Verify template snapshots contain data
   - Run Test 1 above
   - Should see 14-15 tables in snapshot_data

3. ✅ Check for any recent errors
   - Check Supabase logs for restore_snapshot_to_tenant errors
   - Look at simulation_active.error_message column

4. ✅ Confirm function signature is correct
   - Should have 4 parameters (p_tenant_id, p_snapshot, p_id_mappings, p_barcode_mappings)
   - Not the old 2-parameter version

5. ✅ Test one simulation launch before class
   - Launch a simulation
   - Verify patients appear with all data
   - Confirm no errors

---

## Risk Assessment for Lab Update

### Low Risk ✅
Your lab updates to `restore_snapshot_to_tenant` are low risk because:
- All changes are additive (new tables only)
- No modifications to existing restore logic
- Uses same IF IS NOT NULL safety checks
- Follows established pattern (wound_assessments ID mapping)
- Lab data won't be in old snapshots anyway (no data to break)

### Deployment Safety
1. Lab panels/results won't affect existing simulations (no lab data in old snapshots)
2. IF p_snapshot->'lab_panels' IS NOT NULL check prevents errors
3. Existing 15 tables continue to work as before
4. New lab data only appears in NEW snapshots created AFTER deployment

---

## Next Steps

1. **Run verification queries above** to confirm restore is working
2. **If all tests pass** → Safe to deploy lab updates
3. **If any tests fail** → Document the issue and fix before deploying
4. **After deploying labs** → Create new template snapshot to include labs
5. **Test launch with labs** → Verify lab panels and lab results appear

---

## Quick Health Check (Run This First)

```sql
-- One query to check everything
SELECT 
  'Function Exists' as check_type,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname = 'restore_snapshot_to_tenant'

UNION ALL

SELECT 
  'Has Templates with Snapshots',
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM simulation_templates
WHERE snapshot_data IS NOT NULL

UNION ALL

SELECT 
  'Active Simulations Exist',
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '⚠️ NO ACTIVE SIMS' END
FROM simulation_active
WHERE status IN ('running', 'paused')

UNION ALL

SELECT 
  'Patients in Simulations',
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM simulation_active sa
JOIN patients p ON p.tenant_id = sa.simulation_tenant_id
WHERE sa.status IN ('running', 'paused');
```

**Expected Result:**
- Function Exists: ✅ PASS
- Has Templates with Snapshots: ✅ PASS
- Active Simulations Exist: ✅ PASS or ⚠️ NO ACTIVE SIMS (ok if between classes)
- Patients in Simulations: ✅ PASS (if active sim exists)

If all pass → Your restore function is working! Safe to add labs. 🚀

---

**Ready to verify?** Run the Quick Health Check query first!
