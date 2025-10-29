-- FINAL END-TO-END TEST: New simulation with populated snapshot
-- Simulation: 19cee8db-d076-4d57-b765-b43f306b2d02
-- Tenant: d0ac6b21-5a66-401f-a718-7646ee4174f6

-- 1. Check what was restored from snapshot during launch
SELECT 'SIMULATION LAUNCHED - INITIAL DATA:' as test_step;
SELECT 
    (SELECT COUNT(*) FROM patients WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6') as patients,
    (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6') as vitals,
    (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6') as medications;

-- 2. Add some "student work" (new vital readings)
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
    (SELECT id FROM patients WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6' LIMIT 1),
    'd0ac6b21-5a66-401f-a718-7646ee4174f6',
    37.8, -- High temperature 
    110, -- High heart rate
    22, -- High respiratory rate
    140,
    90,
    96,
    NOW()
);

-- 3. Check counts after adding student work
SELECT 'AFTER ADDING STUDENT WORK:' as test_step;
SELECT COUNT(*) as vitals_with_student_work
FROM patient_vitals 
WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6';

-- 4. Test the reset function
SELECT 'TESTING RESET FUNCTION:' as test_step;
SELECT reset_simulation_for_next_session_v2('19cee8db-d076-4d57-b765-b43f306b2d02');

-- 5. Check counts after reset
SELECT 'AFTER RESET:' as test_step;
SELECT COUNT(*) as vitals_after_reset
FROM patient_vitals 
WHERE tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6';

-- 6. Show what vitals are there after reset
SELECT 'VITALS CONTENT AFTER RESET:' as test_step;
SELECT 
    pv.temperature,
    pv.heart_rate,
    pv.respiratory_rate,
    pv.recorded_at,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE pv.tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6'
ORDER BY pv.recorded_at
LIMIT 5;