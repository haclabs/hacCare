-- Fix tenant data integrity issues
-- This script will correct common multi-tenant data problems

-- Step 1: Identify the Lethpoly tenant ID (you mentioned this tenant)
SELECT 'LETHPOLY TENANT:' as section, id, name, subdomain 
FROM tenants 
WHERE name ILIKE '%lethpoly%' OR subdomain ILIKE '%lethpoly%';

-- Step 2: Find patients that should belong to Lethpoly but might be in wrong tenant
-- Look for patients with "lethpoly" in their data or recent records
SELECT 'PATIENTS THAT MIGHT BELONG TO LETHPOLY:' as section;
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as current_tenant_name,
  p.created_at
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.created_at > NOW() - INTERVAL '7 days'  -- Recent patients
ORDER BY p.created_at DESC;

-- Step 3: Check for vitals without proper tenant_id
SELECT 'VITALS NEEDING TENANT FIX:' as section;
SELECT 
  pv.id as vital_id,
  pv.patient_id,
  p.first_name,
  p.last_name,
  p.tenant_id as patient_tenant_id,
  pv.tenant_id as vital_tenant_id,
  pv.recorded_at
FROM patient_vitals pv
JOIN patients p ON pv.patient_id = p.id
WHERE pv.tenant_id IS NULL 
   OR pv.tenant_id != p.tenant_id
ORDER BY pv.recorded_at DESC;

-- Step 4: Check for alerts without proper tenant_id
SELECT 'ALERTS NEEDING TENANT FIX:' as section;
SELECT 
  pa.id as alert_id,
  pa.patient_id,
  pa.patient_name,
  p.tenant_id as patient_tenant_id,
  pa.tenant_id as alert_tenant_id,
  pa.alert_type,
  pa.message,
  pa.created_at
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE pa.tenant_id IS NULL 
   OR pa.tenant_id != p.tenant_id
ORDER BY pa.created_at DESC;

-- FIXES (uncomment and run these after reviewing the above data):

-- Fix 1: Update vitals to match their patient's tenant_id
/*
UPDATE patient_vitals 
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_vitals.patient_id
)
WHERE tenant_id IS NULL 
   OR tenant_id != (
     SELECT p.tenant_id 
     FROM patients p 
     WHERE p.id = patient_vitals.patient_id
   );
*/

-- Fix 2: Update alerts to match their patient's tenant_id
/*
UPDATE patient_alerts 
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_alerts.patient_id
)
WHERE tenant_id IS NULL 
   OR tenant_id != (
     SELECT p.tenant_id 
     FROM patients p 
     WHERE p.id = patient_alerts.patient_id
   );
*/

-- Fix 3: If a patient should belong to Lethpoly (replace LETHPOLY_TENANT_ID with actual ID)
/*
UPDATE patients 
SET tenant_id = 'LETHPOLY_TENANT_ID'
WHERE id = 'SPECIFIC_PATIENT_ID';

-- Then update their related data
UPDATE patient_vitals 
SET tenant_id = 'LETHPOLY_TENANT_ID'
WHERE patient_id = 'SPECIFIC_PATIENT_ID';

UPDATE patient_alerts 
SET tenant_id = 'LETHPOLY_TENANT_ID'
WHERE patient_id = 'SPECIFIC_PATIENT_ID';
*/

-- Verification queries (run after fixes)
SELECT 'VERIFICATION - Data consistency check:' as section;
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
WHERE pa.tenant_id != p.tenant_id;
