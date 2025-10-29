-- DEFINITIVE TEST: Check if vitals exist in the current snapshot
-- Simulation: 267b04a9-0da8-425e-8618-8699b183ec82

-- 1. Get snapshot data and check for vitals
SELECT 'SNAPSHOT VITALS CHECK:' as test_name;

SELECT 
    st.id as template_id,
    st.snapshot_version,
    st.snapshot_taken_at,
    CASE 
        WHEN st.snapshot_data IS NULL THEN 'NO SNAPSHOT'
        WHEN NOT (st.snapshot_data ? 'patient_vitals') THEN 'NO VITALS KEY'
        WHEN jsonb_array_length(st.snapshot_data->'patient_vitals') = 0 THEN 'EMPTY VITALS ARRAY'
        ELSE 'HAS ' || jsonb_array_length(st.snapshot_data->'patient_vitals')::text || ' VITALS'
    END as vitals_status
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '267b04a9-0da8-425e-8618-8699b183ec82';

-- 2. If snapshot exists, show all table keys
SELECT 'SNAPSHOT TABLE KEYS:' as test_name;

SELECT 
    jsonb_object_keys(st.snapshot_data) as table_name,
    jsonb_array_length(st.snapshot_data->jsonb_object_keys(st.snapshot_data)) as record_count
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id,
     jsonb_object_keys(st.snapshot_data)
WHERE sa.id = '267b04a9-0da8-425e-8618-8699b183ec82'
AND st.snapshot_data IS NOT NULL
ORDER BY table_name;

-- 3. Show current vitals in the simulation (should be 0 after reset)
SELECT 'CURRENT VITALS IN SIMULATION:' as test_name;

-- Try both methods
SELECT 
    'Direct tenant_id count' as method,
    COUNT(*) as vitals_count
FROM patient_vitals 
WHERE tenant_id = '283579dd-442c-42ea-b010-10b8a4d48155'

UNION ALL

SELECT 
    'Via patient join' as method,
    COUNT(*) as vitals_count
FROM patient_vitals pv 
JOIN patients p ON p.id = pv.patient_id 
WHERE p.tenant_id = '283579dd-442c-42ea-b010-10b8a4d48155';

-- 4. Check if patient_vitals table has tenant_id column
SELECT 'TABLE STRUCTURE CHECK:' as test_name;

SELECT 
    'patient_vitals' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patient_vitals' 
        AND column_name = 'tenant_id'
    ) THEN 'HAS tenant_id' ELSE 'NO tenant_id' END as has_tenant_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patient_vitals' 
        AND column_name = 'patient_id'
    ) THEN 'HAS patient_id' ELSE 'NO patient_id' END as has_patient_id;