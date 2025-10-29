-- Test reset with the NEW snapshot (version 10)
-- This should now restore vitals since we have data in the snapshot

-- Add a vital to current simulation first (so we can see it get reset)
INSERT INTO patient_vitals (
    patient_id, 
    tenant_id, 
    temperature, 
    heart_rate, 
    respiratory_rate, 
    blood_pressure_systolic, 
    blood_pressure_diastolic, 
    oxygen_saturation,
    recorded_at
) VALUES (
    (SELECT id FROM patients WHERE tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f' LIMIT 1),
    '2aeef624-0e09-4cf6-afa3-90947373fb5f',
    37.2,
    95,
    18,
    130,
    80,
    98,
    NOW()
);

-- Check vitals count before reset
SELECT 'VITALS BEFORE RESET:' as info, COUNT(*) as count
FROM patient_vitals 
WHERE tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f';

-- Now test the reset with the new snapshot
SELECT 'TESTING RESET WITH NEW SNAPSHOT:' as info;
SELECT reset_simulation_for_next_session_v2(
    (SELECT sa.id FROM simulation_active sa 
     WHERE sa.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f' 
     AND sa.status = 'running' 
     LIMIT 1)
);

-- Check vitals count after reset
SELECT 'VITALS AFTER RESET:' as info, COUNT(*) as count
FROM patient_vitals 
WHERE tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f';