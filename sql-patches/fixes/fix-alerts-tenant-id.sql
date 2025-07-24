-- Fix existing alerts that don't have tenant_id set
-- This ensures all alerts are properly associated with tenants

-- First, let's see how many alerts don't have tenant_id
SELECT 
  'patient_alerts' as table_name,
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as alerts_without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as alerts_with_tenant_id
FROM patient_alerts;

-- Update alerts to have tenant_id based on their patient's tenant_id
UPDATE patient_alerts 
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_alerts.patient_id
)
WHERE patient_alerts.tenant_id IS NULL 
AND EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_alerts.patient_id 
  AND p.tenant_id IS NOT NULL
);

-- Delete any alerts for patients that don't exist or don't have tenant_id
-- (these are orphaned alerts that can't be properly associated)
DELETE FROM patient_alerts 
WHERE tenant_id IS NULL 
AND NOT EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_alerts.patient_id 
  AND p.tenant_id IS NOT NULL
);

-- Verify the fix
SELECT 
  'After fix:' as status,
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as alerts_without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as alerts_with_tenant_id
FROM patient_alerts;
