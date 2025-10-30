-- DEBUG: Check vitals in new simulation snapshot
-- New simulation: 267b04a9-0da8-425e-8618-8699b183ec82
-- New tenant: 283579dd-442c-42ea-b010-10b8a4d48155

-- 1. Check if snapshot contains vitals
SELECT 'NEW SIMULATION SNAPSHOT ANALYSIS:' as debug_info;

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
         ELSE 0 END as vitals_count_in_snapshot,
    st.snapshot_version,
    st.snapshot_taken_at
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '267b04a9-0da8-425e-8618-8699b183ec82';

-- 2. Show all keys in the new snapshot
SELECT 'NEW SNAPSHOT KEYS:' as debug_info;
SELECT jsonb_object_keys(st.snapshot_data) as snapshot_keys
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '267b04a9-0da8-425e-8618-8699b183ec82'
AND st.snapshot_data IS NOT NULL;

-- 3. Check if there are actually vitals in the template tenant now
SELECT 'CURRENT VITALS IN TEMPLATE TENANT:' as debug_info;
SELECT COUNT(*) as current_template_vitals
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id = (
    SELECT st.tenant_id 
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '267b04a9-0da8-425e-8618-8699b183ec82'
);

-- 4. Check if there are patients in simulation tenant
SELECT 'PATIENTS IN NEW SIMULATION:' as debug_info;
SELECT COUNT(*) as simulation_patients
FROM patients p
WHERE p.tenant_id = '283579dd-442c-42ea-b010-10b8a4d48155';