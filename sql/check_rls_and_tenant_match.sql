-- Check RLS policies and test direct medication access
-- Run these queries one by one

-- 1. Check if patient_medications has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'patient_medications';

-- 2. Check RLS policies on patient_medications
SELECT policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'patient_medications';

-- 3. Test direct access to NSG001's medications using UUID
SELECT pm.id, pm.name, pm.dosage, pm.status, pm.tenant_id
FROM patient_medications pm
WHERE pm.patient_id = '88d777a8-2530-4768-9282-dc0f1cf01837';

-- 4. Check if medications are in the same tenant as patient
SELECT 
    p.patient_id,
    p.tenant_id as patient_tenant_id,
    pm.tenant_id as medication_tenant_id,
    CASE 
        WHEN p.tenant_id = pm.tenant_id THEN 'MATCH' 
        ELSE 'MISMATCH' 
    END as tenant_match,
    COUNT(pm.id) as med_count
FROM patients p
LEFT JOIN patient_medications pm ON p.id = pm.patient_id
WHERE p.patient_id = 'NSG001'
GROUP BY p.patient_id, p.tenant_id, pm.tenant_id;