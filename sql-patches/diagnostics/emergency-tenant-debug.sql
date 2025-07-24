-- Emergency Tenant Data Fix Script
-- Run this step by step to identify and fix the tenant issues

-- ===================================================
-- STEP 1: IDENTIFY THE PROBLEM
-- ===================================================

-- Find all tenants
SELECT 'ALL TENANTS:' as section;
SELECT id, name, subdomain, status, created_at 
FROM tenants 
ORDER BY created_at;

-- Find the specific Lethpoly tenant
SELECT 'LETHPOLY TENANT:' as section;
SELECT id, name, subdomain, status 
FROM tenants 
WHERE name ILIKE '%lethpoly%' OR subdomain ILIKE '%lethpoly%';

-- Find all patients and which tenant they belong to
SELECT 'ALL PATIENTS BY TENANT:' as section;
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as tenant_name
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY t.name, p.first_name;

-- ===================================================
-- STEP 2: CHECK RECENT ALERTS
-- ===================================================

-- Check all recent alerts and their tenant associations
SELECT 'RECENT ALERTS:' as section;
SELECT 
  pa.id as alert_id,
  pa.patient_name,
  pa.alert_type,
  pa.message,
  pa.tenant_id as alert_tenant_id,
  t_alert.name as alert_tenant_name,
  p.tenant_id as patient_tenant_id,
  t_patient.name as patient_tenant_name,
  pa.acknowledged,
  pa.created_at
FROM patient_alerts pa
LEFT JOIN tenants t_alert ON pa.tenant_id = t_alert.id
LEFT JOIN patients p ON pa.patient_id = p.id
LEFT JOIN tenants t_patient ON p.tenant_id = t_patient.id
WHERE pa.created_at > NOW() - INTERVAL '24 hours'
ORDER BY pa.created_at DESC;

-- ===================================================
-- STEP 3: CHECK RECENT VITALS
-- ===================================================

-- Check recent vital signs and their tenant associations
SELECT 'RECENT VITALS:' as section;
SELECT 
  pv.id as vital_id,
  p.first_name,
  p.last_name,
  pv.temperature,
  pv.tenant_id as vital_tenant_id,
  t_vital.name as vital_tenant_name,
  p.tenant_id as patient_tenant_id,
  t_patient.name as patient_tenant_name,
  pv.recorded_at
FROM patient_vitals pv
LEFT JOIN tenants t_vital ON pv.tenant_id = t_vital.id
LEFT JOIN patients p ON pv.patient_id = p.id
LEFT JOIN tenants t_patient ON p.tenant_id = t_patient.id
WHERE pv.recorded_at > NOW() - INTERVAL '24 hours'
ORDER BY pv.recorded_at DESC;

-- ===================================================
-- STEP 4: IDENTIFY DATA INCONSISTENCIES
-- ===================================================

SELECT 'DATA PROBLEMS:' as section;

-- Problem 1: Patients in System Default that shouldn't be there
SELECT 'Patients in System Default:' as problem, COUNT(*) as count
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE t.name = 'System Default'

UNION ALL

-- Problem 2: Alerts without tenant_id
SELECT 'Alerts without tenant_id:' as problem, COUNT(*) as count
FROM patient_alerts
WHERE tenant_id IS NULL

UNION ALL

-- Problem 3: Alerts with wrong tenant_id
SELECT 'Alerts with mismatched tenant_id:' as problem, COUNT(*) as count
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE pa.tenant_id != p.tenant_id

UNION ALL

-- Problem 4: Vitals without tenant_id  
SELECT 'Vitals without tenant_id:' as problem, COUNT(*) as count
FROM patient_vitals
WHERE tenant_id IS NULL

UNION ALL

-- Problem 5: Vitals with wrong tenant_id
SELECT 'Vitals with mismatched tenant_id:' as problem, COUNT(*) as count
FROM patient_vitals pv
JOIN patients p ON pv.patient_id = p.id
WHERE pv.tenant_id != p.tenant_id;
