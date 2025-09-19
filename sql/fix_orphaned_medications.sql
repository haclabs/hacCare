-- Duplicate medications from NSG001 to PT68837 so both patients have the same meds

-- Step 1: Verify the current state
SELECT 
    'Before fix - Medications for NSG001:' as status,
    COUNT(*) as medication_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'NSG001';

SELECT 
    'Before fix - Medications for PT68837:' as status,
    COUNT(*) as medication_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'PT68837';

-- Step 2: Copy medications from NSG001 to PT68837 (keeping both)
INSERT INTO patient_medications (
    patient_id,
    name,
    dosage,
    route,
    frequency,
    start_date,
    end_date,
    prescribed_by,
    status,
    category,
    admin_time,
    tenant_id,
    created_at,
    last_administered,
    next_due
)
SELECT 
    pt68837.id,                          -- PT68837's UUID
    pm.name,
    pm.dosage,
    pm.route,
    pm.frequency,
    pm.start_date,
    pm.end_date,
    pm.prescribed_by,
    pm.status,
    pm.category,
    pm.admin_time,
    pt68837.tenant_id,                   -- PT68837's tenant
    NOW(),
    pm.last_administered,
    COALESCE(pm.next_due, NOW())
FROM patient_medications pm
JOIN patients nsg001 ON pm.patient_id = nsg001.id
JOIN patients pt68837 ON pt68837.patient_id = 'PT68837'
WHERE nsg001.patient_id = 'NSG001';

-- Step 3: Also copy any vitals if they exist
INSERT INTO patient_vitals (
    patient_id,
    temperature,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    heart_rate,
    respiratory_rate,
    oxygen_saturation,
    recorded_at,
    tenant_id
)
SELECT 
    pt68837.id,                          -- PT68837's UUID
    pv.temperature,
    pv.blood_pressure_systolic,
    pv.blood_pressure_diastolic,
    pv.heart_rate,
    pv.respiratory_rate,
    pv.oxygen_saturation,
    pv.recorded_at,
    pt68837.tenant_id                    -- PT68837's tenant
FROM patient_vitals pv
JOIN patients nsg001 ON pv.patient_id = nsg001.id
JOIN patients pt68837 ON pt68837.patient_id = 'PT68837'
WHERE nsg001.patient_id = 'NSG001'
AND NOT EXISTS (
    -- Don't duplicate if PT68837 already has vitals
    SELECT 1 FROM patient_vitals pv2 WHERE pv2.patient_id = pt68837.id
);

-- Step 4: Verify both patients now have medications
SELECT 
    'After fix - Medications for PT68837:' as status,
    COUNT(*) as medication_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'PT68837';

SELECT 
    'After fix - Medications for NSG001:' as status,
    COUNT(*) as medication_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.patient_id = 'NSG001';

-- Step 5: Show the medications for both patients
SELECT 
    p.patient_id,
    p.first_name,
    p.last_name,
    pm.name as medication_name,
    pm.dosage,
    pm.frequency
FROM patients p
JOIN patient_medications pm ON p.id = pm.patient_id
WHERE p.patient_id IN ('NSG001', 'PT68837')
ORDER BY p.patient_id, pm.name;

SELECT 'Fix completed - Both patients now have the same medications' as status;