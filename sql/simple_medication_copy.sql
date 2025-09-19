-- Simple medication duplication with error handling

-- First, check what we're working with
SELECT 'NSG001 patient UUID:' as info, id as uuid FROM patients WHERE patient_id = 'NSG001';
SELECT 'PT68837 patient UUID:' as info, id as uuid FROM patients WHERE patient_id = 'PT68837';

-- Check NSG001 medications
SELECT 'NSG001 medications:' as info, COUNT(*) as count 
FROM patient_medications pm 
JOIN patients p ON pm.patient_id = p.id 
WHERE p.patient_id = 'NSG001';

-- Delete any existing medications for PT68837 first (to avoid duplicates)
DELETE FROM patient_medications 
WHERE patient_id = (SELECT id FROM patients WHERE patient_id = 'PT68837');

-- Simple insert with required fields only
INSERT INTO patient_medications (
    patient_id,
    name,
    dosage,
    route,
    frequency,
    start_date,
    prescribed_by,
    status,
    tenant_id,
    created_at,
    next_due
)
SELECT 
    (SELECT id FROM patients WHERE patient_id = 'PT68837'),  -- PT68837's UUID
    pm.name,
    pm.dosage,
    COALESCE(pm.route, 'Oral'),                              -- Default route if NULL
    pm.frequency,
    COALESCE(pm.start_date, CURRENT_DATE),                   -- Default start_date if NULL
    COALESCE(pm.prescribed_by, 'Unknown'),                   -- Default prescriber if NULL
    COALESCE(pm.status, 'Active'),                           -- Default status if NULL
    (SELECT tenant_id FROM patients WHERE patient_id = 'PT68837'),  -- PT68837's tenant
    NOW(),
    COALESCE(pm.next_due, NOW() + INTERVAL '1 day')         -- Default next_due if NULL
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'NSG001';

-- Verify the copy worked
SELECT 'PT68837 medications after copy:' as info, COUNT(*) as count 
FROM patient_medications pm 
JOIN patients p ON pm.patient_id = p.id 
WHERE p.patient_id = 'PT68837';

-- Show the actual medications
SELECT 
    p.patient_id,
    pm.name,
    pm.dosage,
    pm.frequency,
    pm.route
FROM patients p
JOIN patient_medications pm ON p.id = pm.patient_id
WHERE p.patient_id IN ('NSG001', 'PT68837')
ORDER BY p.patient_id, pm.name;