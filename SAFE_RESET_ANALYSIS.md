# Safe Reset Analysis - Addressing Your Concerns
**Date:** November 6, 2025  
**Context:** You had major issues with reset removing patients and breaking things

---

## Your Valid Concerns 🚨

Based on your history:
1. **Old reset function deleted medications** you added after template creation
2. **Printed barcode labels became invalid** (medications deleted)
3. **Patients disappeared** or data got corrupted
4. **Took 6 days to fix** and get working properly

**YOU ARE RIGHT TO BE CAUTIOUS!**

---

## What's DIFFERENT Now vs What Broke Before

### The OLD Broken Reset (What You Experienced) ❌

From `015_reset_simulation_update_in_place.sql`:
```sql
-- THIS IS THE BAD ONE THAT BROKE YOUR SYSTEM!
DELETE FROM patient_medications pm
WHERE pm.tenant_id = v_tenant_id
AND pm.id NOT IN (
  SELECT ... FROM template snapshot
);
```

**Problem:** Deleted medications not in original snapshot!
- You add meds during simulation → DELETED on reset ❌
- Printed labels → INVALID ❌
- Students confused → Can't find medications ❌

### What's Currently Deployed (Cloud) ⚠️

```sql
-- Just resets timer, doesn't touch data at all
UPDATE simulation_active
SET starts_at = now(), ends_at = ..., status = 'running'
WHERE id = p_simulation_id;
```

**Problem:** Doesn't reset ANY data!
- Student vitals accumulate ❌
- Med administrations stay marked "given" ❌
- Patient notes pile up across sessions ❌
- Looks like it works but doesn't actually reset ❌

### Your Local Version (What I'm Recommending) ✅

```sql
-- Deletes EVERYTHING in simulation tenant
DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
-- ... (deletes ALL data)
DELETE FROM patients WHERE tenant_id = v_tenant_id;

-- Then restores EXACTLY what was in snapshot
PERFORM restore_snapshot_to_tenant(
  v_tenant_id, 
  v_snapshot, 
  v_id_mappings  -- ✅ THIS PRESERVES PATIENT IDs!
);
```

**Key Difference:** 
- Deletes ALL ✅ (no selective deletion that can break)
- Restores from snapshot ✅ (gets everything back)
- Preserves IDs via v_id_mappings ✅ (barcodes still work)

---

## Why Your Local Version is SAFER Than What Broke Before

### 1. No Selective Deletion ✅
**Old Function (Broken):**
- Tried to be "smart" and only delete NEW meds
- Used complex NOT IN queries
- **FAILED:** Deleted meds you needed

**Your Function (Safe):**
- Deletes EVERYTHING (not selective)
- Simple: `DELETE FROM table WHERE tenant_id = sim_tenant`
- **SAFE:** Can't accidentally keep wrong things

### 2. Full Restoration ✅
**Old Function (Broken):**
- Tried to merge old + new data
- Complex logic for what to keep
- **FAILED:** Inconsistent state

**Your Function (Safe):**
- Restores complete snapshot
- Calls restore_snapshot_to_tenant (already tested working)
- **SAFE:** Known good state every time

### 3. ID Preservation ✅
**Old Function (Broken):**
- Didn't have id_mappings concept
- Generated new UUIDs on reset
- **FAILED:** Barcodes broke

**Your Function (Safe):**
- Uses v_id_mappings from session
- restore_snapshot_to_tenant uses pre-allocated IDs
- **SAFE:** Same patient IDs = same barcodes

---

## The Real Question: Do You WANT Full Data Reset?

Let's clarify what you actually need:

### Option A: Full Reset (Your Local Version)
**What Happens:**
- Deletes all patient data in simulation
- Restores exactly what was in template snapshot
- Preserves patient IDs (barcodes work)
- Resets timer

**Good For:**
- Each student group gets clean slate
- Template has exact starting state you want
- No accumulated junk data between sessions

**Bad For:**
- You add meds/data during simulation that should persist
- You want students to build on previous session's work

### Option B: Selective Clear (New "Safe" Option)
**What Happens:**
- Clears student work ONLY (vitals, notes, med administrations)
- Keeps medications, patients, orders (base setup)
- Doesn't delete/restore anything
- Just marks meds as "not given", clears vitals table

**Good For:**
- You add medications during simulation
- Printed labels must stay valid
- Same setup, fresh student data each session

**Bad For:**
- Students modified patient demographics (will persist)
- You want EXACT template restoration

---

## My Recommendation: TEST FIRST Approach

### Step 1: Check What You Actually Need

Run this query to see what's accumulating:
```sql
-- See what's in your active simulation
WITH sim_data AS (
  SELECT simulation_tenant_id, name 
  FROM simulation_active 
  WHERE status = 'running' 
  LIMIT 1
)
SELECT 
  'Patients' as data_type,
  COUNT(*) as count,
  'Should reset to template count' as expected
FROM patients
WHERE tenant_id IN (SELECT simulation_tenant_id FROM sim_data)

UNION ALL

SELECT 
  'Medications',
  COUNT(*),
  'Template meds + any you added'
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM sim_data)

UNION ALL

SELECT 
  'Vitals Recorded',
  COUNT(*),
  'Should be CLEARED on reset'
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM sim_data)

UNION ALL

SELECT 
  'Medications Given',
  COUNT(*),
  'Should be CLEARED on reset'
FROM medication_administrations ma
JOIN patients p ON p.id::text = ma.patient_id
WHERE p.tenant_id IN (SELECT simulation_tenant_id FROM sim_data)
AND ma.status = 'administered';
```

