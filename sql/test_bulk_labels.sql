-- Test the bulk label queries to see if data is populated correctly

-- First, let's see what tenants exist and their IDs
SELECT id, name, subdomain FROM tenants ORDER BY name;

-- Test patient labels query
SELECT 
    id,
    first_name,
    last_name,
    date_of_birth,
    patient_id,
    room_number,
    tenant_id,
    -- Test patient barcode generation (using substring for PostgreSQL)
    CONCAT('PT', UPPER(RIGHT(patient_id::text, 8))) as patient_barcode
FROM patients 
WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'lethpoly' LIMIT 1)
ORDER BY last_name;

-- Test medication labels query
SELECT 
    pm.id,
    pm.patient_id,
    pm.name,
    pm.dosage,
    pm.frequency,
    pm.route,
    pm.prescribed_by,
    pm.start_date,
    pm.status,
    pm.tenant_id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    -- Test medication barcode generation (using substring for UUIDs)
    CONCAT(
        UPPER(LEFT(REGEXP_REPLACE(pm.name, '[^A-Za-z]', '', 'g'), 3)),
        UPPER(RIGHT(pm.id::text, 6))
    ) as medication_barcode
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'lethpoly' LIMIT 1)
AND pm.status = 'Active'
ORDER BY pm.name;

-- Check if there are medications in other tenants that might belong to lethpoly
SELECT 
    pm.tenant_id,
    t.name as tenant_name,
    t.subdomain,
    COUNT(*) as medication_count,
    ARRAY_AGG(DISTINCT pm.name ORDER BY pm.name) as medications
FROM patient_medications pm
JOIN tenants t ON pm.tenant_id = t.id
WHERE pm.status = 'Active'
GROUP BY pm.tenant_id, t.name, t.subdomain
ORDER BY t.name;