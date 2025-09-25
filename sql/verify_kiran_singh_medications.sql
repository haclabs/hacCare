-- Quick verification for Kiran Singh in NSG25 (nsg-25) tenant

-- 1. Find Kiran Singh and check tenant alignment
SELECT 
    'Kiran Singh Patient Info' as section,
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant_id,
    t.name as patient_tenant_name,
    t.subdomain as patient_tenant_subdomain
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.first_name = 'Kiran' AND p.last_name = 'Singh';

-- 2. Show Kiran's medications and their tenant alignment
SELECT 
    'Kiran Singh Medications' as section,
    pm.id as medication_id,
    pm.name as medication_name,
    pm.status,
    pm.tenant_id as medication_tenant_id,
    p.tenant_id as patient_tenant_id,
    CASE 
        WHEN pm.tenant_id = p.tenant_id THEN '✅ ALIGNED'
        ELSE '❌ MISALIGNED'
    END as tenant_status,
    pt.subdomain as patient_tenant_subdomain,
    mt.subdomain as medication_tenant_subdomain
FROM patients p
JOIN patient_medications pm ON p.id = pm.patient_id
LEFT JOIN tenants pt ON p.tenant_id = pt.id
LEFT JOIN tenants mt ON pm.tenant_id = mt.id
WHERE p.first_name = 'Kiran' AND p.last_name = 'Singh'
ORDER BY pm.name;

-- 3. Check if there are ANY medications for NSG25 patients
SELECT 
    'NSG25 Patient Medication Summary' as section,
    p.first_name,
    p.last_name,
    COUNT(pm.id) as medication_count,
    ARRAY_AGG(pm.name ORDER BY pm.name) FILTER (WHERE pm.name IS NOT NULL) as medications
FROM patients p
LEFT JOIN patient_medications pm ON p.id = pm.patient_id AND pm.status = 'Active'
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
GROUP BY p.id, p.first_name, p.last_name
ORDER BY p.last_name, p.first_name;