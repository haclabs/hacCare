-- Quick check: Are medication_administrations being deleted on reset?

-- 1. Find your running simulation's tenant_id
SELECT 
  sa.id as simulation_id,
  sa.tenant_id,
  sa.status,
  sa.template_name
FROM simulation_active sa
WHERE sa.status = 'running'
ORDER BY sa.created_at DESC
LIMIT 1;

-- 2. Count medication_administrations for that tenant
-- Replace 'YOUR_TENANT_ID' with the tenant_id from query above
SELECT 
  COUNT(*) as total_med_admins,
  COUNT(DISTINCT student_name) as unique_students,
  array_agg(DISTINCT medication_name) as medications
FROM medication_administrations
WHERE tenant_id = 'YOUR_TENANT_ID';

-- 3. If there are records, list them with timestamps
SELECT 
  id,
  medication_name,
  student_name,
  timestamp,
  barcode_scanned,
  created_at
FROM medication_administrations
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY timestamp DESC;
