-- ============================================================================
-- QUICK VITALS TEST - Copy and paste each section into Supabase SQL Editor
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Find Your Template
-- ---------------------------------------------------------------------------

SELECT 
  id, 
  name, 
  status, 
  snapshot_version,
  jsonb_array_length(snapshot_data->'patients') as patients,
  jsonb_array_length(snapshot_data->'patient_vitals') as vitals_in_snapshot
FROM simulation_templates
ORDER BY created_at DESC
LIMIT 5;

-- Copy the template 'id' you want to test with

-- ---------------------------------------------------------------------------
-- STEP 2: Take Snapshot with V2
-- ---------------------------------------------------------------------------

-- Replace YOUR_TEMPLATE_ID with the UUID from Step 1
SELECT save_template_snapshot_v2('YOUR_TEMPLATE_ID');

-- Expected output: 
-- {"success": true, "template_id": "...", "tables_captured": 18, "total_rows": XX, ...}

-- ---------------------------------------------------------------------------
-- STEP 3: Check What Was Captured
-- ---------------------------------------------------------------------------

SELECT 
  'patients' as table_name,
  jsonb_array_length(snapshot_data->'patients') as row_count
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID'
UNION ALL
SELECT 
  'patient_vitals',
  jsonb_array_length(snapshot_data->'patient_vitals')
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID'
UNION ALL
SELECT 
  'patient_medications',
  jsonb_array_length(snapshot_data->'patient_medications')
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID'
UNION ALL
SELECT 
  'lab_panels',
  jsonb_array_length(snapshot_data->'lab_panels')
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID'
UNION ALL
SELECT 
  'lab_results',
  jsonb_array_length(snapshot_data->'lab_results')
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID';

-- Expected: Numbers matching your template data

-- ---------------------------------------------------------------------------
-- STEP 4: See Vitals Details in Snapshot
-- ---------------------------------------------------------------------------

SELECT 
  v->>'recorded_at' as time,
  v->>'heart_rate' as hr,
  v->>'blood_pressure_systolic' as bp_sys,
  v->>'blood_pressure_diastolic' as bp_dia,
  v->>'temperature' as temp,
  v->>'o2_saturation' as o2
FROM simulation_templates,
     jsonb_array_elements(snapshot_data->'patient_vitals') as v
WHERE id = 'YOUR_TEMPLATE_ID'
ORDER BY (v->>'recorded_at')::timestamptz DESC
LIMIT 5;

-- ---------------------------------------------------------------------------
-- STEP 5: Test Manual Restore with V2
-- ---------------------------------------------------------------------------

-- Create a test tenant
INSERT INTO tenants (id, name, type)
VALUES (
  gen_random_uuid(),
  'Vitals Test Tenant ' || now()::text,
  'simulation'
)
RETURNING id;

-- SAVE THIS ID as YOUR_TEST_TENANT_ID

-- Now restore snapshot to this tenant using V2
SELECT restore_snapshot_to_tenant_v2(
  'YOUR_TEST_TENANT_ID',
  (SELECT snapshot_data FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID')
);

-- Expected output:
-- {"success": true, "tenant_id": "...", "tables_restored": 8, "total_rows": XX, ...}

-- ---------------------------------------------------------------------------
-- STEP 6: Verify Vitals Were Restored
-- ---------------------------------------------------------------------------

-- Check vitals count in new tenant
SELECT COUNT(*) as vitals_restored
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'YOUR_TEST_TENANT_ID';

-- Should match the count from Step 3

-- See the actual vitals data
SELECT 
  p.name as patient,
  p.patient_id as patient_mrn,
  pv.recorded_at,
  pv.heart_rate,
  pv.blood_pressure_systolic || '/' || pv.blood_pressure_diastolic as bp,
  pv.temperature,
  pv.respiratory_rate,
  pv.o2_saturation
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = 'YOUR_TEST_TENANT_ID'
ORDER BY pv.recorded_at DESC;

-- ---------------------------------------------------------------------------
-- STEP 7: Test Adding NEW Vitals During "Simulation"
-- ---------------------------------------------------------------------------

-- Get a patient from the restored data
SELECT id, patient_id, name 
FROM patients 
WHERE tenant_id = 'YOUR_TEST_TENANT_ID'
LIMIT 1;

-- SAVE THIS id as YOUR_PATIENT_ID

-- Add NEW vitals (simulating nurse entering during simulation)
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
  'YOUR_PATIENT_ID',
  'YOUR_TEST_TENANT_ID',
  now(),
  92,  -- NEW heart rate
  140, -- NEW BP
  90,
  99.1, -- NEW temp
  20,
  98,
  auth.uid()
);

-- Verify new vitals are there
SELECT 
  recorded_at,
  heart_rate,
  blood_pressure_systolic,
  temperature,
  'NEW' as source
FROM patient_vitals pv
WHERE pv.patient_id = 'YOUR_PATIENT_ID'
ORDER BY recorded_at DESC
LIMIT 3;

-- Expected: Should see your NEW vitals at the top

-- ---------------------------------------------------------------------------
-- STEP 8: Verify Patient IDs Match (For Barcodes)
-- ---------------------------------------------------------------------------

-- Compare original patient IDs vs restored patient IDs
-- The patient_id (MRN) should be IDENTICAL for barcode scanning

-- Original in template
SELECT 
  p.patient_id as original_mrn,
  p.name
FROM patients p
WHERE p.tenant_id = (SELECT tenant_id FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID')
ORDER BY p.name;

-- Restored in test tenant
SELECT 
  p.patient_id as restored_mrn,
  p.name
FROM patients p
WHERE p.tenant_id = 'YOUR_TEST_TENANT_ID'
ORDER BY p.name;

-- ✅ These should be IDENTICAL (same MRN numbers for barcode labels)

-- ---------------------------------------------------------------------------
-- STEP 9: Verify Medication IDs Match (For Barcode Labels)
-- ---------------------------------------------------------------------------

-- Original medications
SELECT 
  pm.id::text as med_id,
  p.patient_id as patient_mrn,
  pm.medication_name,
  pm.dosage
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
WHERE p.tenant_id = (SELECT tenant_id FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID')
ORDER BY p.name, pm.medication_name;

-- Restored medications (IDs will be DIFFERENT but structure preserved)
SELECT 
  pm.id::text as med_id,
  p.patient_id as patient_mrn,
  pm.medication_name,
  pm.dosage
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
WHERE p.tenant_id = 'YOUR_TEST_TENANT_ID'
ORDER BY p.name, pm.medication_name;

-- NOTE: The medication IDs will be different UUIDs, but that's EXPECTED
-- Your barcode labels use medication.id which is preserved during restore
-- If labels still work, then ID mapping is correct!

-- ---------------------------------------------------------------------------
-- STEP 10: Cleanup Test Data
-- ---------------------------------------------------------------------------

-- After testing, delete the test tenant (cascades to all data)
DELETE FROM tenants WHERE id = 'YOUR_TEST_TENANT_ID';

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================

/*

✅ Step 1: Found your template
✅ Step 2: Snapshot V2 ran successfully
✅ Step 3: Captured patients, vitals, meds, labs
✅ Step 4: Can see vitals details in snapshot
✅ Step 5: Restore V2 ran successfully  
✅ Step 6: Vitals count matches snapshot count
✅ Step 7: Can add NEW vitals during simulation
✅ Step 8: Patient MRNs are identical (barcodes will work)
✅ Step 9: Medications restored with new IDs but relationships preserved
✅ Step 10: Clean up successful

If all steps pass: Config-driven system is working! 🎉
Labs are included automatically (check lab_panels and lab_results counts)

*/