### Step 2: Create TEST Function First

Instead of deploying to `reset_simulation`, let's test with a new name:

```sql
-- Create TEST version (won't break anything)
CREATE OR REPLACE FUNCTION reset_simulation_TEST(p_simulation_id uuid)
RETURNS json AS $$
-- (Copy exact same code from schema.sql lines 2924-3074)
-- But name it reset_simulation_TEST
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then test:
```sql
-- Test reset (won't affect real reset button)
SELECT reset_simulation_TEST('your-sim-id'::uuid);

-- Check results
-- Did patients come back? Same IDs?
-- Are vitals cleared?
-- Are meds back to template state?
```

### Step 3: Compare Before/After

```sql
-- BEFORE reset
SELECT id, patient_id, first_name, last_name
FROM patients
WHERE tenant_id = 'sim-tenant-id';

-- Run reset_simulation_TEST

-- AFTER reset
SELECT id, patient_id, first_name, last_name
FROM patients
WHERE tenant_id = 'sim-tenant-id';

-- IDs should be EXACTLY THE SAME if using id_mappings!
```

---

## Safety Checklist Before Deploying

Before you deploy the full reset function, verify:

- [ ] **Template has good snapshot**
  ```sql
  SELECT 
    id, name, snapshot_version, snapshot_taken_at,
    jsonb_object_keys(snapshot_data) as tables
  FROM simulation_templates
  WHERE id = 'your-template-id';
  ```

- [ ] **Simulation has session ID mappings**
  ```sql
  SELECT 
    sa.id, sa.name,
    t.simulation_config->'session_number' as session,
    st.simulation_id_sets->(session-1)->'id_mappings' as id_mappings
  FROM simulation_active sa
  JOIN tenants t ON t.id = sa.tenant_id
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.status = 'running';
  ```

- [ ] **restore_snapshot_to_tenant works** (we verified this earlier)

- [ ] **You have backup of current function**
  - You already have this from the query results I gave you
  - Current cloud version just resets timer (safe fallback)

- [ ] **Test function works** (from Step 2 above)

---

## Rollback Plan If Something Goes Wrong

If you deploy and it breaks:

### Immediate Rollback (2 minutes)
```sql
-- Restore the simple timer-only reset
DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;

CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_sim simulation_active%ROWTYPE;
BEGIN
  SELECT * INTO v_sim
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  UPDATE simulation_active
  SET 
    starts_at = now(),
    ends_at = now() + (v_sim.duration_minutes || ' minutes')::interval,
    status = 'running',
    updated_at = now()
  WHERE id = p_simulation_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;
```

This gets you back to "timer reset only" mode (current cloud state).

### Recover Lost Data (if patients deleted)

If somehow patients get deleted:
```sql
-- Patients should still be in template snapshot
SELECT launch_simulation(
  'template-id'::uuid,
  'Recovery Simulation',
  60,
  ARRAY['your-user-id'::uuid],
  ARRAY['instructor']
);

-- This creates new simulation with all template data
```

---

## My Honest Assessment

### Risk Level: MEDIUM 🟡

**Higher Risk Factors:**
- You've had bad experiences with reset before
- Full delete + restore is more aggressive than timer-only
- Class is using system (can't afford downtime)

**Lower Risk Factors:**
- Current reset doesn't actually reset data (already broken)
- Your local function uses same restore that works for launch
- ID preservation is built-in with session mappings
- You have simple rollback option

### What I'd Do in Your Position

**TODAY (Before Class):**
1. ✅ Keep current timer-only reset (students can work)
2. ✅ Test reset_simulation_TEST in development
3. ✅ Verify ID preservation works
4. ✅ Document exact rollback steps

**AFTER Class (Tomorrow):**
1. Deploy reset_simulation with full data reset
2. Test immediately with small simulation
3. Verify barcodes still work
4. If good → use for next class
5. If bad → rollback in 2 minutes

### Alternative: Don't Deploy Reset Yet

You could:
1. Deploy ONLY the lab support (duplicate, save_template, restore_snapshot)
2. Keep timer-only reset for now
3. Manually delete simulation and re-launch for "reset" (slower but safer)
4. Test full reset function over break/holiday
5. Deploy when you're confident it won't break

---

## Bottom Line

**Your local reset_simulation is SAFER than the old one that broke** because:
- No selective deletion (all or nothing approach)
- Uses proven restore_snapshot_to_tenant
- Has ID preservation built-in
- Simpler logic = less to go wrong

**BUT** it's still more aggressive than current timer-only reset, so:
- TEST with reset_simulation_TEST first
- Verify ID preservation works
- Have rollback ready
- Maybe wait until after class to deploy

**Want me to help you create the TEST version so you can verify it's safe before deploying to production?**
