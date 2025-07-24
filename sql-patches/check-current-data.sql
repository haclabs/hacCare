-- Check current patient data status
-- Run this in your Supabase SQL editor to see what you're working with

-- Check how many patients exist and their tenant status
SELECT 
  'patients' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM patients

UNION ALL

SELECT 
  'patient_vitals' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM patient_vitals

UNION ALL

SELECT 
  'patient_notes' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM patient_notes

UNION ALL

SELECT 
  'patient_medications' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM patient_medications

UNION ALL

SELECT 
  'medication_administrations' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM medication_administrations

UNION ALL

SELECT 
  'patient_images' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id
FROM patient_images;

-- Also check existing tenants
SELECT 
  'Current tenants:' as info,
  COUNT(*) as tenant_count
FROM tenants;

-- Show sample patient data (first 5 records)
SELECT 
  id,
  first_name,
  last_name,
  tenant_id,
  created_at
FROM patients
ORDER BY created_at DESC
LIMIT 5;
