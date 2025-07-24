-- Diagnostic script to check tenant data integrity
-- Run this in your Supabase SQL editor to check the current state

-- 1. Check all tenants
SELECT 'TENANTS:' as section;
SELECT id, name, subdomain, status FROM tenants ORDER BY name;

-- 2. Check patients and their tenant assignments
SELECT 'PATIENTS BY TENANT:' as section;
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as tenant_name,
  t.subdomain as tenant_subdomain
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY t.name, p.first_name;

-- 3. Check patient_vitals and their tenant assignments
SELECT 'VITALS BY TENANT:' as section;
SELECT 
  pv.id,
  pv.patient_id,
  pv.tenant_id as vitals_tenant_id,
  p.tenant_id as patient_tenant_id,
  p.first_name,
  p.last_name,
  t.name as tenant_name,
  pv.temperature,
  pv.recorded_at
FROM patient_vitals pv
LEFT JOIN patients p ON pv.patient_id = p.id
LEFT JOIN tenants t ON pv.tenant_id = t.id
ORDER BY pv.recorded_at DESC
LIMIT 10;

-- 4. Check alerts and their tenant assignments
SELECT 'ALERTS BY TENANT:' as section;
SELECT 
  pa.id,
  pa.patient_id,
  pa.tenant_id as alert_tenant_id,
  p.tenant_id as patient_tenant_id,
  pa.patient_name,
  pa.alert_type,
  pa.message,
  pa.acknowledged,
  t.name as tenant_name,
  pa.created_at
FROM patient_alerts pa
LEFT JOIN patients p ON pa.patient_id = p.id
LEFT JOIN tenants t ON pa.tenant_id = t.id
ORDER BY pa.created_at DESC
LIMIT 10;

-- 5. Check for data inconsistencies
SELECT 'DATA INCONSISTENCIES:' as section;

-- Patients without tenant_id
SELECT 'Patients without tenant_id:' as issue, COUNT(*) as count
FROM patients WHERE tenant_id IS NULL

UNION ALL

-- Vitals with different tenant_id than their patient
SELECT 'Vitals with mismatched tenant_id:' as issue, COUNT(*) as count
FROM patient_vitals pv
JOIN patients p ON pv.patient_id = p.id
WHERE pv.tenant_id != p.tenant_id OR (pv.tenant_id IS NULL AND p.tenant_id IS NOT NULL)

UNION ALL

-- Alerts with different tenant_id than their patient
SELECT 'Alerts with mismatched tenant_id:' as issue, COUNT(*) as count
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE pa.tenant_id != p.tenant_id OR (pa.tenant_id IS NULL AND p.tenant_id IS NOT NULL);

-- 6. Check system default tenant specifically
SELECT 'SYSTEM DEFAULT TENANT DATA:' as section;
SELECT 
  'Patients in System Default:' as type,
  COUNT(*) as count
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE t.name = 'System Default'

UNION ALL

SELECT 
  'Alerts in System Default:' as type,
  COUNT(*) as count
FROM patient_alerts pa
JOIN tenants t ON pa.tenant_id = t.id
WHERE t.name = 'System Default';
