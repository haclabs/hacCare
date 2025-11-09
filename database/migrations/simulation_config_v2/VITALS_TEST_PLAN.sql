-- ============================================================================
-- PHASE 3 TESTING: VITALS TEST PLAN
-- ============================================================================
-- Purpose: Test config-driven snapshot/restore with vitals to ensure:
-- 1. Snapshot captures vitals correctly
-- 2. Restore brings vitals to new simulation
-- 3. New vitals during simulation don't get lost/overwritten
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SETUP: Get your template ID
-- ---------------------------------------------------------------------------

-- Find your template (replace with your actual template name or get the ID)
SELECT id, name, status, snapshot_version, snapshot_taken_at
FROM simulation_templates
ORDER BY created_at DESC
LIMIT 5;

-- Store the template_id for use below
-- Replace 'YOUR_TEMPLATE_ID' with the actual UUID from above

-- ---------------------------------------------------------------------------
-- TEST 1: Take Snapshot with V2 (Capture Current State Including Vitals)
-- ---------------------------------------------------------------------------

-- This will capture all current data including vitals
SELECT save_template_snapshot_v2('YOUR_TEMPLATE_ID');

-- Verify vitals were captured
SELECT 
  jsonb_array_length(snapshot_data->'patient_vitals') as vitals_count,
  jsonb_array_length(snapshot_data->'patients') as patients_count,
  jsonb_array_length(snapshot_data->'lab_panels') as lab_panels_count,
  jsonb_array_length(snapshot_data->'lab_results') as lab_results_count
FROM simulation_templates
WHERE id = 'YOUR_TEMPLATE_ID';

-- See what vitals were captured
SELECT 
  v->>'recorded_at' as recorded_at,
  v->>'heart_rate' as heart_rate,
  v->>'blood_pressure_systolic' as bp_systolic,
  v->>'blood_pressure_diastolic' as bp_diastolic,
  v->>'temperature' as temperature,
  v->>'respiratory_rate' as resp_rate,
  v->>'o2_saturation' as o2_sat
FROM simulation_templates,
     jsonb_array_elements(snapshot_data->'patient_vitals') as v
WHERE id = 'YOUR_TEMPLATE_ID'
ORDER BY (v->>'recorded_at')::timestamptz DESC
LIMIT 10;

-- ---------------------------------------------------------------------------
-- TEST 2: Launch Simulation (This will use V1 for now - V2 not hooked up yet)
-- ---------------------------------------------------------------------------

-- Launch simulation using your existing launch_simulation function
-- This will call restore_snapshot_to_tenant (V1) which is still active
-- We'll manually test V2 separately below

-- SELECT launch_simulation('YOUR_TEMPLATE_ID', 'Test Simulation', 120);

-- Get the new simulation tenant_id
SELECT 
  sa.id as simulation_id,
  sa.tenant_id as new_tenant_id,
  sa.name,
  sa.status
FROM simulation_active sa
WHERE sa.template_id = 'YOUR_TEMPLATE_ID'
ORDER BY sa.created_at DESC
LIMIT 1;

-- ---------------------------------------------------------------------------
-- TEST 3: Verify Vitals Restored (Check V1 restored them)
-- ---------------------------------------------------------------------------

-- Check vitals in the new simulation tenant
SELECT 
  pv.id,
  p.name as patient_name,
  pv.recorded_at,
  pv.heart_rate,
  pv.blood_pressure_systolic,
  pv.blood_pressure_diastolic,
  pv.temperature,
  pv.respiratory_rate,
  pv.o2_saturation
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'NEW_TENANT_ID_FROM_ABOVE'
ORDER BY pv.recorded_at DESC;

-- Count should match snapshot
SELECT COUNT(*) as vitals_in_simulation
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'NEW_TENANT_ID_FROM_ABOVE';

-- ---------------------------------------------------------------------------
-- TEST 4: ADD NEW VITALS During Simulation
-- ---------------------------------------------------------------------------

-- Get a patient_id from the simulation
SELECT id, name, patient_id 
FROM patients 
WHERE tenant_id = 'NEW_TENANT_ID_FROM_ABOVE';

-- Add new vitals (simulating nurse entering vitals during simulation)
INSERT INTO patient_vitals (
  patient_id,
  tenant_id,
  recorded_at,
  heart_rate,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  temperature,
  respiratory_rate,
  o2_saturation,
  recorded_by
)
VALUES (
  'PATIENT_ID_FROM_ABOVE',
  'NEW_TENANT_ID_FROM_ABOVE',
  now(),
  88,  -- New heart rate
  135, -- New BP systolic
  85,  -- New BP diastolic
  98.9, -- New temp
  18,  -- New resp rate
  97,  -- New O2 sat
  auth.uid()
);

-- Verify new vitals are there
SELECT 
  recorded_at,
  heart_rate,
  blood_pressure_systolic,
  temperature
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'NEW_TENANT_ID_FROM_ABOVE'
ORDER BY recorded_at DESC
LIMIT 5;

-- ---------------------------------------------------------------------------
-- TEST 5: Simulate Reset (Should Keep New Vitals - NOT DELETE THEM)
-- ---------------------------------------------------------------------------

-- IMPORTANT: Your reset_simulation should NOT be deleting vitals
-- Let's check what your reset function does

-- Check current reset function
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'reset_simulation';

-- If reset is called, verify vitals are PRESERVED
-- The new vitals entered during simulation should still be there

-- ---------------------------------------------------------------------------
-- TEST 6: Manual Test of V2 Restore (Advanced)
-- ---------------------------------------------------------------------------

-- Create a test tenant to restore into
INSERT INTO tenants (id, name, type)
VALUES (
  gen_random_uuid(),
  'Test Restore V2 Tenant',
  'simulation'
)
RETURNING id;
-- Save this ID as TEST_TENANT_ID

-- Get snapshot from template
SELECT snapshot_data 
FROM simulation_templates 
WHERE id = 'YOUR_TEMPLATE_ID'
\gset

-- Manually call V2 restore
SELECT restore_snapshot_to_tenant_v2(
  'TEST_TENANT_ID',
  (SELECT snapshot_data FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID')
);

-- Check vitals restored in test tenant
SELECT 
  p.name,
  pv.recorded_at,
  pv.heart_rate,
  pv.temperature
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'TEST_TENANT_ID'
ORDER BY pv.recorded_at DESC;

-- ---------------------------------------------------------------------------
-- EXPECTED RESULTS
-- ---------------------------------------------------------------------------

/*

✅ TEST 1: Snapshot should capture all existing vitals
✅ TEST 2: Launch creates new simulation tenant
✅ TEST 3: Vitals from snapshot appear in new simulation
✅ TEST 4: New vitals can be added during simulation
✅ TEST 5: Reset (if used) should PRESERVE new vitals entered during simulation
✅ TEST 6: V2 restore works independently

CRITICAL: New vitals entered during simulation should NEVER be deleted.
Reset should only reset the timer, not delete clinical data.

*/

-- ---------------------------------------------------------------------------
-- CLEANUP (Optional - only if testing manually)
-- ---------------------------------------------------------------------------

/*

-- Delete test tenant and its data (cascades)
DELETE FROM tenants WHERE id = 'TEST_TENANT_ID';

-- End active simulation
UPDATE simulation_active 
SET status = 'completed', completed_at = now()
WHERE id = 'SIMULATION_ID';

*/
