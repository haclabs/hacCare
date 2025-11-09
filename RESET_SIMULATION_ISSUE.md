# Reset Simulation Issue - Cloud vs Local Comparison
**Date:** November 6, 2025  
**Issue:** Simulation reset not working - only resets timer, doesn't restore data

---

## The Problem

When you click "Reset Simulation", it **only resets the timer** but **does not restore patient data** back to the template snapshot.

This means:
- ❌ Medications administered during simulation stay marked as given
- ❌ Vital signs recorded during session remain in database
- ❌ Patient notes created during session not removed
- ❌ Patient data accumulates across resets instead of reverting

---

## Root Cause: Function Mismatch

### What's Deployed in Cloud ❌

From your query results, the cloud `reset_simulation` function is:

```sql
CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_sim simulation_active%ROWTYPE;
  v_result json;
BEGIN
  -- Get simulation details
  SELECT * INTO v_sim
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_sim.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Simply update the timer and status
  UPDATE simulation_active
  SET 
    starts_at = now(),
    ends_at = now() + (v_sim.duration_minutes || ' minutes')::interval,
    status = 'running',
    updated_at = now()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation timer reset successfully',
    'simulation_id', p_simulation_id,
    'new_starts_at', now(),
    'new_ends_at', now() + (v_sim.duration_minutes || ' minutes')::interval
  );
  
  RETURN v_result;
END;
$function$
```

**This only resets the timer - NO data deletion or restoration!**

---

### What Should Be Deployed ✅

Your local `schema.sql` (lines 2924-3074) has the correct comprehensive reset:

```sql
CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_session_number integer;
  v_id_mappings jsonb;
  v_simulation_config jsonb;
  v_result json;
BEGIN
  -- Get simulation details including session info
  SELECT 
    sa.tenant_id, 
    sa.template_id,
    t.simulation_config
  INTO 
    v_tenant_id, 
    v_template_id,
    v_simulation_config
  FROM simulation_active sa
  JOIN tenants t ON t.id = sa.tenant_id
  WHERE sa.id = p_simulation_id;
  
  -- Get template snapshot and ID mappings
  -- ... (snapshot retrieval logic) ...
  
  -- DELETE ALL EXISTING DATA (CRITICAL PART MISSING IN CLOUD!)
  DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  
  -- Delete from tables without tenant_id
  DELETE FROM patient_admission_records WHERE patient_id IN (...);
  DELETE FROM patient_advanced_directives WHERE patient_id IN (...);
  DELETE FROM bowel_records WHERE patient_id IN (...);
  DELETE FROM patient_wounds WHERE patient_id IN (...);
  DELETE FROM handover_notes WHERE patient_id IN (...);
  
  -- Delete patients last
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- RESTORE FROM SNAPSHOT (ALSO MISSING IN CLOUD!)
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot, v_id_mappings);
  
  -- Reset timer
  UPDATE simulation_active
  SET starts_at = now(), status = 'running', updated_at = now()
  WHERE id = p_simulation_id;
  
  RETURN json_build_object('success', true, ...);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**This properly resets data AND preserves patient IDs for barcode compatibility!**

---

## Why This Happened

Based on the release notes (OTTO v5.1.4-rc3), the original plan was:

1. **Old behavior:** `reset_simulation_for_next_session_v2` did full data reset
2. **Simplified:** `reset_simulation` became "just a timer reset" after cleanup
3. **Comment in code:** "After cleanup, reset_simulation is a simple timer reset function"

**Someone simplified it TOO much** and removed the data deletion/restoration logic entirely!

---

## Impact Analysis

### What's Broken ❌

**For Users:**
- Reset button appears to work (timer resets)
- But patient data isn't actually reset
- Medications stay marked as administered
- Vitals accumulate across sessions
- Students get confused seeing duplicate/stale data

**For Barcodes:**
- Patient IDs DO stay the same (because patients aren't deleted)
- But medication administrations accumulate (shows "already given")
- Labs accumulate (shows old results)
- Clinical assessments accumulate (multiple of same type)

### What Still Works ✅

- Simulation timer resets correctly
- Simulation status changes to 'running'
- No database errors
- Launch simulation works fine
- Complete simulation works fine

---

## The Fix

You need to deploy the comprehensive `reset_simulation` function from your local `schema.sql`.

### Deployment SQL

```sql
-- Drop the incomplete version
DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;

-- Deploy the full version
-- (Copy lines 2924-3074 from /workspaces/hacCare/database/schema.sql)
CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_session_number integer;
  v_id_mappings jsonb;
  v_simulation_config jsonb;
  v_result json;
