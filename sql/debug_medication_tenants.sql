-- Debug medication tenant assignments

-- 1. Show all tenants for reference
SELECT id, name, subdomain FROM tenants ORDER BY name;

-- 2. Show medication distribution by tenant
SELECT 
    pm.tenant_id,
    t.name as tenant_name,
    t.subdomain,
    COUNT(*) as total_medications,
    COUNT(CASE WHEN pm.status = 'Active' THEN 1 END) as active_medications,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) as sample_medications
FROM patient_medications pm
LEFT JOIN tenants t ON pm.tenant_id = t.id
GROUP BY pm.tenant_id, t.name, t.subdomain
ORDER BY t.name;

-- 3. Check specific tenant IDs
-- NSG25 tenant ID
SELECT 
    'NSG25' as tenant,
    pm.id,
    pm.name,
    pm.status,
    pm.tenant_id,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant_id
FROM patient_medications pm
LEFT JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25' LIMIT 1)
AND pm.status = 'Active'
ORDER BY pm.name;

-- 4. Check lethpoly tenant medications
SELECT 
    'LETHPOLY' as tenant,
    pm.id,
    pm.name,
    pm.status,
    pm.tenant_id,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant_id
FROM patient_medications pm
LEFT JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'lethpoly' LIMIT 1)
AND pm.status = 'Active'
ORDER BY pm.name;

-- 5. Find medications where patient and medication have different tenant_ids
SELECT 
    pm.id,
    pm.name as medication_name,
    pm.tenant_id as medication_tenant,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant,
    t1.name as med_tenant_name,
    t2.name as patient_tenant_name
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
LEFT JOIN tenants t1 ON pm.tenant_id = t1.id
LEFT JOIN tenants t2 ON p.tenant_id = t2.id
WHERE pm.tenant_id != p.tenant_id
AND pm.status = 'Active'
ORDER BY pm.name;