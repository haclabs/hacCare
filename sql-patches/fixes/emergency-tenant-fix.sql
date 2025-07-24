-- EMERGENCY FIX: Tenant Data Correction
-- This script will fix the tenant assignment issues

-- ===================================================
-- PART A: GATHER INFORMATION FIRST
-- ===================================================

-- Get the Lethpoly tenant ID (replace with actual values you find)
-- You'll need to run this first and note the tenant ID
SELECT 'LETHPOLY TENANT ID:' as info, id, name 
FROM tenants 
WHERE name ILIKE '%lethpoly%' OR subdomain ILIKE '%lethpoly%';

-- Get the System Default tenant ID 
SELECT 'SYSTEM DEFAULT TENANT ID:' as info, id, name
FROM tenants 
WHERE name = 'System Default';

-- ===================================================
-- PART B: FIX PATIENT ASSIGNMENT
-- ===================================================

-- STEP 1: Find patients that should belong to Lethpoly
-- (You'll need to identify which patients these are based on your data)
SELECT 'PATIENTS THAT MIGHT NEED REASSIGNMENT:' as section;
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as current_tenant_name,
  p.created_at
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY p.created_at DESC;

-- STEP 2: Reassign specific patient to Lethpoly tenant
-- REPLACE 'PATIENT_ID_HERE' with the actual patient ID
-- REPLACE 'LETHPOLY_TENANT_ID_HERE' with the actual Lethpoly tenant ID

/*
-- First, identify the correct patient and tenant IDs, then uncomment and run:

UPDATE patients 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE',
    updated_at = NOW()
WHERE id = 'PATIENT_ID_HERE';

-- Update the patient's vitals to match
UPDATE patient_vitals 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id = 'PATIENT_ID_HERE';

-- Update the patient's alerts to match  
UPDATE patient_alerts
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id = 'PATIENT_ID_HERE';

-- Update the patient's notes to match
UPDATE patient_notes
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id = 'PATIENT_ID_HERE';

-- Update the patient's medications to match
UPDATE patient_medications
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE' 
WHERE patient_id = 'PATIENT_ID_HERE';
*/

-- ===================================================
-- PART C: BULK FIX FOR ALL MISMATCHED DATA
-- ===================================================

-- Fix all vitals that don't match their patient's tenant
/*
UPDATE patient_vitals 
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_vitals.patient_id
)
WHERE EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_vitals.patient_id 
  AND p.tenant_id IS NOT NULL
  AND (patient_vitals.tenant_id IS NULL OR patient_vitals.tenant_id != p.tenant_id)
);
*/

-- Fix all alerts that don't match their patient's tenant
/*
UPDATE patient_alerts
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_alerts.patient_id
)
WHERE EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_alerts.patient_id 
  AND p.tenant_id IS NOT NULL
  AND (patient_alerts.tenant_id IS NULL OR patient_alerts.tenant_id != p.tenant_id)
);
*/

-- Fix all notes that don't match their patient's tenant
/*
UPDATE patient_notes
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_notes.patient_id
)
WHERE EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_notes.patient_id 
  AND p.tenant_id IS NOT NULL
  AND (patient_notes.tenant_id IS NULL OR patient_notes.tenant_id != p.tenant_id)
);
*/

-- ===================================================
-- PART D: VERIFICATION
-- ===================================================

-- Verify the fixes worked
SELECT 'VERIFICATION AFTER FIX:' as section;

SELECT 'Fixed data consistency:' as check;

SELECT 
  'Patients without tenant:' as issue,
  COUNT(*) as count
FROM patients 
WHERE tenant_id IS NULL

UNION ALL

SELECT 
  'Vitals with wrong tenant:' as issue,
  COUNT(*) as count  
FROM patient_vitals pv
JOIN patients p ON pv.patient_id = p.id
WHERE pv.tenant_id != p.tenant_id

UNION ALL

SELECT 
  'Alerts with wrong tenant:' as issue,
  COUNT(*) as count
FROM patient_alerts pa  
JOIN patients p ON pa.patient_id = p.id
WHERE pa.tenant_id != p.tenant_id

UNION ALL

SELECT 
  'Notes with wrong tenant:' as issue,
  COUNT(*) as count
FROM patient_notes pn
JOIN patients p ON pn.patient_id = p.id  
WHERE pn.tenant_id != p.tenant_id;
