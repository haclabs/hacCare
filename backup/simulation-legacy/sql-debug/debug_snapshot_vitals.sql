-- DEBUG: Check if there are vitals in the snapshot
-- Simulation: 19cee8db-d076-4d57-b765-b43f306b2d02

-- 1. Get the snapshot for this simulation
SELECT 'SNAPSHOT DATA ANALYSIS:' as debug_info;

-- Check if snapshot exists and has patient_vitals
SELECT 
    st.id as template_id,
    st.tenant_id as template_tenant_id,
    CASE WHEN st.snapshot_data IS NOT NULL 
         THEN 'Snapshot exists' 
         ELSE 'No snapshot' END as snapshot_status,
    CASE WHEN st.snapshot_data ? 'patient_vitals'
         THEN 'Has vitals key'
         ELSE 'No vitals key' END as vitals_key_status,
    CASE WHEN st.snapshot_data ? 'patient_vitals'
         THEN jsonb_array_length(st.snapshot_data->'patient_vitals')
         ELSE 0 END as vitals_count_in_snapshot
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02';

-- 2. Show all keys in the snapshot
SELECT 'SNAPSHOT KEYS:' as debug_info;
SELECT jsonb_object_keys(st.snapshot_data) as snapshot_keys
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
AND st.snapshot_data IS NOT NULL;

-- 3. If vitals exist, show a sample
SELECT 'SAMPLE VITALS IN SNAPSHOT:' as debug_info;
SELECT 
    (vitals_record->>'patient_id') as patient_id,
    (vitals_record->>'heart_rate') as heart_rate,
    (vitals_record->>'blood_pressure_systolic') as bp_systolic
FROM (
    SELECT jsonb_array_elements(st.snapshot_data->'patient_vitals') as vitals_record
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
    AND st.snapshot_data ? 'patient_vitals'
) vitals_data
LIMIT 3;