-- Debug NSG001 medication visibility issue
-- Run this in Supabase SQL Editor when logged in as the NSG26 tenant user

-- Step 1: Check NSG001 patient record and tenant
SELECT 
    'NSG001 Patient Info' as debug_step,
    p.patient_id,
    p.id as patient_uuid,
    p.first_name,
    p.last_name,
    t.name as tenant_name,
    t.subdomain as tenant_subdomain
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.patient_id = 'NSG001';

-- Step 2: Check medications for NSG001 (by patient_id string)
SELECT 
    'NSG001 Medications (by patient_id)' as debug_step,
    COUNT(*) as medication_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'NSG001';

-- Step 3: Check medications for NSG001 (by UUID directly)
SELECT 
    'NSG001 Medications (by UUID)' as debug_step,
    pm.id,
    pm.name,
    pm.dosage,
    pm.frequency,
    pm.status,
    t.name as medication_tenant,
    pt.name as patient_tenant
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
JOIN tenants t ON pm.tenant_id = t.id
JOIN tenants pt ON p.tenant_id = pt.id
WHERE p.patient_id = 'NSG001';

-- Step 4: Check if there are RLS policies blocking access
SELECT 
    'RLS Policy Check' as debug_step,
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'patient_medications';

-- Step 5: Check current user context
SELECT 
    'Current User Context' as debug_step,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'tenant_id' as jwt_tenant_id,
    auth.jwt() ->> 'subdomain' as jwt_subdomain;

-- Step 6: Check tenant user permissions for current user
SELECT 
    'Current Tenant Access' as debug_step,
    tu.user_id,
    tu.tenant_id,
    t.name as tenant_name,
    t.subdomain
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- Step 7: Cross-tenant medication check (NSG001 vs PT68837)
SELECT 
    'Cross-Tenant Medication Comparison' as debug_step,
    p.patient_id,
    p.first_name,
    p.last_name,
    t.name as patient_tenant,
    COUNT(pm.id) as medication_count
FROM patients p
LEFT JOIN patient_medications pm ON p.id = pm.patient_id
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE p.patient_id IN ('NSG001', 'PT68837')
GROUP BY p.patient_id, p.first_name, p.last_name, t.name
ORDER BY p.patient_id;

SELECT 'Debug complete - check results above' as status;