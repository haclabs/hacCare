-- Comprehensive medication troubleshooting for NSG25 tenant
-- Compare bulk label queries vs individual patient medication queries

-- 1. Get NSG25 tenant ID for reference
SELECT 'NSG25 Tenant Info' as section, id, name, subdomain 
FROM tenants 
WHERE subdomain = 'nsg-25';

-- 2. Count all patients in NSG25
SELECT 'Patient Count' as section, COUNT(*) as total_patients
FROM patients 
WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25');

-- 3. List all patients in NSG25 with their medication counts
SELECT 
    'Individual Patient Med Counts' as section,
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.patient_id,
    COUNT(pm.id) as medication_count,
    ARRAY_AGG(pm.name ORDER BY pm.name) as medications
FROM patients p
LEFT JOIN patient_medications pm ON p.id = pm.patient_id AND pm.status = 'Active'
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
GROUP BY p.id, p.first_name, p.last_name, p.patient_id
ORDER BY p.last_name, p.first_name;

-- 4. Check medications by tenant_id (what bulk labels uses)
SELECT 
    'Bulk Label Query (by medication tenant_id)' as section,
    COUNT(*) as total_medications,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) as medications
FROM patient_medications pm
WHERE pm.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pm.status = 'Active';

-- 5. Check medications by patient tenant_id (what individual patient views might use)
SELECT 
    'Patient View Query (by patient tenant_id)' as section,
    COUNT(*) as total_medications,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) as medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pm.status = 'Active';

-- 6. Find any medication/patient tenant mismatches in NSG25
SELECT 
    'Tenant Mismatches' as section,
    pm.id as medication_id,
    pm.name as medication_name,
    pm.tenant_id as medication_tenant,
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant,
    CASE 
        WHEN pm.tenant_id = p.tenant_id THEN 'MATCH'
        ELSE 'MISMATCH'
    END as tenant_alignment
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE (p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
       OR pm.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25'))
AND pm.status = 'Active'
ORDER BY tenant_alignment DESC, pm.name;

-- 7. Check if there are inactive medications that should be active
SELECT 
    'Inactive Medications' as section,
    COUNT(*) as inactive_count,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) as inactive_medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pm.status != 'Active';

-- 8. Show detailed medication records for troubleshooting
SELECT 
    'Detailed Medication Records' as section,
    pm.id,
    pm.name,
    pm.status,
    pm.tenant_id as med_tenant_id,
    pm.patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id as patient_tenant_id,
    pm.created_at
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
ORDER BY p.last_name, pm.name;