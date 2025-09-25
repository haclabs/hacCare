-- Find and fix patients with missing tenant_id

-- 1. Show patients with missing tenant_id
SELECT 
    'Patients with NULL tenant_id' as section,
    id,
    first_name,
    last_name,
    patient_id,
    tenant_id,
    created_at
FROM patients
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- 2. Show all tenants for reference
SELECT 
    'Available Tenants' as section,
    id as tenant_id,
    name as tenant_name,
    subdomain
FROM tenants
ORDER BY name;

-- 3. Count patients by tenant (to see distribution)
SELECT 
    'Patient Distribution by Tenant' as section,
    t.name as tenant_name,
    t.subdomain,
    COUNT(p.id) as patient_count
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
GROUP BY t.id, t.name, t.subdomain
ORDER BY patient_count DESC;

-- 4. Fix Ray Gatsby specifically - assign to NSG25 tenant
UPDATE patients
SET tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'
WHERE first_name = 'Ray' AND last_name = 'Gatsby' AND tenant_id IS NULL;

-- 5. Fix ALL patients with NULL tenant_id - assign to NSG25 tenant
-- (You can change this tenant_id if needed)
UPDATE patients
SET tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'
WHERE tenant_id IS NULL;

-- 6. Verification - should show 0 patients with NULL tenant_id
SELECT 
    'Verification - Patients with NULL tenant_id' as section,
    COUNT(*) as patients_without_tenant,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL PATIENTS HAVE TENANT_ID'
        ELSE '⚠️ STILL HAVE PATIENTS WITHOUT TENANT_ID'
    END as status
FROM patients
WHERE tenant_id IS NULL;