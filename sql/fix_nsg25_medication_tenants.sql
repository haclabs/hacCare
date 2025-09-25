-- Fix medication tenant mismatches for NSG25
-- Update medications to match their patient's tenant_id

-- First, let's see the current mismatch count
SELECT 
    'Before Fix - Mismatch Count' as status,
    COUNT(*) as mismatched_medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25
AND pm.tenant_id != p.tenant_id
AND pm.status = 'Active';

-- Update all NSG25 patient medications to have NSG25 tenant_id
UPDATE patient_medications 
SET tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25 tenant ID
FROM patients p
WHERE patient_medications.patient_id = p.id
AND p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25 tenant ID
AND patient_medications.tenant_id != p.tenant_id;

-- Verify the fix
SELECT 
    'After Fix - Remaining Mismatches' as status,
    COUNT(*) as mismatched_medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25
AND pm.tenant_id != p.tenant_id
AND pm.status = 'Active';

-- Show final medication count by tenant
SELECT 
    'Final Count Check' as status,
    pm.tenant_id,
    t.name as tenant_name,
    COUNT(*) as medication_count
FROM patient_medications pm
LEFT JOIN tenants t ON pm.tenant_id = t.id
WHERE pm.status = 'Active'
AND pm.tenant_id IN (
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',  -- lethpoly
    '4b181815-24ae-44cb-9128-e74fefb35e13'   -- NSG25
)
GROUP BY pm.tenant_id, t.name
ORDER BY t.name;