BEGIN
  -- Get simulation details including which session was used
  SELECT 
    sa.tenant_id, 
    sa.template_id,
    t.simulation_config
  INTO 
    v_tenant_id, 
    v_template_id,
    v_simulation_config
  FROM simulation_active sa
  JOIN tenants t ON t.id = sa.tenant_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Extract session number from config
  v_session_number := (v_simulation_config->>'session_number')::integer;
  
  RAISE NOTICE 'Resetting simulation with session number: %', 
    COALESCE(v_session_number::text, 'NONE (will generate random IDs)');
  
  -- Get template snapshot and ID mappings for this session
  IF v_session_number IS NOT NULL THEN
    SELECT 
      st.snapshot_data,
      (st.simulation_id_sets->(v_session_number - 1))->'id_mappings'
    INTO 
      v_snapshot,
      v_id_mappings
    FROM simulation_templates st
    WHERE st.id = v_template_id;
    
    IF v_id_mappings IS NULL THEN
      RAISE WARNING 'Session % ID mappings not found, will generate random IDs', v_session_number;
    END IF;
  ELSE
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_templates
    WHERE id = v_template_id;
    
    v_id_mappings := NULL;
  END IF;
  
  -- Delete all existing data in simulation tenant
  DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  
  -- Delete from tables without tenant_id (use patient_id join)
  DELETE FROM patient_admission_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_advanced_directives WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM bowel_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_wounds WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM handover_notes WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  -- Delete patients last
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- Restore snapshot WITH THE SAME ID MAPPINGS (preserves barcode labels!)
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot, v_id_mappings);
  
  -- Reset simulation timestamps and status
  UPDATE simulation_active
  SET 
    starts_at = now(),
    status = 'running',
    updated_at = now()
  WHERE id = p_simulation_id;
  
  -- Log the reset
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_reset',
    jsonb_build_object(
      'session_number', v_session_number,
      'reused_ids', v_id_mappings IS NOT NULL
    ),
    CASE 
      WHEN v_id_mappings IS NOT NULL THEN 
        'Simulation reset with preserved Session ' || v_session_number || ' IDs (labels remain valid)'
      ELSE 
        'Simulation reset with random IDs (no session specified)'
    END
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation reset successfully',
    'session_number', v_session_number,
    'ids_preserved', v_id_mappings IS NOT NULL
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;
```

---

## Testing the Fix

### Before Deployment (Current Broken Behavior)

1. Launch simulation from template
2. Record some vitals for a patient
3. Administer a medication
4. Click "Reset Simulation"
5. Check patient data → **Vitals and med admin still there ❌**

### After Deployment (Expected Correct Behavior)

1. Launch simulation from template
2. Record some vitals for a patient
3. Administer a medication
4. Click "Reset Simulation"
5. Check patient data → **Vitals and med admin GONE, back to template state ✅**

### Test Query

```sql
-- Before reset: Record counts
WITH sim_data AS (
  SELECT simulation_tenant_id FROM simulation_active 
  WHERE status = 'running' LIMIT 1
)
SELECT 
  'patient_vitals' as table_name,
  COUNT(*) as record_count
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM sim_data)

UNION ALL

SELECT 
  'medication_administrations',
  COUNT(*)
FROM medication_administrations ma
JOIN patients p ON p.id::text = ma.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM sim_data);

-- Click Reset Button

-- After reset: Should be back to template counts
-- (Run same query again)
```

---

## Priority Assessment

### Urgency: HIGH 🔴

**Why this is critical:**
- Students are experiencing confusing behavior
- Reset appears to work but doesn't actually reset data
- Could lead to incorrect training outcomes
- Accumulating data could cause performance issues over time

**Impact:**
- Every simulation reset is incomplete
- Students see stale data from previous sessions
- Medication "already given" errors confuse workflow
- Assessment forms show duplicates

### Risk of Fix: LOW ✅

**Why it's safe to deploy:**
- Function is self-contained
- Uses same delete + restore pattern as launch
- Already tested in your local environment
- Has proper error handling and logging
- Preserves barcode IDs correctly

---

## Deployment Checklist

- [ ] **Backup current function** (you already have it from query results)
- [ ] **Deploy new reset_simulation** from schema.sql lines 2924-3074
- [ ] **Test with active simulation**:
  1. Launch simulation
  2. Add some vitals
  3. Click reset
  4. Verify vitals are gone
- [ ] **Verify barcodes preserved** (patient IDs should stay same if using sessions)
- [ ] **Check logs** for any errors during reset
- [ ] **Inform users** that reset now properly reverts data

---

## Related Issues

This is actually **blocking your lab deployment** because:
- Your local `reset_simulation` includes lab_results and lab_panels deletion
- But cloud version doesn't delete ANY data
- When you deploy lab support, reset still won't work unless you deploy this fix

**Recommendation:** Deploy `reset_simulation` fix FIRST, then deploy lab support.

---

## Summary

| Aspect | Cloud (Current) | Local (Correct) |
|--------|----------------|-----------------|
| Resets timer | ✅ Yes | ✅ Yes |
| Deletes patient data | ❌ No | ✅ Yes |
| Restores from snapshot | ❌ No | ✅ Yes |
| Preserves patient IDs | N/A (doesn't delete) | ✅ Yes (with sessions) |
| Includes lab cleanup | ❌ No | ✅ Yes |
| Session support | ❌ No | ✅ Yes |
| Activity logging | ❌ No | ✅ Yes |

**Bottom line:** Your cloud database has an incomplete `reset_simulation` function that needs to be replaced with the full version from your local schema.sql.

---

## Next Steps

1. **Deploy reset_simulation fix** (highest priority)
2. Test reset functionality works correctly
3. Deploy lab support to all 3 functions
4. Test complete workflow including labs

Would you like me to extract the exact SQL you need to run to deploy this fix?
